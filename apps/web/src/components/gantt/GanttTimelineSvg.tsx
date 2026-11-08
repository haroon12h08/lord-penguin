import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { ProjectTask, BomItem } from '@lord-penguin/shared';
import { Calendar, CheckCircle2, Clock, MoveHorizontal, AlertCircle } from 'lucide-react';

interface GanttTimelineSvgProps {
  onSelectTask?: (task: ProjectTask, bomItem?: BomItem) => void;
}

export const GanttTimelineSvg: React.FC<GanttTimelineSvgProps> = ({ onSelectTask }) => {
  const { project, tasks, dependencies, bomItems, rescheduleTask, selectBomItem } = useProjectStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Time range calculation
  // Project horizon: default from Nov 07, 2026 to Nov 27, 2026 (21 days)
  const baseStart = new Date('2026-11-07T00:00:00Z').getTime();
  const totalDays = 21;
  const dayMs = 24 * 60 * 60 * 1000;
  const pixelsPerDay = 52; // width per day
  const timelineWidth = totalDays * pixelsPerDay;
  const rowHeight = 44;
  const headerHeight = 38;

  // Dragging state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);

  // Virtual Now timestamp
  const virtualNow = project?.virtualNowTimestamp
    ? new Date(project.virtualNowTimestamp).getTime()
    : baseStart;
  const virtualNowDays = Math.max(0, (virtualNow - baseStart) / dayMs);
  const virtualNowX = virtualNowDays * pixelsPerDay;

  // Helper: map task to X coordinate and width
  const getTaskGeometry = (task: ProjectTask) => {
    const start = new Date(task.startDate).getTime();
    const end = new Date(task.endDate).getTime();
    const startDay = (start - baseStart) / dayMs;
    const durationDays = Math.max(1, (end - start) / dayMs);

    let offset = 0;
    if (draggingTaskId === task.id) {
      offset = dragOffsetDays * pixelsPerDay;
    }

    const x = Math.max(0, startDay * pixelsPerDay) + offset;
    const w = Math.max(pixelsPerDay * 0.9, durationDays * pixelsPerDay);

    return { x, w, startDay, durationDays };
  };

  // Helper: calculate LRM X coordinate
  const getLrmX = (bomItem?: BomItem) => {
    if (!bomItem || !bomItem.lrmTimestamp) return null;
    const lrmTime = new Date(bomItem.lrmTimestamp).getTime();
    const lrmDay = (lrmTime - baseStart) / dayMs;
    return lrmDay * pixelsPerDay;
  };

  // Drag listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTaskId) return;
      const dx = e.clientX - dragStartX;
      const days = Math.round(dx / pixelsPerDay);
      setDragOffsetDays(days);
    };

    const handleMouseUp = () => {
      if (!draggingTaskId) return;
      const task = tasks.find((t) => t.id === draggingTaskId);
      if (task && dragOffsetDays !== 0) {
        const origStart = new Date(task.startDate).getTime();
        const origEnd = new Date(task.endDate).getTime();
        const duration = origEnd - origStart;

        const newStartTime = new Date(origStart + dragOffsetDays * dayMs);
        const newEndTime = new Date(newStartTime.getTime() + duration);

        const newStartIso = newStartTime.toISOString().split('T')[0];
        const newEndIso = newEndTime.toISOString().split('T')[0];

        rescheduleTask(task.id, newStartIso, newEndIso);
      }
      setDraggingTaskId(null);
      setDragOffsetDays(0);
    };

    if (draggingTaskId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTaskId, dragStartX, dragOffsetDays, tasks, rescheduleTask]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0A09] border border-white/[0.08] rounded-xl overflow-hidden select-none shadow-macos-card">
      {/* Top Banner with Instructions & Legend */}
      <div className="bg-[rgba(22,19,17,0.85)] backdrop-blur-md px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-[#F5F0E6]">
            <Calendar className="w-4 h-4 text-[#E5A93C]" />
            <span>CPM Critical Path Timeline</span>
          </div>
          <span className="hidden md:inline text-[11px] text-[#A3998E]">
            ↔ Drag bars to reschedule. Engine recalculates T_LRM and executes autonomous strikes.
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-[rgba(30,26,23,0.9)] border border-white/[0.15]"></span>
            <span className="text-[#A3998E]">Monitoring</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-[#E5A93C]/25 border border-[#E5A93C] animate-pulse"></span>
            <span className="text-[#E5A93C]">Settling</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-[#34C759]/25 border border-[#34C759]"></span>
            <span className="text-[#34C759]">Settled</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t border-dashed border-[#E5A93C]"></span>
            <span className="text-[#E5A93C] font-semibold">T_LRM</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Canvas (Split: Left Task Grid, Right SVG Timeline) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Table Grid (Task Name, Phase, Dur, Status) */}
        <div className="w-[280px] border-r border-white/[0.08] bg-[rgba(22,19,17,0.5)] backdrop-blur-md flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Table Header */}
          <div
            className="flex items-center text-[10px] uppercase font-mono font-semibold text-[#A3998E] border-b border-white/[0.08] px-3 bg-[rgba(22,19,17,0.9)] sticky top-0 z-10"
            style={{ height: `${headerHeight}px` }}
          >
            <span className="w-16">Code</span>
            <span className="flex-1">Deliverable</span>
            <span className="w-12 text-right">Dur</span>
          </div>

          {/* Table Rows */}
          {tasks.map((task, idx) => {
            const bomItem = bomItems.find((b) => b.taskId === task.id);
            const isSettled = bomItem?.status === 'SETTLED';
            const isSettling = bomItem?.status === 'SETTLING_PAYPAL';

            return (
              <div
                key={task.id}
                onClick={() => {
                  if (bomItem) {
                    selectBomItem(bomItem);
                    if (onSelectTask) onSelectTask(task, bomItem);
                  }
                }}
                className={`flex items-center px-3 border-b border-white/[0.04] text-xs transition cursor-pointer hover:bg-white/[0.04] ${
                  task.isCriticalPath ? 'border-l-2 border-l-[#FF453A]' : 'border-l-2 border-l-transparent'
                } ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.15]'}`}
                style={{ height: `${rowHeight}px` }}
              >
                <span className="w-16 font-mono text-[11px] text-[#E5A93C] font-medium truncate">
                  {task.externalCode}
                </span>
                <div className="flex-1 truncate pr-1">
                  <div className="font-medium text-[#F5F0E6] truncate text-[11px]">{task.name}</div>
                  <div className="text-[10px] text-[#A3998E] truncate">
                    {bomItem?.itemName || task.phaseName}
                  </div>
                </div>
                <span className="w-12 text-right font-mono text-[11px] text-[#A3998E] tabular-nums">
                  {task.durationDays}d
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0B0A09]">
          <div style={{ width: `${timelineWidth + 60}px`, minHeight: '100%', position: 'relative' }}>
            {/* 1. Header: Days & Dates */}
            <div
              className="sticky top-0 z-20 flex bg-[rgba(22,19,17,0.92)] backdrop-blur-md border-b border-white/[0.08]"
              style={{ height: `${headerHeight}px` }}
            >
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayDate = new Date(baseStart + i * dayMs);
                const dayNum = dayDate.getUTCDate();
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });
                const isWeekend = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;

                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center border-r border-white/[0.04] text-[10px] font-mono ${
                      isWeekend ? 'bg-black/40 text-[#A3998E]/60' : 'text-[#A3998E]'
                    }`}
                    style={{ width: `${pixelsPerDay}px` }}
                  >
                    <span className="font-semibold text-[#F5F0E6] tabular-nums">{dayNum}</span>
                    <span className="text-[9px] uppercase">{dayName}</span>
                  </div>
                );
              })}
            </div>

            {/* 2. Grid Background Columns & Weekend Highlights */}
            <div className="absolute inset-0 top-[38px] pointer-events-none flex">
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayDate = new Date(baseStart + i * dayMs);
                const isWeekend = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;
                return (
                  <div
                    key={i}
                    className={`border-r border-white/[0.03] h-full ${
                      isWeekend ? 'bg-black/30' : ''
                    }`}
                    style={{ width: `${pixelsPerDay}px` }}
                  />
                );
              })}
            </div>

            {/* 3. Virtual Clock Line (Warm Amber/Green Vertical Indicator) */}
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
              style={{ left: `${virtualNowX}px` }}
            >
              <div className="bg-[#E5A93C] text-[#0B0A09] font-mono font-bold text-[8px] px-1 py-0.2 rounded shadow-sm">
                NOW
              </div>
              <div className="w-[1.5px] flex-1 bg-[#E5A93C] shadow-[0_0_8px_rgba(229,169,60,0.6)]" />
            </div>

            {/* 4. Dependency Curves (SVG Overlay) */}
            <svg
              className="absolute inset-0 pointer-events-none z-10"
              style={{ width: `${timelineWidth + 60}px`, height: `${headerHeight + tasks.length * rowHeight}px` }}
            >
              <defs>
                <marker
                  id="macos-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#E5A93C" opacity="0.85" />
                </marker>
              </defs>
              {dependencies.map((dep) => {
                const fromIndex = tasks.findIndex((t) => t.id === dep.fromTaskId);
                const toIndex = tasks.findIndex((t) => t.id === dep.toTaskId);
                if (fromIndex === -1 || toIndex === -1) return null;

                const fromTask = tasks[fromIndex];
                const toTask = tasks[toIndex];
                const fromGeom = getTaskGeometry(fromTask);
                const toGeom = getTaskGeometry(toTask);

                const x1 = fromGeom.x + fromGeom.w;
                const y1 = headerHeight + fromIndex * rowHeight + rowHeight / 2;
                const x2 = toGeom.x;
                const y2 = headerHeight + toIndex * rowHeight + rowHeight / 2;

                const dx = Math.max(16, (x2 - x1) / 2);
                const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                return (
                  <path
                    key={dep.id}
                    d={path}
                    fill="none"
                    stroke="#E5A93C"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                    markerEnd="url(#macos-arrow)"
                  />
                );
              })}
            </svg>

            {/* 5. Task Bars & LRM Cutoff Markers */}
            <div className="relative pt-0" style={{ height: `${tasks.length * rowHeight}px` }}>
              {tasks.map((task, idx) => {
                const geom = getTaskGeometry(task);
                const bomItem = bomItems.find((b) => b.taskId === task.id);
                const lrmX = getLrmX(bomItem);

                const isSettled = bomItem?.status === 'SETTLED';
                const isSettling = bomItem?.status === 'SETTLING_PAYPAL';

                // Bar styling in Espresso & Obsidian palette
                let barBg = 'bg-[rgba(30,26,23,0.95)] border-white/[0.14] hover:border-white/[0.25] text-[#F5F0E6] shadow-macos-card';
                if (isSettled) {
                  barBg = 'bg-[#34C759]/20 border-[#34C759]/60 text-[#F5F0E6] shadow-[0_0_12px_rgba(52,199,89,0.25)]';
                } else if (isSettling) {
                  barBg = 'bg-[#E5A93C]/25 border-[#E5A93C] text-[#F5F0E6] animate-pulse shadow-[0_0_14px_rgba(229,169,60,0.4)]';
                } else if (task.isCriticalPath) {
                  barBg = 'bg-[rgba(45,20,18,0.95)] border-[#FF453A]/70 text-[#F5F0E6]';
                }

                return (
                  <div
                    key={task.id}
                    className="relative flex items-center"
                    style={{ height: `${rowHeight}px` }}
                  >
                    {/* Task Bar Element */}
                    <div
                      onMouseDown={(e) => {
                        setDraggingTaskId(task.id);
                        setDragStartX(e.clientX);
                        setDragOffsetDays(0);
                      }}
                      onClick={() => {
                        if (bomItem) {
                          selectBomItem(bomItem);
                          if (onSelectTask) onSelectTask(task, bomItem);
                        }
                      }}
                      className={`absolute rounded-lg h-[28px] border px-2 flex items-center justify-between text-xs cursor-grab active:cursor-grabbing transition-all select-none group z-10 ${barBg}`}
                      style={{
                        left: `${geom.x}px`,
                        width: `${geom.w}px`,
                      }}
                      title={`${task.name} (${task.startDate} to ${task.endDate}) - Drag to reschedule`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {isSettled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] flex-shrink-0" />
                        ) : isSettling ? (
                          <Clock className="w-3.5 h-3.5 text-[#E5A93C] animate-spin flex-shrink-0" />
                        ) : (
                          <MoveHorizontal className="w-3 h-3 text-[#A3998E] opacity-60 group-hover:opacity-100 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate text-[11px]">{task.name}</span>
                      </div>

                      <span className="font-mono text-[10px] text-[#A3998E] pl-1 flex-shrink-0 tabular-nums">
                        {task.durationDays}d
                      </span>
                    </div>

                    {/* LRM Cutoff Indicator Line */}
                    {lrmX !== null && (
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
                        style={{ left: `${lrmX}px` }}
                        title={`Last Responsible Moment Cutoff: ${bomItem?.lrmTimestamp}`}
                      >
                        <div className="w-[1.5px] h-full border-r border-dashed border-[#E5A93C] opacity-80" />
                        <div className="absolute -top-1 bg-[#E5A93C] text-[#0B0A09] font-mono text-[8px] font-bold px-1 rounded shadow-sm transform -translate-x-1/2">
                          LRM
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
