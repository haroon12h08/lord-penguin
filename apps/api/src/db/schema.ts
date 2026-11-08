import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Database Enums
export const projectAutonomyModeEnum = pgEnum('project_autonomy_mode', [
  'FULL_AUTONOMOUS',
  'APPROVAL_OVER_THRESHOLD',
  'ADVISORY_ONLY'
]);

export const taskDependencyTypeEnum = pgEnum('task_dependency_type', [
  'FS',
  'SS',
  'FF',
  'SF'
]);

export const bomProcurementStatusEnum = pgEnum('bom_procurement_status', [
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

export const settlementRailTypeEnum = pgEnum('settlement_rail_type', [
  'PAYPAL_ORDER',
  'PAYPAL_INVOICE'
]);

export const verificationStatusTypeEnum = pgEnum('verification_status_type', [
  'PASSED',
  'FAILED_OUT_OF_STOCK',
  'FAILED_PRICE_MISMATCH',
  'FAILED_DELIVERY_LATE'
]);

export const auditLogSeverityEnum = pgEnum('audit_log_severity', [
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR'
]);

// 2. Projects Table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  briefText: text('brief_text').notNull(),
  destinationZip: varchar('destination_zip', { length: 20 }).notNull().default('78701'),
  budgetCapUsd: numeric('budget_cap_usd', { precision: 12, scale: 2 }).notNull(),
  autoSpendLimitUsd: numeric('auto_spend_limit_usd', { precision: 12, scale: 2 }).notNull().default('5000.00'),
  autonomyMode: projectAutonomyModeEnum('autonomy_mode').notNull().default('FULL_AUTONOMOUS'),
  costOfCapitalApr: numeric('cost_of_capital_apr', { precision: 5, scale: 4 }).notNull().default('0.0850'),
  safetyBufferDays: integer('safety_buffer_days').notNull().default(1),
  virtualNowTimestamp: timestamp('virtual_now_timestamp', { withTimezone: true }).notNull().defaultNow(),
  projectStartDate: timestamp('project_start_date', { withTimezone: true }).notNull(),
  targetCompletionDate: timestamp('target_completion_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// 3. Project Tasks Table (Synchronized with Bryntum Gantt)
export const projectTasks = pgTable(
  'project_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    externalCode: varchar('external_code', { length: 32 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    phaseName: varchar('phase_name', { length: 100 }).notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    durationDays: integer('duration_days').notNull(),
    percentDone: integer('percent_done').notNull().default(0),
    isCriticalPath: boolean('is_critical_path').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('idx_project_tasks_project_id').on(table.projectId, table.sortOrder)
  ]
);

// 4. Task Dependencies Table
export const taskDependencies = pgTable(
  'task_dependencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fromTaskId: uuid('from_task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    toTaskId: uuid('to_task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    dependencyType: taskDependencyTypeEnum('dependency_type').notNull().default('FS'),
    lagDays: integer('lag_days').notNull().default(0)
  },
  table => [
    uniqueIndex('uq_task_dependency').on(table.fromTaskId, table.toTaskId)
  ]
);

// 5. BOM Items Table (Synchronized with AG Grid)
export const bomItems = pgTable(
  'bom_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => projectTasks.id, { onDelete: 'cascade' }),
    skuCode: varchar('sku_code', { length: 64 }).notNull(),
    itemName: varchar('item_name', { length: 220 }).notNull(),
    category: varchar('category', { length: 80 }).notNull(),
    searchQuery: varchar('search_query', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    baselineUnitPriceUsd: numeric('baseline_unit_price_usd', { precision: 12, scale: 2 }).notNull(),
    strikeUnitPriceUsd: numeric('strike_unit_price_usd', { precision: 12, scale: 2 }).notNull(),
    maxBudgetUsd: numeric('max_budget_usd', { precision: 12, scale: 2 }).notNull(),
    selectedOfferId: uuid('selected_offer_id'),
    lrmTimestamp: timestamp('lrm_timestamp', { withTimezone: true }).notNull(),
    leadTimeDays: integer('lead_time_days').notNull().default(3),
    daysFloatSaved: numeric('days_float_saved', { precision: 8, scale: 2 }).notNull().default('0'),
    capitalYieldSavedUsd: numeric('capital_yield_saved_usd', { precision: 12, scale: 2 }).notNull().default('0'),
    priceHistoryJson: jsonb('price_history_json').notNull().default('[]'),
    settlementRail: settlementRailTypeEnum('settlement_rail').notNull().default('PAYPAL_ORDER'),
    status: bomProcurementStatusEnum('status').notNull().default('MONITORING'),
    statusReason: text('status_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('idx_bom_items_project_status').on(table.projectId, table.status),
    index('idx_bom_items_lrm').on(table.lrmTimestamp)
  ]
);

// 6. Merchant Offers Table (Channel3 Product Graph)
export const merchantOffers = pgTable(
  'merchant_offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bomItemId: uuid('bom_item_id')
      .notNull()
      .references(() => bomItems.id, { onDelete: 'cascade' }),
    channel3ProductId: varchar('channel3_product_id', { length: 120 }).notNull(),
    merchantName: varchar('merchant_name', { length: 120 }).notNull(),
    merchantDomain: varchar('merchant_domain', { length: 120 }).notNull(),
    unitPriceUsd: numeric('unit_price_usd', { precision: 12, scale: 2 }).notNull(),
    shippingPriceUsd: numeric('shipping_price_usd', { precision: 12, scale: 2 }).notNull().default('0.00'),
    commissionRatePct: numeric('commission_rate_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    netEffectiveTotalUsd: numeric('net_effective_total_usd', { precision: 12, scale: 2 }).notNull(),
    shippingLeadDays: integer('shipping_lead_days').notNull().default(3),
    inStock: boolean('in_stock').notNull().default(true),
    productUrl: text('product_url').notNull(),
    verificationUrl: text('verification_url').notNull(),
    isBestOffer: boolean('is_best_offer').notNull().default(false),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('idx_merchant_offers_bom_item').on(table.bomItemId, table.netEffectiveTotalUsd)
  ]
);

// 7. Browser Verifications Table (KERNEL Cloud Browser / Playwright)
export const browserVerifications = pgTable('browser_verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  bomItemId: uuid('bom_item_id')
    .notNull()
    .references(() => bomItems.id, { onDelete: 'cascade' }),
  offerId: uuid('offer_id')
    .notNull()
    .references(() => merchantOffers.id, { onDelete: 'cascade' }),
  kernelSessionId: varchar('kernel_session_id', { length: 128 }).notNull(),
  executionMode: varchar('execution_mode', { length: 32 }).notNull(),
  browserLiveViewUrl: text('browser_live_view_url'),
  targetUrl: text('target_url').notNull(),
  verifiedPriceUsd: numeric('verified_price_usd', { precision: 12, scale: 2 }).notNull(),
  verifiedInStock: boolean('verified_in_stock').notNull(),
  verifiedDeliveryDays: integer('verified_delivery_days').notNull(),
  destinationZip: varchar('destination_zip', { length: 20 }).notNull(),
  verificationStatus: verificationStatusTypeEnum('verification_status').notNull(),
  domSnapshotJson: jsonb('dom_snapshot_json').notNull().default('{}'),
  durationMs: integer('duration_ms').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// 8. PayPal Settlements Table (APIMatic & PayPal Agent Toolkit)
export const paypalSettlements = pgTable(
  'paypal_settlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    bomItemId: uuid('bom_item_id')
      .notNull()
      .references(() => bomItems.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => merchantOffers.id, { onDelete: 'restrict' }),
    verificationId: uuid('verification_id')
      .notNull()
      .references(() => browserVerifications.id, { onDelete: 'restrict' }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
    settlementRail: settlementRailTypeEnum('settlement_rail').notNull(),
    paypalEnvironment: varchar('paypal_environment', { length: 24 }).notNull().default('SANDBOX'),
    paypalOrderId: varchar('paypal_order_id', { length: 128 }),
    paypalInvoiceId: varchar('paypal_invoice_id', { length: 128 }),
    paypalCaptureId: varchar('paypal_capture_id', { length: 128 }),
    paypalStatus: varchar('paypal_status', { length: 64 }).notNull(),
    grossAmountUsd: numeric('gross_amount_usd', { precision: 12, scale: 2 }).notNull(),
    commissionRebateUsd: numeric('commission_rebate_usd', { precision: 12, scale: 2 }).notNull().default('0.00'),
    netSettledUsd: numeric('net_settled_usd', { precision: 12, scale: 2 }).notNull(),
    savingsVsBaselineUsd: numeric('savings_vs_baseline_usd', { precision: 12, scale: 2 }).notNull().default('0.00'),
    approvalUrl: text('approval_url'),
    receiptUrl: text('receipt_url'),
    apimaticValidated: boolean('apimatic_validated').notNull().default(true),
    agentToolkitToolUsed: varchar('agent_toolkit_tool_used', { length: 64 }).notNull(),
    rawPaypalResponseJson: jsonb('raw_paypal_response_json').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    uniqueIndex('uq_active_settlement_per_bom_item')
      .on(table.bomItemId)
  ]
);

// 9. Agent Audit Logs Table (Live Drawer Stream)
export const agentAuditLogs = pgTable(
  'agent_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    bomItemId: uuid('bom_item_id').references(() => bomItems.id, { onDelete: 'set null' }),
    sponsorService: varchar('sponsor_service', { length: 40 }).notNull(),
    actionType: varchar('action_type', { length: 80 }).notNull(),
    summary: text('summary').notNull(),
    metadataJson: jsonb('metadata_json').notNull().default('{}'),
    severity: auditLogSeverityEnum('severity').notNull().default('INFO'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    index('idx_agent_audit_logs_project_time').on(table.projectId, table.createdAt)
  ]
);

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(projectTasks),
  dependencies: many(taskDependencies),
  bomItems: many(bomItems),
  settlements: many(paypalSettlements),
  auditLogs: many(agentAuditLogs)
}));

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id]
  }),
  bomItems: many(bomItems),
  outgoingDependencies: many(taskDependencies, { relationName: 'fromTask' }),
  incomingDependencies: many(taskDependencies, { relationName: 'toTask' })
}));

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  project: one(projects, {
    fields: [taskDependencies.projectId],
    references: [projects.id]
  }),
  fromTask: one(projectTasks, {
    fields: [taskDependencies.fromTaskId],
    references: [projectTasks.id],
    relationName: 'fromTask'
  }),
  toTask: one(projectTasks, {
    fields: [taskDependencies.toTaskId],
    references: [projectTasks.id],
    relationName: 'toTask'
  })
}));

export const bomItemsRelations = relations(bomItems, ({ one, many }) => ({
  project: one(projects, {
    fields: [bomItems.projectId],
    references: [projects.id]
  }),
  task: one(projectTasks, {
    fields: [bomItems.taskId],
    references: [projectTasks.id]
  }),
  offers: many(merchantOffers),
  verifications: many(browserVerifications),
  settlement: one(paypalSettlements, {
    fields: [bomItems.id],
    references: [paypalSettlements.bomItemId]
  })
}));

export const merchantOffersRelations = relations(merchantOffers, ({ one }) => ({
  bomItem: one(bomItems, {
    fields: [merchantOffers.bomItemId],
    references: [bomItems.id]
  })
}));

export const browserVerificationsRelations = relations(browserVerifications, ({ one }) => ({
  bomItem: one(bomItems, {
    fields: [browserVerifications.bomItemId],
    references: [bomItems.id]
  }),
  offer: one(merchantOffers, {
    fields: [browserVerifications.offerId],
    references: [merchantOffers.id]
  })
}));

export const paypalSettlementsRelations = relations(paypalSettlements, ({ one }) => ({
  project: one(projects, {
    fields: [paypalSettlements.projectId],
    references: [projects.id]
  }),
  bomItem: one(bomItems, {
    fields: [paypalSettlements.bomItemId],
    references: [bomItems.id]
  }),
  offer: one(merchantOffers, {
    fields: [paypalSettlements.offerId],
    references: [merchantOffers.id]
  }),
  verification: one(browserVerifications, {
    fields: [paypalSettlements.verificationId],
    references: [browserVerifications.id]
  })
}));

export const agentAuditLogsRelations = relations(agentAuditLogs, ({ one }) => ({
  project: one(projects, {
    fields: [agentAuditLogs.projectId],
    references: [projects.id]
  }),
  bomItem: one(bomItems, {
    fields: [agentAuditLogs.bomItemId],
    references: [bomItems.id]
  })
}));
