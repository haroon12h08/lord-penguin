import React, { useState } from 'react';
import { AegisBryntumGantt } from '../gantt/AegisBryntumGantt';
import { AegisAgGrid } from '../grid/AegisAgGrid';
import { AgentAuditStream } from '../drawer/AgentAuditStream';
import { TopTelemetryBar } from './TopTelemetryBar';
import { useProjectStore } from '../../store/useProjectStore';
import type { ProjectTask, BomItem } from '@lord-penguin/shared';

interface SplitWorkspaceProps {
  activeTab: 'all' | 'schedule' | 'matrix';
}

export const SplitWorkspace: React.FC<SplitWorkspaceProps> = ({ activeTab }) => {
  const { selectBomItem } = useProjectStore();
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [splitPercent, setSplitPercent] = useState(46); // 46% Top Gantt, 54% Bottom Matrix

  const handleSelectTask = (task: ProjectTask, bomItem?: BomItem) => {
    if (bomItem) {
      selectBomItem(bomItem);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0B0A09]">
      {/* 1. Top Financial KPI Strip */}
      <TopTelemetryBar />

      {/* 2. Central Workspace & Right Live Stream */}
      <div className="flex-1 flex overflow-hidden p-2.5 pt-0 gap-2.5">
        {/* Main Central Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-2.5">
          {activeTab === 'all' && (
            <>
              {/* Top Pane: CPM Timeline */}
              <div 
                className="w-full relative min-h-[220px]"
                style={{ height: `${splitPercent}%` }}
              >
                <AegisBryntumGantt onSelectTask={handleSelectTask} />
              </div>

              {/* Horizontal Separator */}
              <div className="h-1 bg-white/[0.06] hover:bg-[#E5A93C]/50 transition cursor-row-resize rounded-full mx-2" />

              {/* Bottom Pane: AG Grid Command Matrix */}
              <div className="w-full flex-1 min-h-[240px] overflow-hidden">
                <AegisAgGrid />
              </div>
            </>
          )}

          {activeTab === 'schedule' && (
            <div className="w-full h-full">
              <AegisBryntumGantt onSelectTask={handleSelectTask} />
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="w-full h-full">
              <AegisAgGrid />
            </div>
          )}
        </div>

        {/* Right Live Stream Drawer */}
        <AgentAuditStream
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
        />
      </div>
    </div>
  );
};
