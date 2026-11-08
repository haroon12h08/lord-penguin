import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Globe, CheckCircle2, AlertTriangle, ExternalLink, Cpu } from 'lucide-react';

export const KernelLiveViewModal: React.FC = () => {
  const { activeModal, closeModal, selectedVerification, selectedBomItem } = useProjectStore();

  if (activeModal !== 'KERNEL_PROOF') return null;

  const ver = selectedVerification || selectedBomItem?.latestVerification;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[rgba(22,19,17,0.96)] backdrop-blur-2xl border border-white/[0.12] rounded-[14px] shadow-macos-window max-w-2xl w-full overflow-hidden text-[#F5F0E6] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#E5A93C]" />
            <h3 className="font-semibold text-sm text-[#F5F0E6]">
              KERNEL Anti-Detect Cloud Browser Session Proof
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
          {!ver ? (
            <div className="text-center py-8 text-[#A3998E] font-sans">
              No browser verification run yet for this item. Trigger procurement strike to initiate automated headless validation.
            </div>
          ) : (
            <>
              {/* Status Header Strip */}
              <div className="flex items-center justify-between bg-[rgba(30,26,23,0.65)] p-3 rounded-lg border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  {ver.verificationStatus === 'PASSED' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#FF453A]" />
                  )}
                  <div>
                    <div className="text-[10px] text-[#A3998E]">VERIFICATION OUTCOME</div>
                    <div className={`font-bold ${ver.verificationStatus === 'PASSED' ? 'text-[#34C759]' : 'text-[#FF453A]'}`}>
                      {ver.verificationStatus}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#A3998E]">EXECUTION ENGINE</div>
                  <div className="font-bold text-[#E5A93C]">{ver.executionMode}</div>
                </div>
              </div>

              {/* Grid of Verified Assertions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">VERIFIED PRICE</span>
                  <span className="font-bold text-[#34C759] text-sm tabular-nums">
                    ${ver.verifiedPriceUsd?.toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">IN STOCK</span>
                  <span className={`font-bold ${ver.verifiedInStock ? 'text-[#34C759]' : 'text-[#FF453A]'}`}>
                    {ver.verifiedInStock ? 'TRUE (DOM MATCH)' : 'FALSE'}
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">LEAD TIME</span>
                  <span className="font-bold text-[#F5F0E6] tabular-nums">
                    {ver.verifiedDeliveryDays} days (ZIP {ver.destinationZip})
                  </span>
                </div>

                <div className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08]">
                  <span className="text-[10px] text-[#A3998E] block">DURATION</span>
                  <span className="font-bold text-[#E5A93C] tabular-nums">
                    {ver.durationMs}ms
                  </span>
                </div>
              </div>

              {/* Target Merchant URL & Session */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#A3998E] block">TARGET STOREFRONT URL</span>
                <a
                  href={ver.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#E5A93C] hover:underline truncate bg-[#0B0A09] p-2 rounded-lg border border-white/[0.08]"
                >
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{ver.targetUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto opacity-70" />
                </a>
              </div>

              {/* KERNEL Session Replay Link */}
              {ver.browserLiveViewUrl && (
                <div>
                  <span className="text-[10px] text-[#A3998E] block">KERNEL CLOUD LIVE REPLAY</span>
                  <a
                    href={ver.browserLiveViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#34C759] hover:underline truncate bg-[#0B0A09] p-2 rounded-lg border border-white/[0.08]"
                  >
                    <Cpu className="w-3.5 h-3.5 flex-shrink-0 text-[#34C759]" />
                    <span className="truncate">{ver.browserLiveViewUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto opacity-70" />
                  </a>
                </div>
              )}

              {/* DOM Assertions Snapshot */}
              <div>
                <span className="text-[10px] text-[#A3998E] block mb-1">PLAYWRIGHT DOM SELECTORS & EXTRACTED TOKENS</span>
                <pre className="bg-[#0B0A09] p-2.5 rounded-lg border border-white/[0.08] text-[10px] text-[#F5F0E6] overflow-x-auto max-h-44 whitespace-pre-wrap">
                  {JSON.stringify(ver.domSnapshotJson, null, 2)}
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
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
