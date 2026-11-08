import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sseBroadcaster } from '../services/sse-broadcaster.service.js';
import crypto from 'node:crypto';

export const streamRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/stream',
    async (request, reply) => {
      const { projectId } = request.params;
      const clientId = crypto.randomUUID();

      // Write SSE protocol headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial connection handshake
      reply.raw.write(
        `event: CONNECTED\ndata: ${JSON.stringify({ clientId, projectId, connectedAt: new Date().toISOString() })}\n\n`
      );

      // Register client in broadcaster service
      const writer = (event: any) => {
        try {
          reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        } catch {
          // Socket closed
        }
      };

      sseBroadcaster.addClient(projectId, clientId, writer);

      // Clean up when client disconnects
      request.raw.on('close', () => {
        sseBroadcaster.removeClient(projectId, clientId);
      });

      // Keep connection open; do not call reply.send()
    }
  );
};
