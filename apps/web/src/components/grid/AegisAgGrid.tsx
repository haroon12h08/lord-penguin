import React, { useMemo } from 'react';
import { ModuleRegistry, AllCommunityModule, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { BomItem } from '@lord-penguin/shared';

// Import Custom Cell Renderers
import { StatusBadgeRenderer } from './cell-renderers/StatusBadgeRenderer';
import { MerchantSpreadRenderer } from './cell-renderers/MerchantSpreadRenderer';
import { SparklineRenderer } from './cell-renderers/SparklineRenderer';
import { KernelProofRenderer } from './cell-renderers/KernelProofRenderer';
import { PayPalReceiptRenderer } from './cell-renderers/PayPalReceiptRenderer';

// Import AG Grid CSS styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

export const AegisAgGrid: React.FC = () => {
  const { bomItems, selectBomItem } = useProjectStore();

  const columnDefs: ColDef<BomItem>[] = useMemo(
    () => [
      {
        headerName: 'SKU',
        field: 'skuCode',
        width: 105,
        pinned: 'left',
        cellClass: 'font-mono text-[#E5A93C] font-semibold flex items-center',
      },
      {
        headerName: 'Item / Deliverable',
        field: 'itemName',
        minWidth: 220,
        flex: 1,
        cellRenderer: (params: any) => {
          const item = params.data as BomItem;
          if (!item) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-medium text-[#F5F0E6] truncate text-xs">{item.itemName}</span>
              <span className="text-[10px] text-[#A3998E] font-mono truncate">{item.category} • Qty: {item.quantity}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Baseline',
        field: 'baselineUnitPriceUsd',
        width: 95,
        headerClass: 'text-right',
        cellClass: 'font-mono text-[#A3998E] text-right tabular-nums flex items-center justify-end',
        valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
      },
      {
        headerName: 'Best Landed Offer (Channel3)',
        width: 220,
        cellRenderer: MerchantSpreadRenderer,
      },
      {
        headerName: '14d Trend & Strike',
        width: 135,
        cellRenderer: SparklineRenderer,
      },
      {
        headerName: 'LRM Window',
        field: 'lrmTimestamp',
        width: 110,
        cellRenderer: (params: any) => {
          const item = params.data as BomItem;
          if (!item || !item.lrmTimestamp) return null;
          const lrmDate = new Date(item.lrmTimestamp);
          const formatted = lrmDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const floatDays = item.daysFloatSaved ? `${item.daysFloatSaved.toFixed(1)}d float` : '';
          return (
            <div className="flex flex-col justify-center h-full py-1 font-mono text-[11px]">
              <span className="text-[#E5A93C] font-semibold">{formatted}</span>
              <span className="text-[9px] text-[#A3998E] tabular-nums">{floatDays}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 135,
        cellRenderer: StatusBadgeRenderer,
      },
      {
        headerName: 'Kernel Proof',
        width: 115,
        cellRenderer: KernelProofRenderer,
      },
      {
        headerName: 'PayPal Settlement Rail',
        width: 160,
        pinned: 'right',
        cellRenderer: PayPalReceiptRenderer,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0A09] border border-white/[0.08] rounded-xl overflow-hidden shadow-macos-card">
      {/* AG Grid macOS Top Context Bar */}
      <div className="bg-[rgba(22,19,17,0.85)] backdrop-blur-md px-3.5 py-1.5 border-b border-white/[0.08] flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2 font-medium text-[#F5F0E6]">
          <span className="font-mono text-[#E5A93C]">AG GRID PRO</span>
          <span className="text-[#A3998E]">/</span>
          <span className="text-[#F5F0E6]">Multi-Merchant Arbitrage & Settlement Matrix</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-[#A3998E]">
          <span>8 Items Live</span>
          <span className="text-[#34C759]">● Quartz Dark</span>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 w-full ag-theme-quartz-dark text-xs">
        <AgGridReact
          rowData={bomItems}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowHeight={46}
          headerHeight={36}
          onRowClicked={(event) => {
            if (event.data) selectBomItem(event.data);
          }}
          rowSelection="single"
          animateRows={true}
        />
      </div>
    </div>
  );
};
