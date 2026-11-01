import React, { useState, useMemo, useRef } from 'react';
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
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { Portfolio, PortfolioStatsData } from '../types';
import { PortfolioQuickPills } from './PortfolioQuickPills';

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

export type ChartTimeframe = '1D' | '1W' | '1M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'Max';

export interface PeriodMetricsInfo {
  timeframe: string;
  diffDollar: number;
  diffPercent: number;
  isCustom: boolean;
}

interface Props {
  stats: PortfolioStatsData | null;
  activePortfolio?: Portfolio | { id: string; name: string; color: string; description?: string };
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  currencySymbol?: string;
  onPeriodMetricsChange?: (info: PeriodMetricsInfo) => void;
}

export const PortfolioHeroChart: React.FC<Props> = ({
  stats,
  activePortfolio,
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  currencySymbol = '$',
  onPeriodMetricsChange,
}) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('Max');
  const [customZoomSelection, setCustomZoomSelection] = useState<{ startDate: string; endDate: string } | null>(null);
  const [metricMode, setMetricMode] = useState<'value' | 'percent'>('value');
  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    value: number;
    percent: number;
  } | null>(null);

  const [isZoomed, setIsZoomed] = useState(false);
  const chartRef = useRef<ChartJS<'line'>>(null);
  const isProgrammaticUpdateRef = useRef<boolean>(false);

  const handleResetZoom = () => {
    isProgrammaticUpdateRef.current = true;
    setCustomZoomSelection(null);
    setIsZoomed(false);
    if (chartRef.current) {
      try {
        (chartRef.current as any).resetZoom?.('none');
      } catch (e) {}
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  const handleTimeframeChange = (tf: ChartTimeframe) => {
    isProgrammaticUpdateRef.current = true;
    setTimeframe(tf);
    setCustomZoomSelection(null);
    setIsZoomed(false);
    if (chartRef.current) {
      try {
        (chartRef.current as any).resetZoom?.('none');
      } catch (e) {}
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  // Reset zoom when switching active portfolio
  React.useEffect(() => {
    handleResetZoom();
  }, [activePortfolioId]);

  // Timeline for the active timeframe preset (labels for chart)
  const activeTimeline = useMemo(() => {
    if (!stats || !stats.timelineDates || stats.timelineDates.length === 0) {
      return { dates: [], values: [], benchmark: [] };
    }

    const { timelineDates, portfolioValues, benchmarkValues } = stats;
    const len = timelineDates.length;

    if (timeframe === 'Max' || len <= 2) {
      return {
        dates: timelineDates,
        values: portfolioValues,
        benchmark: benchmarkValues || [],
      };
    }

    const lastDateStr = timelineDates[len - 1];
    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    const cutoff = new Date(ly, lm - 1, ld);

    if (timeframe === '1D') {
      cutoff.setDate(cutoff.getDate() - 1);
    } else if (timeframe === '1W') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (timeframe === '1M') {
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (timeframe === 'YTD') {
      cutoff.setFullYear(ly, 0, 1);
    } else if (timeframe === '1Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else if (timeframe === '3Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 3);
    } else if (timeframe === '5Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 5);
    }

    const cy = cutoff.getFullYear();
    const cm = String(cutoff.getMonth() + 1).padStart(2, '0');
    const cd = String(cutoff.getDate()).padStart(2, '0');
    const cutoffStr = `${cy}-${cm}-${cd}`;

    let startIndex = timelineDates.findIndex((d) => d >= cutoffStr);
    if (startIndex === -1 || startIndex >= len - 1) {
      if (timeframe === '1D') startIndex = Math.max(0, len - 2);
      else if (timeframe === '1W') startIndex = Math.max(0, len - 6);
      else if (timeframe === '1M') startIndex = Math.max(0, len - 22);
      else startIndex = 0;
    }

    return {
      dates: timelineDates.slice(startIndex),
      values: portfolioValues.slice(startIndex),
      benchmark: (benchmarkValues || []).slice(startIndex),
    };
  }, [stats, timeframe]);

  // Compute period delta (profit $ and %) for the active timeframe or custom zoom
  const periodMetrics = useMemo(() => {
    const { dates, values } = activeTimeline;
    if (values.length === 0) {
      return {
        currentVal: stats?.currentValue || 0,
        startVal: stats?.currentValue || 0,
        diffDollar: stats?.totalProfit || 0,
        diffPercent: stats?.totalReturnPercent || 0,
        isPositive: (stats?.totalProfit || 0) >= 0,
      };
    }

    let sIdx = 0;
    let eIdx = values.length - 1;
    if (customZoomSelection) {
      const foundStart = dates.findIndex((d) => d >= customZoomSelection.startDate);
      let foundEnd = dates.findIndex((d) => d > customZoomSelection.endDate);
      if (foundEnd === -1) foundEnd = dates.length;
      sIdx = foundStart === -1 ? 0 : foundStart;
      eIdx = Math.max(sIdx + 1, Math.min(dates.length - 1, foundEnd - 1));
    }

    const startVal = values[sIdx];
    const endVal = values[eIdx];
    const diffDollar = endVal - startVal;
    const diffPercent = startVal > 0 ? (diffDollar / startVal) * 100 : 0;

    return {
      currentVal: endVal,
      startVal,
      diffDollar,
      diffPercent,
      isPositive: diffDollar >= 0,
    };
  }, [activeTimeline, customZoomSelection, stats]);

  // Dynamic Y-axis scale bounds for visible range (auto-fits line vertically)
  const { visibleMinY, visibleMaxY } = useMemo(() => {
    const { dates, values, benchmark } = activeTimeline;
    if (values.length === 0) return { visibleMinY: undefined, visibleMaxY: undefined };

    let sIdx = 0;
    let eIdx = values.length - 1;
    if (customZoomSelection) {
      const foundStart = dates.findIndex((d) => d >= customZoomSelection.startDate);
      let foundEnd = dates.findIndex((d) => d > customZoomSelection.endDate);
      if (foundEnd === -1) foundEnd = dates.length;
      sIdx = foundStart === -1 ? 0 : foundStart;
      eIdx = Math.max(sIdx + 1, Math.min(dates.length - 1, foundEnd - 1));
    }

    const startVal = values[sIdx] || values[0] || 1;
    const startBench = (benchmark && benchmark[sIdx]) || (benchmark && benchmark[0]) || 1;

    let min = Infinity;
    let max = -Infinity;

    for (let i = sIdx; i <= eIdx; i++) {
      const v = values[i];
      if (v != null && !isNaN(v)) {
        const displayV = metricMode === 'value' ? v : (startVal > 0 ? ((v - startVal) / startVal) * 100 : 0);
        if (displayV < min) min = displayV;
        if (displayV > max) max = displayV;
      }
      if (showBenchmark && benchmark && benchmark[i] != null && !isNaN(benchmark[i])) {
        const b = benchmark[i];
        const displayB = metricMode === 'value' ? b : (startBench > 0 ? ((b - startBench) / startBench) * 100 : 0);
        if (displayB < min) min = displayB;
        if (displayB > max) max = displayB;
      }
    }

    if (min === Infinity || max === -Infinity) return { visibleMinY: undefined, visibleMaxY: undefined };

    const span = Math.max(1, max - min);
    const pad = span * 0.08;
    return {
      visibleMinY: min - pad,
      visibleMaxY: max + pad,
    };
  }, [activeTimeline, customZoomSelection, metricMode, showBenchmark]);

  // Notify parent dashboard of active timeframe & period metrics
  React.useEffect(() => {
    onPeriodMetricsChange?.({
      timeframe: customZoomSelection ? `Zoom: ${customZoomSelection.startDate} - ${customZoomSelection.endDate}` : timeframe,
      diffDollar: periodMetrics.diffDollar,
      diffPercent: periodMetrics.diffPercent,
      isCustom: !!customZoomSelection,
    });
  }, [periodMetrics, customZoomSelection, timeframe, onPeriodMetricsChange]);

  // Display value based on hover or active timeframe end
  const displayValue = hoveredPoint ? hoveredPoint.value : periodMetrics.currentVal;
  const displayPercent = hoveredPoint ? hoveredPoint.percent : periodMetrics.diffPercent;
  const displayDiffDollar = hoveredPoint
    ? hoveredPoint.value - (periodMetrics.startVal || 0)
    : periodMetrics.diffDollar;
  const isDisplayPositive = displayDiffDollar >= 0;

  // Chart datasets
  const chartData = useMemo(() => {
    const { dates, values, benchmark } = activeTimeline;
    const isPositive = periodMetrics.isPositive;
    const startVal = values[0] || 1;
    const startBench = benchmark[0] || 1;

    // Line colors: emerald neon or vivid rose
    const lineColor = isPositive ? '#10b981' : '#f43f5e';
    const gradientTop = isPositive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)';

    const displaySeries =
      metricMode === 'value'
        ? values
        : values.map((v) => (startVal > 0 ? ((v - startVal) / startVal) * 100 : 0));

    const datasets: any[] = [
      {
        label: activePortfolio?.name || 'Portfolio',
        data: displaySeries,
        borderColor: lineColor,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2.5,
        tension: 0.2,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return gradientTop;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, gradientTop);
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
          return gradient;
        },
      },
    ];

    if (showBenchmark && benchmark.length === values.length) {
      const benchSeries =
        metricMode === 'value'
          ? benchmark
          : benchmark.map((b) => (startBench > 0 ? ((b - startBench) / startBench) * 100 : 0));

      datasets.push({
        label: 'S&P 500 (VOO)',
        data: benchSeries,
        borderColor: '#06b6d4',
        borderWidth: 1.8,
        borderDash: [5, 4],
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#06b6d4',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.2,
        fill: false,
      });
    }

    return {
      labels: dates,
      datasets,
    };
  }, [activeTimeline, metricMode, showBenchmark, periodMetrics.isPositive, activePortfolio?.name]);

  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: customZoomSelection ? 300 : 250,
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: showBenchmark,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            color: '#cbd5e1',
            font: { size: 11, weight: 600 },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#cbd5e1',
          bodyColor: '#ffffff',
          borderColor: 'rgba(139, 92, 246, 0.4)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const dateStr = items[0].label;
              const [y, m, d] = dateStr.split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
              return dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            },
            label: (item) => {
              const val = Number(item.raw);
              if (metricMode === 'value') {
                return ` ${item.dataset.label}: ${currencySymbol}${val.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              } else {
                const sign = val >= 0 ? '+' : '';
                return ` ${item.dataset.label}: ${sign}${val.toFixed(2)}%`;
              }
            },
          },
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
              if (isProgrammaticUpdateRef.current) return;
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
                  setCustomZoomSelection(null);
                  setIsZoomed(false);
                  return;
                }

                if (minIdx >= maxIdx) return;

                const startDate = labels[minIdx];
                const endDate = labels[maxIdx];
                if (startDate && endDate && startDate !== endDate) {
                  setCustomZoomSelection({ startDate, endDate });
                  setIsZoomed(true);
                }
              }
            },
          },
          pan: {
            enabled: false,
          },
        },
      },
      scales: {
        x: {
          min: customZoomSelection?.startDate,
          max: customZoomSelection?.endDate,
          display: false, // Clean getquin look: axis is minimal, selector pills are below
          grid: { display: false },
        },
        y: {
          min: visibleMinY,
          max: visibleMaxY,
          display: false, // Edge-to-edge full canvas getquin aesthetic
          grid: { display: false },
        },
      },
      onHover: (_e, activeElements) => {
        // Suppress hover updates while mouse button is pressed (dragging to zoom)
        const native = (_e as any)?.native as MouseEvent | undefined;
        if (native && native.buttons > 0) return;

        if (activeElements && activeElements.length > 0) {
          const index = activeElements[0].index;
          const { dates, values } = activeTimeline;
          if (index >= 0 && index < values.length) {
            let sIdx = 0;
            if (customZoomSelection) {
              const foundStart = dates.findIndex((d) => d >= customZoomSelection.startDate);
              sIdx = foundStart === -1 ? 0 : foundStart;
            }
            const baseVal = values[sIdx] || values[0] || 1;
            const ptVal = values[index];
            const ptPct = baseVal > 0 ? ((ptVal - baseVal) / baseVal) * 100 : 0;
            setHoveredPoint({
              date: dates[index],
              value: ptVal,
              percent: ptPct,
            });
          }
        } else {
          setHoveredPoint(null);
        }
      },
    };
  }, [showBenchmark, metricMode, currencySymbol, activeTimeline, customZoomSelection, visibleMinY, visibleMaxY]);

  const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', 'YTD', '1Y', '3Y', '5Y', 'Max'];

  // Split formatted currency value for sleek design (e.g. $131,289 and .81)
  const formattedVal = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [valInt, valDec] = formattedVal.split('.');

  return (
    <div
      className="card glass getquin-hero-chart animate-fade-in"
      style={{
        padding: '24px 28px',
        marginBottom: '26px',
        position: 'relative',
        background: '#0a0f1d',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* TOP ROW: Quick Portfolio Switcher Pills (getquin style) */}
      <PortfolioQuickPills
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        onSelectPortfolio={onSelectPortfolio}
      />

      {/* HEADER SECTION: Value, Performance Delta, Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.88rem',
              color: '#94a3b8',
              fontWeight: 600,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{activePortfolio?.name || 'Portfolios'}</span>
            {hoveredPoint && (
              <span style={{ color: 'var(--accent-whatif-light)', fontWeight: 700 }}>
                • {hoveredPoint.date}
              </span>
            )}
          </div>

          {/* Large Portfolio Total Value */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              fontFamily: 'var(--font-mono)',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              fontWeight: 800,
            }}
          >
            {metricMode === 'percent' ? (
              <span style={{ fontSize: '2.5rem', lineHeight: 1, color: isDisplayPositive ? '#34d399' : '#fb7185' }}>
                {isDisplayPositive ? '+' : ''}{displayPercent.toFixed(2)}%
              </span>
            ) : (
              <>
                <span style={{ fontSize: '1.6rem', marginRight: '4px', opacity: 0.85 }}>
                  {currencySymbol}
                </span>
                <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{valInt}</span>
                <span style={{ fontSize: '1.5rem', opacity: 0.75 }}>.{valDec}</span>
              </>
            )}
          </div>

          {/* Period Change Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '6px',
              fontSize: '0.92rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                color: isDisplayPositive ? '#34d399' : '#fb7185',
              }}
            >
              {isDisplayPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {isDisplayPositive ? '+' : ''}
              {currencySymbol}
              {Math.abs(displayDiffDollar).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ({isDisplayPositive ? '+' : ''}
              {displayPercent.toFixed(2)}%)
            </span>
            <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
              {hoveredPoint
                ? 'at point'
                : customZoomSelection
                ? `selected period (${customZoomSelection.startDate} to ${customZoomSelection.endDate})`
                : timeframe === 'Max'
                ? 'all-time'
                : `${timeframe} change`}
            </span>
          </div>
        </div>

        {/* Right Action Tools: Performance toggle + Benchmark toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Toggle between Value $ and Return % */}
          <button
            onClick={() => setMetricMode(metricMode === 'value' ? 'percent' : 'value')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '8px',
              background:
                metricMode === 'percent'
                  ? 'rgba(139, 92, 246, 0.25)'
                  : 'rgba(255, 255, 255, 0.05)',
              border:
                metricMode === 'percent'
                  ? '1px solid rgba(139, 92, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Toggle between Value ($) and Return (%)"
          >
            <ArrowRightLeft size={13} color="var(--accent-whatif-light)" />
            <span>{metricMode === 'value' ? 'Performance %' : 'Show Net Worth $'}</span>
          </button>

          {/* Add Benchmark S&P 500 Toggle */}
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '8px',
              background: showBenchmark
                ? 'rgba(6, 182, 212, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              border: showBenchmark
                ? '1px solid rgba(6, 182, 212, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              color: showBenchmark ? '#38bdf8' : '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {showBenchmark ? <Check size={13} /> : <Plus size={13} />}
            <span>Benchmark (S&P 500)</span>
          </button>

          {(customZoomSelection || isZoomed) && (
            <button
              className="btn btn-reset-zoom"
              onClick={handleResetZoom}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.25)',
                border: '1px solid rgba(139, 92, 246, 0.6)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 0 14px rgba(139, 92, 246, 0.4)',
              }}
            >
              <RotateCcw size={13} />
              <span>Reset Zoom</span>
            </button>
          )}
        </div>
      </div>

      {/* CHART CANVAS */}
      <div style={{ height: '240px', width: '100%', position: 'relative' }}>
        {activeTimeline.values.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '0.88rem',
            }}
          >
            No historical trading points for this portfolio yet.
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Timeframe Selector Pills + Watermark */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Timeframe Selector Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {TIMEFRAMES.map((tf) => {
            const isSelected = timeframe === tf && !customZoomSelection;
            return (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: isSelected ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.4)' : 'none',
                }}
              >
                {tf}
              </button>
            );
          })}

          {customZoomSelection && (
            <span
              style={{
                fontSize: '0.74rem',
                color: '#c4b5fd',
                fontWeight: 700,
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.4)',
              }}
            >
              Custom: {customZoomSelection.startDate} — {customZoomSelection.endDate}
            </span>
          )}
        </div>

        {/* Watermark getquin-style badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#64748b',
            textTransform: 'uppercase',
          }}
        >
          <span>CHART BY</span>
          <span style={{ color: '#c4b5fd', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Sparkles size={11} color="var(--accent-whatif-light)" />
            FolioLab
          </span>
        </div>
      </div>
    </div>
  );
};
