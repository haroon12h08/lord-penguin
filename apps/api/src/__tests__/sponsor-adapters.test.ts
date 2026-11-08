import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { seedDatabase } from '../db/seed.js';
import { bomItems, merchantOffers, paypalSettlements } from '../db/schema.js';
import { channel3Adapter } from '../adapters/channel3.adapter.js';
import { kernelBrowserAdapter } from '../adapters/kernel-browser.adapter.js';
import { paypalApimaticAdapter } from '../adapters/paypal-apimatic.adapter.js';
import { llmOrchestratorAdapter } from '../adapters/llm-orchestrator.adapter.js';
import { eq } from 'drizzle-orm';
import Fastify from 'fastify';
import { mockMerchantRoutes } from '../routes/mock-merchant.routes.js';

describe('Phase 2 Sponsor Adapters & Mock Storefront (IT-01 to IT-03)', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();

    // Spin up fastify instance with mock merchant routes for local HTTP injection
    app = Fastify();
    await app.register(mockMerchantRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  describe('IT-01: Channel3 Multi-Merchant Discovery Adapter', () => {
    it('returns >= 3 competing offers per BOM SKU and marks lowest landed price as isBestOffer', async () => {
      const db = getDatabase();
      const boms = await db.select().from(bomItems).limit(1);
      expect(boms.length).toBe(1);

      const item = {
        ...boms[0],
        baselineUnitPriceUsd: Number(boms[0].baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(boms[0].strikeUnitPriceUsd),
        maxBudgetUsd: Number(boms[0].maxBudgetUsd),
        daysFloatSaved: Number(boms[0].daysFloatSaved),
        capitalYieldSavedUsd: Number(boms[0].capitalYieldSavedUsd),
        priceHistoryJson: boms[0].priceHistoryJson as number[],
        lrmTimestamp: boms[0].lrmTimestamp.toISOString(),
        createdAt: boms[0].createdAt.toISOString(),
        updatedAt: boms[0].updatedAt.toISOString()
      };

      const offers = await channel3Adapter.searchOffersForBomItem(item, '78701');
      expect(offers.length).toBeGreaterThanOrEqual(3);

      // Verify ascending rank by netEffectiveTotalUsd
      for (let i = 0; i < offers.length - 1; i++) {
        expect(offers[i].netEffectiveTotalUsd).toBeLessThanOrEqual(offers[i + 1].netEffectiveTotalUsd);
      }

      // Exactly 1 offer must be marked as best
      const bestOffers = offers.filter(o => o.isBestOffer);
      expect(bestOffers.length).toBe(1);
      expect(bestOffers[0].id).toBe(offers[0].id);
    });

    it('simulates a price drop and updates offer in database', async () => {
      const db = getDatabase();
      const existingOffers = await db.select().from(merchantOffers).limit(1);
      expect(existingOffers.length).toBe(1);

      const targetId = existingOffers[0].id;
      const initialPrice = Number(existingOffers[0].unitPriceUsd);

      const updated = await channel3Adapter.simulatePriceDrop(targetId, 20); // 20% discount
      expect(updated.unitPriceUsd).toBeLessThan(initialPrice);
      expect(updated.isBestOffer).toBe(true);
    });
  });

  describe('Mock Merchant Storefront Route', () => {
    it('serves semantic HTML5 with data-testid selectors for DOM extraction', async () => {
      const db = getDatabase();
      const offers = await db.select().from(merchantOffers).limit(1);
      const offerId = offers[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/merchant-simulator/${offerId}?zip=78701`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');

      const body = response.body;
      expect(body).toContain('data-testid="merchant-name"');
      expect(body).toContain('data-testid="stock-status"');
      expect(body).toContain('data-testid="live-price"');
      expect(body).toContain('data-testid="delivery-estimate"');
      expect(body).toContain('data-testid="shipping-lead-days"');
      expect(body).toContain('In Stock');
    });

    it('respects query parameter overrides for backorder testing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/merchant-simulator/non-existent-id?in_stock=false&price=999.00&zip=94107`
      });

      expect(response.statusCode).toBe(200);
      const body = response.body;
      expect(body).toContain('Out of Stock');
      expect(body).toContain('$999.00');
      expect(body).toContain('94107');
    });
  });

  describe('IT-02: KERNEL Browser & Playwright Verifier Adapter', () => {
    it('verifies in-stock product with matching price and valid lead time', async () => {
      const mockOffer = {
        id: 'off-test-01',
        bomItemId: 'bom-test-01',
        channel3ProductId: 'c3_test_01',
        merchantName: 'Sweetwater Pro Audio',
        merchantDomain: 'sweetwater.com',
        unitPriceUsd: 425.0,
        shippingPriceUsd: 0,
        commissionRatePct: 4.0,
        netEffectiveTotalUsd: 408.0,
        shippingLeadDays: 2,
        inStock: true,
        productUrl: 'https://sweetwater.com/store/item/sm7db',
        verificationUrl: '/api/v1/merchant-simulator/off-test-01?zip=78701',
        isBestOffer: true,
        lastCheckedAt: new Date().toISOString()
      };

      const result = await kernelBrowserAdapter.verifyOfferInBrowser(
        mockOffer,
        '78701',
        new Date(Date.now() + 5 * 86_400_000) // task start date 5 days in future
      );

      expect(result.verificationStatus).toBe('PASSED');
      expect(result.verifiedInStock).toBe(true);
      expect(result.verifiedPriceUsd).toBe(425.0);
      expect(result.kernelSessionId).toBeDefined();
      expect(result.browserLiveViewUrl).toContain('replay_id=');
      expect(result.domSnapshot).toBeDefined();
    });

    it('rejects offer when out-of-stock condition is detected in DOM', async () => {
      const outOfStockOffer = {
        id: 'off-oos-02',
        bomItemId: 'bom-test-02',
        channel3ProductId: 'c3_test_oos',
        merchantName: 'Sweetwater Pro Audio',
        merchantDomain: 'sweetwater.com',
        unitPriceUsd: 425.0,
        shippingPriceUsd: 0,
        commissionRatePct: 4.0,
        netEffectiveTotalUsd: 408.0,
        shippingLeadDays: 2,
        inStock: false,
        productUrl: 'https://sweetwater.com/store/item/sm7db',
        verificationUrl: '/api/v1/merchant-simulator/off-oos-02?in_stock=false',
        isBestOffer: false,
        lastCheckedAt: new Date().toISOString()
      };

      const result = await kernelBrowserAdapter.verifyOfferInBrowser(outOfStockOffer, '78701');
      expect(result.verificationStatus).toBe('FAILED_OUT_OF_STOCK');
      expect(result.verifiedInStock).toBe(false);
    });
  });

  describe('IT-03: APIMatic PayPal Server SDK & PayPal Agent Toolkit Adapter', () => {
    it('executes Orders v2 settlement with APIMatic model serialization and idempotency', async () => {
      const db = getDatabase();
      const boms = await db.select().from(bomItems).where(eq(bomItems.skuCode, 'SHURE-SM7DB-4PK')).limit(1);
      expect(boms.length).toBe(1);

      const bomItem = {
        ...boms[0],
        baselineUnitPriceUsd: Number(boms[0].baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(boms[0].strikeUnitPriceUsd),
        maxBudgetUsd: Number(boms[0].maxBudgetUsd),
        daysFloatSaved: Number(boms[0].daysFloatSaved),
        capitalYieldSavedUsd: Number(boms[0].capitalYieldSavedUsd),
        priceHistoryJson: boms[0].priceHistoryJson as number[],
        lrmTimestamp: boms[0].lrmTimestamp.toISOString(),
        createdAt: boms[0].createdAt.toISOString(),
        updatedAt: boms[0].updatedAt.toISOString()
      };

      // Get an existing seeded offer for this BOM item
      const dbOffers = await db.select().from(merchantOffers).where(eq(merchantOffers.bomItemId, bomItem.id)).limit(1);
      expect(dbOffers.length).toBe(1);

      const targetOffer = {
        ...dbOffers[0],
        unitPriceUsd: Number(dbOffers[0].unitPriceUsd),
        shippingPriceUsd: Number(dbOffers[0].shippingPriceUsd),
        commissionRatePct: Number(dbOffers[0].commissionRatePct),
        netEffectiveTotalUsd: Number(dbOffers[0].netEffectiveTotalUsd),
        lastCheckedAt: dbOffers[0].lastCheckedAt.toISOString()
      };

      // Execute real verification first to have a valid verification in DB
      const verification = await kernelBrowserAdapter.verifyOfferInBrowser(targetOffer, '78701');
      expect(verification.verificationStatus).toBe('PASSED');

      const idempotencyKey = `test-idemp-shure-${Date.now()}`;

      const settlement = await paypalApimaticAdapter.executeOrderSettlement({
        projectId: bomItem.projectId,
        bomItem,
        offer: targetOffer,
        verification,
        idempotencyKey
      });

      expect(settlement.settlementRail).toBe('PAYPAL_ORDER');
      expect(settlement.paypalOrderId).toBeDefined();
      expect(settlement.apimaticValidated).toBe(true);
      expect(settlement.agentToolkitToolUsed).toBe('create_order');
      expect(settlement.netSettledUsd).toBe(targetOffer.netEffectiveTotalUsd);
      expect(settlement.approvalUrl).toContain('checkoutnow?token=');

      // Verify persisted in DB
      const persisted = await db
        .select()
        .from(paypalSettlements)
        .where(eq(paypalSettlements.idempotencyKey, idempotencyKey))
        .limit(1);

      expect(persisted.length).toBe(1);
      expect(persisted[0].paypalOrderId).toBe(settlement.paypalOrderId);
    });

    it('executes B2B Vendor Invoicing v2 settlement via PayPal Agent Toolkit', async () => {
      const db = getDatabase();
      const boms = await db.select().from(bomItems).where(eq(bomItems.skuCode, 'RODE-CASTER-PRO-2')).limit(1);
      expect(boms.length).toBe(1);

      const bomItem = {
        ...boms[0],
        baselineUnitPriceUsd: Number(boms[0].baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(boms[0].strikeUnitPriceUsd),
        maxBudgetUsd: Number(boms[0].maxBudgetUsd),
        daysFloatSaved: Number(boms[0].daysFloatSaved),
        capitalYieldSavedUsd: Number(boms[0].capitalYieldSavedUsd),
        priceHistoryJson: boms[0].priceHistoryJson as number[],
        lrmTimestamp: boms[0].lrmTimestamp.toISOString(),
        createdAt: boms[0].createdAt.toISOString(),
        updatedAt: boms[0].updatedAt.toISOString()
      };

      const dbOffers = await db.select().from(merchantOffers).where(eq(merchantOffers.bomItemId, bomItem.id)).limit(1);
      expect(dbOffers.length).toBe(1);

      const targetOffer = {
        ...dbOffers[0],
        unitPriceUsd: Number(dbOffers[0].unitPriceUsd),
        shippingPriceUsd: Number(dbOffers[0].shippingPriceUsd),
        commissionRatePct: Number(dbOffers[0].commissionRatePct),
        netEffectiveTotalUsd: Number(dbOffers[0].netEffectiveTotalUsd),
        lastCheckedAt: dbOffers[0].lastCheckedAt.toISOString()
      };

      const verification = await kernelBrowserAdapter.verifyOfferInBrowser(targetOffer, '78701');
      const idempotencyKey = `test-invoice-idemp-${Date.now()}`;

      const settlement = await paypalApimaticAdapter.executeInvoiceSettlement({
        projectId: bomItem.projectId,
        bomItem,
        offer: targetOffer,
        verification,
        idempotencyKey
      });

      expect(settlement.settlementRail).toBe('PAYPAL_INVOICE');
      expect(settlement.paypalInvoiceId).toContain('INV2-');
      expect(settlement.agentToolkitToolUsed).toBe('create_invoice');
      expect(settlement.receiptUrl).toContain('payerView');
    });

    it('executes a refund and transitions settlement and BOM item status', async () => {
      const db = getDatabase();
      const settlements = await db.select().from(paypalSettlements).limit(1);
      expect(settlements.length).toBe(1);

      const targetSettlement = settlements[0];
      const refund = await paypalApimaticAdapter.executeRefund(targetSettlement.id, targetSettlement.paypalCaptureId || undefined, 100);

      expect(refund.refundStatus).toBe('COMPLETED');
      expect(refund.refundId).toContain('REF-');

      // Verify DB record updated
      const updated = await db.select().from(paypalSettlements).where(eq(paypalSettlements.id, targetSettlement.id));
      expect(updated[0].paypalStatus).toBe('REFUNDED');
    });
  });

  describe('LLM Project Orchestrator Adapter', () => {
    it('decomposes natural language brief into dependency-linked schedule & BOM items', async () => {
      const brief = {
        name: 'San Francisco Robotics Lab',
        briefText: 'Build a 6-bench robotics and soldering lab by Nov 30 with oscilloscopes and ESD workstations in 94107',
        budgetCapUsd: 12000,
        destinationZip: '94107',
        targetCompletionDate: '2026-11-30T00:00:00.000Z',
        autonomyMode: 'FULL_AUTONOMOUS' as const
      };

      const decomposed = await llmOrchestratorAdapter.decomposeProjectBrief(brief);
      expect(decomposed.projectName).toBe(brief.name);
      expect(decomposed.tasks.length).toBeGreaterThanOrEqual(6);

      // Verify each task has a mapped BOM item
      for (const t of decomposed.tasks) {
        expect(t.externalCode).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.durationDays).toBeGreaterThan(0);
        expect(t.bomItem.skuCode).toBeDefined();
        expect(t.bomItem.estimatedUnitPriceUsd).toBeGreaterThan(0);
      }
    });
  });
});
