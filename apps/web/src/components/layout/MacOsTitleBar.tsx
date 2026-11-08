import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { 
  FastForward, 
  Zap, 
  RotateCcw, 
  PlusCircle, 
  Clock, 
  SlidersHorizontal,
  Wifi,
  Sparkles,
  Layers,
  Calendar,
  Grid3X3
} from 'lucide-react';

interface MacOsTitleBarProps {
  activeTab: 'all' | 'schedule' | 'matrix';
  setActiveTab: (tab: 'all' | 'schedule' | 'matrix') => void;
  onToggleSidebar?: () => void;
}

export const MacOsTitleBar: React.FC<MacOsTitleBarProps> = ({
  activeTab,
  setActiveTab,
  onToggleSidebar,
}) => {
  const {
    project,
    isStreaming,
    isSimulating,
    advanceVirtualClock,
    triggerFlashPriceDrop,
    resetDemo,
    openModal,
  } = useProjectStore();

  const [hoveredTraffic, setHoveredTraffic] = useState(false);

  const formatClock = (timestamp?: string) => {
    if (!timestamp) return 'Nov 07, 2026';
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <header className="h-11 bg-[rgba(22,19,17,0.85)] backdrop-blur-xl border-b border-white/[0.08] px-3.5 flex items-center justify-between select-none relative z-30">
      {/* 1. Left: macOS Traffic Lights + Window Icon + Title */}
      <div className="flex items-center gap-3.5">
        {/* Apple Traffic Lights */}
        <div 
          className="flex items-center gap-2 group cursor-default"
          onMouseEnter={() => setHoveredTraffic(true)}
          onMouseLeave={() => setHoveredTraffic(false)}
        >
          {/* Close */}
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center text-[8px] font-bold text-[#4D0000] opacity-90 group-hover:opacity-100 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className={hoveredTraffic ? 'opacity-100' : 'opacity-0'}>✕</span>
          </div>
          {/* Minimize */}
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center text-[8px] font-bold text-[#543500] opacity-90 group-hover:opacity-100 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className={hoveredTraffic ? 'opacity-100' : 'opacity-0'}>–</span>
          </div>
          {/* Expand */}
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center text-[7px] font-bold text-[#004D0D] opacity-90 group-hover:opacity-100 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className={hoveredTraffic ? 'opacity-100' : 'opacity-0'}>+</span>
          </div>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-4 bg-white/[0.08]" />

        {/* Window Title & Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-sm" role="img" aria-label="penguin">🐧</span>
          <div className="flex items-center gap-1.5 font-medium tracking-tight">
            <span className="text-[#F5F0E6] font-semibold">LORD-PENGUIN</span>
            <span className="text-[#A3998E]">/</span>
            <span className="text-[#E5A93C] font-semibold">AegisBOM Pro</span>
          </div>

          <span className="hidden md:inline-flex text-[10px] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded text-[#A3998E] font-mono">
            {project?.name || 'Austin 10-Seat AI Studio (ZIP 78701)'}
          </span>
        </div>
      </div>

      {/* 2. Middle: Apple-Style Segmented View Control */}
      <div className="hidden lg:flex items-center bg-[#110F0D] p-0.5 rounded-lg border border-white/[0.08] shadow-inner">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] shadow-sm'
              : 'text-[#A3998E] hover:text-[#F5F0E6]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>Unified Pro</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === 'schedule'
              ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] shadow-sm'
              : 'text-[#A3998E] hover:text-[#F5F0E6]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>CPM Horizon</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            activeTab === 'matrix'
              ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] shadow-sm'
              : 'text-[#A3998E] hover:text-[#F5F0E6]'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>AG Grid Matrix</span>
        </button>
      </div>

      {/* 3. Right: Virtual Clock, Demo Controls & Status */}
      <div className="flex items-center gap-2 text-xs">
        {/* Virtual Clock Display with +24h */}
        <div className="flex items-center bg-[rgba(30,26,23,0.65)] border border-white/[0.08] rounded-md px-2.5 py-1 text-xs">
          <Clock className="w-3.5 h-3.5 text-[#E5A93C] mr-1.5" />
          <span className="font-mono text-[#F5F0E6] font-semibold text-[11px] mr-2 tabular-nums">
            {formatClock(project?.virtualNowTimestamp)}
          </span>
          <button
            onClick={() => advanceVirtualClock(24)}
            disabled={isSimulating}
            className="flex items-center gap-1 bg-[#E5A93C] hover:bg-[#F3BE58] text-[#0B0A09] text-[10px] font-bold px-1.5 py-0.5 rounded transition shadow-sm disabled:opacity-50"
            title="Advance simulation clock forward 24 hours to test LRM deadline strikes"
          >
            <FastForward className="w-2.5 h-2.5" />
            <span>+24h</span>
          </button>
        </div>

        {/* Demo Shocks */}
        <button
          onClick={() => triggerFlashPriceDrop()}
          disabled={isSimulating}
          className="flex items-center gap-1 bg-[rgba(229,169,60,0.12)] hover:bg-[rgba(229,169,60,0.2)] text-[#E5A93C] border border-[#E5A93C]/30 px-2 py-1 rounded-md transition font-medium text-xs disabled:opacity-50"
          title="Simulate Channel3 18% flash price drop to trigger autonomous strike"
        >
          <Zap className="w-3 h-3 text-[#E5A93C]" />
          <span className="hidden sm:inline">Flash -18%</span>
        </button>

        <button
          onClick={() => resetDemo()}
          disabled={isSimulating}
          className="p-1 rounded-md text-[#A3998E] hover:text-[#F5F0E6] hover:bg-white/[0.05] border border-white/[0.08] transition"
          title="Reset Demo State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* New Brief Button */}
        <button
          onClick={() => openModal('NEW_BRIEF')}
          className="flex items-center gap-1.5 bg-[rgba(30,26,23,0.85)] hover:bg-[rgba(30,26,23,1)] text-[#F5F0E6] border border-white/[0.12] hover:border-[#E5A93C]/50 px-2.5 py-1 rounded-md transition font-medium"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span className="hidden sm:inline">+ Brief</span>
        </button>

        {/* SSE Pulse Indicator */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.08] text-[10px] font-mono text-[#A3998E]"
          title={isStreaming ? 'SSE Real-Time Stream Connected' : 'SSE Disconnected'}
        >
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-[#34C759] shadow-[0_0_8px_#34C759]' : 'bg-[#FF453A]'}`} />
          <span className="hidden xl:inline">{isStreaming ? 'LIVE' : 'SYNC'}</span>
        </div>
      </div>
    </header>
  );
};
