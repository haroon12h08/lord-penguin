import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { 
  TrendingDown, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const TopTelemetryBar: React.FC = () => {
  const { telemetry, bomItems } = useProjectStore();

  const baseline = telemetry?.totalBaselineCostUsd ?? 12840;
  const landedNet = telemetry?.totalOptimizedNetCostUsd ?? 10392.5;
  const arbitrage = telemetry?.totalArbitrageSavingsUsd ?? 2447.5;
  const capitalYield = telemetry?.totalWorkingCapitalYieldUsd ?? 184.2;
  const floatDays = telemetry?.averageFloatDaysSaved ?? 14.6;
  const settledCount = bomItems.filter((b) => b.status === 'SETTLED').length;
  const totalItems = bomItems.length || 8;

  const savingsPct = baseline > 0 ? ((arbitrage / baseline) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 p-3 bg-transparent select-none">
      {/* 1. Baseline Budget Cap Card */}
      <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-2.5 rounded-xl shadow-macos-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-[#A3998E] uppercase tracking-wider font-semibold font-mono">
          <span>Baseline Cap</span>
          <span className="text-[#A3998E]">MSRP</span>
        </div>
        <div className="mt-1 font-mono font-bold text-base text-[#A3998E] tabular-nums">
          ${baseline.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-[#A3998E] mt-0.5 truncate">
          Initial unoptimized specification
        </div>
      </div>

      {/* 2. Landed Net Arbitrage Card */}
      <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-2.5 rounded-xl shadow-macos-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold font-mono">
          <span className="text-[#E5A93C]">Landed Net Cost</span>
          <span className="bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/30 text-[9px] px-1.5 py-0.2 rounded font-bold">
            -{savingsPct}%
          </span>
        </div>
        <div className="mt-1 font-mono font-bold text-base text-[#F5F0E6] tabular-nums">
          ${landedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-[#A3998E] mt-0.5 flex items-center gap-1 truncate">
          <span>Channel3 Verified Best Offers</span>
        </div>
      </div>

      {/* 3. Net Arbitrage Saved Card */}
      <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-2.5 rounded-xl shadow-macos-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-[#34C759] uppercase tracking-wider font-semibold font-mono">
          <span>Arbitrage Savings</span>
          <ArrowUpRight className="w-3 h-3 text-[#34C759]" />
        </div>
        <div className="mt-1 font-mono font-bold text-base text-[#34C759] tabular-nums">
          +${arbitrage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-[#A3998E] mt-0.5 truncate">
          Cross-merchant spread + 3% rebates
        </div>
      </div>

      {/* 4. Float Working Capital Yield Card */}
      <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-2.5 rounded-xl shadow-macos-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-[#E5A93C] uppercase tracking-wider font-semibold font-mono">
          <span>Float Yield</span>
          <span className="text-[9px] text-[#E5A93C] font-mono">8.5% APR</span>
        </div>
        <div className="mt-1 font-mono font-bold text-base text-[#E5A93C] tabular-nums">
          +${capitalYield.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-[#A3998E] mt-0.5 truncate">
          Preserved across {floatDays.toFixed(1)} float days
        </div>
      </div>

      {/* 5. Settlement Rail Progress Card */}
      <div className="bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] p-2.5 rounded-xl shadow-macos-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] text-[#A3998E] uppercase tracking-wider font-semibold font-mono">
          <span>PayPal Settlement</span>
          <span className="text-[#34C759] font-mono">SANDBOX</span>
        </div>
        <div className="mt-1 font-mono font-bold text-base text-[#F5F0E6] flex items-center justify-between">
          <span>{settledCount}/{totalItems} Items</span>
          <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
        </div>
        <div className="text-[10px] text-[#A3998E] mt-0.5 truncate font-mono">
          Dual-Rail: Orders v2 + Invoices v2
        </div>
      </div>
    </div>
  );
};
