import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { BomItem } from '@lord-penguin/shared';

export const SparklineRenderer: React.FC<ICellRendererParams<BomItem>> = (props) => {
  const item = props.data;
  if (!item) return null;

  const history = item.priceHistoryJson && item.priceHistoryJson.length > 0
    ? item.priceHistoryJson
    : [item.baselineUnitPriceUsd, item.strikeUnitPriceUsd];

  const strikePrice = item.strikeUnitPriceUsd || item.baselineUnitPriceUsd * 0.9;
  const latestPrice = history[history.length - 1];

  // SVG Geometry (width 120, height 28)
  const width = 120;
  const height = 28;
  const padY = 4;

  const minVal = Math.min(...history, strikePrice) * 0.98;
  const maxVal = Math.max(...history, strikePrice) * 1.02;
  const range = maxVal - minVal || 1;

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * (width - 8) + 4;
    const y = height - padY - ((val - minVal) / range) * (height - 2 * padY);
    return { x, y, val };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints = `${points[0].x.toFixed(1)},${height} ${polylinePoints} ${points[points.length - 1].x.toFixed(1)},${height}`;

  // Strike price horizontal line
  const strikeY = height - padY - ((strikePrice - minVal) / range) * (height - 2 * padY);

  const isBelowStrike = latestPrice <= strikePrice;
  const strokeColor = isBelowStrike ? '#34C759' : '#E5A93C';
  const fillColor = isBelowStrike ? 'rgba(52, 199, 89, 0.15)' : 'rgba(229, 169, 60, 0.12)';

  const lastPoint = points[points.length - 1];

  return (
    <div 
      className="flex items-center h-full w-full py-1"
      title={`14-Day Trajectory: Low $${Math.min(...history).toFixed(0)} / High $${Math.max(...history).toFixed(0)} | Strike: $${strikePrice.toFixed(0)}`}
    >
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <polygon points={areaPoints} fill={`url(#grad-${item.id})`} />

        {/* Strike Price Cutoff Line */}
        <line
          x1="0"
          y1={strikeY}
          x2={width}
          y2={strikeY}
          stroke="#E5A93C"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.6"
        />

        {/* Trend Polyline */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Latest Price Dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2.5"
          fill={strokeColor}
          className={isBelowStrike ? 'animate-ping' : ''}
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2"
          fill={strokeColor}
        />
      </svg>
    </div>
  );
};
