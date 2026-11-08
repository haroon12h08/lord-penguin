import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { initDatabase, closeDatabase, getDatabaseMode } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { mockMerchantRoutes } from './routes/mock-merchant.routes.js';
import { projectsRoutes } from './routes/projects.routes.js';
import { bomRoutes } from './routes/bom.routes.js';
import { procurementRoutes } from './routes/procurement.routes.js';
import { streamRoutes } from './routes/stream.routes.js';
import { sseBroadcaster } from './services/sse-broadcaster.service.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: true
  });

  // 1. Zod Type Provider Compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // 2. CORS Middleware
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
  });

  // 3. Health & Sponsor Status Probe
  app.get('/api/v1/health', async () => {
    const dbMode = getDatabaseMode();
    const hasPayPal = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
    const hasChannel3 = Boolean(env.CHANNEL3_API_KEY);
    const hasKernel = Boolean(env.KERNEL_API_KEY);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'lord-penguin-aegisbom-api',
      version: '1.0.0',
      integrations: {
        database: 'connected',
        databaseMode: dbMode,
        paypalSandbox: {
          configured: hasPayPal,
          mode: hasPayPal ? 'LIVE_SANDBOX' : 'SIMULATION_MODE',
          sdk: '@paypal/paypal-server-sdk + @paypal/agent-toolkit'
        },
        apimatic: {
          configured: true,
          runtime: '@apimatic/core',
          codeGenerator: 'APIMatic v3.0'
        },
        channel3: {
          configured: hasChannel3,
          mode: hasChannel3 ? 'LIVE_API' : 'HYBRID_GRAPH_CATALOG'
        },
        kernel: {
          configured: hasKernel,
          mode: hasKernel ? 'CLOUD_CHROMIUM_READY' : 'LOCAL_DOM_VERIFIER_READY'
        }
      }
    };
  });

  // 4. Register Route Plugins
  await app.register(mockMerchantRoutes);
  await app.register(projectsRoutes);
  await app.register(bomRoutes);
  await app.register(procurementRoutes);
  await app.register(streamRoutes);

  // 5. Serve Frontend SPA if built (Production or Local Preview)
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, '../../web/dist'),
    path.resolve(currentDir, '../../../apps/web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist')
  ];
  const targetDist = candidatePaths.find(p => fs.existsSync(p)) || null;

  if (targetDist) {
    await app.register(fastifyStatic, {
      root: targetDist,
      prefix: '/'
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API route not found' } });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

export async function startServer(): Promise<void> {
  try {
    console.log('🚀 Initializing database layer...');
    await initDatabase();
    await runMigrations();

    const app = await buildApp();
    const port = env.PORT;
    const host = '0.0.0.0';

    await app.listen({ port, host });
    console.log(`🐧 [LORD-PENGUIN API] Server listening on http://${host}:${port}`);
    console.log(`🔗 Health Check: http://localhost:${port}/api/v1/health`);

    const shutdown = async () => {
      console.log('🛑 Shutting down server...');
      sseBroadcaster.destroy();
      await app.close();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err: any) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Allow direct CLI execution: node dist/index.js or tsx src/index.ts
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('index.ts') || process.argv[1]?.includes('index.js')) {
  startServer();
}
