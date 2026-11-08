import { create } from 'zustand';
import type {
  Project,
  ProjectTask,
  TaskDependency,
  BomItem,
  MerchantOffer,
  BrowserVerification,
  PayPalSettlement,
  AgentAuditLog,
  ProjectTelemetry,
  SettlementRailType,
  SSEEvent,
} from '@lord-penguin/shared';

export type ModalType = 'NEW_BRIEF' | 'KERNEL_PROOF' | 'PAYPAL_RECEIPT' | null;

interface ProjectState {
  project: Project | null;
  telemetry: ProjectTelemetry | null;
  tasks: ProjectTask[];
  dependencies: TaskDependency[];
  bomItems: BomItem[];
  auditLogs: AgentAuditLog[];
  isStreaming: boolean;
  isLoading: boolean;
  isSimulating: boolean;
  error: string | null;

  // Active Modals & Selection
  activeModal: ModalType;
  selectedBomItem: BomItem | null;
  selectedVerification: BrowserVerification | null;
  selectedSettlement: PayPalSettlement | null;

  // Actions
  init: (projectId?: string) => Promise<void>;
  connectSSE: (projectId: string) => void;
  disconnectSSE: () => void;
  refreshProject: () => Promise<void>;
  rescheduleTask: (taskId: string, startDate: string, endDate: string) => Promise<void>;
  triggerProcurement: (bomItemId: string, railOverride?: SettlementRailType) => Promise<void>;
  simulateMarketShock: (action: 'FLASH_PRICE_DROP' | 'ADVANCE_CLOCK_24H' | 'RESET_DEMO', params?: any) => Promise<void>;
  advanceVirtualClock: (hours?: number) => Promise<void>;
  triggerFlashPriceDrop: (bomItemId?: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  createProjectFromBrief: (briefText: string, budgetCapUsd?: number, targetZip?: string) => Promise<void>;
  openModal: (modal: ModalType, payload?: { bomItem?: BomItem; verification?: BrowserVerification; settlement?: PayPalSettlement }) => void;
  closeModal: () => void;
  selectBomItem: (bomItem: BomItem | null) => void;
}

let activeEventSource: EventSource | null = null;

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  telemetry: null,
  tasks: [],
  dependencies: [],
  bomItems: [],
  auditLogs: [],
  isStreaming: false,
  isLoading: false,
  isSimulating: false,
  error: null,

  activeModal: null,
  selectedBomItem: null,
  selectedVerification: null,
  selectedSettlement: null,

  init: async (projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let targetProjectId = projectId;

      if (!targetProjectId) {
        // Fetch project list to get default project
        const listRes = await fetch('/api/v1/projects');
        if (!listRes.ok) throw new Error(`Failed to list projects: ${listRes.statusText}`);
        const listData: any = await listRes.json();
        if (listData.projects && listData.projects.length > 0) {
          targetProjectId = listData.projects[0].id;
        } else {
          set({ isLoading: false });
          return;
        }
      }

      // Fetch full aggregate
      const aggRes = await fetch(`/api/v1/projects/${targetProjectId}`);
      if (!aggRes.ok) throw new Error(`Failed to fetch project aggregate: ${aggRes.statusText}`);
      const aggregate: any = await aggRes.json();

      set({
        project: aggregate.project,
        telemetry: aggregate.telemetry,
        tasks: aggregate.tasks || [],
        dependencies: aggregate.dependencies || [],
        bomItems: aggregate.bomItems || [],
        auditLogs: aggregate.auditLogs || [],
        isLoading: false,
      });

      // Connect SSE
      if (targetProjectId) {
        get().connectSSE(targetProjectId);
      }
    } catch (err: any) {
      console.error('Failed to initialize project store:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  refreshProject: async () => {
    const { project } = get();
    if (!project) return;
    try {
      const aggRes = await fetch(`/api/v1/projects/${project.id}`);
      if (!aggRes.ok) return;
      const aggregate: any = await aggRes.json();
      set({
        project: aggregate.project,
        telemetry: aggregate.telemetry,
        tasks: aggregate.tasks || [],
        dependencies: aggregate.dependencies || [],
        bomItems: aggregate.bomItems || [],
        auditLogs: aggregate.auditLogs || [],
      });
    } catch (err) {
      console.error('Error refreshing project:', err);
    }
  },

  connectSSE: (projectId: string) => {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    const eventSource = new EventSource(`/api/v1/projects/${projectId}/stream`);
    activeEventSource = eventSource;

    eventSource.onopen = () => {
      set({ isStreaming: true });
    };

    eventSource.onerror = (e) => {
      console.warn('SSE connection disconnected or failed, reconnecting...', e);
      set({ isStreaming: false });
    };

    const handleEvent = (event: MessageEvent) => {
      try {
        const payload: SSEEvent = JSON.parse(event.data);
        const { type, data } = payload;

        // Append to audit logs if present
        if (type === 'AUDIT_LOG_ADDED' && data) {
          const logItem = data as AgentAuditLog;
          set((state) => ({
            auditLogs: [logItem, ...state.auditLogs.slice(0, 99)],
          }));
        } else if (type === 'TASK_SHIFTED' && data) {
          // Task date shifted
          const { task, shiftedLRMs } = data as { task: ProjectTask; shiftedLRMs?: Record<string, string> };
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
            bomItems: state.bomItems.map((b) => {
              if (shiftedLRMs && shiftedLRMs[b.id]) {
                return { ...b, lrmTimestamp: shiftedLRMs[b.id] };
              }
              return b;
            }),
          }));
          // Trigger silent background refresh for computed telemetry
          get().refreshProject();
        } else if (type === 'BOM_STATUS_CHANGED' && data) {
          const { bomItemId, status, statusReason } = data as { bomItemId: string; status: any; statusReason?: string };
          set((state) => ({
            bomItems: state.bomItems.map((b) =>
              b.id === bomItemId ? { ...b, status, statusReason } : b
            ),
          }));
        } else if (type === 'KERNEL_BROWSER_VERIFIED' && data) {
          const { verification, bomItemId } = data as { verification: BrowserVerification; bomItemId: string };
          set((state) => ({
            bomItems: state.bomItems.map((b) =>
              b.id === bomItemId
                ? {
                    ...b,
                    latestVerification: verification,
                  }
                : b
            ),
          }));
        } else if (type === 'PAYPAL_SETTLEMENT_COMPLETED' && data) {
          const { settlement, bomItemId } = data as { settlement: PayPalSettlement; bomItemId: string };
          set((state) => ({
            bomItems: state.bomItems.map((b) =>
              b.id === bomItemId
                ? {
                    ...b,
                    status: 'SETTLED',
                    settlement,
                  }
                : b
            ),
          }));
          get().refreshProject();
        } else if (type === 'SIMULATION_CLOCK_SHIFTED' && data) {
          const { virtualNowTimestamp } = data as { virtualNowTimestamp?: string };
          if (virtualNowTimestamp) {
            set((state) => ({
              project: state.project ? { ...state.project, virtualNowTimestamp } : state.project,
            }));
            get().refreshProject();
          }
        }
      } catch (err) {
        console.error('Error handling SSE frame:', err);
      }
    };

    // Register all server event types
    const eventTypes = [
      'CONNECTED',
      'TASK_SHIFTED',
      'BOM_STATUS_CHANGED',
      'OFFERS_RANKED',
      'KERNEL_BROWSER_STARTED',
      'KERNEL_BROWSER_VERIFIED',
      'PAYPAL_SETTLEMENT_CREATED',
      'PAYPAL_SETTLEMENT_COMPLETED',
      'SIMULATION_CLOCK_SHIFTED',
      'PROJECT_TELEMETRY_UPDATED',
      'AUDIT_LOG_ADDED',
    ];

    eventTypes.forEach((evt) => {
      eventSource.addEventListener(evt, handleEvent as EventListener);
    });

    eventSource.onmessage = handleEvent;
  },

  disconnectSSE: () => {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
    set({ isStreaming: false });
  },

  rescheduleTask: async (taskId: string, startDate: string, endDate: string) => {
    const { project } = get();
    if (!project) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error?.message || 'Failed to reschedule task');
      }
      const data: any = await res.json();
      if (data.task) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)),
        }));
      }
      get().refreshProject();
    } catch (err: any) {
      console.error('Failed to reschedule task:', err);
      set({ error: err.message });
    }
  },

  triggerProcurement: async (bomItemId: string, railOverride?: SettlementRailType) => {
    const { project } = get();
    if (!project) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/bom/${bomItemId}/procure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerReason: 'MANUAL_DASHBOARD_STRIKE',
          settlementRailOverride: railOverride,
        }),
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error?.message || 'Procurement failed');
      }
      const data: any = await res.json();
      // Update BOM item status
      if (data.bomItem) {
        set((state) => ({
          bomItems: state.bomItems.map((b) => (b.id === bomItemId ? { ...b, ...data.bomItem } : b)),
        }));
      }
      get().refreshProject();
    } catch (err: any) {
      console.error('Procurement error:', err);
      set({ error: err.message });
    }
  },

  simulateMarketShock: async (action, params = {}) => {
    const { project } = get();
    if (!project) return;
    set({ isSimulating: true });
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/simulate/market-shock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error?.message || 'Simulation shock failed');
      }
      await get().refreshProject();
    } catch (err: any) {
      console.error('Market shock simulation error:', err);
      set({ error: err.message });
    } finally {
      set({ isSimulating: false });
    }
  },

  advanceVirtualClock: async (hours = 24) => {
    await get().simulateMarketShock('ADVANCE_CLOCK_24H', { hoursForward: hours });
  },

  triggerFlashPriceDrop: async (bomItemId?: string) => {
    const { bomItems } = get();
    // Target either provided BOM item, or first unsettled item with offers
    const targetItem = bomItemId
      ? bomItems.find((b) => b.id === bomItemId)
      : bomItems.find((b) => b.status === 'MONITORING' && b.offers && b.offers.length > 0) || bomItems[0];

    if (!targetItem) {
      set({ error: 'No suitable BOM item available for flash price drop' });
      return;
    }

    await get().simulateMarketShock('FLASH_PRICE_DROP', {
      bomItemId: targetItem.id,
      discountPct: 18,
    });
  },

  resetDemo: async () => {
    await get().simulateMarketShock('RESET_DEMO');
  },

  createProjectFromBrief: async (briefText: string, budgetCapUsd = 15000, targetZip = '78701') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/projects/from-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefText, budgetCapUsd, targetZip }),
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error?.message || 'Failed to parse and create project from brief');
      }
      const data: any = await res.json();
      await get().init(data.project.id);
      set({ activeModal: null });
    } catch (err: any) {
      console.error('Failed to create project from brief:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  openModal: (modal, payload) => {
    set({
      activeModal: modal,
      selectedBomItem: payload?.bomItem ?? get().selectedBomItem,
      selectedVerification: payload?.verification ?? (payload?.bomItem?.latestVerification ?? null),
      selectedSettlement: payload?.settlement ?? (payload?.bomItem?.settlement ?? null),
    });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  selectBomItem: (bomItem) => {
    set({
      selectedBomItem: bomItem,
      selectedVerification: bomItem?.latestVerification ?? null,
      selectedSettlement: bomItem?.settlement ?? null,
    });
  },
}));
