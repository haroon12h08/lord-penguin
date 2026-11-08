import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ProcureBomItemSchema, SimulateMarketShockSchema } from '@lord-penguin/shared';
import { procurementAgentService } from '../services/procurement-agent.service.js';
import { lrmEngineService } from '../services/lrm-engine.service.js';
import { channel3Adapter } from '../adapters/channel3.adapter.js';
import { getDatabase } from '../db/index.js';
import { merchantOffers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { seedDatabase } from '../db/seed.js';
import { projectPlannerService } from '../services/project-planner.service.js';

export const procurementRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Manually or Autonomously Execute Full 3-Stage Pipeline for BOM Item
  app.post<{
    Params: { projectId: string; bomItemId: string };
  }>('/api/v1/projects/:projectId/bom/:bomItemId/procure', async (request, reply) => {
    const { projectId, bomItemId } = request.params;
    const parsed = ProcureBomItemSchema.safeParse(request.body || {});
    const triggerReason = parsed.success ? parsed.data.triggerReason : 'MANUAL_TRIGGER';
    const railOverride = parsed.success ? parsed.data.settlementRailOverride : undefined;

    try {
      const result = await procurementAgentService.executeProcurement(
        projectId,
        bomItemId,
        triggerReason,
        railOverride
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        error: { code: 'PROCUREMENT_EXECUTION_FAILED', message: err.message }
      });
    }
  });

  // 2. Market Shock & Demo Acceleration Controller
  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/simulate/market-shock',
    async (request, reply) => {
      const { projectId } = request.params;
      const parsed = SimulateMarketShockSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'INVALID_SIMULATION_PARAMETERS', details: parsed.error.format() }
        });
      }

      const { action, bomItemId, discountPct = 18, hoursForward = 24 } = parsed.data;

      // ACTION 1: FLASH_PRICE_DROP
      if (action === 'FLASH_PRICE_DROP') {
        if (!bomItemId) {
          return reply.status(400).send({ error: { message: 'bomItemId is required for FLASH_PRICE_DROP' } });
        }

        const db = getDatabase();
        const offers = await db.select().from(merchantOffers).where(eq(merchantOffers.bomItemId, bomItemId));
        const best = offers.find(o => o.isBestOffer) || offers[0];

        if (!best) {
          return reply.status(404).send({ error: { message: 'No offers found to discount' } });
        }

        const updatedOffer = await channel3Adapter.simulatePriceDrop(best.id, discountPct);

        // Trigger autonomous capture due to arbitrage strike
        const procurement = await procurementAgentService.executeProcurement(
          projectId,
          bomItemId,
          `Flash Price Shock: -${discountPct}% Discount Hit via Channel3 ($${updatedOffer.unitPriceUsd})`
        );

        return reply.send({
          action: 'FLASH_PRICE_DROP',
          bomItemId,
          discountPct,
          updatedOffer,
          procurement
        });
      }

      // ACTION 2: ADVANCE_CLOCK_24H
      if (action === 'ADVANCE_CLOCK_24H') {
        const clockResult = await lrmEngineService.advanceVirtualClock(projectId, hoursForward);
        return reply.send({
          action: 'ADVANCE_CLOCK_24H',
          hoursAdvanced: hoursForward,
          ...clockResult
        });
      }

      // ACTION 3: RESET_DEMO
      if (action === 'RESET_DEMO') {
        await seedDatabase();
        const freshAggregate = await projectPlannerService.getProjectAggregate(projectId);
        return reply.send({
          action: 'RESET_DEMO',
          status: 'DEMO_RESTORED_TO_INITIAL_STATE',
          project: freshAggregate
        });
      }

      return reply.status(400).send({ error: { message: `Unknown action: ${action}` } });
    }
  );
};
