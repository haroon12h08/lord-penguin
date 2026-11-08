import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';

export const NewProjectBriefModal: React.FC = () => {
  const { activeModal, closeModal, createProjectFromBrief, isLoading } = useProjectStore();

  const [briefText, setBriefText] = useState(
    'Build a 10-Seat AI Podcast & Video Production Broadcast Studio in downtown Austin TX (ZIP 78701). Requires 10x Shure SM7B dynamic microphones, 10x Cloudlifter CL-1 mic activators, 1x Rodecaster Pro II audio production console, 4x Sony FX3 cinema cameras, 4x Sony FE 24-70mm GM II zoom lenses, acoustic treatment panels, and an Apple M3 Max Studio workstation. Total budget cap is $14,500.'
  );
  const [budgetCap, setBudgetCap] = useState(14500);
  const [targetZip, setTargetZip] = useState('78701');

  if (activeModal !== 'NEW_BRIEF') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefText.trim()) return;
    await createProjectFromBrief(briefText, budgetCap, targetZip);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[rgba(22,19,17,0.96)] backdrop-blur-2xl border border-white/[0.12] rounded-[14px] shadow-macos-window max-w-xl w-full overflow-hidden text-[#F5F0E6] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E5A93C]" />
            <h3 className="font-semibold text-sm text-[#F5F0E6]">Decompose AI Natural Language Procurement Brief</h3>
          </div>
          <button
            onClick={closeModal}
            className="text-[#A3998E] hover:text-[#F5F0E6] p-1 rounded-md hover:bg-white/[0.05] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[#A3998E] font-medium mb-1">
              Natural Language Brief / BOM Specification:
            </label>
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={5}
              className="w-full bg-[#0B0A09] border border-white/[0.08] rounded-lg p-3 text-[#F5F0E6] font-sans focus:outline-none focus:border-[#E5A93C] transition resize-none leading-relaxed"
              placeholder="Describe what you want to build and equipment needed..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A3998E] font-medium mb-1">
                Budget Cap (USD):
              </label>
              <input
                type="number"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full bg-[#0B0A09] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[#F5F0E6] font-mono focus:outline-none focus:border-[#E5A93C] tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-[#A3998E] font-medium mb-1">
                Destination ZIP:
              </label>
              <input
                type="text"
                value={targetZip}
                onChange={(e) => setTargetZip(e.target.value)}
                className="w-full bg-[#0B0A09] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[#F5F0E6] font-mono focus:outline-none focus:border-[#E5A93C]"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={closeModal}
              className="px-3 py-1.5 rounded-lg bg-[rgba(30,26,23,0.8)] hover:bg-white/[0.08] text-[#A3998E] hover:text-[#F5F0E6] border border-white/[0.08] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#E5A93C] hover:bg-[#F3BE58] text-[#0B0A09] font-bold transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing CPM Schedule...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Synthesize Schedule & BOM</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
