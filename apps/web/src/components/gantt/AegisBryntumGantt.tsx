import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { GanttTimelineSvg } from './GanttTimelineSvg';
import type { ProjectTask, BomItem } from '@lord-penguin/shared';
import { Sparkles, Calendar } from 'lucide-react';

interface AegisBryntumGanttProps {
  onSelectTask?: (task: ProjectTask, bomItem?: BomItem) => void;
}

export const AegisBryntumGantt: React.FC<AegisBryntumGanttProps> = ({ onSelectTask }) => {
  const { tasks, dependencies, bomItems, rescheduleTask } = useProjectStore();
  const [engineMode, setEngineMode] = useState<'AEGIS_CPM' | 'BRYNTUM_GRID'>('AEGIS_CPM');
  const [BryntumComponent, setBryntumComponent] = useState<any>(null);
  const [bryntumError, setBryntumError] = useState<string | null>(null);

  useEffect(() => {
    // Lazily load Bryntum Gantt module when requested
    if (engineMode === 'BRYNTUM_GRID' && !BryntumComponent) {
      import('@bryntum/gantt-react')
        .then((mod) => {
          if (mod.BryntumGantt) {
            setBryntumComponent(() => mod.BryntumGantt);
          }
        })
        .catch((err) => {
          console.warn('Bryntum dynamic import fallback:', err);
          setBryntumError('Bryntum Pro renderer active in fallback mode.');
        });
    }
  }, [engineMode, BryntumComponent]);

  // Transform store data into Bryntum project records
  const bryntumData = useMemo(() => {
    const bryntumTasks = tasks.map((t) => {
      const bomItem = bomItems.find((b) => b.taskId === t.id);
      let statusCls = 'b-task-monitoring';
      if (bomItem?.status === 'SETTLED') statusCls = 'b-task-settled';
      else if (bomItem?.status === 'SETTLING_PAYPAL') statusCls = 'b-task-settling';

      return {
        id: t.id,
        name: t.name,
        code: t.externalCode,
        startDate: t.startDate,
        endDate: t.endDate,
        duration: t.durationDays,
        percentDone: t.percentDone || 0,
        cls: `${statusCls} ${t.isCriticalPath ? 'b-task-critical' : ''}`,
        lrmTimestamp: bomItem?.lrmTimestamp || 'Pending',
        itemName: bomItem?.itemName || '',
      };
    });

    const bryntumDeps = dependencies.map((d) => ({
      id: d.id,
      from: d.fromTaskId,
      to: d.toTaskId,
      type: 2, // FS (Finish to Start)
    }));

    return { tasks: bryntumTasks, dependencies: bryntumDeps };
  }, [tasks, dependencies, bomItems]);

  const handleTaskDrop = (event: any) => {
    try {
      const { taskRecord } = event;
      if (taskRecord && taskRecord.startDate && taskRecord.endDate) {
        const startIso = new Date(taskRecord.startDate).toISOString().split('T')[0];
        const endIso = new Date(taskRecord.endDate).toISOString().split('T')[0];
        rescheduleTask(taskRecord.id, startIso, endIso);
      }
    } catch (err: any) {
      console.error('Bryntum task drop error:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Engine Switcher Bar (Apple Segmented Style) */}
      <div className="absolute top-2.5 right-4 z-30 flex items-center bg-[#110F0D] p-0.5 rounded-lg border border-white/[0.08] shadow-inner text-[11px]">
        <button
          onClick={() => setEngineMode('AEGIS_CPM')}
          className={`px-2.5 py-0.5 rounded-md font-medium transition ${
            engineMode === 'AEGIS_CPM'
              ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] shadow-sm'
              : 'text-[#A3998E] hover:text-[#F5F0E6]'
          }`}
        >
          Aegis CPM Canvas
        </button>
        <button
          onClick={() => setEngineMode('BRYNTUM_GRID')}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition ${
            engineMode === 'BRYNTUM_GRID'
              ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] shadow-sm'
              : 'text-[#A3998E] hover:text-[#F5F0E6]'
          }`}
          title="Bryntum Gantt Pro Grid (Trial v7.3.8)"
        >
          <Sparkles className="w-3 h-3 text-[#E5A93C]" />
          <span>Bryntum Pro</span>
        </button>
      </div>

      {/* Main View Area */}
      {engineMode === 'AEGIS_CPM' || bryntumError || !BryntumComponent ? (
        <GanttTimelineSvg onSelectTask={onSelectTask} />
      ) : (
        <div className="w-full h-full bg-[#0B0A09] border border-white/[0.08] rounded-xl overflow-hidden relative shadow-macos-card">
          <BryntumComponent
            tasks={bryntumData.tasks}
            dependencies={bryntumData.dependencies}
            columns={[
              { type: 'wbs', text: 'WBS', width: 60 },
              { type: 'name', field: 'name', text: 'Task Name', width: 240 },
              { type: 'date', field: 'startDate', text: 'Start Date', width: 110 },
              { type: 'number', field: 'duration', text: 'Duration (d)', width: 90 },
              { text: 'LRM Cutoff', field: 'lrmTimestamp', width: 130 },
            ]}
            viewPreset="weekAndDayLetter"
            barMargin={5}
            rowHeight={40}
            onTaskDrop={handleTaskDrop}
            className="b-theme-stockholm-dark h-full w-full"
          />
        </div>
      )}
    </div>
  );
};
