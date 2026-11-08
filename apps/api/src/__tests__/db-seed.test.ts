import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { seedDatabase } from '../db/seed.js';
import { projects, projectTasks, bomItems, merchantOffers } from '../db/schema.js';

describe('Phase 1 Database Layer & Seed Verification', () => {
  beforeAll(async () => {
    await runMigrations();
    await seedDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('correctly seeds the Austin 10-Seat Studio build project', async () => {
    const db = getDatabase();
    const projs = await db.select().from(projects);
    expect(projs.length).toBe(1);
    expect(projs[0].name).toBe('Austin 10-Seat AI Broadcast & Podcast Studio Build');
    expect(projs[0].destinationZip).toBe('78701');
    expect(Number(projs[0].budgetCapUsd)).toBe(14500.00);
  });

  it('seeds all 8 sequential tasks across the 3 phases', async () => {
    const db = getDatabase();
    const tasks = await db.select().from(projectTasks);
    expect(tasks.length).toBe(8);

    const phase1Tasks = tasks.filter(t => t.phaseName.includes('Phase 1'));
    expect(phase1Tasks.length).toBe(2);

    const phase2Tasks = tasks.filter(t => t.phaseName.includes('Phase 2'));
    expect(phase2Tasks.length).toBe(3);

    const phase3Tasks = tasks.filter(t => t.phaseName.includes('Phase 3'));
    expect(phase3Tasks.length).toBe(3);
  });

  it('seeds 8 BOM items linked to tasks with 32 merchant offers', async () => {
    const db = getDatabase();
    const boms = await db.select().from(bomItems);
    expect(boms.length).toBe(8);

    const offers = await db.select().from(merchantOffers);
    expect(offers.length).toBe(32);

    // Each BOM item should have exactly 4 competing offers
    for (const b of boms) {
      const itemOffers = offers.filter(o => o.bomItemId === b.id);
      expect(itemOffers.length).toBe(4);
      expect(itemOffers.some(o => o.isBestOffer)).toBe(true);
    }
  });
});
