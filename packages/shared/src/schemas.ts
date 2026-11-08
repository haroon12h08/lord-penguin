import { z } from 'zod';

export const ProjectAutonomyModeSchema = z.enum([
  'FULL_AUTONOMOUS',
  'APPROVAL_OVER_THRESHOLD',
  'ADVISORY_ONLY'
]);

export const TaskDependencyTypeSchema = z.enum(['FS', 'SS', 'FF', 'SF']);

export const BomProcurementStatusSchema = z.enum([
  'MONITORING',
  'DISCOVERING_OFFERS',
  'VERIFYING_KERNEL',
  'OFFER_REJECTED',
  'BUDGET_HOLD',
  'SETTLING_PAYPAL',
  'SETTLED',
  'SETTLEMENT_FAILED',
  'REFUNDED'
]);

export const SettlementRailTypeSchema = z.enum(['PAYPAL_ORDER', 'PAYPAL_INVOICE']);
export const VerificationStatusTypeSchema = z.enum([
  'PASSED',
  'FAILED_OUT_OF_STOCK',
  'FAILED_PRICE_MISMATCH',
  'FAILED_DELIVERY_LATE'
]);

export const CreateProjectBriefSchema = z.object({
  name: z.string().min(3).max(180),
  briefText: z.string().min(10),
  budgetCapUsd: z.number().positive(),
  destinationZip: z.string().min(3).max(20).default('78701'),
  autonomyMode: ProjectAutonomyModeSchema.default('FULL_AUTONOMOUS'),
  targetCompletionDate: z.string().datetime()
});

export const RescheduleTaskSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

export const ProcureBomItemSchema = z.object({
  triggerReason: z.string().min(2),
  settlementRailOverride: SettlementRailTypeSchema.optional()
});

export const SimulateMarketShockSchema = z.object({
  action: z.enum(['FLASH_PRICE_DROP', 'ADVANCE_CLOCK_24H', 'RESET_DEMO']),
  bomItemId: z.string().uuid().optional(),
  discountPct: z.number().min(1).max(90).optional(),
  hoursForward: z.number().positive().optional()
});

export const DecomposedProjectSchema = z.object({
  projectName: z.string(),
  projectStartDate: z.string(),
  targetCompletionDate: z.string(),
  tasks: z.array(
    z.object({
      externalCode: z.string(),
      name: z.string(),
      phaseName: z.string(),
      durationDays: z.number().int().positive(),
      dependsOnExternalCode: z.string().optional(),
      bomItem: z.object({
        skuCode: z.string(),
        itemName: z.string(),
        category: z.string(),
        searchQuery: z.string(),
        quantity: z.number().int().positive(),
        estimatedUnitPriceUsd: z.number().positive(),
        estimatedLeadTimeDays: z.number().int().positive()
      })
    })
  )
});

export type CreateProjectBriefInput = z.infer<typeof CreateProjectBriefSchema>;
export type RescheduleTaskInput = z.infer<typeof RescheduleTaskSchema>;
export type ProcureBomItemInput = z.infer<typeof ProcureBomItemSchema>;
export type SimulateMarketShockInput = z.infer<typeof SimulateMarketShockSchema>;
export type DecomposedProjectOutput = z.infer<typeof DecomposedProjectSchema>;
