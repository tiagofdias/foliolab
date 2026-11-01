import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { RotateCcw, MousePointerClick, CalendarRange } from 'lucide-react';
import type { SimulationResult, CustomWindowSelection } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export type TimeRange = '1M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

interface Props {
  result: SimulationResult;
  selectedRange?: TimeRange;
  customSelection?: CustomWindowSelection | null;
  onRangeChange?: (range: TimeRange) => void;
  onCustomSelection?: (selection: CustomWindowSelection | null) => void;
}

export const PerformanceChart: React.FC<Props> = ({
  result,
  selectedRange: controlledRange,
  customSelection,
  onRangeChange,
  onCustomSelection,
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [internalRange, setInternalRange] = useState<TimeRange>('ALL');
  const selectedRange = controlledRange || internalRange;

  // Track if custom selection / zoom is active (single source of truth: customSelection)
  const isCustomZoomed = Boolean(customSelection);

  // Filter dataset based on selected preset period
  const filteredData = useMemo(() => {
    if (result.dates.length === 0) {
      return { dates: [], baseline: [], whatIf: [] };
    }

    const lastDateStr = result.dates[result.dates.length - 1];
    const lastDate = new Date(lastDateStr);

    let cutoffDate: Date | null = null;

    if (selectedRange === '1M') {
      cutoffDate = new Date(lastDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (selectedRange === '6M') {
      cutoffDate = new Date(lastDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    } else if (selectedRange === 'YTD') {
      cutoffDate = new Date(lastDate.getFullYear(), 0, 1);
    } else if (selectedRange === '1Y') {
      cutoffDate = new Date(lastDate);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    } else if (selectedRange === '3Y') {
      cutoffDate = new Date(lastDate);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    } else if (selectedRange === '5Y') {
      cutoffDate = new Date(lastDate);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    }

    const cutoffStr = cutoffDate ? cutoffDate.toISOString().split('T')[0] : '';
    const startIndex = cutoffStr
      ? Math.max(0, result.dates.findIndex((d) => d >= cutoffStr))
      : 0;

    const datesSlice = result.dates.slice(startIndex);
    const baselineSlice = result.baselineValues.slice(startIndex);
    const whatIfSlice = result.whatIfValues.slice(startIndex);

    return {
      dates: datesSlice,
      baseline: baselineSlice,
      whatIf: whatIfSlice,
    };
  }, [result, selectedRange]);

  // Downsample if dataset is too dense for 60fps interaction
  const { sampledDates, sampledBaseline, sampledWhatIf } = useMemo(() => {
    const dates = filteredData.dates;
    const baseline = filteredData.baseline;
    const whatIf = filteredData.whatIf;
    if (dates.length === 0) {
      return { sampledDates: [], sampledBaseline: [], sampledWhatIf: [] };
    }

    const step = Math.max(1, Math.floor(dates.length / 300));
    const sDates: string[] = [];
    const sBaseline: number[] = [];
    const sWhatIf: number[] = [];

    for (let i = 0; i < dates.length; i += step) {
      sDates.push(dates[i]);
      sBaseline.push(baseline[i]);
      sWhatIf.push(whatIf[i]);
    }

    // Ensure the very last point is always included
    if (sDates[sDates.length - 1] !== dates[dates.length - 1]) {
      sDates.push(dates[dates.length - 1]);
      sBaseline.push(baseline[dates.length - 1]);
      sWhatIf.push(whatIf[dates.length - 1]);
    }

    return {
      sampledDates: sDates,
      sampledBaseline: sBaseline,
      sampledWhatIf: sWhatIf,
    };
  }, [filteredData]);

  // Determine active custom zoom boundaries (X-axis bounds and Y-axis auto-fit bounds)
  const { effectiveMin, effectiveMax, visibleMinY, visibleMaxY } = useMemo(() => {
    if (!customSelection?.startDate || !customSelection?.endDate || sampledDates.length === 0) {
      return {
        effectiveMin: undefined,
        effectiveMax: undefined,
        visibleMinY: undefined,
        visibleMaxY: undefined,
      };
    }

    // Helper to find closest existing label in sampledDates
    const findClosestLabel = (dateStr: string, fallbackIdx: number) => {
      if (sampledDates.includes(dateStr)) return dateStr;
      const targetTime = new Date(dateStr).getTime();
      let closest = sampledDates[fallbackIdx] || sampledDates[0];
      let minDiff = Infinity;
      for (const d of sampledDates) {
        const diff = Math.abs(new Date(d).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = d;
        }
      }
      return closest;
    };

    const minLabel = findClosestLabel(customSelection.startDate, 0);
    const maxLabel = findClosestLabel(customSelection.endDate, sampledDates.length - 1);

    const minIdx = sampledDates.indexOf(minLabel);
    const maxIdx = sampledDates.indexOf(maxLabel);
    const startIdx = Math.min(minIdx, maxIdx);
    const endIdx = Math.max(minIdx, maxIdx);

    // Compute dynamic Y bounds for visible custom slice so zoomed curves are vivid & detailed
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = Math.max(0, startIdx); i <= Math.min(sampledDates.length - 1, endIdx); i++) {
      const b = sampledBaseline[i];
      const w = sampledWhatIf[i];
      if (b != null && !isNaN(b)) {
        if (b < minY) minY = b;
        if (b > maxY) maxY = b;
      }
      if (w != null && !isNaN(w)) {
        if (w < minY) minY = w;
        if (w > maxY) maxY = w;
      }
    }

    let yMinVal: number | undefined = undefined;
    let yMaxVal: number | undefined = undefined;
    if (minY < maxY && minY !== Infinity) {
      const pad = (maxY - minY) * 0.08;
      yMinVal = Math.max(0, Math.floor((minY - pad) / 100) * 100);
      yMaxVal = Math.ceil((maxY + pad) / 100) * 100;
    }

    return {
      effectiveMin: minLabel,
      effectiveMax: maxLabel,
      visibleMinY: yMinVal,
      visibleMaxY: yMaxVal,
    };
  }, [customSelection, sampledDates, sampledBaseline, sampledWhatIf]);

  const isProgrammaticUpdateRef = useRef<boolean>(false);
  const prevCustomSelectionRef = useRef<CustomWindowSelection | null>(null);

  const handleResetZoom = () => {
    isProgrammaticUpdateRef.current = true;
    onCustomSelection?.(null);
    if (chartRef.current) {
      try {
        (chartRef.current as any).resetZoom?.('none');
      } catch (e) {
        // ignore
      }
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  // Only reset plugin zoom if customSelection was cleared from outside
  useEffect(() => {
    if (prevCustomSelectionRef.current !== null && customSelection === null) {
      isProgrammaticUpdateRef.current = true;
      if (chartRef.current) {
        try {
          (chartRef.current as any).resetZoom?.('none');
        } catch (e) {
          // ignore
        }
      }
      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);
    }
    prevCustomSelectionRef.current = customSelection || null;
  }, [customSelection]);

  const handleSelectRange = (range: TimeRange) => {
    isProgrammaticUpdateRef.current = true;
    setInternalRange(range);
    onRangeChange?.(range);
    onCustomSelection?.(null);
    if (chartRef.current) {
      try {
        (chartRef.current as any).resetZoom?.('none');
      } catch (e) {
        // ignore
      }
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  const whatIfLabel =
    result.rules && result.rules.length > 0
      ? `What-If Portfolio (${result.rules.map((r) => `${r.swapPercentage}% ${r.sourceSymbol}➔${r.targetSymbol}`).join(', ')})`
      : `What-If Portfolio (${result.swapPercentage}% swapped to ${result.targetSymbol})`;

  const data = useMemo(
    () => ({
      labels: sampledDates,
      datasets: [
        {
          label: 'Actual Portfolio (Baseline)',
          data: sampledBaseline,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.04)',
          borderWidth: 2.2,
          tension: 0.25,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#10b981',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
        {
          label: whatIfLabel,
          data: sampledWhatIf,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2.6,
          tension: 0.25,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#8b5cf6',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
      ],
    }),
    [sampledDates, sampledBaseline, sampledWhatIf, whatIfLabel]
  );

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: isCustomZoomed ? 400 : 250,
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        zoom: {
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: 'rgba(139, 92, 246, 0.25)',
              borderColor: 'rgba(139, 92, 246, 0.8)',
              borderWidth: 1.5,
            },
            mode: 'x',
            onZoomComplete: ({ chart }: any) => {
              if (isProgrammaticUpdateRef.current) {
                return;
              }
              const xScale = chart.scales.x;
              const labels = chart.data.labels as string[];
              if (xScale && labels && labels.length > 1) {
                const rawMin = typeof xScale.min === 'number' ? xScale.min : 0;
                const rawMax = typeof xScale.max === 'number' ? xScale.max : labels.length - 1;
                const idx1 = Math.max(0, Math.min(labels.length - 1, Math.round(rawMin)));
                const idx2 = Math.max(0, Math.min(labels.length - 1, Math.round(rawMax)));
                const minIdx = Math.min(idx1, idx2);
                const maxIdx = Math.max(idx1, idx2);

                if (minIdx <= 0 && maxIdx >= labels.length - 1) {
                  onCustomSelection?.(null);
                  return;
                }

                if (minIdx >= maxIdx) {
                  return;
                }

                const startDate = labels[minIdx];
                const endDate = labels[maxIdx];
                if (startDate && endDate && startDate !== endDate) {
                  onCustomSelection?.({ startDate, endDate });
                }
              }
            },
          },
          pan: {
            enabled: false,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#94a3b8',
          titleFont: { size: 12, family: 'Poppins', weight: 'bold' },
          bodyFont: { size: 13, family: 'Poppins', weight: 'normal' },
          borderColor: 'rgba(139, 92, 246, 0.3)',
          borderWidth: 1,
          padding: 14,
          displayColors: true,
          boxPadding: 6,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y ?? 0;
              const prefix = ctx.datasetIndex === 0 ? 'Actual:  ' : 'What-If: ';
              return ` ${prefix} $${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            },
            afterBody: (items) => {
              if (items.length >= 2) {
                const base = items[0]?.parsed?.y ?? 0;
                const whatIf = items[1]?.parsed?.y ?? 0;
                const diff = whatIf - base;
                const sign = diff >= 0 ? '+' : '';
                const pct = base > 0 ? ((diff / base) * 100).toFixed(1) : '0.0';
                return `\nDelta: ${sign}$${Math.round(diff).toLocaleString('en-US')} (${sign}${pct}%)`;
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          min: effectiveMin,
          max: effectiveMax,
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
          },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'Poppins' },
            maxTicksLimit: 8,
          },
        },
        y: {
          min: visibleMinY,
          max: visibleMaxY,
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
          },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'Poppins' },
            callback: (value) => `$${Number(value).toLocaleString()}`,
          },
        },
      },
    }),
    [effectiveMin, effectiveMax, visibleMinY, visibleMaxY, isCustomZoomed, onCustomSelection]
  );

  const ranges: TimeRange[] = ['1M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'];

  return (
    <div>
      {/* Time Range Selector & Zoom Bar */}
      <div className="chart-toolbar">
        {/* Preset Range Buttons */}
        <div className="range-selector">
          <CalendarRange size={14} className="range-icon" />
          {ranges.map((r) => (
            <button
              key={r}
              className={`range-btn ${selectedRange === r && !isCustomZoomed ? 'active' : ''}`}
              onClick={() => handleSelectRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Mouse Selection & Reset Zoom Actions */}
        <div className="zoom-actions">
          {isCustomZoomed ? (
            <button className="btn btn-reset-zoom" onClick={handleResetZoom}>
              <RotateCcw size={13} />
              Reset Zoom
            </button>
          ) : (
            <div className="mouse-drag-hint">
              <MousePointerClick size={13} />
              <span>Click & drag horizontally on the chart to select a custom period</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-container">
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};
