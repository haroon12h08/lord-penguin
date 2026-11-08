import {
  ProjectTask,
  TaskDependency,
  calculateLrmTimestamp,
  cascadeTaskSchedule
} from '@lord-penguin/shared';
import { getDatabase } from '../db/index.js';
import { projects, projectTasks, taskDependencies, bomItems, merchantOffers } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { procurementAgentService, ProcurementResult } from './procurement-agent.service.js';
import { sseBroadcaster } from './sse-broadcaster.service.js';

export interface RescheduleResult {
  updatedTasks: ProjectTask[];
  updatedBomItems: any[];
  triggeredProcurements: Array<{
    bomItemId: string;
    reason: string;
    result?: ProcurementResult;
  }>;
}

export class LrmEngineService {
  /**
   * Reschedules a task in Bryntum Gantt, cascades dependent tasks, recalculates LRM cutoffs,
   * and triggers autonomous procurement for any BOM item whose LRM window has been entered.
   */
  async rescheduleTask(
    projectId: string,
    taskId: string,
    newStartDate: Date | string,
    newEndDate: Date | string
  ): Promise<RescheduleResult> {
    const db = getDatabase();

    // 1. Fetch project metadata
    const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (projRows.length === 0) {
      throw new Error(`Project ${projectId} not found`);
    }
    const project = projRows[0];
    const virtualNow = new Date(project.virtualNowTimestamp);
    const apr = Number(project.costOfCapitalApr);
    const safetyBuffer = project.safetyBufferDays;

    // 2. Fetch all project tasks and dependencies
    const dbTasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId));
    const dbDeps = await db.select().from(taskDependencies).where(eq(taskDependencies.projectId, projectId));

    const domainTasks: ProjectTask[] = dbTasks.map(t => ({
      ...t,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    }));

    const domainDeps: TaskDependency[] = dbDeps.map(d => ({
      id: d.id,
      projectId: d.projectId,
      fromTaskId: d.fromTaskId,
      toTaskId: d.toTaskId,
      dependencyType: d.dependencyType,
      lagDays: d.lagDays
    }));

    // 3. Cascade schedule downstream along the critical path
    const cascadedTasks = cascadeTaskSchedule(domainTasks, domainDeps, taskId, newStartDate, newEndDate);

    // 4. Update modified tasks in database
    for (const t of cascadedTasks) {
      await db
        .update(projectTasks)
        .set({
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
          durationDays: t.durationDays,
          updatedAt: new Date()
        })
        .where(eq(projectTasks.id, t.id));
    }

    // 5. Recalculate LRM timestamps and float for linked BOM items
    const taskIds = cascadedTasks.map(t => t.id);
    const linkedBoms = await db.select().from(bomItems).where(inArray(bomItems.taskId, taskIds));

    const updatedBomItems: any[] = [];
    const triggeredProcurements: Array<{ bomItemId: string; reason: string; result?: ProcurementResult }> = [];

    for (const bom of linkedBoms) {
      const task = cascadedTasks.find(t => t.id === bom.taskId);
      if (!task) continue;

      const newLrm = calculateLrmTimestamp(task.startDate, bom.leadTimeDays, safetyBuffer);
      const floatDays = Math.max(0, (newLrm.getTime() - virtualNow.getTime()) / 86_400_000);
      const netBaseline = Number(bom.baselineUnitPriceUsd) * bom.quantity;
      const capitalYield = Math.round(netBaseline * (apr / 365) * floatDays * 100) / 100;

      await db
        .update(bomItems)
        .set({
          lrmTimestamp: newLrm,
          daysFloatSaved: floatDays.toFixed(2),
          capitalYieldSavedUsd: capitalYield.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(bomItems.id, bom.id));

      updatedBomItems.push({
        ...bom,
        lrmTimestamp: newLrm.toISOString(),
        daysFloatSaved: floatDays,
        capitalYieldSavedUsd: capitalYield
      });

      // 6. Evaluate Autonomous Trigger: virtualNow >= newLrm
      const isLrmBreached = virtualNow.getTime() >= newLrm.getTime();
      if (isLrmBreached && bom.status === 'MONITORING' && project.autonomyMode === 'FULL_AUTONOMOUS') {
        try {
          const procResult = await procurementAgentService.executeProcurement(
            projectId,
            bom.id,
            `LRM Cutoff Crossed (${newLrm.toISOString().split('T')[0]}) via Gantt Task Shift`
          );

          triggeredProcurements.push({
            bomItemId: bom.id,
            reason: 'LRM_WINDOW_ENTERED',
            result: procResult
          });
        } catch (err: any) {
          console.error(`[LRM Engine] Procurement execution error for BOM ${bom.id}:`, err);
        }
      }
    }

    // Broadcast SSE update
    sseBroadcaster.broadcast(projectId, 'TASK_SHIFTED', {
      shiftedTaskId: taskId,
      cascadedTasksCount: cascadedTasks.length,
      triggeredProcurementsCount: triggeredProcurements.length
    });

    return {
      updatedTasks: cascadedTasks,
      updatedBomItems,
      triggeredProcurements
    };
  }

  /**
   * Advances project virtual clock forward (e.g. +24h), triggering autonomous settlement
   * for any BOM item whose LRM moment is reached.
   */
  async advanceVirtualClock(projectId: string, hoursForward = 24): Promise<{ newVirtualNow: string; triggeredCount: number }> {
    const db = getDatabase();
    const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (projRows.length === 0) throw new Error(`Project ${projectId} not found`);

    const currentProject = projRows[0];
    const currentNowMs = new Date(currentProject.virtualNowTimestamp).getTime();
    const newNowDate = new Date(currentNowMs + hoursForward * 3600 * 1000);

    await db
      .update(projects)
      .set({
        virtualNowTimestamp: newNowDate,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    // Check all MONITORING items
    const monitoringItems = await db
      .select()
      .from(bomItems)
      .where(eq(bomItems.projectId, projectId));

    let triggeredCount = 0;

    for (const item of monitoringItems) {
      if (item.status === 'MONITORING') {
        const itemLrmMs = new Date(item.lrmTimestamp).getTime();
        if (newNowDate.getTime() >= itemLrmMs && currentProject.autonomyMode === 'FULL_AUTONOMOUS') {
          triggeredCount++;
          await procurementAgentService.executeProcurement(
            projectId,
            item.id,
            `Simulation Clock Advanced (+${hoursForward}h) -> LRM Triggered`
          );
        }
      }
    }

    sseBroadcaster.broadcast(projectId, 'SIMULATION_CLOCK_SHIFTED', {
      previousTimestamp: currentProject.virtualNowTimestamp.toISOString(),
      newTimestamp: newNowDate.toISOString(),
      hoursAdvanced: hoursForward,
      triggeredCount
    });

    return {
      newVirtualNow: newNowDate.toISOString(),
      triggeredCount
    };
  }
}

export const lrmEngineService = new LrmEngineService();
