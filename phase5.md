# Phase 5 Implementation Plan: AG Grid Financial Command Matrix, Custom Cell Renderers & Interactive Proof Modals

**Project:** LORD-PENGUIN (AegisBOM) — Autonomous Temporal Procurement & Treasury Engine  
**Document Target:** `/home/haroon/Desktop/lord-penguin/phase5.md`  
**Reference Specification:** [`./lord-penguin.md`](file:///home/haroon/Desktop/lord-penguin/lord-penguin.md)  
**Execution Phase:** Phase 5 of 6  
**Status:** READY FOR EXECUTION  

---

## 1. Executive Summary & Phase 5 Objectives

Phase 5 builds the **Institutional AG Grid Financial Command Matrix** (`AegisAgGrid.tsx`) occupying the lower 52% of the split workspace. This grid provides high-density financial data visualization, real-time Channel3 merchant arbitrage spreads, SVG price history sparklines, and seamless one-click actions for KERNEL Cloud DOM verification and PayPal Sandbox settlements.

### Phase 5 Core Deliverables:
1. **AG Grid v33 Quartz Matrix Container (`AegisAgGrid.tsx`):**
   * Configured with `ag-grid-community` v33 `AllCommunityModule` and `ag-grid-react`.
   * Dark institutional styling matching the Obsidian palette (`#090D16` / `#111827`).
   * Column sorting, filtering, resizing, and responsive row auto-sizing.
2. **Custom Cell Renderers:**
   * **`StatusBadgeRenderer.tsx`:** Dynamic visual states (`SETTLED` in emerald green with lock icon; `SETTLING_PAYPAL` pulsing blue; `VERIFYING_KERNEL` cyan; `MONITORING` slate blue; `OFFER_REJECTED` rose).
   * **`MerchantSpreadRenderer.tsx`:** Displays Channel3 best merchant, unit price, shipping, affiliate rebate percentage (`+3.0% comm rebate`), and spread savings vs second-best merchant.
   * **`SparklineRenderer.tsx`:** Inline SVG 14-day price trajectory line with gradient area fill, latest price dot indicator, and horizontal dashed strike threshold line.
   * **`KernelProofRenderer.tsx`:** Displays Kernel verified status, delivery lead days to ZIP, and clickable `[👁 DOM Proof]` button opening `KernelLiveViewModal`.
   * **`PayPalReceiptRenderer.tsx`:** Displays PayPal Orders v2 or Invoices v2 badge, settled amount, clickable button to open `PayPalReceiptModal` or sandbox link, and if not settled, an immediate `[⚡ Strike]` button to trigger autonomous procurement.
3. **Workspace Integration (`SplitWorkspace.tsx`):**
   * Embeds `AegisAgGrid` directly into the lower resizable pane.
4. **Interactive Modals Polish:**
   * Refined `PayPalReceiptModal.tsx` and `KernelLiveViewModal.tsx` ensuring live sandbox checkout inspection, replay links, and refund demonstration.
5. **Automated Verification:**
   * Clean compilation with `npm run build` and 100% passing tests via `npm test`.

---

## 2. Technical Architecture & Column Layout

```text
+-------------------------------------------------------------------------------------------------------------------+
| AG GRID FINANCIAL COMMAND MATRIX (52% Pane Height)                                                                |
+---------+--------------------+---------+----------------------+------------+----------+----------+----------------+
| SKU     | Item Description   | Base    | Best Landed Offer    | 14d Trend  | LRM Win  | Status   | PayPal Action  |
+---------+--------------------+---------+----------------------+------------+----------+----------+----------------+
| MIC-01  | Shure SM7B         | $399.00 | $359.00 (Sweetwater) | 📉 [~~~~~] | 6.2d     | 🟢 PAID  | [Receipt ↗]    |
| LENS-01 | Sony FE 24-70mm GM | $2298.00| $2149.00 (B&H Photo) | 📊 [~~~~~] | 1.8d 🔥  | 🟡 SETTL | [Executing...] |
| DSK-01  | Uplift V2 Standing | $960.00 | $820.00 (UpliftDesk) | 📉 [~~~~~] | 11.5d    | 🔵 MONIT | [⚡ Strike]    |
+---------+--------------------+---------+----------------------+------------+----------+----------+----------------+
```

### Column Configuration:
1. **`skuCode`** (Width: 105px, pinned left): Bold monospace cyan font.
2. **`itemName`** (Width: 220px): Primary item title with category subtitle.
3. **`baselineUnitPriceUsd`** (Width: 100px): Baseline budget cap in USD.
4. **`merchantSpread`** (Width: 200px): Uses `MerchantSpreadRenderer`.
5. **`priceHistory`** (Width: 150px): Uses `SparklineRenderer`.
6. **`lrmWindow`** (Width: 120px): Formatted countdown to $T_{\text{LRM}}$ and remaining float days.
7. **`status`** (Width: 140px): Uses `StatusBadgeRenderer`.
8. **`kernelProof`** (Width: 120px): Uses `KernelProofRenderer`.
9. **`actions`** (Width: 160px, pinned right): Uses `PayPalReceiptRenderer`.

---

## 3. Target File Structure for Phase 5

```text
apps/web/src/
├── components/
│   ├── grid/
│   │   ├── AegisAgGrid.tsx                      # Main AG Grid v33 wrapper
│   │   └── cell-renderers/
│   │       ├── StatusBadgeRenderer.tsx          # Dynamic status badge with icons
│   │       ├── MerchantSpreadRenderer.tsx       # Channel3 merchant spread & affiliate pill
│   │       ├── SparklineRenderer.tsx            # SVG 14-day price trajectory
│   │       ├── KernelProofRenderer.tsx          # Cloud Chromium verification proof trigger
│   │       └── PayPalReceiptRenderer.tsx        # Orders/Invoices v2 receipt & manual strike
│   ├── modals/
│   │   ├── KernelLiveViewModal.tsx              # DOM assertions & session replay viewer
│   │   ├── PayPalReceiptModal.tsx               # APIMatic validation & Sandbox receipt viewer
│   │   └── NewProjectBriefModal.tsx             # Natural language AI brief ingestion
│   └── layout/
│       └── SplitWorkspace.tsx                   # Updated to host AegisAgGrid in bottom pane
```

---

## 4. Implementation Steps for Phase 5

1. **Step 1:** Implement custom cell renderers in `apps/web/src/components/grid/cell-renderers/`:
   - `StatusBadgeRenderer.tsx`
   - `MerchantSpreadRenderer.tsx`
   - `SparklineRenderer.tsx`
   - `KernelProofRenderer.tsx`
   - `PayPalReceiptRenderer.tsx`
2. **Step 2:** Implement `AegisAgGrid.tsx` with AG Grid Community v33 module registration and Quartz dark theme styling.
3. **Step 3:** Mount `AegisAgGrid` inside `SplitWorkspace.tsx` to replace the interim HTML table.
4. **Step 4:** Run `npm run build` and verify 0 TypeScript compiler warnings or bundle errors.
5. **Step 5:** Run `npm test` across all workspaces to guarantee 100% test passing rate.

---

## 5. Definition of Done (Phase 5 Acceptance Criteria)

Phase 5 will be considered 100% complete when:
- [ ] `AegisAgGrid.tsx` renders all 8 BOM items with AG Grid v33 Quartz dark styling.
- [ ] Custom cell renderers display real-time Channel3 prices, SVG 14-day sparklines, and status badges.
- [ ] Clicking `[Kernel 👁]` opens `KernelLiveViewModal.tsx` showing DOM assertions.
- [ ] Clicking `[Receipt ↗]` opens `PayPalReceiptModal.tsx` showing APIMatic validation and Sandbox transaction IDs.
- [ ] Clicking `[⚡ Strike]` dispatches autonomous procurement via `/api/v1/projects/:id/bom/:id/procure`.
- [ ] `npm run build` succeeds across monorepo with **zero errors**.
- [ ] `npm test` executes all 29 automated tests with 100% success.
