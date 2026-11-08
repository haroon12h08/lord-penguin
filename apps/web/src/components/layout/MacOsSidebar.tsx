import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { 
  Layers, 
  Calendar, 
  Grid3X3, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Sliders, 
  Sparkles,
  Cpu,
  ChevronDown,
  Building2,
  DollarSign
} from 'lucide-react';

interface MacOsSidebarProps {
  activeTab: 'all' | 'schedule' | 'matrix';
  setActiveTab: (tab: 'all' | 'schedule' | 'matrix') => void;
}

export const MacOsSidebar: React.FC<MacOsSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { project, telemetry, bomItems, isStreaming } = useProjectStore();

  const baseline = telemetry?.totalBaselineCostUsd ?? 12840;
  const landedNet = telemetry?.totalOptimizedNetCostUsd ?? 10392.5;
  const arbitrage = telemetry?.totalArbitrageSavingsUsd ?? 2447.5;
  const capitalYield = telemetry?.totalWorkingCapitalYieldUsd ?? 184.2;

  const settledCount = bomItems.filter((b) => b.status === 'SETTLED').length;
  const totalCount = bomItems.length || 8;

  return (
    <aside className="w-64 bg-[rgba(22,19,17,0.82)] backdrop-blur-xl border-r border-white/[0.08] flex flex-col justify-between select-none text-xs flex-shrink-0 z-20 overflow-y-auto">
      {/* 1. Top Section: Project Context & Switcher */}
      <div className="p-3.5 space-y-4">
        {/* Workspace Card */}
        <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-3 rounded-xl shadow-macos-card">
          <div className="flex items-center justify-between text-[10px] text-[#A3998E] uppercase tracking-wider font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#E5A93C]" />
              <span>Active Studio Project</span>
            </span>
            <span className="font-mono text-[#34C759]">● ONLINE</span>
          </div>

          <div className="font-medium text-[#F5F0E6] text-xs truncate leading-snug">
            {project?.name || 'Austin 10-Seat AI Studio'}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-[#A3998E]">
            <span>ZIP {project?.destinationZip || '78701'}</span>
            <span className="text-[#E5A93C] font-semibold">${project?.budgetCapUsd?.toLocaleString() || '14,500'} CAP</span>
          </div>
        </div>

        {/* Treasury Overview Widget */}
        <div className="bg-[rgba(30,26,23,0.45)] border border-white/[0.08] p-3 rounded-xl space-y-2">
          <div className="text-[10px] text-[#A3998E] font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>Treasury & Yield</span>
            <span className="text-[#E5A93C] font-mono">8.5% APR</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A3998E]">Landed Net:</span>
              <span className="font-mono font-bold text-[#F5F0E6] tabular-nums">
                ${landedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A3998E]">Arbitrage Saved:</span>
              <span className="font-mono font-bold text-[#34C759] tabular-nums">
                +${arbitrage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A3998E]">Float Preserved:</span>
              <span className="font-mono font-bold text-[#E5A93C] tabular-nums">
                +${capitalYield.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] text-[#A3998E] mb-1">
              <span>Settlement Progress</span>
              <span className="font-mono text-[#F5F0E6]">{settledCount}/{totalCount} Items</span>
            </div>
            <div className="w-full bg-[#110F0D] h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div 
                className="bg-[#E5A93C] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(229,169,60,0.5)]"
                style={{ width: `${(settledCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1 pt-1">
          <div className="text-[10px] text-[#A3998E] uppercase tracking-wider font-semibold px-2 mb-1.5">
            Command Center
          </div>

          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'all'
                ? 'bg-[rgba(229,169,60,0.15)] text-[#F5F0E6] border border-[#E5A93C]/30 shadow-sm'
                : 'text-[#A3998E] hover:text-[#F5F0E6] hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#E5A93C]" />
            <span>Unified Pro View</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'schedule'
                ? 'bg-[rgba(229,169,60,0.15)] text-[#F5F0E6] border border-[#E5A93C]/30 shadow-sm'
                : 'text-[#A3998E] hover:text-[#F5F0E6] hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#E5A93C]" />
            <span>CPM Timeline (Bryntum)</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'matrix'
                ? 'bg-[rgba(229,169,60,0.15)] text-[#F5F0E6] border border-[#E5A93C]/30 shadow-sm'
                : 'text-[#A3998E] hover:text-[#F5F0E6] hover:bg-white/[0.04]'
            }`}
          >
            <Grid3X3 className="w-4 h-4 text-[#E5A93C]" />
            <span>Financial Matrix (AG Grid)</span>
          </button>
        </div>

        {/* Sponsor Engines & Rails */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="text-[10px] text-[#A3998E] uppercase tracking-wider font-semibold px-2">
            Integrated Rails
          </div>

          <div className="bg-[rgba(30,26,23,0.35)] border border-white/[0.06] rounded-lg p-2.5 space-y-2 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#F5F0E6]">
                <CreditCard className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>PayPal Orders v2</span>
              </span>
              <span className="text-[10px] text-[#34C759] font-bold">SANDBOX</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#F5F0E6]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>APIMatic SDK</span>
              </span>
              <span className="text-[10px] text-[#34C759] font-bold">VALIDATED</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#F5F0E6]">
                <Store className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>Channel3 Graph</span>
              </span>
              <span className="text-[10px] text-[#34C759] font-bold">100M+ SKUS</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#F5F0E6]">
                <Cpu className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>KERNEL Stealth</span>
              </span>
              <span className="text-[10px] text-[#34C759] font-bold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bottom Section: macOS Operator Profile & Version */}
      <div className="p-3 border-t border-white/[0.08] bg-[rgba(17,15,13,0.85)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#E5A93C] text-[#0B0A09] font-bold flex items-center justify-center text-[10px]">
            LP
          </div>
          <div>
            <div className="font-medium text-[#F5F0E6] text-xs">Autonomous Agent</div>
            <div className="text-[10px] text-[#A3998E] font-mono">treasury.controller</div>
          </div>
        </div>

        <span className="text-[9px] font-mono bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 rounded text-[#A3998E]">
          v1.0-PRO
        </span>
      </div>
    </aside>
  );
};
