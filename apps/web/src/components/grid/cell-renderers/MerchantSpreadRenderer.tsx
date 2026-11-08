import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { BomItem } from '@lord-penguin/shared';
import { Store, TrendingDown } from 'lucide-react';

export const MerchantSpreadRenderer: React.FC<ICellRendererParams<BomItem>> = (props) => {
  const item = props.data;
  if (!item) return null;

  const bestOffer = item.offers?.find((o) => o.isBestOffer) || item.offers?.[0];

  if (!bestOffer) {
    return (
      <div className="flex items-center text-[#A3998E] text-xs italic h-full">
        Searching Channel3 catalog...
      </div>
    );
  }

  const baselinePrice = item.baselineUnitPriceUsd;
  const unitPrice = bestOffer.unitPriceUsd;
  const savings = baselinePrice - unitPrice;
  const savingsPct = baselinePrice > 0 ? ((savings / baselinePrice) * 100).toFixed(1) : '0';

  return (
    <div className="flex flex-col justify-center h-full py-1 text-xs">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 font-medium text-[#F5F0E6] truncate">
          <Store className="w-3 h-3 text-[#E5A93C] flex-shrink-0" />
          <span className="truncate">{bestOffer.merchantName}</span>
        </div>

        <span className="font-mono font-bold text-[#F5F0E6] tabular-nums">
          ${unitPrice.toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] mt-0.5">
        <div className="flex items-center gap-1">
          {savings > 0 ? (
            <span className="text-[#34C759] font-mono font-medium flex items-center tabular-nums">
              <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
              -${savings.toFixed(0)} ({savingsPct}%)
            </span>
          ) : (
            <span className="text-[#A3998E] font-mono">At Baseline</span>
          )}
        </div>

        {bestOffer.commissionRatePct > 0 && (
          <span className="bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-[#E5A93C] font-mono px-1 rounded text-[9px]">
            +{bestOffer.commissionRatePct}% rebate
          </span>
        )}
      </div>
    </div>
  );
};
