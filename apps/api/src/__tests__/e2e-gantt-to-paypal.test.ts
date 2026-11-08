import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../index.js';
import { initDatabase, closeDatabase, getDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { seedDatabase } from '../db/seed.js';
import { bomItems, paypalSettlements, browserVerifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sseBroadcaster } from '../services/sse-broadcaster.service.js';

describe('Phase 3 End-to-End Workflow: Bryntum Gantt Drag to PayPal Settlement (E2E-01)', () => {
  let app: FastifyInstance;
  const projectId = '11111111-2222-3333-4444-555555555555';

  beforeAll(async () => {
    await initDatabase();
    await runMigrations();
    await seedDatabase();

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    sseBroadcaster.destroy();
    await app.close();
    await closeDatabase();
  });

  it('Health Check: responds 200 OK with sponsor integration metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.integrations.database).toBe('connected');
    expect(body.integrations.apimatic.configured).toBe(true);
    expect(body.integrations.paypalSandbox).toBeDefined();
    expect(body.integrations.channel3).toBeDefined();
    expect(body.integrations.kernel).toBeDefined();
  });

  it('Project Aggregate: returns full state with tasks, BOM items, telemetry, and offers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}`
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.project.id).toBe(projectId);
    expect(body.tasks.length).toBe(8);
    expect(body.bomItems.length).toBe(8);
    expect(body.telemetry.totalBaselineCostUsd).toBeGreaterThan(10000);
    expect(body.telemetry.settledCount).toBe(2); // Initial 2 pre-settled items
  });

  it('E2E-01: Dragging Task 2.1 earlier crosses LRM window and triggers autonomous Kernel verify & PayPal settlement', async () => {
    // 1. Target Task 2.1 (Shure SM7dB Quad Pack - Task ID 20000000-0000-0000-0000-000000000003)
    // Initial start date: Nov 15. Initial LRM: Nov 11.
    // Virtual Now: Nov 07.
    // Drag Task 2.1 earlier so start date is Nov 10 -> LRM becomes Nov 07 (<= Nov 07 06:30, LRM CROSSED!)
    // Delivery lead time (2 days) arrives Nov 09 <= Nov 10, passing delivery deadline check!
    const taskId = '20000000-0000-0000-0000-000000000003';
    const newStartDate = '2026-11-10T00:00:00.000Z';
    const newEndDate = '2026-11-13T00:00:00.000Z';

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/tasks/${taskId}`,
      payload: {
        startDate: newStartDate,
        endDate: newEndDate
      }
    });

    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.body);

    // Verify task updated
    const updatedTask = patchBody.updatedTasks.find((t: any) => t.id === taskId);
    expect(updatedTask.startDate).toBe(newStartDate);

    // Verify autonomous procurement was triggered
    expect(patchBody.triggeredProcurements.length).toBeGreaterThanOrEqual(1);
    const triggered = patchBody.triggeredProcurements[0];
    expect(triggered.reason).toBe('LRM_WINDOW_ENTERED');
    expect(triggered.result.status).toBe('SETTLED');
    expect(triggered.result.settlement.paypalOrderId).toBeDefined();

    // Verify database state: BOM item is now SETTLED with verification and settlement records
    const db = getDatabase();
    const bomRows = await db
      .select()
      .from(bomItems)
      .where(eq(bomItems.id, '30000000-0000-0000-0000-000000000003'));

    expect(bomRows[0].status).toBe('SETTLED');
    expect(bomRows[0].statusReason).toContain('APIMatic OrdersController');

    const settlements = await db
      .select()
      .from(paypalSettlements)
      .where(eq(paypalSettlements.bomItemId, '30000000-0000-0000-0000-000000000003'));

    expect(settlements.length).toBe(1);
    expect(settlements[0].paypalStatus).toBe('COMPLETED');
    expect(settlements[0].apimaticValidated).toBe(true);

    const verifications = await db
      .select()
      .from(browserVerifications)
      .where(eq(browserVerifications.bomItemId, '30000000-0000-0000-0000-000000000003'));

    expect(verifications.length).toBeGreaterThanOrEqual(1);
    expect(verifications[0].verificationStatus).toBe('PASSED');
  });

  it('Demo Accelerator: Flash Price Shock triggers early strike and settles item', async () => {
    // Target Item 4: RØDECaster Pro II
    const targetBomId = '30000000-0000-0000-0000-000000000004';

    const shockRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/simulate/market-shock`,
      payload: {
        action: 'FLASH_PRICE_DROP',
        bomItemId: targetBomId,
        discountPct: 20
      }
    });

    expect(shockRes.statusCode).toBe(200);
    const shockBody = JSON.parse(shockRes.body);
    expect(shockBody.action).toBe('FLASH_PRICE_DROP');
    expect(shockBody.procurement.status).toBe('SETTLED');
    expect(shockBody.procurement.settlement.paypalOrderId).toBeDefined();

    // Verify DB updated
    const db = getDatabase();
    const rows = await db.select().from(bomItems).where(eq(bomItems.id, targetBomId));
    expect(rows[0].status).toBe('SETTLED');
  });

  it('AI Brief Ingestion: creates a new project with tasks, dependencies, and Channel3 offers', async () => {
    const briefRes = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/from-brief',
      payload: {
        name: 'Seattle Hardware Prototyping Lab',
        briefText: 'Build an 8-bench hardware prototyping lab with ESD benches, oscilloscopes, and 3D printer in 98101 by Nov 29 under $11,000.',
        budgetCapUsd: 11000,
        destinationZip: '98101',
        targetCompletionDate: '2026-11-29T00:00:00.000Z'
      }
    });

    expect(briefRes.statusCode).toBe(201);
    const createdProject = JSON.parse(briefRes.body);
    expect(createdProject.project.name).toBe('Seattle Hardware Prototyping Lab');
    expect(createdProject.tasks.length).toBeGreaterThanOrEqual(6);
    expect(createdProject.bomItems.length).toBeGreaterThanOrEqual(6);
    expect(createdProject.bomItems[0].offers.length).toBeGreaterThanOrEqual(3);
  });
});
