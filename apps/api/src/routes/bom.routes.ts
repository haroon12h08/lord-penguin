import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/index.js';
import { bomItems, merchantOffers, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { channel3Adapter } from '../adapters/channel3.adapter.js';
import { sseBroadcaster } from '../services/sse-broadcaster.service.js';
import { BomItem } from '@lord-penguin/shared';

export const bomRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. List BOM Items for Project
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/bom',
    async (request, reply) => {
      const { projectId } = request.params;
      const db = getDatabase();
      const rows = await db.select().from(bomItems).where(eq(bomItems.projectId, projectId));
      return reply.send({ bomItems: rows });
    }
  );

  // 2. Update Strike Price for SKU
  app.patch<{
    Params: { projectId: string; bomItemId: string };
    Body: { strikeUnitPriceUsd: number };
  }>('/api/v1/projects/:projectId/bom/:bomItemId/strike', async (request, reply) => {
    const { projectId, bomItemId } = request.params;
    const { strikeUnitPriceUsd } = request.body || {};

    if (!strikeUnitPriceUsd || strikeUnitPriceUsd <= 0) {
      return reply.status(400).send({
        error: { code: 'INVALID_STRIKE_PRICE', message: 'strikeUnitPriceUsd must be a positive number' }
      });
    }

    const db = getDatabase();
    await db
      .update(bomItems)
      .set({
        strikeUnitPriceUsd: strikeUnitPriceUsd.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(bomItems.id, bomItemId));

    sseBroadcaster.broadcast(projectId, 'BOM_STATUS_CHANGED', {
      bomItemId,
      newStrikePriceUsd: strikeUnitPriceUsd
    });

    return reply.send({ success: true, bomItemId, strikeUnitPriceUsd });
  });

  // 3. Force Channel3 Offer Refresh
  app.post<{ Params: { projectId: string; bomItemId: string } }>(
    '/api/v1/projects/:projectId/bom/:bomItemId/refresh-offers',
    async (request, reply) => {
      const { projectId, bomItemId } = request.params;
      const db = getDatabase();

      const itemRows = await db.select().from(bomItems).where(eq(bomItems.id, bomItemId)).limit(1);
      if (itemRows.length === 0) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'BOM item not found' } });
      }

      const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      const zip = projRows[0]?.destinationZip || '78701';

      const bomDomain: BomItem = {
        ...itemRows[0],
        baselineUnitPriceUsd: Number(itemRows[0].baselineUnitPriceUsd),
        strikeUnitPriceUsd: Number(itemRows[0].strikeUnitPriceUsd),
        maxBudgetUsd: Number(itemRows[0].maxBudgetUsd),
        daysFloatSaved: Number(itemRows[0].daysFloatSaved),
        capitalYieldSavedUsd: Number(itemRows[0].capitalYieldSavedUsd),
        priceHistoryJson: itemRows[0].priceHistoryJson as number[],
        lrmTimestamp: itemRows[0].lrmTimestamp.toISOString(),
        createdAt: itemRows[0].createdAt.toISOString(),
        updatedAt: itemRows[0].updatedAt.toISOString()
      };

      const freshOffers = await channel3Adapter.searchOffersForBomItem(bomDomain, zip);

      sseBroadcaster.broadcast(projectId, 'OFFERS_RANKED', {
        bomItemId,
        offersCount: freshOffers.length,
        bestOffer: freshOffers.find(o => o.isBestOffer)
      });

      return reply.send({ bomItemId, offers: freshOffers });
    }
  );
};
