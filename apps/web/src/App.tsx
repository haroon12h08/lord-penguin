import React, { useEffect, useState } from 'react';
import { useProjectStore } from './store/useProjectStore';
import { MacOsTitleBar } from './components/layout/MacOsTitleBar';
import { MacOsSidebar } from './components/layout/MacOsSidebar';
import { SplitWorkspace } from './components/layout/SplitWorkspace';
import { NewProjectBriefModal } from './components/modals/NewProjectBriefModal';
import { KernelLiveViewModal } from './components/modals/KernelLiveViewModal';
import { PayPalReceiptModal } from './components/modals/PayPalReceiptModal';
import { Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const { init, isLoading, error } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'all' | 'schedule' | 'matrix'>('all');

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="w-full h-screen bg-[#0B0A09] flex flex-col justify-center items-center p-1 sm:p-2 md:p-3 overflow-hidden select-none">
      {/* Main macOS Pro Window Container */}
      <div className="w-full h-full max-w-[1920px] bg-[#0B0A09] rounded-[14px] border border-white/[0.1] shadow-macos-window flex flex-col overflow-hidden relative">
        {/* 1. macOS Title Bar (Traffic Lights, Segmented Control, Clock & Shocks) */}
        <MacOsTitleBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* 2. Global Error Banner */}
        {error && (
          <div className="bg-[#FF453A]/15 border-b border-[#FF453A]/40 px-4 py-1.5 flex items-center justify-between text-xs text-[#FF453A] z-40">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => useProjectStore.setState({ error: null })}
              className="hover:underline font-mono text-[10px] uppercase font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3. Window Body (Translucent Left Sidebar + Main Split Workspace) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Translucent Espresso Sidebar */}
          <MacOsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Content Area */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0B0A09]">
              <Loader2 className="w-8 h-8 text-[#E5A93C] animate-spin" />
              <div className="font-mono text-sm text-[#A3998E]">
                Booting LORD-PENGUIN macOS Pro Treasury Desk...
              </div>
            </div>
          ) : (
            <SplitWorkspace activeTab={activeTab} />
          )}
        </div>

        {/* 4. Modals */}
        <NewProjectBriefModal />
        <KernelLiveViewModal />
        <PayPalReceiptModal />
      </div>
    </div>
  );
};

export default App;
