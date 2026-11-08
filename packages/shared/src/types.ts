// Domain Enums matching PostgreSQL schema
export type ProjectAutonomyMode = 'FULL_AUTONOMOUS' | 'APPROVAL_OVER_THRESHOLD' | 'ADVISORY_ONLY';
export type TaskDependencyType = 'FS' | 'SS' | 'FF' | 'SF';
export type BomProcurementStatus =
  | 'MONITORING'
  | 'DISCOVERING_OFFERS'
  | 'VERIFYING_KERNEL'
  | 'OFFER_REJECTED'
  | 'BUDGET_HOLD'
  | 'SETTLING_PAYPAL'
  | 'SETTLED'
  | 'SETTLEMENT_FAILED'
  | 'REFUNDED';

export type SettlementRailType = 'PAYPAL_ORDER' | 'PAYPAL_INVOICE';
export type VerificationStatusType = 'PASSED' | 'FAILED_OUT_OF_STOCK' | 'FAILED_PRICE_MISMATCH' | 'FAILED_DELIVERY_LATE';
export type AuditLogSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

// Domain Interfaces
export interface Project {
  id: string;
  name: string;
  briefText: string;
  destinationZip: string;
  budgetCapUsd: number;
  autoSpendLimitUsd: number;
  autonomyMode: ProjectAutonomyMode;
  costOfCapitalApr: number;
  safetyBufferDays: number;
  virtualNowTimestamp: string;
  projectStartDate: string;
  targetCompletionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  externalCode: string;
  name: string;
  phaseName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  percentDone: number;
  isCriticalPath: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  projectId: string;
  fromTaskId: string;
  toTaskId: string;
  dependencyType: TaskDependencyType;
  lagDays: number;
}

export interface BomItem {
  id: string;
  projectId: string;
  taskId: string;
  skuCode: string;
  itemName: string;
  category: string;
  searchQuery: string;
  quantity: number;
  baselineUnitPriceUsd: number;
  strikeUnitPriceUsd: number;
  maxBudgetUsd: number;
  selectedOfferId: string | null;
  lrmTimestamp: string;
  leadTimeDays: number;
  daysFloatSaved: number;
  capitalYieldSavedUsd: number;
  priceHistoryJson: number[];
  settlementRail: SettlementRailType;
  status: BomProcurementStatus;
  statusReason?: string | null;
  createdAt: string;
  updatedAt: string;
  offers?: MerchantOffer[];
  latestVerification?: BrowserVerification | null;
  settlement?: PayPalSettlement | null;
}

export interface MerchantOffer {
  id: string;
  bomItemId: string;
  channel3ProductId: string;
  merchantName: string;
  merchantDomain: string;
  unitPriceUsd: number;
  shippingPriceUsd: number;
  commissionRatePct: number;
  netEffectiveTotalUsd: number;
  shippingLeadDays: number;
  inStock: boolean;
  productUrl: string;
  verificationUrl: string;
  isBestOffer: boolean;
  lastCheckedAt: string;
}

export interface BrowserVerification {
  id: string;
  bomItemId: string;
  offerId: string;
  kernelSessionId: string;
  executionMode: 'KERNEL_CLOUD' | 'PLAYWRIGHT_SANDBOX';
  browserLiveViewUrl: string | null;
  targetUrl: string;
  verifiedPriceUsd: number;
  verifiedInStock: boolean;
  verifiedDeliveryDays: number;
  destinationZip: string;
  verificationStatus: VerificationStatusType;
  domSnapshotJson: Record<string, unknown>;
  durationMs: number;
  createdAt: string;
}

export interface PayPalSettlement {
  id: string;
  projectId: string;
  bomItemId: string;
  offerId: string;
  verificationId: string;
  idempotencyKey: string;
  settlementRail: SettlementRailType;
  paypalEnvironment: 'SANDBOX' | 'LIVE';
  paypalOrderId: string | null;
  paypalInvoiceId: string | null;
  paypalCaptureId: string | null;
  paypalStatus: string;
  grossAmountUsd: number;
  commissionRebateUsd: number;
  netSettledUsd: number;
  savingsVsBaselineUsd: number;
  approvalUrl: string | null;
  receiptUrl: string | null;
  apimaticValidated: boolean;
  agentToolkitToolUsed: string;
  rawPaypalResponseJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAuditLog {
  id: string;
  projectId: string;
  bomItemId: string | null;
  sponsorService: 'PAYPAL' | 'APIMATIC' | 'CHANNEL3' | 'KERNEL' | 'BRYNTUM' | 'AG_GRID' | 'LRM_ENGINE';
  actionType: string;
  summary: string;
  metadataJson: Record<string, unknown>;
  severity: AuditLogSeverity;
  createdAt: string;
}

export interface ProjectTelemetry {
  totalBaselineCostUsd: number;
  totalOptimizedNetCostUsd: number;
  totalArbitrageSavingsUsd: number;
  totalWorkingCapitalYieldUsd: number;
  totalCommissionRebatesUsd: number;
  averageFloatDaysSaved: number;
  settledCount: number;
  monitoringCount: number;
}

export interface ProjectAggregate {
  project: Project;
  telemetry: ProjectTelemetry;
  tasks: ProjectTask[];
  dependencies: TaskDependency[];
  bomItems: BomItem[];
  auditLogs: AgentAuditLog[];
}

// Server-Sent Events (SSE) Messages
export type SSEEventType =
  | 'TASK_SHIFTED'
  | 'BOM_STATUS_CHANGED'
  | 'OFFERS_RANKED'
  | 'KERNEL_BROWSER_STARTED'
  | 'KERNEL_BROWSER_VERIFIED'
  | 'PAYPAL_SETTLEMENT_CREATED'
  | 'PAYPAL_SETTLEMENT_COMPLETED'
  | 'AUDIT_LOG_ADDED'
  | 'PROJECT_TELEMETRY_UPDATED'
  | 'SIMULATION_CLOCK_SHIFTED';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  projectId: string;
  timestamp: string;
  data: T;
}
