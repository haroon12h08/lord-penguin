import { SSEEvent, SSEEventType } from '@lord-penguin/shared';

export type SSEClientWriter = (event: SSEEvent) => void;

export class SSEBroadcasterService {
  // Map of projectId -> (clientId -> writeFunction)
  private readonly subscribers = new Map<string, Map<string, SSEClientWriter>>();
  private keepaliveTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Send comment keepalive every 15 seconds to prevent reverse proxy dropouts
    this.keepaliveTimer = setInterval(() => {
      this.sendKeepalivePing();
    }, 15000);
  }

  /**
   * Registers a connected SSE client
   */
  addClient(projectId: string, clientId: string, writer: SSEClientWriter): void {
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Map());
    }
    this.subscribers.get(projectId)!.set(clientId, writer);
  }

  /**
   * Unregisters an SSE client upon disconnect
   */
  removeClient(projectId: string, clientId: string): void {
    const projectSubs = this.subscribers.get(projectId);
    if (projectSubs) {
      projectSubs.delete(clientId);
      if (projectSubs.size === 0) {
        this.subscribers.delete(projectId);
      }
    }
  }

  /**
   * Broadcasts an event to all clients watching a specific project
   */
  broadcast<T = unknown>(projectId: string, type: SSEEventType, data: T): void {
    const event: SSEEvent<T> = {
      type,
      projectId,
      timestamp: new Date().toISOString(),
      data
    };

    const projectSubs = this.subscribers.get(projectId);
    if (projectSubs) {
      projectSubs.forEach(writer => {
        try {
          writer(event as SSEEvent<unknown>);
        } catch {
          // ignore dead socket errors
        }
      });
    }
  }

  /**
   * Broadcasts an event to all clients across all projects
   */
  broadcastToAll<T = unknown>(type: SSEEventType, data: T): void {
    this.subscribers.forEach((_, projectId) => {
      this.broadcast(projectId, type, data);
    });
  }

  /**
   * Gets total number of active SSE client listeners for a project
   */
  getClientCount(projectId: string): number {
    return this.subscribers.get(projectId)?.size || 0;
  }

  /**
   * Keepalive comment frames
   */
  private sendKeepalivePing(): void {
    const pingEvent: SSEEvent<{ ping: true }> = {
      type: 'SIMULATION_CLOCK_SHIFTED', // or handled as keepalive frame
      projectId: 'system',
      timestamp: new Date().toISOString(),
      data: { ping: true }
    };

    this.subscribers.forEach(clients => {
      clients.forEach(writer => {
        try {
          writer(pingEvent as SSEEvent<unknown>);
        } catch {
          // client disconnected
        }
      });
    });
  }

  destroy(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    this.subscribers.clear();
  }
}

export const sseBroadcaster = new SSEBroadcasterService();
