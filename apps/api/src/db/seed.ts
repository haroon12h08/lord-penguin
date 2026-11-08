import { initDatabase, closeDatabase } from './index.js';
import { runMigrations } from './migrate.js';
import {
  projects,
  projectTasks,
  taskDependencies,
  bomItems,
  merchantOffers,
  browserVerifications,
  paypalSettlements,
  agentAuditLogs
} from './schema.js';
import { sql } from 'drizzle-orm';

export async function seedDatabase(): Promise<void> {
  console.log('🌱 [Seed] Preparing database for seeding...');
  await runMigrations();
  const { db } = await initDatabase();

  // Clean existing tables (cascade)
  try {
    await db.execute(sql.raw(`TRUNCATE projects, project_tasks, task_dependencies, bom_items, merchant_offers, browser_verifications, paypal_settlements, agent_audit_logs CASCADE;`));
  } catch {
    // If truncate fails on fresh DB, proceed with individual deletes
  }

  try {
    await db.delete(agentAuditLogs);
    await db.delete(paypalSettlements);
    await db.delete(browserVerifications);
    await db.delete(merchantOffers);
    await db.delete(bomItems);
    await db.delete(taskDependencies);
    await db.delete(projectTasks);
    await db.delete(projects);
  } catch {
    // Ignore initial clean errors on fresh DB
  }

  console.log('🌱 [Seed] Seeding Austin 10-Seat AI Broadcast & Podcast Studio Build...');

  const projectId = '11111111-2222-3333-4444-555555555555';
  const projectStartDate = new Date('2026-11-07T00:00:00.000Z');
  const targetCompletionDate = new Date('2026-11-28T00:00:00.000Z');
  const virtualNowTimestamp = new Date('2026-11-07T06:30:00.000Z');

  // 1. Insert Project
  await db.insert(projects).values({
    id: projectId,
    name: 'Austin 10-Seat AI Broadcast & Podcast Studio Build',
    briefText:
      'Outfit a 10-seat hybrid video podcast and live broadcast editing studio by November 28 under $14,500 in Austin, TX 78701. Include high-isolation acoustic panels, commercial studio desks, quad Shure SM7dB mic package, RØDECaster Pro II console, Sony FR7 4K PTZ camera, Elgato studio lighting, Ubiquiti 10GbE PoE networking, and Apple Mac Studio editing node.',
    destinationZip: '78701',
    budgetCapUsd: '14500.00',
    autoSpendLimitUsd: '5000.00',
    autonomyMode: 'FULL_AUTONOMOUS',
    costOfCapitalApr: '0.0850',
    safetyBufferDays: 1,
    virtualNowTimestamp,
    projectStartDate,
    targetCompletionDate
  });

  // 2. Insert Tasks
  const taskData = [
    {
      id: '20000000-0000-0000-0000-000000000001',
      externalCode: 'PHASE-1.1',
      name: 'Acoustic Wall Panels & Bass Traps Installation',
      phaseName: 'Phase 1: Room Treatment & Infrastructure',
      startDate: new Date('2026-11-09T00:00:00.000Z'),
      endDate: new Date('2026-11-12T00:00:00.000Z'),
      durationDays: 3,
      percentDone: 100,
      isCriticalPath: true,
      sortOrder: 1
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      externalCode: 'PHASE-1.2',
      name: 'Custom Studio Desks & Cable Framing',
      phaseName: 'Phase 1: Room Treatment & Infrastructure',
      startDate: new Date('2026-11-12T00:00:00.000Z'),
      endDate: new Date('2026-11-15T00:00:00.000Z'),
      durationDays: 3,
      percentDone: 100,
      isCriticalPath: true,
      sortOrder: 2
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      externalCode: 'PHASE-2.1',
      name: 'Shure SM7dB Quad Mic Rigging & Boom Arms',
      phaseName: 'Phase 2: Audio & Video Core Capture',
      startDate: new Date('2026-11-15T00:00:00.000Z'),
      endDate: new Date('2026-11-18T00:00:00.000Z'),
      durationDays: 3,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 3
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      externalCode: 'PHASE-2.2',
      name: 'RØDECaster Pro II Broadcast Mixer & Audio Patchbay',
      phaseName: 'Phase 2: Audio & Video Core Capture',
      startDate: new Date('2026-11-18T00:00:00.000Z'),
      endDate: new Date('2026-11-20T00:00:00.000Z'),
      durationDays: 2,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 4
    },
    {
      id: '20000000-0000-0000-0000-000000000005',
      externalCode: 'PHASE-2.3',
      name: 'Sony FR7 4K PTZ Camera Ceiling Mount & HDMI/SDI Pulls',
      phaseName: 'Phase 2: Audio & Video Core Capture',
      startDate: new Date('2026-11-20T00:00:00.000Z'),
      endDate: new Date('2026-11-23T00:00:00.000Z'),
      durationDays: 3,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 5
    },
    {
      id: '20000000-0000-0000-0000-000000000006',
      externalCode: 'PHASE-3.1',
      name: 'Elgato Key Light Air 6-Pack Grid Mount & DMX Sync',
      phaseName: 'Phase 3: Compute, Network & Lighting Rig',
      startDate: new Date('2026-11-23T00:00:00.000Z'),
      endDate: new Date('2026-11-25T00:00:00.000Z'),
      durationDays: 2,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 6
    },
    {
      id: '20000000-0000-0000-0000-000000000007',
      externalCode: 'PHASE-3.2',
      name: 'Ubiquiti Pro Max 24 PoE Switch & 10GbE Uplink',
      phaseName: 'Phase 3: Compute, Network & Lighting Rig',
      startDate: new Date('2026-11-25T00:00:00.000Z'),
      endDate: new Date('2026-11-27T00:00:00.000Z'),
      durationDays: 2,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 7
    },
    {
      id: '20000000-0000-0000-0000-000000000008',
      externalCode: 'PHASE-3.3',
      name: 'Apple Mac Studio M3 Ultra Edit Node Deployment',
      phaseName: 'Phase 3: Compute, Network & Lighting Rig',
      startDate: new Date('2026-11-27T00:00:00.000Z'),
      endDate: new Date('2026-11-28T00:00:00.000Z'),
      durationDays: 1,
      percentDone: 0,
      isCriticalPath: true,
      sortOrder: 8
    }
  ];

  for (const t of taskData) {
    await db.insert(projectTasks).values({
      ...t,
      projectId
    });
  }

  // 3. Insert Task Dependencies (Linear critical path Finish-to-Start chain)
  for (let i = 0; i < taskData.length - 1; i++) {
    await db.insert(taskDependencies).values({
      projectId,
      fromTaskId: taskData[i].id,
      toTaskId: taskData[i + 1].id,
      dependencyType: 'FS',
      lagDays: 0
    });
  }

  // 4. Insert BOM Items
  const bomData = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      taskId: '20000000-0000-0000-0000-000000000001',
      skuCode: 'ACOUSTIC-PANEL-24PK',
      itemName: 'Primacoustic Broadway High-Density Acoustic Panels (24-Pack)',
      category: 'Room Treatment',
      searchQuery: 'Primacoustic Broadway acoustic panel 24 pack',
      quantity: 1,
      baselineUnitPriceUsd: '1200.00',
      strikeUnitPriceUsd: '1050.00',
      maxBudgetUsd: '1300.00',
      lrmTimestamp: new Date('2026-11-05T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '0.00',
      capitalYieldSavedUsd: '0.00',
      priceHistoryJson: [1200, 1200, 1180, 1150, 1120, 1080, 1050, 1020, 990, 960, 950, 940, 940, 940],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'SETTLED' as const,
      statusReason: 'Autonomous LRM threshold reached. Kernel verified. Settled via PayPal Orders v2.'
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      taskId: '20000000-0000-0000-0000-000000000002',
      skuCode: 'STUDIO-DESK-UPLIFT-2PK',
      itemName: 'Uplift Commercial Curved Studio Desks with Cable Raceway (Pair)',
      category: 'Infrastructure',
      searchQuery: 'Uplift commercial curved studio desk',
      quantity: 2,
      baselineUnitPriceUsd: '1100.00',
      strikeUnitPriceUsd: '950.00',
      maxBudgetUsd: '2400.00',
      lrmTimestamp: new Date('2026-11-07T00:00:00.000Z'),
      leadTimeDays: 4,
      daysFloatSaved: '0.00',
      capitalYieldSavedUsd: '0.00',
      priceHistoryJson: [1100, 1100, 1080, 1050, 1020, 990, 970, 960, 950, 940, 920, 900, 900, 895],
      settlementRail: 'PAYPAL_INVOICE' as const,
      status: 'SETTLED' as const,
      statusReason: 'B2B Vendor PO authorized. Kernel verified. Settled via PayPal Invoicing v2.'
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      taskId: '20000000-0000-0000-0000-000000000003',
      skuCode: 'SHURE-SM7DB-4PK',
      itemName: 'Shure SM7dB Active Dynamic Vocal Microphone (Quad Bundle)',
      category: 'Audio Capture',
      searchQuery: 'Shure SM7dB active microphone 4 pack',
      quantity: 4,
      baselineUnitPriceUsd: '499.00',
      strikeUnitPriceUsd: '439.00',
      maxBudgetUsd: '2000.00',
      lrmTimestamp: new Date('2026-11-11T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '3.75',
      capitalYieldSavedUsd: '11.80',
      priceHistoryJson: [499, 499, 489, 485, 479, 469, 459, 449, 445, 439, 435, 429, 429, 425],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'Monitoring Channel3 arbitrage spread. LRM window countdown: <48h remaining.'
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      taskId: '20000000-0000-0000-0000-000000000004',
      skuCode: 'RODE-CASTER-PRO-2',
      itemName: 'RØDECaster Pro II Integrated Audio Production Studio Console',
      category: 'Audio Processing',
      searchQuery: 'RODECaster Pro II audio console',
      quantity: 1,
      baselineUnitPriceUsd: '699.00',
      strikeUnitPriceUsd: '629.00',
      maxBudgetUsd: '750.00',
      lrmTimestamp: new Date('2026-11-14T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '6.75',
      capitalYieldSavedUsd: '9.85',
      priceHistoryJson: [699, 699, 699, 689, 689, 679, 669, 659, 649, 649, 639, 629, 629, 619],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'Monitoring Channel3 price graph. Float yield actively accumulating.'
    },
    {
      id: '30000000-0000-0000-0000-000000000005',
      taskId: '20000000-0000-0000-0000-000000000005',
      skuCode: 'SONY-FR7-4K-PTZ',
      itemName: 'Sony FR7 Cinema Line Full-Frame PTZ Robotic Broadcast Camera',
      category: 'Video Capture',
      searchQuery: 'Sony FR7 4K PTZ camera',
      quantity: 1,
      baselineUnitPriceUsd: '2499.00',
      strikeUnitPriceUsd: '2250.00',
      maxBudgetUsd: '2700.00',
      lrmTimestamp: new Date('2026-11-16T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '8.75',
      capitalYieldSavedUsd: '45.10',
      priceHistoryJson: [2499, 2499, 2450, 2400, 2380, 2350, 2300, 2280, 2250, 2200, 2190, 2160, 2150, 2149],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'Strike target within 5%. Flash discount simulation candidate.'
    },
    {
      id: '30000000-0000-0000-0000-000000000006',
      taskId: '20000000-0000-0000-0000-000000000006',
      skuCode: 'ELGATO-KEYLIGHT-6PK',
      itemName: 'Elgato Key Light Air Professional Studio LED Panels (6-Pack Bundle)',
      category: 'Lighting',
      searchQuery: 'Elgato Key Light Air 6 pack',
      quantity: 6,
      baselineUnitPriceUsd: '129.99',
      strikeUnitPriceUsd: '109.00',
      maxBudgetUsd: '850.00',
      lrmTimestamp: new Date('2026-11-19T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '11.75',
      capitalYieldSavedUsd: '18.40',
      priceHistoryJson: [129, 129, 129, 125, 125, 120, 119, 115, 115, 112, 110, 109, 105, 99],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'Monitoring multi-merchant inventory availability.'
    },
    {
      id: '30000000-0000-0000-0000-000000000007',
      taskId: '20000000-0000-0000-0000-000000000007',
      skuCode: 'UBIQUITI-PROMAX-24',
      itemName: 'Ubiquiti UniFi Pro Max 24 PoE 400W Enterprise Network Switch',
      category: 'Networking',
      searchQuery: 'Ubiquiti Pro Max 24 PoE switch',
      quantity: 1,
      baselineUnitPriceUsd: '799.00',
      strikeUnitPriceUsd: '729.00',
      maxBudgetUsd: '850.00',
      lrmTimestamp: new Date('2026-11-21T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '13.75',
      capitalYieldSavedUsd: '21.50',
      priceHistoryJson: [799, 799, 799, 790, 785, 780, 775, 760, 755, 750, 745, 739, 729, 715],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'B2B commercial network pricing indexed via CDW Business.'
    },
    {
      id: '30000000-0000-0000-0000-000000000008',
      taskId: '20000000-0000-0000-0000-000000000008',
      skuCode: 'MAC-STUDIO-M3-ULTRA',
      itemName: 'Apple Mac Studio M3 Ultra (64GB Unified Memory / 1TB SSD)',
      category: 'Compute',
      searchQuery: 'Apple Mac Studio M3 Ultra 64GB',
      quantity: 1,
      baselineUnitPriceUsd: '2699.00',
      strikeUnitPriceUsd: '2499.00',
      maxBudgetUsd: '2900.00',
      lrmTimestamp: new Date('2026-11-23T00:00:00.000Z'),
      leadTimeDays: 3,
      daysFloatSaved: '15.75',
      capitalYieldSavedUsd: '77.50',
      priceHistoryJson: [2699, 2699, 2699, 2650, 2650, 2600, 2590, 2550, 2550, 2520, 2499, 2480, 2450, 2420],
      settlementRail: 'PAYPAL_ORDER' as const,
      status: 'MONITORING' as const,
      statusReason: 'High-value treasury asset. Preserving $2,699 working capital float.'
    }
  ];

  for (const b of bomData) {
    await db.insert(bomItems).values({
      ...b,
      projectId
    });
  }

  // 5. Insert 32 Competing Merchant Offers (4 per BOM item)
  const merchants = [
    { name: 'Sweetwater Sound', domain: 'sweetwater.com', rebate: '4.00' },
    { name: 'B&H Photo Video', domain: 'bhphotovideo.com', rebate: '3.50' },
    { name: 'Adorama Pro AV', domain: 'adorama.com', rebate: '3.00' },
    { name: 'CDW Business Direct', domain: 'cdw.com', rebate: '2.50' }
  ];

  const offerBasePrices = [
    [940.0, 980.0, 1020.0, 1050.0],       // Acoustic Panels (Best: Sweetwater $940)
    [895.0, 920.0, 940.0, 960.0],         // Studio Desks (Best: Sweetwater $895)
    [425.0, 439.0, 449.0, 465.0],         // Shure SM7dB (Best: Sweetwater $425)
    [619.0, 635.0, 649.0, 660.0],         // RODECaster (Best: Sweetwater $619)
    [2149.0, 2199.0, 2250.0, 2290.0],     // Sony PTZ (Best: Sweetwater $2149)
    [99.0, 105.0, 109.0, 115.0],          // Elgato Key Light (Best: Sweetwater $99)
    [715.0, 729.0, 745.0, 760.0],         // Ubiquiti Switch (Best: Sweetwater $715)
    [2420.0, 2450.0, 2480.0, 2510.0]      // Mac Studio (Best: Sweetwater $2420)
  ];

  const createdOfferIds: string[] = [];

  for (let bIdx = 0; bIdx < bomData.length; bIdx++) {
    const bom = bomData[bIdx];
    const prices = offerBasePrices[bIdx];

    for (let mIdx = 0; mIdx < merchants.length; mIdx++) {
      const m = merchants[mIdx];
      const unitPrice = prices[mIdx];
      const isBest = mIdx === 0;
      const offerId = `40000000-0000-0000-0000-0000000000${(bIdx * 4 + mIdx + 1).toString().padStart(2, '0')}`;
      createdOfferIds.push(offerId);

      const gross = unitPrice * bom.quantity;
      const net = Math.round(gross * (1 - parseFloat(m.rebate) / 100) * 100) / 100;

      await db.insert(merchantOffers).values({
        id: offerId,
        bomItemId: bom.id,
        channel3ProductId: `c3_prod_${bom.skuCode.toLowerCase()}_${mIdx + 1}`,
        merchantName: m.name,
        merchantDomain: m.domain,
        unitPriceUsd: unitPrice.toFixed(2),
        shippingPriceUsd: '0.00',
        commissionRatePct: m.rebate,
        netEffectiveTotalUsd: net.toFixed(2),
        shippingLeadDays: 2 + mIdx,
        inStock: true,
        productUrl: `https://${m.domain}/item/${bom.skuCode.toLowerCase()}`,
        verificationUrl: `/api/v1/merchant-simulator/${offerId}?zip=78701`,
        isBestOffer: isBest
      });
    }
  }

  // 6. Pre-populate Browser Verification & PayPal Settlement for Item 1 (Acoustic Panels)
  const acousticOfferId = createdOfferIds[0];
  const acousticVerId = '50000000-0000-0000-0000-000000000001';
  await db.insert(browserVerifications).values({
    id: acousticVerId,
    bomItemId: bomData[0].id,
    offerId: acousticOfferId,
    kernelSessionId: 'krn_sess_9a8b7c6d5e_01',
    executionMode: 'KERNEL_CLOUD',
    browserLiveViewUrl: 'https://api.onkernel.com/browser/replays?replay_id=krn_sess_9a8b7c6d5e_01',
    targetUrl: 'https://sweetwater.com/item/acoustic-panel-24pk',
    verifiedPriceUsd: '940.00',
    verifiedInStock: true,
    verifiedDeliveryDays: 2,
    destinationZip: '78701',
    verificationStatus: 'PASSED',
    domSnapshotJson: {
      stockStatus: 'In Stock (Ready to Ship to Austin, TX 78701)',
      livePrice: '$940.00',
      shippingEstimate: 'Guaranteed 2-Day Delivery via FedEx Ground',
      merchantName: 'Sweetwater Sound'
    },
    durationMs: 680
  });

  await db.insert(paypalSettlements).values({
    id: '60000000-0000-0000-0000-000000000001',
    projectId,
    bomItemId: bomData[0].id,
    offerId: acousticOfferId,
    verificationId: acousticVerId,
    idempotencyKey: 'idem_settle_acoustic_20261107',
    settlementRail: 'PAYPAL_ORDER',
    paypalEnvironment: 'SANDBOX',
    paypalOrderId: '8XY92019AB1234567',
    paypalCaptureId: '3CD45678EF9876543',
    paypalStatus: 'COMPLETED',
    grossAmountUsd: '940.00',
    commissionRebateUsd: '37.60',
    netSettledUsd: '902.40',
    savingsVsBaselineUsd: '297.60',
    approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=8XY92019AB1234567',
    receiptUrl: 'https://www.sandbox.paypal.com/activity/payment/8XY92019AB1234567',
    apimaticValidated: true,
    agentToolkitToolUsed: 'create_order',
    rawPaypalResponseJson: {
      id: '8XY92019AB1234567',
      status: 'COMPLETED',
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'ACOUSTIC-PANEL-24PK',
          amount: { currency_code: 'USD', value: '940.00' }
        }
      ]
    }
  });

  // 7. Pre-populate Browser Verification & PayPal Settlement for Item 2 (Studio Desks - B2B Invoice)
  const deskOfferId = createdOfferIds[4];
  const deskVerId = '50000000-0000-0000-0000-000000000002';
  await db.insert(browserVerifications).values({
    id: deskVerId,
    bomItemId: bomData[1].id,
    offerId: deskOfferId,
    kernelSessionId: 'krn_sess_1f2e3d4c5b_02',
    executionMode: 'KERNEL_CLOUD',
    browserLiveViewUrl: 'https://api.onkernel.com/browser/replays?replay_id=krn_sess_1f2e3d4c5b_02',
    targetUrl: 'https://sweetwater.com/item/studio-desk-uplift-2pk',
    verifiedPriceUsd: '895.00',
    verifiedInStock: true,
    verifiedDeliveryDays: 3,
    destinationZip: '78701',
    verificationStatus: 'PASSED',
    domSnapshotJson: {
      stockStatus: 'In Stock (Commercial Freight to Austin, TX 78701)',
      livePrice: '$895.00',
      shippingEstimate: '3-Day Liftgate Freight Included',
      merchantName: 'Sweetwater Sound Commercial'
    },
    durationMs: 740
  });

  await db.insert(paypalSettlements).values({
    id: '60000000-0000-0000-0000-000000000002',
    projectId,
    bomItemId: bomData[1].id,
    offerId: deskOfferId,
    verificationId: deskVerId,
    idempotencyKey: 'idem_settle_desks_20261107',
    settlementRail: 'PAYPAL_INVOICE',
    paypalEnvironment: 'SANDBOX',
    paypalInvoiceId: 'INV2-R49A-7ZKC-99Q2-11M8',
    paypalStatus: 'SENT',
    grossAmountUsd: '1790.00',
    commissionRebateUsd: '71.60',
    netSettledUsd: '1718.40',
    savingsVsBaselineUsd: '481.60',
    approvalUrl: 'https://www.sandbox.paypal.com/invoice/payerView/details/INV2-R49A-7ZKC-99Q2-11M8',
    receiptUrl: 'https://www.sandbox.paypal.com/invoice/payerView/details/INV2-R49A-7ZKC-99Q2-11M8',
    apimaticValidated: true,
    agentToolkitToolUsed: 'create_invoice',
    rawPaypalResponseJson: {
      id: 'INV2-R49A-7ZKC-99Q2-11M8',
      status: 'SENT',
      detail: {
        currency_code: 'USD',
        invoice_number: 'INV-2026-AEGIS-002',
        note: 'B2B Procurement for Austin Studio Framing'
      }
    }
  });

  // 8. Insert Initial Agent Audit Logs
  const auditEntries = [
    {
      sponsorService: 'BRYNTUM' as const,
      actionType: 'SCHEDULE_HYDRATED',
      summary: 'Bryntum Gantt CPM timeline loaded: 8 tasks, 7 FS dependencies, zero cycles.',
      severity: 'INFO' as const
    },
    {
      sponsorService: 'CHANNEL3' as const,
      actionType: 'CATALOG_INDEXED',
      summary: 'Channel3 product graph indexed 32 competing merchant offers across 6 authorized vendors.',
      severity: 'SUCCESS' as const
    },
    {
      sponsorService: 'KERNEL' as const,
      actionType: 'DOM_VERIFIED',
      summary: 'Kernel cloud Chromium verified in-stock inventory & 2-day delivery for Acoustic Panels.',
      severity: 'SUCCESS' as const
    },
    {
      sponsorService: 'APIMATIC' as const,
      actionType: 'PAYPAL_ORDER_CAPTURED',
      summary: 'APIMatic-validated PayPal Order #8XY92019AB1234567 captured ($940.00). $297.60 saved vs baseline.',
      severity: 'SUCCESS' as const
    },
    {
      sponsorService: 'PAYPAL' as const,
      actionType: 'PAYPAL_INVOICE_SENT',
      summary: 'PayPal Agent Toolkit dispatched B2B Invoice #INV2-R49A-7ZKC-99Q2-11M8 for Studio Desks.',
      severity: 'SUCCESS' as const
    },
    {
      sponsorService: 'LRM_ENGINE' as const,
      actionType: 'MONITORING_ACTIVE',
      summary: 'Autonomous LRM monitoring active. Next imminent cutoff: Shure SM7dB Quad Pack (<48h).',
      severity: 'INFO' as const
    }
  ];

  for (const log of auditEntries) {
    await db.insert(agentAuditLogs).values({
      projectId,
      ...log
    });
  }

  console.log('✅ [Seed] Successfully seeded Austin 10-Seat Studio demo project with 8 tasks, 8 BOM items, 32 merchant offers, 2 settlements, and 6 audit logs.');
}

// Allow direct CLI invocation: tsx src/db/seed.ts
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(async () => {
      console.log('🎉 [Seed] Seeding completed successfully.');
      await closeDatabase();
      process.exit(0);
    })
    .catch(async err => {
      console.error('❌ [Seed] Seeding failed:', err);
      await closeDatabase();
      process.exit(1);
    });
}
