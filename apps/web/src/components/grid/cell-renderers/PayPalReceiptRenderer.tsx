import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { BomItem } from '@lord-penguin/shared';
import { useProjectStore } from '../../../store/useProjectStore';
import { CheckCircle2, Play, ExternalLink, RotateCw } from 'lucide-react';

export const PayPalReceiptRenderer: React.FC<ICellRendererParams<BomItem>> = (props) => {
  const item = props.data;
  const { triggerProcurement, openModal } = useProjectStore();

  if (!item) return null;

  const settlement = item.settlement;
  const isSettled = item.status === 'SETTLED' && !!settlement;
  const isSettling = item.status === 'SETTLING_PAYPAL';

  if (isSettled) {
    const isOrder = settlement.settlementRail === 'PAYPAL_ORDER';
    const displayId = isOrder 
      ? settlement.paypalOrderId || 'Order'
      : settlement.paypalInvoiceId || 'Invoice';

    return (
      <div className="flex items-center gap-1.5 h-full">
        <button
          onClick={() => openModal('PAYPAL_RECEIPT', { bomItem: item, settlement })}
          className="flex items-center gap-1 bg-[#34C759]/15 border border-[#34C759]/40 text-[#34C759] hover:bg-[#34C759]/25 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition shadow-sm"
          title="Open PayPal Sandbox Receipt & APIMatic Validation Record"
        >
          <CheckCircle2 className="w-2.5 h-2.5 text-[#34C759]" />
          <span className="truncate max-w-[85px]">{displayId}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
        </button>
      </div>
    );
  }

  if (isSettling) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-mono text-[#E5A93C] animate-pulse h-full">
        <RotateCw className="w-2.5 h-2.5 animate-spin text-[#E5A93C]" />
        <span>Capturing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 h-full">
      <button
        onClick={() => triggerProcurement(item.id)}
        className="flex items-center gap-1 bg-[#E5A93C] hover:bg-[#F3BE58] text-[#0B0A09] font-bold px-2.5 py-0.5 rounded-md text-[10px] font-mono transition shadow-sm"
        title="Execute 3-Stage Autonomous Strike: Channel3 Index -> KERNEL DOM Verify -> PayPal Settle"
      >
        <Play className="w-2.5 h-2.5 fill-current" />
        <span>Strike</span>
      </button>

      <span className="text-[9px] font-mono text-[#A3998E] bg-[rgba(30,26,23,0.9)] px-1.5 py-0.5 rounded border border-white/[0.08]">
        {item.settlementRail === 'PAYPAL_ORDER' ? 'Order' : 'Invoice'}
      </span>
    </div>
  );
};
