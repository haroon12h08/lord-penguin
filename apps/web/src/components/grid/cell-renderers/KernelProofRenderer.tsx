import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { BomItem } from '@lord-penguin/shared';
import { useProjectStore } from '../../../store/useProjectStore';
import { ExternalLink, Cpu } from 'lucide-react';

export const KernelProofRenderer: React.FC<ICellRendererParams<BomItem>> = (props) => {
  const item = props.data;
  const { openModal } = useProjectStore();

  if (!item) return null;

  const ver = item.latestVerification;

  if (!ver) {
    return (
      <div className="flex items-center text-[#A3998E] font-mono text-[10px] h-full">
        <span>Unverified</span>
      </div>
    );
  }

  const isPassed = ver.verificationStatus === 'PASSED';

  return (
    <div className="flex items-center gap-1.5 h-full">
      <button
        onClick={() => openModal('KERNEL_PROOF', { bomItem: item, verification: ver })}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition border ${
          isPassed
            ? 'bg-[rgba(30,26,23,0.9)] border-white/[0.12] text-[#F5F0E6] hover:border-[#E5A93C]/60 hover:text-[#E5A93C]'
            : 'bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF453A]'
        }`}
        title="Inspect KERNEL Anti-Detect Browser Session & DOM Assertions"
      >
        <Cpu className="w-2.5 h-2.5 text-[#E5A93C]" />
        <span>{isPassed ? 'DOM Proof' : 'Failed'}</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
      </button>
    </div>
  );
};
