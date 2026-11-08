import {
  BomItem,
  MerchantOffer,
  PayPalSettlement,
  ProjectTask,
  ProjectTelemetry,
  TaskDependency
} from './types.js';

export interface EarlyStrikeParams {
  baselinePrice: number;
  currentBestPrice: number;
  strikePrice: number;
  lrmTimestamp: Date | string;
  nowTimestamp: Date | string;
  annualCostOfCapital?: number;
}

export interface EarlyStrikeResult {
  shouldStrike: boolean;
  reason: string;
  floatDaysRemaining: number;
  lostFloatYieldUsd: number;
  netArbitrageSavingsUsd: number;
}

/**
 * Computes Last Responsible Purchase Moment (T_LRM)
 * T_LRM = T_TaskStart - (LeadTime_Shipping + Buffer_Safety) * 86,400,000 ms
 */
export function calculateLrmTimestamp(
  taskStartDate: Date | string,
  leadTimeDays: number,
  safetyBufferDays = 1
): Date {
  const start = new Date(taskStartDate);
  const totalOffsetDays = leadTimeDays + safetyBufferDays;
  const lrmMs = start.getTime() - totalOffsetDays * 86_400_000;
  return new Date(lrmMs);
}

/**
 * Computes Net Landed Arbitrage Price (P_net)
 * P_net = ((P_unit * Q) + S_ship) * (1 - (R_comm / 100))
 */
export function calculateNetOfferPrice(
  unitPriceUsd: number,
  quantity: number,
  shippingPriceUsd: number,
  commissionRatePct: number
): number {
  const gross = unitPriceUsd * quantity + shippingPriceUsd;
  const discountMultiplier = 1 - commissionRatePct / 100;
  const net = gross * discountMultiplier;
  return Math.round(net * 100) / 100;
}

/**
 * Evaluates whether an early price drop justifies deployment of capital prior to T_LRM
 * Early strike executes if P_live <= P_strike AND (P_strike - P_live) > P_live * r_daily * delta_t
 */
export function evaluateEarlyStrike(params: EarlyStrikeParams): EarlyStrikeResult {
  const {
    baselinePrice,
    currentBestPrice,
    strikePrice,
    lrmTimestamp,
    nowTimestamp,
    annualCostOfCapital = 0.085
  } = params;

  const lrmTime = new Date(lrmTimestamp).getTime();
  const nowTime = new Date(nowTimestamp).getTime();
  const floatDaysRemaining = Math.max(0, (lrmTime - nowTime) / 86_400_000);

  const dailyCostOfCapital = annualCostOfCapital / 365;
  const lostFloatYield = currentBestPrice * dailyCostOfCapital * floatDaysRemaining;
  const netSavingsVsBaseline = baselinePrice - currentBestPrice;
  const priceSavingsVsStrike = strikePrice - currentBestPrice;

  const isBelowStrike = currentBestPrice <= strikePrice;
  const beatsFloatYield = priceSavingsVsStrike > lostFloatYield;

  if (floatDaysRemaining <= 0) {
    return {
      shouldStrike: true,
      reason: 'LRM window reached or passed. Immediate procurement required.',
      floatDaysRemaining: 0,
      lostFloatYieldUsd: 0,
      netArbitrageSavingsUsd: Math.round(netSavingsVsBaseline * 100) / 100
    };
  }

  if (isBelowStrike && beatsFloatYield) {
    return {
      shouldStrike: true,
      reason: `Arbitrage strike hit: $${Math.round(priceSavingsVsStrike * 100) / 100} savings exceeds lost treasury float yield ($${Math.round(lostFloatYield * 100) / 100}).`,
      floatDaysRemaining: Math.round(floatDaysRemaining * 10) / 10,
      lostFloatYieldUsd: Math.round(lostFloatYield * 100) / 100,
      netArbitrageSavingsUsd: Math.round(netSavingsVsBaseline * 100) / 100
    };
  }

  return {
    shouldStrike: false,
    reason: isBelowStrike
      ? `Price $${currentBestPrice} hits strike, but lost float yield ($${Math.round(lostFloatYield * 100) / 100}) outweighs margin.`
      : `Current price $${currentBestPrice} is above strike target $${strikePrice}. Hold cash in treasury.`,
    floatDaysRemaining: Math.round(floatDaysRemaining * 10) / 10,
    lostFloatYieldUsd: Math.round(lostFloatYield * 100) / 100,
    netArbitrageSavingsUsd: Math.round(netSavingsVsBaseline * 100) / 100
  };
}

/**
 * Validates and cascades schedule changes across the project's task dependency graph.
 * Detects cycles using Kahn's algorithm and throws if cyclic dependencies exist.
 */
export function cascadeTaskSchedule(
  tasks: ProjectTask[],
  dependencies: TaskDependency[],
  updatedTaskId: string,
  newStartDate: Date | string,
  newEndDate: Date | string
): ProjectTask[] {
  // 1. Build adjacency list & verify DAG (detect cycles)
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const t of tasks) {
    adj.set(t.id, []);
    inDegree.set(t.id, 0);
  }

  for (const d of dependencies) {
    if (!adj.has(d.fromTaskId) || !adj.has(d.toTaskId)) continue;
    adj.get(d.fromTaskId)!.push(d.toTaskId);
    inDegree.set(d.toTaskId, (inDegree.get(d.toTaskId) || 0) + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  let visitedCount = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visitedCount++;
    for (const neighbor of adj.get(node) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount < tasks.length) {
    throw new Error('Cycle detected in task dependencies');
  }

  // 2. Clone tasks and apply update to target task
  const taskMap = new Map<string, ProjectTask>();
  for (const t of tasks) {
    taskMap.set(t.id, { ...t });
  }

  const target = taskMap.get(updatedTaskId);
  if (!target) {
    throw new Error(`Task with id ${updatedTaskId} not found`);
  }

  const sDate = new Date(newStartDate);
  const eDate = new Date(newEndDate);
  const durationMs = eDate.getTime() - sDate.getTime();
  const durationDays = Math.max(1, Math.round(durationMs / 86_400_000));

  target.startDate = sDate.toISOString();
  target.endDate = eDate.toISOString();
  target.durationDays = durationDays;
  target.updatedAt = new Date().toISOString();

  // 3. Cascade downstream successors via Breadth-First-Search
  const cascadeQueue: string[] = [updatedTaskId];
  const processed = new Set<string>();

  while (cascadeQueue.length > 0) {
    const currentId = cascadeQueue.shift()!;
    processed.add(currentId);
    const pred = taskMap.get(currentId)!;
    const predEndTime = new Date(pred.endDate).getTime();

    // Find outgoing dependencies
    const outgoing = dependencies.filter(d => d.fromTaskId === currentId && d.dependencyType === 'FS');
    for (const dep of outgoing) {
      const succ = taskMap.get(dep.toTaskId);
      if (!succ) continue;

      const minAllowedStartTime = predEndTime + dep.lagDays * 86_400_000;
      const currentSuccStartTime = new Date(succ.startDate).getTime();

      if (currentSuccStartTime < minAllowedStartTime) {
        // Shift successor forward
        const succDurationMs = succ.durationDays * 86_400_000;
        const newSuccStart = new Date(minAllowedStartTime);
        const newSuccEnd = new Date(minAllowedStartTime + succDurationMs);

        succ.startDate = newSuccStart.toISOString();
        succ.endDate = newSuccEnd.toISOString();
        succ.updatedAt = new Date().toISOString();

        if (!processed.has(succ.id)) {
          cascadeQueue.push(succ.id);
        }
      }
    }
  }

  return Array.from(taskMap.values());
}

/**
 * Calculates aggregate project financial telemetry
 */
export function calculateProjectTelemetry(
  bomItems: BomItem[],
  offers: MerchantOffer[],
  settlements: PayPalSettlement[]
): ProjectTelemetry {
  let totalBaselineCostUsd = 0;
  let totalOptimizedNetCostUsd = 0;
  let totalArbitrageSavingsUsd = 0;
  let totalWorkingCapitalYieldUsd = 0;
  let totalCommissionRebatesUsd = 0;
  let totalFloatDays = 0;
  let settledCount = 0;
  let monitoringCount = 0;

  for (const item of bomItems) {
    const baseline = item.baselineUnitPriceUsd * item.quantity;
    totalBaselineCostUsd += baseline;

    if (item.status === 'SETTLED') {
      settledCount++;
    } else {
      monitoringCount++;
    }

    totalFloatDays += item.daysFloatSaved || 0;
    totalWorkingCapitalYieldUsd += item.capitalYieldSavedUsd || 0;

    // Find best offer
    const itemOffers = offers.filter(o => o.bomItemId === item.id);
    const best = itemOffers.find(o => o.isBestOffer) || itemOffers[0];

    if (best) {
      totalOptimizedNetCostUsd += best.netEffectiveTotalUsd;
      const savings = Math.max(0, baseline - best.netEffectiveTotalUsd);
      totalArbitrageSavingsUsd += savings;
      const rebate = (best.unitPriceUsd * item.quantity * best.commissionRatePct) / 100;
      totalCommissionRebatesUsd += rebate;
    } else {
      totalOptimizedNetCostUsd += baseline;
    }
  }

  // Add settled actuals from settlements if available
  for (const s of settlements) {
    if (s.commissionRebateUsd) {
      // already counted in projection or can be refined
    }
  }

  const averageFloatDaysSaved =
    bomItems.length > 0 ? Math.round((totalFloatDays / bomItems.length) * 10) / 10 : 0;

  return {
    totalBaselineCostUsd: Math.round(totalBaselineCostUsd * 100) / 100,
    totalOptimizedNetCostUsd: Math.round(totalOptimizedNetCostUsd * 100) / 100,
    totalArbitrageSavingsUsd: Math.round(totalArbitrageSavingsUsd * 100) / 100,
    totalWorkingCapitalYieldUsd: Math.round(totalWorkingCapitalYieldUsd * 100) / 100,
    totalCommissionRebatesUsd: Math.round(totalCommissionRebatesUsd * 100) / 100,
    averageFloatDaysSaved,
    settledCount,
    monitoringCount
  };
}
