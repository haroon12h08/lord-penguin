import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { BomItem } from '@lord-penguin/shared';
import { 
  Clock, 
  RotateCw, 
  Search, 
  AlertCircle, 
  Lock, 
  Radio 
} from 'lucide-react';

export const StatusBadgeRenderer: React.FC<ICellRendererParams<BomItem>> = (props) => {
  const item = props.data;
  if (!item) return null;

  const status = item.status;

  switch (status) {
    case 'SETTLED':
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span className="inline-flex items-center gap-1 bg-[#34C759]/15 border border-[#34C759]/40 text-[#34C759] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-[0_0_8px_rgba(52,199,89,0.2)]">
            <Lock className="w-2.5 h-2.5 text-[#34C759]" />
            <span>SETTLED</span>
          </span>
        </div>
      );

    case 'SETTLING_PAYPAL':
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span className="inline-flex items-center gap-1 bg-[#E5A93C]/15 border border-[#E5A93C]/60 text-[#E5A93C] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold animate-pulse shadow-[0_0_10px_rgba(229,169,60,0.3)]">
            <RotateCw className="w-2.5 h-2.5 animate-spin" />
            <span>SETTLING</span>
          </span>
        </div>
      );

    case 'VERIFYING_KERNEL':
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span className="inline-flex items-center gap-1 bg-[rgba(229,169,60,0.12)] border border-[#E5A93C]/40 text-[#E5A93C] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
            <Radio className="w-2.5 h-2.5 animate-pulse text-[#E5A93C]" />
            <span>KERNEL VERIFY</span>
          </span>
        </div>
      );

    case 'DISCOVERING_OFFERS':
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span className="inline-flex items-center gap-1 bg-white/[0.05] border border-white/[0.1] text-[#F5F0E6] px-2 py-0.5 rounded-md text-[10px] font-mono font-medium">
            <Search className="w-2.5 h-2.5 text-[#E5A93C]" />
            <span>DISCOVERING</span>
          </span>
        </div>
      );

    case 'OFFER_REJECTED':
    case 'SETTLEMENT_FAILED':
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span 
            className="inline-flex items-center gap-1 bg-[#FF453A]/15 border border-[#FF453A]/40 text-[#FF453A] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
            title={item.statusReason || 'Settlement or delivery rejected'}
          >
            <AlertCircle className="w-2.5 h-2.5" />
            <span>REJECTED</span>
          </span>
        </div>
      );

    case 'MONITORING':
    default:
      return (
        <div className="flex items-center gap-1.5 h-full">
          <span className="inline-flex items-center gap-1 bg-[rgba(30,26,23,0.85)] border border-white/[0.08] text-[#A3998E] px-2 py-0.5 rounded-md text-[10px] font-mono font-medium">
            <Clock className="w-2.5 h-2.5 text-[#A3998E]" />
            <span>MONITORING</span>
          </span>
        </div>
      );
  }
};
