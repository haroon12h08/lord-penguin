import { describe, it, expect } from 'vitest';
import {
  calculateLrmTimestamp,
  calculateNetOfferPrice,
  evaluateEarlyStrike,
  cascadeTaskSchedule,
  calculateProjectTelemetry
} from '../lrm-calculator.js';
import { BomItem, MerchantOffer, ProjectTask, TaskDependency } from '../types.js';

describe('Shared LRM Math Engine (UT-01 to UT-04)', () => {
  describe('UT-01: LRM Date Calculation', () => {
    it('calculates exact T_LRM given task start date, lead time days, and safety buffer', () => {
      // 2026-11-15T00:00:00.000Z - (3 lead days + 1 buffer day) = 2026-11-11T00:00:00.000Z
      const taskStart = '2026-11-15T00:00:00.000Z';
      const lrm = calculateLrmTimestamp(taskStart, 3, 1);
      expect(lrm.toISOString()).toBe('2026-11-11T00:00:00.000Z');
    });

    it('correctly spans month boundaries', () => {
      // 2026-11-02T00:00:00.000Z - 4 days = 2026-10-29T00:00:00.000Z
      const taskStart = '2026-11-02T00:00:00.000Z';
      const lrm = calculateLrmTimestamp(taskStart, 3, 1);
      expect(lrm.toISOString()).toBe('2026-10-29T00:00:00.000Z');
    });

    it('correctly handles zero safety buffer', () => {
      const taskStart = '2026-11-10T12:00:00.000Z';
      const lrm = calculateLrmTimestamp(taskStart, 2, 0);
      expect(lrm.toISOString()).toBe('2026-11-08T12:00:00.000Z');
    });
  });

  describe('UT-02: Net Offer Pricing & Arbitrage Landed Cost', () => {
    it('computes accurate landed cost with unit price, quantity, shipping, and commission rebate', () => {
      // 4 microphones @ $425 each = $1,700 gross. Free shipping ($0). 4.0% rebate = $68. Net = $1,632.00
      const net = calculateNetOfferPrice(425.0, 4, 0.0, 4.0);
      expect(net).toBe(1632.0);
    });

    it('factors in positive shipping cost and 2.5% affiliate rebate', () => {
      // 1 item @ $1000 + $50 shipping = $1050. 2.5% rebate = $26.25. Net = $1023.75
      const net = calculateNetOfferPrice(1000.0, 1, 50.0, 2.5);
      expect(net).toBe(1023.75);
    });
  });

  describe('UT-03: Early Strike Decision Function', () => {
    it('executes an immediate strike when price drops significantly below strike price, outweighing lost float yield', () => {
      // Baseline $2,000, Strike $1,800, Live Flash Price $1,600.
      // Float days = 14 days. Daily cost of capital = 8.5% / 365 = 0.0002328
      // Float yield cost = $1,600 * 0.0002328 * 14 = ~$5.21
      // Price savings vs strike = $1,800 - $1,600 = $200. $200 > $5.21 -> SHOULD STRIKE
      const result = evaluateEarlyStrike({
        baselinePrice: 2000,
        strikePrice: 1800,
        currentBestPrice: 1600,
        lrmTimestamp: '2026-11-21T00:00:00.000Z',
        nowTimestamp: '2026-11-07T00:00:00.000Z',
        annualCostOfCapital: 0.085
      });

      expect(result.shouldStrike).toBe(true);
      expect(result.netArbitrageSavingsUsd).toBe(400);
      expect(result.lostFloatYieldUsd).toBeLessThan(10);
    });

    it('refuses early strike when price is above strike target, even if below baseline', () => {
      const result = evaluateEarlyStrike({
        baselinePrice: 2000,
        strikePrice: 1700,
        currentBestPrice: 1850,
        lrmTimestamp: '2026-11-21T00:00:00.000Z',
        nowTimestamp: '2026-11-07T00:00:00.000Z'
      });

      expect(result.shouldStrike).toBe(false);
      expect(result.reason).toContain('Hold cash in treasury');
    });

    it('forces strike when LRM timestamp has arrived or passed (float days <= 0)', () => {
      const result = evaluateEarlyStrike({
        baselinePrice: 2000,
        strikePrice: 1700,
        currentBestPrice: 1900,
        lrmTimestamp: '2026-11-07T00:00:00.000Z',
        nowTimestamp: '2026-11-07T00:00:00.000Z'
      });

      expect(result.shouldStrike).toBe(true);
      expect(result.floatDaysRemaining).toBe(0);
      expect(result.reason).toContain('LRM window reached');
    });
  });

  describe('UT-04: DAG Schedule Cascading & Cycle Detection', () => {
    const tasks: ProjectTask[] = [
      {
        id: 'task-1',
        projectId: 'proj-1',
        externalCode: 'PHASE-1.1',
        name: 'Acoustics',
        phaseName: 'Phase 1',
        startDate: '2026-11-09T00:00:00.000Z',
        endDate: '2026-11-12T00:00:00.000Z',
        durationDays: 3,
        percentDone: 0,
        isCriticalPath: true,
        sortOrder: 1,
        createdAt: '2026-11-07T00:00:00.000Z',
        updatedAt: '2026-11-07T00:00:00.000Z'
      },
      {
        id: 'task-2',
        projectId: 'proj-1',
        externalCode: 'PHASE-1.2',
        name: 'Desks',
        phaseName: 'Phase 1',
        startDate: '2026-11-12T00:00:00.000Z',
        endDate: '2026-11-15T00:00:00.000Z',
        durationDays: 3,
        percentDone: 0,
        isCriticalPath: true,
        sortOrder: 2,
        createdAt: '2026-11-07T00:00:00.000Z',
        updatedAt: '2026-11-07T00:00:00.000Z'
      }
    ];

    const dependencies: TaskDependency[] = [
      {
        id: 'dep-1',
        projectId: 'proj-1',
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        dependencyType: 'FS',
        lagDays: 0
      }
    ];

    it('cascades downstream successor task when predecessor is pushed later', () => {
      // Push task-1 to end on Nov 16 instead of Nov 12
      const updated = cascadeTaskSchedule(
        tasks,
        dependencies,
        'task-1',
        '2026-11-13T00:00:00.000Z',
        '2026-11-16T00:00:00.000Z'
      );

      const t1 = updated.find(t => t.id === 'task-1')!;
      const t2 = updated.find(t => t.id === 'task-2')!;

      expect(t1.startDate).toBe('2026-11-13T00:00:00.000Z');
      expect(t1.endDate).toBe('2026-11-16T00:00:00.000Z');

      // task-2 was forced forward to start on Nov 16 and end on Nov 19 (duration 3d preserved)
      expect(t2.startDate).toBe('2026-11-16T00:00:00.000Z');
      expect(t2.endDate).toBe('2026-11-19T00:00:00.000Z');
    });

    it('detects and throws on circular task dependencies', () => {
      const circularDeps: TaskDependency[] = [
        ...dependencies,
        {
          id: 'dep-cycle',
          projectId: 'proj-1',
          fromTaskId: 'task-2',
          toTaskId: 'task-1',
          dependencyType: 'FS',
          lagDays: 0
        }
      ];

      expect(() => {
        cascadeTaskSchedule(
          tasks,
          circularDeps,
          'task-1',
          '2026-11-10T00:00:00.000Z',
          '2026-11-13T00:00:00.000Z'
        );
      }).toThrow('Cycle detected in task dependencies');
    });
  });

  describe('Project Telemetry Aggregator', () => {
    it('correctly aggregates baseline, net, savings, and float days', () => {
      const mockBom: BomItem[] = [
        {
          id: 'b1',
          projectId: 'p1',
          taskId: 't1',
          skuCode: 'SKU1',
          itemName: 'Item 1',
          category: 'Cat',
          searchQuery: 'Item 1',
          quantity: 2,
          baselineUnitPriceUsd: 100,
          strikeUnitPriceUsd: 90,
          maxBudgetUsd: 250,
          selectedOfferId: 'o1',
          lrmTimestamp: '2026-11-10T00:00:00.000Z',
          leadTimeDays: 2,
          daysFloatSaved: 10,
          capitalYieldSavedUsd: 5.5,
          priceHistoryJson: [100, 95, 90],
          settlementRail: 'PAYPAL_ORDER',
          status: 'MONITORING',
          createdAt: '',
          updatedAt: ''
        }
      ];

      const mockOffers: MerchantOffer[] = [
        {
          id: 'o1',
          bomItemId: 'b1',
          channel3ProductId: 'c1',
          merchantName: 'Sweetwater',
          merchantDomain: 'sweetwater.com',
          unitPriceUsd: 85,
          shippingPriceUsd: 0,
          commissionRatePct: 4,
          netEffectiveTotalUsd: 163.2,
          shippingLeadDays: 2,
          inStock: true,
          productUrl: '',
          verificationUrl: '',
          isBestOffer: true,
          lastCheckedAt: ''
        }
      ];

      const telemetry = calculateProjectTelemetry(mockBom, mockOffers, []);

      expect(telemetry.totalBaselineCostUsd).toBe(200);
      expect(telemetry.totalOptimizedNetCostUsd).toBe(163.2);
      expect(telemetry.totalArbitrageSavingsUsd).toBe(36.8);
      expect(telemetry.averageFloatDaysSaved).toBe(10);
      expect(telemetry.monitoringCount).toBe(1);
      expect(telemetry.settledCount).toBe(0);
    });
  });
});
