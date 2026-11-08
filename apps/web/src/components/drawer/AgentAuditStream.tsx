import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import type { AgentAuditLog } from '@lord-penguin/shared';
import { 
  Terminal, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink, 
  CheckCircle2, 
  Radio
} from 'lucide-react';

interface AgentAuditStreamProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AgentAuditStream: React.FC<AgentAuditStreamProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const { auditLogs, isStreaming, openModal } = useProjectStore();
  const [selectedSponsor, setSelectedSponsor] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toTimeString().split(' ')[0];
  };

  const getSponsorBadge = (sponsor: string) => {
    switch (sponsor) {
      case 'PAYPAL':
        return <span className="bg-[#34C759]/15 border border-[#34C759]/40 text-[#34C759] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">PAYPAL</span>;
      case 'APIMATIC':
        return <span className="bg-[#E5A93C]/15 border border-[#E5A93C]/40 text-[#E5A93C] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">APIMATIC</span>;
      case 'CHANNEL3':
        return <span className="bg-white/[0.06] border border-white/[0.12] text-[#F5F0E6] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">CHANNEL3</span>;
      case 'KERNEL':
        return <span className="bg-[rgba(229,169,60,0.12)] border border-[#E5A93C]/40 text-[#E5A93C] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">KERNEL</span>;
      case 'BRYNTUM':
        return <span className="bg-[#E5A93C]/10 border border-[#E5A93C]/30 text-[#E5A93C] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">BRYNTUM</span>;
      default:
        return <span className="bg-[rgba(30,26,23,0.9)] border border-white/[0.08] text-[#A3998E] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold">ENGINE</span>;
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedSponsor === 'ALL') return true;
    return log.sponsorService === selectedSponsor;
  });

  if (collapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className="w-9 bg-[rgba(22,19,17,0.82)] backdrop-blur-xl border-l border-white/[0.08] flex flex-col items-center py-4 cursor-pointer hover:bg-white/[0.03] transition select-none flex-shrink-0"
        title="Expand Live Agent Audit Stream"
      >
        <ChevronLeft className="w-4 h-4 text-[#E5A93C] mb-4" />
        <div className="flex items-center gap-1.5 -rotate-90 text-[10px] font-mono font-medium tracking-wider text-[#A3998E] whitespace-nowrap mt-8">
          <Terminal className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>AGENT EXECUTION FEED</span>
          {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shadow-[0_0_6px_#34C759] ml-1.5" />}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 md:w-80 bg-[rgba(22,19,17,0.82)] backdrop-blur-xl border-l border-white/[0.08] flex flex-col h-full overflow-hidden select-none flex-shrink-0">
      {/* Header */}
      <div className="bg-[rgba(22,19,17,0.9)] px-3 py-2 border-b border-white/[0.08] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-[#F5F0E6]">
          <Terminal className="w-4 h-4 text-[#E5A93C]" />
          <span>Agent Audit Stream</span>
          <div className="flex items-center gap-1 text-[10px] text-[#34C759] font-mono">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>SSE</span>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="text-[#A3998E] hover:text-[#F5F0E6] p-1 rounded-md hover:bg-white/[0.05] transition"
          title="Collapse Stream"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs (Apple Segmented Style) */}
      <div className="bg-[#110F0D] p-1 border-b border-white/[0.06] flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
        {['ALL', 'PAYPAL', 'KERNEL', 'CHANNEL3', 'LRM_ENGINE'].map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedSponsor(tag)}
            className={`px-2 py-0.5 rounded-md transition ${
              selectedSponsor === tag
                ? 'bg-[rgba(30,26,23,0.95)] text-[#F5F0E6] border border-white/[0.1] font-bold shadow-sm'
                : 'text-[#A3998E] hover:text-[#F5F0E6]'
            }`}
          >
            {tag === 'LRM_ENGINE' ? 'ENGINE' : tag}
          </button>
        ))}
      </div>

      {/* Log Feed List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-[#A3998E] text-xs">
            Waiting for autonomous agent execution events...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const hasMetadata = log.metadataJson && Object.keys(log.metadataJson).length > 0;

            return (
              <div
                key={log.id}
                onClick={() => hasMetadata && setExpandedLogId(isExpanded ? null : log.id)}
                className={`bg-[rgba(30,26,23,0.65)] backdrop-blur-md border border-white/[0.08] rounded-lg p-2.5 transition cursor-pointer hover:border-white/[0.2] ${
                  log.severity === 'SUCCESS' ? 'border-l-2 border-l-[#34C759]' :
                  log.severity === 'WARNING' ? 'border-l-2 border-l-[#E5A93C]' :
                  log.severity === 'ERROR' ? 'border-l-2 border-l-[#FF453A]' :
                  'border-l-2 border-l-[#E5A93C]'
                }`}
              >
                {/* Meta row */}
                <div className="flex items-center justify-between text-[10px] text-[#A3998E] mb-1">
                  <div className="flex items-center gap-1.5">
                    {getSponsorBadge(log.sponsorService)}
                    <span className="text-[#F5F0E6] font-medium">{log.actionType}</span>
                  </div>
                  <span className="tabular-nums text-[#A3998E]">{formatTime(log.createdAt)}</span>
                </div>

                {/* Summary */}
                <p className="text-[11px] text-[#F5F0E6] font-sans leading-relaxed">
                  {log.summary}
                </p>

                {/* Expandable JSON details */}
                {isExpanded && hasMetadata && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <pre className="text-[10px] text-[#F5F0E6] bg-[#0B0A09] border border-white/[0.08] p-2 rounded-md overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.metadataJson, null, 2)}
                    </pre>

                    {log.sponsorService === 'KERNEL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('KERNEL_PROOF');
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#E5A93C] hover:underline font-mono"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Inspect KERNEL Browser Proof</span>
                      </button>
                    )}

                    {log.sponsorService === 'PAYPAL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('PAYPAL_RECEIPT');
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#34C759] hover:underline font-mono"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>View PayPal Sandbox Receipt</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
