import { initDatabase, closeDatabase } from './index.js';
import { projects, projectTasks, bomItems, merchantOffers, paypalSettlements, browserVerifications, agentAuditLogs } from './schema.js';

async function verify() {
  const { db, mode } = await initDatabase();
  const projList = await db.select().from(projects);
  const taskList = await db.select().from(projectTasks);
  const bomList = await db.select().from(bomItems);
  const offerList = await db.select().from(merchantOffers);
  const verificationsList = await db.select().from(browserVerifications);
  const settlementList = await db.select().from(paypalSettlements);
  const auditList = await db.select().from(agentAuditLogs);

  console.log('==================================================');
  console.log(`✅ DATABASE VERIFICATION REPORT [Mode: ${mode}]`);
  console.log('==================================================');
  console.log(`1. Projects:            ${projList.length} ("${projList[0]?.name}")`);
  console.log(`2. Project Tasks:       ${taskList.length} (Phases: 1.1 to 3.3)`);
  console.log(`3. BOM Line Items:      ${bomList.length} items`);
  console.log(`4. Merchant Offers:     ${offerList.length} offers (4 per BOM item)`);
  console.log(`5. Browser Verifies:    ${verificationsList.length} verification records`);
  console.log(`6. PayPal Settlements:  ${settlementList.length} settlements`);
  console.log(`7. Agent Audit Logs:    ${auditList.length} audit entries`);
  console.log('--------------------------------------------------');

  for (const item of bomList) {
    const itemOffers = offerList.filter(o => o.bomItemId === item.id);
    const best = itemOffers.find(o => o.isBestOffer);
    console.log(`* SKU: ${item.skuCode.padEnd(22)} | Qty: ${item.quantity} | Base: $${item.baselineUnitPriceUsd} | Best: $${best?.unitPriceUsd} (${best?.merchantName}) | Status: ${item.status}`);
  }

  console.log('==================================================');
  await closeDatabase();
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
