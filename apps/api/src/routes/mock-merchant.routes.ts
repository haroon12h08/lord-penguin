import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/index.js';
import { merchantOffers, bomItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface SimulatorQueryParams {
  zip?: string;
  price?: string;
  in_stock?: string;
  lead_days?: string;
  merchant?: string;
  title?: string;
}

export const mockMerchantRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{
    Params: { offerId: string };
    Querystring: SimulatorQueryParams;
  }>('/api/v1/merchant-simulator/:offerId', async (request, reply) => {
    const { offerId } = request.params;
    const { zip = '78701', price, in_stock, lead_days, merchant, title } = request.query;

    let merchantName = merchant || 'Sweetwater Sound Pro AV';
    let productTitle = title || 'Professional Studio Audio & Video Component';
    let livePrice = price ? parseFloat(price) : 425.0;
    let isStock = in_stock !== undefined ? in_stock === 'true' || in_stock === '1' : true;
    let shippingDays = lead_days ? parseInt(lead_days, 10) : 2;

    // Try finding the actual offer from database
    try {
      const db = getDatabase();
      const rows = await db
        .select({
          offer: merchantOffers,
          bom: bomItems
        })
        .from(merchantOffers)
        .leftJoin(bomItems, eq(merchantOffers.bomItemId, bomItems.id))
        .where(eq(merchantOffers.id, offerId))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        if (!merchant) merchantName = row.offer.merchantName;
        if (!title && row.bom) productTitle = row.bom.itemName;
        if (!price) livePrice = parseFloat(row.offer.unitPriceUsd);
        if (in_stock === undefined) isStock = row.offer.inStock;
        if (!lead_days) shippingDays = row.offer.shippingLeadDays;
      }
    } catch {
      // In-memory or standalone execution without DB ready
    }

    const stockStatusText = isStock ? 'In Stock' : 'Out of Stock';
    const deliveryEstimateText = isStock
      ? `Guaranteed ${shippingDays}-Day Delivery to ${zip}`
      : `Currently Backordered — Delivery to ${zip} Delayed`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle} — ${merchantName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 2rem; }
    .storefront-card { max-width: 650px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; }
    .badge-merchant { background: #0070ba; color: #fff; margin-bottom: 1rem; }
    .badge-in-stock { background: #065f46; color: #34d399; }
    .badge-out-of-stock { background: #7f1d1d; color: #f87171; }
    .price { font-size: 2.25rem; font-weight: 800; color: #38bdf8; margin: 1rem 0; font-family: monospace; }
    .delivery { color: #9ca3af; font-size: 0.95rem; border-top: 1px solid #1f2937; padding-top: 1rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="storefront-card" id="product-root">
    <div class="badge badge-merchant" data-testid="merchant-name">${merchantName}</div>
    <h1 data-testid="product-title" style="margin: 0; font-size: 1.5rem;">${productTitle}</h1>
    <div class="price" data-testid="live-price">$${livePrice.toFixed(2)}</div>
    <div>
      <span class="badge ${isStock ? 'badge-in-stock' : 'badge-out-of-stock'}" data-testid="stock-status">${stockStatusText}</span>
    </div>
    <div class="delivery">
      <div>🚚 <strong data-testid="delivery-estimate">${deliveryEstimateText}</strong></div>
      <div style="font-size: 0.85rem; margin-top: 0.25rem;">
        Lead Time: <span data-testid="shipping-lead-days">${shippingDays}</span> business days | Destination: <span data-testid="destination-zip">${zip}</span>
      </div>
      <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">Verified for KERNEL Chromium & Playwright Inspection</div>
    </div>
  </div>
</body>
</html>`;

    reply.type('text/html; charset=utf-8').send(html);
  });
};
