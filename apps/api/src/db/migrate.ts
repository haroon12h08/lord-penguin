import { initDatabase, getDatabase, closeDatabase } from './index.js';
import { sql } from 'drizzle-orm';

export async function runMigrations(): Promise<void> {
  console.log('🚀 [Migration] Initializing database connection...');
  const { db, mode } = await initDatabase();
  console.log(`📦 [Migration] Running schema migration in ${mode} mode...`);

  // pgcrypto is optional because gen_random_uuid() is built-in on PostgreSQL 13+ and PGlite
  try {
    await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`));
  } catch {
    // pgcrypto extension is not needed when gen_random_uuid() is built-in
  }

  const ddlStatements = [
    `DO $$ BEGIN
      CREATE TYPE project_autonomy_mode AS ENUM ('FULL_AUTONOMOUS', 'APPROVAL_OVER_THRESHOLD', 'ADVISORY_ONLY');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE task_dependency_type AS ENUM ('FS', 'SS', 'FF', 'SF');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE bom_procurement_status AS ENUM (
        'MONITORING',
        'DISCOVERING_OFFERS',
        'VERIFYING_KERNEL',
        'OFFER_REJECTED',
        'BUDGET_HOLD',
        'SETTLING_PAYPAL',
        'SETTLED',
        'SETTLEMENT_FAILED',
        'REFUNDED'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE settlement_rail_type AS ENUM ('PAYPAL_ORDER', 'PAYPAL_INVOICE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE verification_status_type AS ENUM (
        'PASSED',
        'FAILED_OUT_OF_STOCK',
        'FAILED_PRICE_MISMATCH',
        'FAILED_DELIVERY_LATE'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
      CREATE TYPE audit_log_severity AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(180) NOT NULL,
      brief_text TEXT NOT NULL,
      destination_zip VARCHAR(20) NOT NULL DEFAULT '78701',
      budget_cap_usd NUMERIC(12, 2) NOT NULL,
      auto_spend_limit_usd NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
      autonomy_mode project_autonomy_mode NOT NULL DEFAULT 'FULL_AUTONOMOUS',
      cost_of_capital_apr NUMERIC(5, 4) NOT NULL DEFAULT 0.0850,
      safety_buffer_days INTEGER NOT NULL DEFAULT 1,
      virtual_now_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      project_start_date TIMESTAMPTZ NOT NULL,
      target_completion_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS project_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      external_code VARCHAR(32) NOT NULL,
      name VARCHAR(200) NOT NULL,
      phase_name VARCHAR(100) NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      duration_days INTEGER NOT NULL,
      percent_done INTEGER NOT NULL DEFAULT 0,
      is_critical_path BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id, sort_order);`,

    `CREATE TABLE IF NOT EXISTS task_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      from_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
      to_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
      dependency_type task_dependency_type NOT NULL DEFAULT 'FS',
      lag_days INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT uq_task_dependency UNIQUE (from_task_id, to_task_id)
    );`,

    `CREATE TABLE IF NOT EXISTS bom_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
      sku_code VARCHAR(64) NOT NULL,
      item_name VARCHAR(220) NOT NULL,
      category VARCHAR(80) NOT NULL,
      search_query VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      baseline_unit_price_usd NUMERIC(12, 2) NOT NULL,
      strike_unit_price_usd NUMERIC(12, 2) NOT NULL,
      max_budget_usd NUMERIC(12, 2) NOT NULL,
      selected_offer_id UUID,
      lrm_timestamp TIMESTAMPTZ NOT NULL,
      lead_time_days INTEGER NOT NULL DEFAULT 3,
      days_float_saved NUMERIC(8, 2) NOT NULL DEFAULT 0,
      capital_yield_saved_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
      price_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      settlement_rail settlement_rail_type NOT NULL DEFAULT 'PAYPAL_ORDER',
      status bom_procurement_status NOT NULL DEFAULT 'MONITORING',
      status_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_bom_items_project_status ON bom_items(project_id, status);`,
    `CREATE INDEX IF NOT EXISTS idx_bom_items_lrm ON bom_items(lrm_timestamp);`,

    `CREATE TABLE IF NOT EXISTS merchant_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
      channel3_product_id VARCHAR(120) NOT NULL,
      merchant_name VARCHAR(120) NOT NULL,
      merchant_domain VARCHAR(120) NOT NULL,
      unit_price_usd NUMERIC(12, 2) NOT NULL,
      shipping_price_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      commission_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      net_effective_total_usd NUMERIC(12, 2) NOT NULL,
      shipping_lead_days INTEGER NOT NULL DEFAULT 3,
      in_stock BOOLEAN NOT NULL DEFAULT TRUE,
      product_url TEXT NOT NULL,
      verification_url TEXT NOT NULL,
      is_best_offer BOOLEAN NOT NULL DEFAULT FALSE,
      last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_merchant_offers_bom_item ON merchant_offers(bom_item_id, net_effective_total_usd ASC);`,

    `CREATE TABLE IF NOT EXISTS browser_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
      offer_id UUID NOT NULL REFERENCES merchant_offers(id) ON DELETE CASCADE,
      kernel_session_id VARCHAR(128) NOT NULL,
      execution_mode VARCHAR(32) NOT NULL,
      browser_live_view_url TEXT,
      target_url TEXT NOT NULL,
      verified_price_usd NUMERIC(12, 2) NOT NULL,
      verified_in_stock BOOLEAN NOT NULL,
      verified_delivery_days INTEGER NOT NULL,
      destination_zip VARCHAR(20) NOT NULL,
      verification_status verification_status_type NOT NULL,
      dom_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      duration_ms INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS paypal_settlements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
      offer_id UUID NOT NULL REFERENCES merchant_offers(id) ON DELETE RESTRICT,
      verification_id UUID NOT NULL REFERENCES browser_verifications(id) ON DELETE RESTRICT,
      idempotency_key VARCHAR(128) NOT NULL UNIQUE,
      settlement_rail settlement_rail_type NOT NULL,
      paypal_environment VARCHAR(24) NOT NULL DEFAULT 'SANDBOX',
      paypal_order_id VARCHAR(128),
      paypal_invoice_id VARCHAR(128),
      paypal_capture_id VARCHAR(128),
      paypal_status VARCHAR(64) NOT NULL,
      gross_amount_usd NUMERIC(12, 2) NOT NULL,
      commission_rebate_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      net_settled_usd NUMERIC(12, 2) NOT NULL,
      savings_vs_baseline_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      approval_url TEXT,
      receipt_url TEXT,
      apimatic_validated BOOLEAN NOT NULL DEFAULT TRUE,
      agent_toolkit_tool_used VARCHAR(64) NOT NULL,
      raw_paypal_response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_bom_item ON paypal_settlements(bom_item_id);`,

    `CREATE TABLE IF NOT EXISTS agent_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      bom_item_id UUID REFERENCES bom_items(id) ON DELETE SET NULL,
      sponsor_service VARCHAR(40) NOT NULL,
      action_type VARCHAR(80) NOT NULL,
      summary TEXT NOT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      severity audit_log_severity NOT NULL DEFAULT 'INFO',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    `CREATE INDEX IF NOT EXISTS idx_agent_audit_logs_project_time ON agent_audit_logs(project_id, created_at DESC);`
  ];

  for (const statement of ddlStatements) {
    await db.execute(sql.raw(statement));
  }

  console.log('✅ [Migration] All 7 tables, enums, and indexes successfully applied.');
}

// Allow direct CLI invocation: tsx src/db/migrate.ts
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(async () => {
      console.log('🎉 [Migration] Migration completed successfully.');
      await closeDatabase();
      process.exit(0);
    })
    .catch(async err => {
      console.error('❌ [Migration] Migration failed:', err);
      await closeDatabase();
      process.exit(1);
    });
}
