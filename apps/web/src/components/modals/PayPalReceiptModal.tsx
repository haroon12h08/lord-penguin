import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, CheckCircle2, ShieldCheck, ExternalLink, RotateCcw } from 'lucide-react';

export const PayPalReceiptModal: React.FC = () => {
  const { activeModal, closeModal, selectedSettlement, selectedBomItem } = useProjectStore();

  if (activeModal !== 'PAYPAL_RECEIPT') return null;

  const set = selectedSettlement || selectedBomItem?.settlement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[rgba(22,19,17,0.96)] backdrop-blur-2xl border border-white/[0.12] rounded-[14px] shadow-macos-window max-w-2xl w-full overflow-hidden text-[#F5F0E6] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            <h3 className="font-semibold text-sm text-[#F5F0E6]">
              PayPal Settlement Receipt & APIMatic Validation Proof
            </h3>
          </div>
          <button
            onClick={closeModal}
            className="text-[#A3998E] hover:text-[#F5F0E6] p-1 rounded-md hover:bg-white/[0.05] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          {!set ? (
            <div className="text-center py-8 text-[#A3998E] font-sans">
              No PayPal settlement record found for this item yet. Trigger procurement strike to settle via PayPal Sandbox Orders v2 or Invoices v2.
            </div>
          ) : (
            <>
              {/* Top APIMatic & Status Strip */}
              <div className="flex items-center justify-between bg-[rgba(30,26,23,0.65)] p-3 rounded-lg border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#E5A93C]" />
                  <div>
                    <div className="text-[10px] text-[#A3998E]">APIMATIC ENGINE</div>
                    <div className="font-bold text-[#E5A93C]">
                      {set.apimaticValidated ? 'SDK MODEL VALIDATED (OrdersController)' : 'AGENT TOOLKIT VALIDATED'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#A3998E]">RAIL & ENVIRONMENT</div>
                  <div className="font-bold text-[#34C759]">
                    {set.settlementRail} // {set.paypalEnvironment}
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">GROSS AMOUNT</span>
                  <span className="font-bold text-[#F5F0E6] text-sm tabular-nums">
                    ${set.grossAmountUsd?.toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">COMMISSION REBATE</span>
                  <span className="font-bold text-[#E5A93C] text-sm tabular-nums">
                    ${set.commissionRebateUsd?.toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">NET SETTLED</span>
                  <span className="font-bold text-[#34C759] text-sm tabular-nums">
                    ${set.netSettledUsd?.toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">SAVED VS BASE</span>
                  <span className="font-bold text-[#34C759] text-sm tabular-nums">
                    +${set.savingsVsBaselineUsd?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Transaction IDs */}
              <div className="bg-[#0B0A09] p-3 rounded-lg border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#A3998E]">PAYPAL ORDER ID:</span>
                  <span className="text-[#E5A93C] font-bold">{set.paypalOrderId || 'N/A (Invoice Rail)'}</span>
                </div>
                {set.paypalInvoiceId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#A3998E]">PAYPAL INVOICE ID:</span>
                    <span className="text-[#E5A93C] font-bold">{set.paypalInvoiceId}</span>
                  </div>
                )}
                {set.paypalCaptureId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#A3998E]">CAPTURE ID:</span>
                    <span className="text-[#F5F0E6]">{set.paypalCaptureId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#A3998E]">IDEMPOTENCY KEY:</span>
                  <span className="text-[#A3998E] truncate max-w-xs">{set.idempotencyKey}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A3998E]">AGENT TOOLKIT TOOL:</span>
                  <span className="text-[#34C759]">{set.agentToolkitToolUsed}</span>
                </div>
              </div>

              {/* Raw PayPal API Response JSON */}
              <div>
                <span className="text-[10px] text-[#A3998E] block mb-1">
                  OFFICIAL PAYPAL REST API V2 RESPONSE PAYLOAD
                </span>
                <pre className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08] text-[10px] text-[#F5F0E6] overflow-x-auto max-h-44 whitespace-pre-wrap">
                  {JSON.stringify(set.rawPaypalResponseJson, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-black/20 flex justify-end">
          <button
            onClick={closeModal}
            className="px-4 py-1.5 rounded-lg bg-[rgba(30,26,23,0.9)] hover:bg-white/[0.08] text-[#F5F0E6] border border-white/[0.1] text-xs font-medium transition"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
