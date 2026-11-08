import {
  CreateProjectBriefInput,
  ProjectAggregate,
  Project,
  ProjectTask,
  TaskDependency,
  BomItem,
  calculateLrmTimestamp,
  calculateProjectTelemetry,
  MerchantOffer
} from '@lord-penguin/shared';
import { getDatabase } from '../db/index.js';
import {
  projects,
  projectTasks,
  taskDependencies,
  bomItems,
  merchantOffers,
  browserVerifications,
  paypalSettlements,
  agentAuditLogs
} from '../db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { llmOrchestratorAdapter } from '../adapters/llm-orchestrator.adapter.js';
import { channel3Adapter } from '../adapters/channel3.adapter.js';
import crypto from 'node:crypto';

export class ProjectPlannerService {
  /**
   * Decomposes a user's brief using AI and persists a complete project graph in the database
   */
  async createProjectFromBrief(input: CreateProjectBriefInput): Promise<ProjectAggregate> {
    const db = getDatabase();

    // 1. Decompose brief via LLM / Heuristic adapter
    const decomposed = await llmOrchestratorAdapter.decomposeProjectBrief(input);

    const projectId = crypto.randomUUID();
    const startDate = new Date(decomposed.projectStartDate || new Date());
    const completionDate = new Date(input.targetCompletionDate || decomposed.targetCompletionDate);
    const virtualNow = new Date();

    // 2. Insert Project
    await db.insert(projects).values({
      id: projectId,
      name: input.name || decomposed.projectName,
      briefText: input.briefText,
      destinationZip: input.destinationZip || '78701',
      budgetCapUsd: input.budgetCapUsd.toFixed(2),
      autoSpendLimitUsd: '5000.00',
      autonomyMode: input.autonomyMode || 'FULL_AUTONOMOUS',
      costOfCapitalApr: '0.0850',
      safetyBufferDays: 1,
      virtualNowTimestamp: virtualNow,
      projectStartDate: startDate,
      targetCompletionDate: completionDate
    });

    // 3. Create Tasks and BOM Items
    const taskIdMap = new Map<string, string>(); // externalCode -> taskId
    let currentTaskStartDate = new Date(startDate);

    for (let idx = 0; idx < decomposed.tasks.length; idx++) {
      const dt = decomposed.tasks[idx];
      const taskId = crypto.randomUUID();
      taskIdMap.set(dt.externalCode, taskId);

      const taskEndDate = new Date(currentTaskStartDate.getTime() + dt.durationDays * 86_400_000);

      await db.insert(projectTasks).values({
        id: taskId,
        projectId,
        externalCode: dt.externalCode,
        name: dt.name,
        phaseName: dt.phaseName,
        startDate: currentTaskStartDate,
        endDate: taskEndDate,
        durationDays: dt.durationDays,
        percentDone: 0,
        isCriticalPath: true,
        sortOrder: idx + 1
      });

      // Insert BOM line item
      const bomId = crypto.randomUUID();
      const leadDays = dt.bomItem.estimatedLeadTimeDays || 3;
      const lrmDate = calculateLrmTimestamp(currentTaskStartDate, leadDays, 1);
      const estPrice = dt.bomItem.estimatedUnitPriceUsd || 100;
      const strikePrice = Math.round(estPrice * 0.9 * 100) / 100;

      await db.insert(bomItems).values({
        id: bomId,
        projectId,
        taskId,
        skuCode: dt.bomItem.skuCode,
        itemName: dt.bomItem.itemName,
        category: dt.bomItem.category,
        searchQuery: dt.bomItem.searchQuery || dt.bomItem.itemName,
        quantity: dt.bomItem.quantity || 1,
        baselineUnitPriceUsd: estPrice.toFixed(2),
        strikeUnitPriceUsd: strikePrice.toFixed(2),
        maxBudgetUsd: (estPrice * (dt.bomItem.quantity || 1) * 1.2).toFixed(2),
        lrmTimestamp: lrmDate,
        leadTimeDays: leadDays,
        daysFloatSaved: '0',
        capitalYieldSavedUsd: '0',
        priceHistoryJson: [estPrice, estPrice, estPrice],
        settlementRail: 'PAYPAL_ORDER',
        status: 'MONITORING',
        statusReason: 'Monitoring initial Channel3 catalog offers.'
      });

      // Advance task start date for next task in sequence
      currentTaskStartDate = new Date(taskEndDate);
    }

    // 4. Insert Dependencies
    for (const dt of decomposed.tasks) {
      if (dt.dependsOnExternalCode && taskIdMap.has(dt.dependsOnExternalCode)) {
        const fromTaskId = taskIdMap.get(dt.dependsOnExternalCode)!;
        const toTaskId = taskIdMap.get(dt.externalCode)!;

        await db.insert(taskDependencies).values({
          projectId,
          fromTaskId,
          toTaskId,
          dependencyType: 'FS',
          lagDays: 0
        });
      }
    }

    // 5. Index Initial Offers for Created BOM Items
    const createdBoms = await db.select().from(bomItems).where(eq(bomItems.projectId, projectId));
    for (const b of createdBoms) {
      const bDomain: BomItem = {
        ...b,
        baselineUnitPriceUsd: Number(b.baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(b.strikeUnitPriceUsd),
        maxBudgetUsd: Number(b.maxBudgetUsd),
        daysFloatSaved: Number(b.daysFloatSaved),
        capitalYieldSavedUsd: Number(b.capitalYieldSavedUsd),
        priceHistoryJson: b.priceHistoryJson as number[],
        lrmTimestamp: b.lrmTimestamp.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString()
      };
      await channel3Adapter.searchOffersForBomItem(bDomain, input.destinationZip || '78701');
    }

    // 6. Log Audit Entry
    await db.insert(agentAuditLogs).values({
      projectId,
      sponsorService: 'BRYNTUM',
      actionType: 'PROJECT_DECOMPOSED',
      summary: `AI Project brief ingested. Generated ${decomposed.tasks.length} tasks and linked BOM items.`,
      severity: 'SUCCESS'
    });

    return this.getProjectAggregate(projectId);
  }

  /**
   * Retrieves full aggregated project state for frontend hydration
   */
  async getProjectAggregate(projectId: string): Promise<ProjectAggregate> {
    const db = getDatabase();

    const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (projRows.length === 0) {
      throw new Error(`Project ${projectId} not found`);
    }

    const p = projRows[0];
    const projectDomain: Project = {
      ...p,
      budgetCapUsd: Number(p.budgetCapUsd),
      autoSpendLimitUsd: Number(p.autoSpendLimitUsd),
      costOfCapitalApr: Number(p.costOfCapitalApr),
      virtualNowTimestamp: p.virtualNowTimestamp.toISOString(),
      projectStartDate: p.projectStartDate.toISOString(),
      targetCompletionDate: p.targetCompletionDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    };

    const taskRows = await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId));
    const tasksDomain: ProjectTask[] = taskRows.map(t => ({
      ...t,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    }));

    const depRows = await db.select().from(taskDependencies).where(eq(taskDependencies.projectId, projectId));
    const depsDomain: TaskDependency[] = depRows.map(d => ({
      id: d.id,
      projectId: d.projectId,
      fromTaskId: d.fromTaskId,
      toTaskId: d.toTaskId,
      dependencyType: d.dependencyType,
      lagDays: d.lagDays
    }));

    const bomRows = await db.select().from(bomItems).where(eq(bomItems.projectId, projectId));
    const bomIds = bomRows.map(b => b.id);

    const offerRows = bomIds.length > 0 ? await db.select().from(merchantOffers).where(inArray(merchantOffers.bomItemId, bomIds)) : [];
    const verifyRows = bomIds.length > 0 ? await db.select().from(browserVerifications).where(inArray(browserVerifications.bomItemId, bomIds)) : [];
    const settleRows = bomIds.length > 0 ? await db.select().from(paypalSettlements).where(inArray(paypalSettlements.bomItemId, bomIds)) : [];

    const offersDomain: MerchantOffer[] = offerRows.map(o => ({
      ...o,
      unitPriceUsd: Number(o.unitPriceUsd),
      shippingPriceUsd: Number(o.shippingPriceUsd),
      commissionRatePct: Number(o.commissionRatePct),
      netEffectiveTotalUsd: Number(o.netEffectiveTotalUsd),
      lastCheckedAt: o.lastCheckedAt.toISOString()
    }));

    const bomsDomain: BomItem[] = bomRows.map(b => {
      const itemOffers = offersDomain.filter(o => o.bomItemId === b.id);
      const latestVer = verifyRows.find(v => v.bomItemId === b.id);
      const settle = settleRows.find(s => s.bomItemId === b.id);

      return {
        ...b,
        baselineUnitPriceUsd: Number(b.baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(b.strikeUnitPriceUsd),
        maxBudgetUsd: Number(b.maxBudgetUsd),
        daysFloatSaved: Number(b.daysFloatSaved),
        capitalYieldSavedUsd: Number(b.capitalYieldSavedUsd),
        priceHistoryJson: b.priceHistoryJson as number[],
        lrmTimestamp: b.lrmTimestamp.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        offers: itemOffers,
        latestVerification: latestVer
          ? {
              ...latestVer,
              verifiedPriceUsd: Number(latestVer.verifiedPriceUsd),
              domSnapshotJson: latestVer.domSnapshotJson as Record<string, unknown>,
              executionMode: latestVer.executionMode as 'KERNEL_CLOUD' | 'PLAYWRIGHT_SANDBOX',
              createdAt: latestVer.createdAt.toISOString()
            }
          : null,
        settlement: settle
          ? {
              ...settle,
              grossAmountUsd: Number(settle.grossAmountUsd),
              commissionRebateUsd: Number(settle.commissionRebateUsd),
              netSettledUsd: Number(settle.netSettledUsd),
              savingsVsBaselineUsd: Number(settle.savingsVsBaselineUsd),
              paypalEnvironment: settle.paypalEnvironment as 'SANDBOX' | 'LIVE',
              rawPaypalResponseJson: settle.rawPaypalResponseJson as Record<string, unknown>,
              createdAt: settle.createdAt.toISOString(),
              updatedAt: settle.updatedAt.toISOString()
            }
          : null
      };
    });

    const auditRows = await db
      .select()
      .from(agentAuditLogs)
      .where(eq(agentAuditLogs.projectId, projectId))
      .orderBy(desc(agentAuditLogs.createdAt))
      .limit(50);

    const auditsDomain = auditRows.map(a => ({
      ...a,
      sponsorService: a.sponsorService as any,
      metadataJson: a.metadataJson as Record<string, unknown>,
      createdAt: a.createdAt.toISOString()
    }));

    const telemetry = calculateProjectTelemetry(
      bomsDomain,
      offersDomain,
      bomsDomain.map(b => b.settlement).filter(Boolean) as any
    );

    return {
      project: projectDomain,
      telemetry,
      tasks: tasksDomain,
      dependencies: depsDomain,
      bomItems: bomsDomain,
      auditLogs: auditsDomain
    };
  }

  /**
   * Lists all available projects
   */
  async listProjects(): Promise<Project[]> {
    const db = getDatabase();
    const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return rows.map(p => ({
      ...p,
      budgetCapUsd: Number(p.budgetCapUsd),
      autoSpendLimitUsd: Number(p.autoSpendLimitUsd),
      costOfCapitalApr: Number(p.costOfCapitalApr),
      virtualNowTimestamp: p.virtualNowTimestamp.toISOString(),
      projectStartDate: p.projectStartDate.toISOString(),
      targetCompletionDate: p.targetCompletionDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }));
  }
}

export const projectPlannerService = new ProjectPlannerService();
