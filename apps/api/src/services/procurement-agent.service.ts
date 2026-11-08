import {
  BomItem,
  MerchantOffer,
  PayPalSettlement,
  SettlementRailType
} from '@lord-penguin/shared';
import { getDatabase } from '../db/index.js';
import { bomItems, projects, projectTasks, paypalSettlements, browserVerifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { channel3Adapter } from '../adapters/channel3.adapter.js';
import { kernelBrowserAdapter, VerificationResult } from '../adapters/kernel-browser.adapter.js';
import { paypalApimaticAdapter } from '../adapters/paypal-apimatic.adapter.js';
import { sseBroadcaster } from './sse-broadcaster.service.js';

export interface ProcurementResult {
  bomItemId: string;
  status: string;
  statusReason?: string;
  bestOffer?: MerchantOffer;
  verification?: VerificationResult;
  settlement?: PayPalSettlement;
  capitalSavedUsd: number;
}

export class ProcurementAgentService {
  /**
   * Executes the full 3-Stage Autonomous Procurement Pipeline:
   * Discovery (Channel3) -> Verification (KERNEL Browser) -> Settlement (PayPal Orders v2 / Invoices v2)
   */
  async executeProcurement(
    projectId: string,
    bomItemId: string,
    triggerReason = 'MANUAL_OR_LRM_TRIGGER',
    railOverride?: SettlementRailType
  ): Promise<ProcurementResult> {
    const db = getDatabase();

    // 1. Concurrency Guard: Atomic check-and-set
    const itemRows = await db.select().from(bomItems).where(eq(bomItems.id, bomItemId)).limit(1);
    if (itemRows.length === 0) {
      throw new Error(`BOM item with id ${bomItemId} not found`);
    }

    const currentItem = itemRows[0];
    if (currentItem.status === 'SETTLED' || currentItem.status === 'SETTLING_PAYPAL') {
      // Already settled or currently settling
      const existingSettlement = await db
        .select()
        .from(paypalSettlements)
        .where(eq(paypalSettlements.bomItemId, bomItemId))
        .limit(1);

      return {
        bomItemId,
        status: currentItem.status,
        statusReason: 'Item is already settled or in settlement.',
        settlement: existingSettlement[0] as unknown as PayPalSettlement,
        capitalSavedUsd: Number(existingSettlement[0]?.savingsVsBaselineUsd || 0)
      };
    }

    // Transition to DISCOVERING_OFFERS
    await db
      .update(bomItems)
      .set({
        status: 'DISCOVERING_OFFERS',
        statusReason: triggerReason,
        updatedAt: new Date()
      })
      .where(eq(bomItems.id, bomItemId));

    sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
      bomItemId,
      status: 'DISCOVERING_OFFERS',
      reason: triggerReason
    });

    // 2. Fetch project metadata (ZIP & task start date)
    const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const destZip = projRows[0]?.destinationZip || '78701';

    const taskRows = await db.select().from(projectTasks).where(eq(projectTasks.id, currentItem.taskId)).limit(1);
    const taskStartDate = taskRows[0]?.startDate;

    const bomItemDomain: BomItem = {
      ...currentItem,
      baselineUnitPriceUsd: Number(currentItem.baselineUnitPriceUsd),
      strikeUnitPriceUsd: Number(currentItem.strikeUnitPriceUsd),
      maxBudgetUsd: Number(currentItem.maxBudgetUsd),
      daysFloatSaved: Number(currentItem.daysFloatSaved),
      capitalYieldSavedUsd: Number(currentItem.capitalYieldSavedUsd),
      priceHistoryJson: currentItem.priceHistoryJson as number[],
      lrmTimestamp: currentItem.lrmTimestamp.toISOString(),
      createdAt: currentItem.createdAt.toISOString(),
      updatedAt: currentItem.updatedAt.toISOString()
    };

    // Stage 1: Channel3 Discovery & Ranking
    const rankedOffers = await channel3Adapter.searchOffersForBomItem(bomItemDomain, destZip);
    if (rankedOffers.length === 0) {
      await db
        .update(bomItems)
        .set({ status: 'MONITORING', statusReason: 'No merchant offers discovered' })
        .where(eq(bomItems.id, bomItemId));
      throw new Error(`No merchant offers discovered for SKU ${currentItem.skuCode}`);
    }

    const bestOffer = rankedOffers.find(o => o.isBestOffer) || rankedOffers[0];

    // Budget Guardrail
    if (bestOffer.netEffectiveTotalUsd > bomItemDomain.maxBudgetUsd) {
      await db
        .update(bomItems)
        .set({
          status: 'BUDGET_HOLD',
          statusReason: `Best offer $${bestOffer.netEffectiveTotalUsd} exceeds max budget cap $${bomItemDomain.maxBudgetUsd}`,
          updatedAt: new Date()
        })
        .where(eq(bomItems.id, bomItemId));

      sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
        bomItemId,
        status: 'BUDGET_HOLD',
        reason: 'Budget cap exceeded'
      });

      return {
        bomItemId,
        status: 'BUDGET_HOLD',
        statusReason: 'Budget cap exceeded',
        bestOffer,
        capitalSavedUsd: 0
      };
    }

    sseBroadcaster.broadcast(projectId, 'OFFERS_RANKED', {
      bomItemId,
      bestOfferId: bestOffer.id,
      merchantName: bestOffer.merchantName,
      unitPriceUsd: bestOffer.unitPriceUsd,
      netEffectiveTotalUsd: bestOffer.netEffectiveTotalUsd,
      savingsVsBaseline: Math.max(0, bomItemDomain.baselineUnitPriceUsd * bomItemDomain.quantity - bestOffer.netEffectiveTotalUsd)
    });

    // Stage 2: KERNEL Cloud Browser DOM Verification
    await db
      .update(bomItems)
      .set({
        status: 'VERIFYING_KERNEL',
        selectedOfferId: bestOffer.id,
        updatedAt: new Date()
      })
      .where(eq(bomItems.id, bomItemId));

    sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
      bomItemId,
      status: 'VERIFYING_KERNEL'
    });
    sseBroadcaster.broadcast(projectId, 'KERNEL_BROWSER_STARTED', {
      bomItemId,
      offerId: bestOffer.id,
      merchantName: bestOffer.merchantName
    });

    const verification = await kernelBrowserAdapter.verifyOfferInBrowser(bestOffer, destZip, taskStartDate);

    sseBroadcaster.broadcast(projectId, 'KERNEL_BROWSER_VERIFIED', {
      bomItemId,
      verificationStatus: verification.verificationStatus,
      kernelSessionId: verification.kernelSessionId,
      liveViewUrl: verification.browserLiveViewUrl,
      verifiedPriceUsd: verification.verifiedPriceUsd,
      verifiedInStock: verification.verifiedInStock
    });

    if (verification.verificationStatus !== 'PASSED') {
      await db
        .update(bomItems)
        .set({
          status: 'OFFER_REJECTED',
          statusReason: `Kernel verification failed: ${verification.verificationStatus}`,
          updatedAt: new Date()
        })
        .where(eq(bomItems.id, bomItemId));

      sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
        bomItemId,
        status: 'OFFER_REJECTED',
        reason: verification.verificationStatus
      });

      return {
        bomItemId,
        status: 'OFFER_REJECTED',
        statusReason: `Kernel verification failed: ${verification.verificationStatus}`,
        bestOffer,
        verification,
        capitalSavedUsd: 0
      };
    }

    // Stage 3: APIMatic & PayPal Dual-Rail Settlement
    await db
      .update(bomItems)
      .set({
        status: 'SETTLING_PAYPAL',
        updatedAt: new Date()
      })
      .where(eq(bomItems.id, bomItemId));

    sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
      bomItemId,
      status: 'SETTLING_PAYPAL'
    });

    const rail = railOverride || currentItem.settlementRail || 'PAYPAL_ORDER';
    let settlement: PayPalSettlement;

    if (rail === 'PAYPAL_INVOICE') {
      settlement = await paypalApimaticAdapter.executeInvoiceSettlement({
        projectId,
        bomItem: bomItemDomain,
        offer: bestOffer,
        verification
      });
    } else {
      settlement = await paypalApimaticAdapter.executeOrderSettlement({
        projectId,
        bomItem: bomItemDomain,
        offer: bestOffer,
        verification
      });
    }

    sseBroadcaster.broadcast(projectId, 'PAYPAL_SETTLEMENT_COMPLETED', {
      bomItemId,
      settlementId: settlement.id,
      rail: settlement.settlementRail,
      orderId: settlement.paypalOrderId,
      invoiceId: settlement.paypalInvoiceId,
      netSettledUsd: settlement.netSettledUsd,
      savingsVsBaselineUsd: settlement.savingsVsBaselineUsd,
      approvalUrl: settlement.approvalUrl,
      receiptUrl: settlement.receiptUrl
    });

    sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
      bomItemId,
      status: 'SETTLED',
      reason: `Settled via ${settlement.settlementRail}`
    });

    return {
      bomItemId,
      status: 'SETTLED',
      statusReason: `Settled via ${settlement.settlementRail}`,
      bestOffer,
      verification,
      settlement,
      capitalSavedUsd: settlement.savingsVsBaselineUsd
    };
  }
}

export const procurementAgentService = new ProcurementAgentService();
