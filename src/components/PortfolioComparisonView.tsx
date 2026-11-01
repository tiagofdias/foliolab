import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Scale,
  Plus,
  X,
  RotateCcw,
  MousePointerClick,
} from 'lucide-react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import type { Portfolio, PortfolioActivity, MarketQuote } from '../types';
import { computePortfolioStats } from '../services/portfolioStats';
import { computePortfolioHoldings } from '../services/portfolioStore';
import { fetchMarketData } from '../services/marketData';
import { BenchmarkSelectorModal } from './BenchmarkSelectorModal';
import { type BenchmarkItem, PRESET_BENCHMARKS } from '../services/benchmarkCatalog';

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

interface Props {
  portfolios: Portfolio[];
  activities: PortfolioActivity[];
  quotes: Record<string, MarketQuote>;
}

type TimeframePreset = '1M' | '6M' | 'YTD' | '1Y' | '3Y' | 'ALL';
type DisplayMode = 'PERCENT' | 'DOLLAR';

const BENCHMARK_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f43f5e', // Rose
];

export const PortfolioComparisonView: React.FC<Props> = ({
  portfolios,
  activities,
  quotes,
}) => {
  // Modal open state
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  // Active selected benchmarks/portfolios (default: First portfolio + Second portfolio + S&P 500)
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<BenchmarkItem[]>(() => {
    const defaultItems: BenchmarkItem[] = [];

    // 1. First user portfolio
    const firstPort = portfolios[1] || portfolios[0];
    if (firstPort) {
      defaultItems.push({
        id: `port-${firstPort.id}`,
        name: firstPort.name,
        symbol: firstPort.name.toUpperCase().slice(0, 4),
        category: 'portfolio',
        color: firstPort.color || '#06b6d4',
        avatarText: firstPort.name.slice(0, 2).toUpperCase(),
        avatarBg: `${firstPort.color || '#06b6d4'}28`,
        isUserPortfolio: true,
        portfolioId: firstPort.id,
        description: firstPort.description || `User Portfolio: ${firstPort.name}`,
      });
    }

    // 2. Second user portfolio
    const secondPort = portfolios.find((p) => p.id !== firstPort?.id);
    if (secondPort) {
      defaultItems.push({
        id: `port-${secondPort.id}`,
        name: secondPort.name,
        symbol: secondPort.name.toUpperCase().slice(0, 4),
        category: 'portfolio',
        color: secondPort.color || '#10b981',
        avatarText: secondPort.name.slice(0, 2).toUpperCase(),
        avatarBg: `${secondPort.color || '#10b981'}28`,
        isUserPortfolio: true,
        portfolioId: secondPort.id,
        description: secondPort.description || `User Portfolio: ${secondPort.name}`,
      });
    }

    // 3. S&P 500 Index (VOO)
    const voo = PRESET_BENCHMARKS.find((b) => b.symbol === 'VOO');
    if (voo) defaultItems.push(voo);

    return defaultItems;
  });

  const [timeframe, setTimeframe] = useState<TimeframePreset>('ALL');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('PERCENT');
  const [extraQuotes, setExtraQuotes] = useState<Record<string, MarketQuote>>({});
  const [customZoomSelection, setCustomZoomSelection] = useState<{ startDate: string; endDate: string } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const chartRef = useRef<any>(null);
  const isProgrammaticUpdateRef = useRef<boolean>(false);

  const handleResetZoom = () => {
    isProgrammaticUpdateRef.current = true;
    setCustomZoomSelection(null);
    setIsZoomed(false);
    if (chartRef.current) {
      try {
        chartRef.current.resetZoom?.('none');
      } catch (e) {}
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  const handleTimeframeChange = (tf: TimeframePreset) => {
    isProgrammaticUpdateRef.current = true;
    setTimeframe(tf);
    setCustomZoomSelection(null);
    setIsZoomed(false);
    if (chartRef.current) {
      try {
        chartRef.current.resetZoom?.('none');
      } catch (e) {}
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  // Reset zoom on display mode switch so scale units align cleanly
  useEffect(() => {
    if (chartRef.current) {
      try {
        chartRef.current.resetZoom?.('none');
      } catch (e) {}
    }
  }, [displayMode]);

  // Asynchronously fetch market data for selected benchmarks that aren't loaded yet
  useEffect(() => {
    selectedBenchmarks.forEach(async (b) => {
      if (!b.isUserPortfolio && !quotes[b.symbol] && !extraQuotes[b.symbol]) {
        try {
          const q = await fetchMarketData(b.symbol);
          setExtraQuotes((prev) => ({ ...prev, [b.symbol]: q }));
        } catch (e) {
          console.warn(`Could not load quote for benchmark ${b.symbol}`);
        }
      }
    });
  }, [selectedBenchmarks, quotes, extraQuotes]);

  const allQuotes = useMemo(() => {
    return { ...quotes, ...extraQuotes };
  }, [quotes, extraQuotes]);

  // 1. Raw historical series for each benchmark/portfolio
  const rawBenchmarks = useMemo(() => {
    return selectedBenchmarks.map((bench, idx) => {
      const assignedColor = bench.color || BENCHMARK_COLORS[idx % BENCHMARK_COLORS.length];

      if (bench.isUserPortfolio) {
        const pActs =
          bench.portfolioId === 'ALL'
            ? activities
            : activities.filter((a) => a.portfolioId === bench.portfolioId);
        const stats = computePortfolioStats(pActs, allQuotes, 'VOO');
        const holdings = computePortfolioHoldings(pActs, allQuotes, bench.portfolioId || 'port-main').holdings;

        return {
          item: bench,
          color: assignedColor,
          isPortfolio: true,
          holdings,
          dates: stats?.timelineDates || [],
          values: stats?.portfolioValues || [],
        };
      } else {
        const q = allQuotes[bench.symbol];
        const history = q?.history || [];
        return {
          item: bench,
          color: assignedColor,
          isPortfolio: false,
          holdings: [],
          dates: history.map((h) => h.date),
          values: history.map((h) => h.price),
        };
      }
    });
  }, [selectedBenchmarks, activities, allQuotes]);

  // 2. Union of all chronological dates across all benchmarks
  const allSortedDates = useMemo(() => {
    const set = new Set<string>();
    rawBenchmarks.forEach((b) => b.dates.forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [rawBenchmarks]);

  // 3. Active timeline dates filtered by preset timeframe
  const timeframeDates = useMemo(() => {
    if (allSortedDates.length === 0) return [];

    if (timeframe === 'ALL') return allSortedDates;

    const lastDateStr = allSortedDates[allSortedDates.length - 1];
    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    const cutoff = new Date(ly, lm - 1, ld);

    if (timeframe === '1M') {
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (timeframe === '6M') {
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (timeframe === 'YTD') {
      cutoff.setFullYear(ly, 0, 1);
    } else if (timeframe === '1Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else if (timeframe === '3Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 3);
    }

    const cy = cutoff.getFullYear();
    const cm = String(cutoff.getMonth() + 1).padStart(2, '0');
    const cd = String(cutoff.getDate()).padStart(2, '0');
    const cutoffStr = `${cy}-${cm}-${cd}`;

    const sIdx = allSortedDates.findIndex((d) => d >= cutoffStr);
    const startIndex = sIdx === -1 ? 0 : sIdx;
    const sliced = allSortedDates.slice(startIndex);
    return sliced.length >= 2 ? sliced : allSortedDates.slice(-2);
  }, [allSortedDates, timeframe]);

  // 4. Effective dates for metrics & KPI evaluation (zoomed window if custom zoom active, else timeframe)
  const zoomedDates = useMemo(() => {
    if (!customZoomSelection || timeframeDates.length === 0) return timeframeDates;
    const filtered = timeframeDates.filter(
      (d) => d >= customZoomSelection.startDate && d <= customZoomSelection.endDate
    );
    return filtered.length >= 2 ? filtered : timeframeDates;
  }, [timeframeDates, customZoomSelection]);

  // 5. Compute dynamic institutional metrics for the active timeframe / zoom window
  const benchmarkEvaluations = useMemo(() => {
    if (zoomedDates.length === 0) return [];
    const firstDate = zoomedDates[0];

    return rawBenchmarks.map((b) => {
      const dateMap = new Map<string, number>();
      b.dates.forEach((d, i) => dateMap.set(d, b.values[i]));

      // Determine baseline start price/value on or prior to first date of evaluation window
      let startVal = dateMap.get(firstDate);
      if (startVal === undefined) {
        for (let i = b.dates.length - 1; i >= 0; i--) {
          if (b.dates[i] <= firstDate) {
            startVal = b.values[i];
            break;
          }
        }
      }
      if (startVal === undefined || startVal <= 0) {
        startVal = b.values[0] || 1;
      }

      let lastKnown = startVal;
      const pcts: number[] = [];
      const dollars: number[] = [];

      zoomedDates.forEach((d) => {
        if (dateMap.has(d)) {
          lastKnown = dateMap.get(d)!;
        }
        dollars.push(lastKnown);
        const pct = startVal > 0 ? ((lastKnown - startVal) / startVal) * 100 : 0;
        pcts.push(Math.round(pct * 100) / 100);
      });

      const endVal = dollars[dollars.length - 1] || startVal;
      const periodReturnPercent = pcts[pcts.length - 1] || 0;
      const periodDollarChange = endVal - startVal;
      const years = Math.max(0.08, zoomedDates.length / 252);
      const cagr = startVal > 0 && endVal > 0 ? (Math.pow(endVal / startVal, 1 / years) - 1) * 100 : 0;

      // Peak-to-trough max drawdown within active evaluation window
      let peak = -Infinity;
      let maxDd = 0;
      const dailyReturns: number[] = [];
      for (let i = 0; i < dollars.length; i++) {
        const p = dollars[i];
        if (p > peak) peak = p;
        const dd = peak > 0 ? ((p - peak) / peak) * 100 : 0;
        if (Math.abs(dd) > maxDd) maxDd = Math.abs(dd);

        if (i > 0 && dollars[i - 1] > 0) {
          dailyReturns.push((dollars[i] - dollars[i - 1]) / dollars[i - 1]);
        }
      }

      const meanDaily = dailyReturns.length > 0 ? dailyReturns.reduce((acc, v) => acc + v, 0) / dailyReturns.length : 0;
      const variance =
        dailyReturns.length > 1
          ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) / (dailyReturns.length - 1)
          : 0;
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
      const sharpeRatio = volatility > 0 ? (cagr - 4.5) / volatility : 0;

      return {
        item: b.item,
        color: b.color,
        isPortfolio: b.isPortfolio,
        holdings: b.holdings,
        dates: zoomedDates,
        values: dollars,
        pcts,
        dollars,
        startValue: startVal,
        currentValue: endVal,
        periodDollarChange,
        totalReturnPercent: periodReturnPercent,
        cagr,
        sharpeRatio,
        volatility,
        maxDrawdown: maxDd,
      };
    });
  }, [rawBenchmarks, zoomedDates]);

  // 6. Dynamic Y-axis scale bounds for zoomed window
  const { visibleMinY, visibleMaxY } = useMemo(() => {
    if (rawBenchmarks.length === 0 || zoomedDates.length === 0) {
      return { visibleMinY: undefined, visibleMaxY: undefined };
    }

    const firstTfDate = timeframeDates[0];
    let min = Infinity;
    let max = -Infinity;

    rawBenchmarks.forEach((b) => {
      const dateMap = new Map<string, number>();
      b.dates.forEach((d, i) => dateMap.set(d, b.values[i]));

      let tfStartVal = dateMap.get(firstTfDate);
      if (tfStartVal === undefined) {
        for (let i = b.dates.length - 1; i >= 0; i--) {
          if (b.dates[i] <= firstTfDate) {
            tfStartVal = b.values[i];
            break;
          }
        }
      }
      if (tfStartVal === undefined || tfStartVal <= 0) tfStartVal = b.values[0] || 1;

      let lastKnown = tfStartVal;
      zoomedDates.forEach((d) => {
        if (dateMap.has(d)) lastKnown = dateMap.get(d)!;
        const val = displayMode === 'DOLLAR'
          ? lastKnown
          : tfStartVal > 0 ? ((lastKnown - tfStartVal) / tfStartVal) * 100 : 0;
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    if (min === Infinity || max === -Infinity) {
      return { visibleMinY: undefined, visibleMaxY: undefined };
    }

    const span = Math.max(1, max - min);
    const pad = span * 0.08;
    return {
      visibleMinY: Math.floor(min - pad),
      visibleMaxY: Math.ceil(max + pad),
    };
  }, [rawBenchmarks, zoomedDates, timeframeDates, displayMode]);

  // 7. Chart datasets mapped across full timeframe dates
  const chartData = useMemo(() => {
    if (rawBenchmarks.length === 0 || timeframeDates.length === 0) {
      return { labels: [], datasets: [] };
    }

    const isDollar = displayMode === 'DOLLAR';
    const firstDate = timeframeDates[0];

    const datasets: any[] = rawBenchmarks.map((b, idx) => {
      const dateMap = new Map<string, number>();
      b.dates.forEach((d, i) => dateMap.set(d, b.values[i]));

      let startVal = dateMap.get(firstDate);
      if (startVal === undefined) {
        for (let i = b.dates.length - 1; i >= 0; i--) {
          if (b.dates[i] <= firstDate) {
            startVal = b.values[i];
            break;
          }
        }
      }
      if (startVal === undefined || startVal <= 0) startVal = b.values[0] || 1;

      let lastKnown = startVal;
      const series: number[] = [];
      timeframeDates.forEach((d) => {
        if (dateMap.has(d)) lastKnown = dateMap.get(d)!;
        if (isDollar) {
          series.push(lastKnown);
        } else {
          const pct = startVal > 0 ? ((lastKnown - startVal) / startVal) * 100 : 0;
          series.push(Math.round(pct * 100) / 100);
        }
      });

      return {
        label: b.item.name,
        data: series,
        borderColor: b.color,
        backgroundColor: 'transparent',
        borderWidth: 2.4,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: b.color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        order: idx + 1,
      };
    });

    return {
      labels: timeframeDates,
      datasets,
    };
  }, [rawBenchmarks, timeframeDates, displayMode]);

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
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            color: '#cbd5e1',
            font: { size: 12, family: 'Poppins', weight: 600 },
            padding: 16,
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
        tooltip: {
          backgroundColor: '#0a0f1d',
          titleColor: '#94a3b8',
          titleFont: { size: 12, family: 'Poppins', weight: 'bold' },
          bodyFont: { size: 12, family: 'Poppins' },
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset.label || '';
              const val = ctx.parsed.y ?? 0;
              if (displayMode === 'DOLLAR') {
                return ` ${label}: $${val.toLocaleString()}`;
              } else {
                const sign = val >= 0 ? '+' : '';
                return ` ${label}: ${sign}${val.toFixed(2)}%`;
              }
            },
          },
        },
      },
      scales: {
        x: {
          min: customZoomSelection?.startDate,
          max: customZoomSelection?.endDate,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#64748b', font: { size: 11, family: 'Poppins' }, maxTicksLimit: 7 },
        },
        y: {
          min: customZoomSelection ? visibleMinY : undefined,
          max: customZoomSelection ? visibleMaxY : undefined,
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'Poppins' },
            callback: (val) => {
              if (displayMode === 'DOLLAR') return `$${Number(val).toLocaleString()}`;
              return `${val}%`;
            },
          },
        },
      },
    };
  }, [displayMode, customZoomSelection, visibleMinY, visibleMaxY]);

  // Remove benchmark
  const handleRemoveBenchmark = (id: string) => {
    setSelectedBenchmarks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. TOP UNIFIED BENCHMARKS BAR */}
      <div
        className="card glass"
        style={{
          padding: '16px 24px',
          background: '#0d1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Left: Active Benchmark Chips + Add Benchmark Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.74rem',
              color: '#94a3b8',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginRight: '2px',
            }}
          >
            Comparing ({selectedBenchmarks.length}):
          </span>

          {/* Benchmark Chips */}
          {selectedBenchmarks.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${b.color}55`,
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: `0 0 10px ${b.color}22`,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: b.color,
                  boxShadow: `0 0 8px ${b.color}`,
                }}
              />
              <span>{b.symbol || b.name}</span>
              <button
                onClick={() => handleRemoveBenchmark(b.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                title={`Remove ${b.name}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {/* + Add Benchmark Button */}
          <button
            onClick={() => setIsBenchmarkModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '9999px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#c4b5fd',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 0 12px rgba(139, 92, 246, 0.25)',
            }}
            title="Open Benchmark selection modal"
          >
            <Plus size={14} />
            <span>Add Benchmark</span>
          </button>
        </div>

        {/* Right: Display Mode & Timeframe Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Return (%) vs Net Worth ($) */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              onClick={() => setDisplayMode('PERCENT')}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: displayMode === 'PERCENT' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                color: displayMode === 'PERCENT' ? '#ffffff' : '#94a3b8',
                border: displayMode === 'PERCENT' ? '1px solid rgba(139, 92, 246, 0.5)' : 'none',
              }}
            >
              Return (%)
            </button>
            <button
              onClick={() => setDisplayMode('DOLLAR')}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: displayMode === 'DOLLAR' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                color: displayMode === 'DOLLAR' ? '#ffffff' : '#94a3b8',
                border: displayMode === 'DOLLAR' ? '1px solid rgba(139, 92, 246, 0.5)' : 'none',
              }}
            >
              Net Worth ($)
            </button>
          </div>

          {/* Timeframe selector pills */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {(['1M', '6M', 'YTD', '1Y', '3Y', 'ALL'] as TimeframePreset[]).map((tf) => {
              const isActive = timeframe === tf && !customZoomSelection;
              return (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isActive ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    border: isActive ? '1px solid rgba(139, 92, 246, 0.5)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State if no benchmarks selected */}
      {selectedBenchmarks.length === 0 ? (
        <div
          className="card glass"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            background: '#0d1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          }}
        >
          <Scale size={42} style={{ color: '#8b5cf6', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            No Benchmarks Selected
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '440px', margin: '0 auto 20px' }}>
            Select your portfolios, market indices, ETFs, or crypto assets to compare side-by-side.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsBenchmarkModalOpen(true)}
            style={{ padding: '10px 20px', fontWeight: 700 }}
          >
            <Plus size={16} /> Add Benchmark
          </button>
        </div>
      ) : (
        <>
          {/* 2. DYNAMIC KPI COMPARISON CARDS ROW */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {benchmarkEvaluations.map((bench) => (
              <div
                key={bench.item.id}
                className="card glass"
                style={{
                  padding: '20px 24px',
                  background: '#0d1526',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderLeft: `4px solid ${bench.color}`,
                  borderRadius: '16px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: bench.color,
                        boxShadow: `0 0 8px ${bench.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#cbd5e1',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {bench.item.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: bench.isPortfolio ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        color: bench.isPortfolio ? 'var(--accent-whatif-light)' : '#94a3b8',
                        fontWeight: 800,
                      }}
                    >
                      {bench.isPortfolio ? 'PORTFOLIO' : bench.item.symbol}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: customZoomSelection ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: customZoomSelection ? '#f472b6' : '#64748b',
                        fontWeight: 700,
                      }}
                    >
                      {customZoomSelection ? 'ZOOM' : timeframe}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '1.9rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: bench.totalReturnPercent >= 0 ? '#34d399' : '#fb7185',
                  }}
                >
                  {displayMode === 'DOLLAR'
                    ? `$${Math.round(bench.currentValue).toLocaleString()}`
                    : `${bench.totalReturnPercent >= 0 ? '+' : ''}${bench.totalReturnPercent.toFixed(2)}%`}
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>
                    CAGR: {bench.cagr.toFixed(1)}% · Sharpe: {bench.sharpeRatio.toFixed(2)} · Max DD: -{bench.maxDrawdown.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 3. COMPARATIVE PERFORMANCE CHART */}
          <div
            className="card glass"
            style={{
              padding: '24px',
              background: '#0d1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Comparative Performance Trajectory
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {customZoomSelection ? (
                    <span style={{ color: '#c4b5fd', fontWeight: 600 }}>
                      Custom Window: {customZoomSelection.startDate} to {customZoomSelection.endDate} ({zoomedDates.length} trading points)
                    </span>
                  ) : (
                    `Normalized return trajectory across market closes (${selectedBenchmarks.map((b) => b.symbol).join(', ')})`
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {customZoomSelection || isZoomed ? (
                  <button
                    className="btn btn-reset-zoom"
                    onClick={handleResetZoom}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      background: 'rgba(139, 92, 246, 0.25)',
                      border: '1px solid rgba(139, 92, 246, 0.6)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    <RotateCcw size={13} />
                    Reset Zoom
                  </button>
                ) : (
                  <div
                    className="mouse-drag-hint"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    <MousePointerClick size={13} />
                    <span>Click & drag horizontally on the chart to select a custom period</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: '420px', width: '100%', position: 'relative' }}>
              {chartData.datasets && chartData.datasets.length > 0 ? (
                <Line ref={chartRef} data={chartData} options={chartOptions} />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  Select benchmarks with active price history to plot performance curves.
                </div>
              )}
            </div>
          </div>

          {/* 4. HEAD-TO-HEAD QUANTITATIVE ANALYTICS MATRIX */}
          <div
            className="card glass"
            style={{
              padding: '24px',
              background: '#0d1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-whatif-light)',
                }}
              >
                <Scale size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Head-to-Head Quantitative Analytics Matrix
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Direct cross-asset and cross-portfolio risk-adjusted returns, volatility, and drawdowns
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Metric / Ratio</th>
                    {benchmarkEvaluations.map((b) => (
                      <th key={b.item.id} style={{ color: b.color }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: b.color,
                            marginRight: '6px',
                          }}
                        />
                        {b.item.name}
                      </th>
                    ))}
                    {benchmarkEvaluations.length > 1 && <th style={{ width: '18%' }}>Leader</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Cumulative Return */}
                  <tr>
                    <td><strong>Cumulative Total Return</strong></td>
                    {benchmarkEvaluations.map((b) => (
                      <td
                        key={b.item.id}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: b.totalReturnPercent >= 0 ? '#34d399' : '#fb7185',
                        }}
                      >
                        {b.totalReturnPercent >= 0 ? '+' : ''}
                        {b.totalReturnPercent.toFixed(2)}%
                      </td>
                    ))}
                    {benchmarkEvaluations.length > 1 && (
                      <td style={{ fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                        {[...benchmarkEvaluations].sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)[0]?.item.symbol}
                      </td>
                    )}
                  </tr>

                  {/* Row 2: CAGR */}
                  <tr>
                    <td>Annualized Return (CAGR)</td>
                    {benchmarkEvaluations.map((b) => (
                      <td key={b.item.id} style={{ fontFamily: 'var(--font-mono)' }}>
                        {b.cagr.toFixed(2)}%
                      </td>
                    ))}
                    {benchmarkEvaluations.length > 1 && (
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {[...benchmarkEvaluations].sort((a, b) => b.cagr - a.cagr)[0]?.item.symbol}
                      </td>
                    )}
                  </tr>

                  {/* Row 3: Sharpe Ratio */}
                  <tr>
                    <td>Sharpe Ratio (Rf = 4.5%)</td>
                    {benchmarkEvaluations.map((b) => (
                      <td
                        key={b.item.id}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: b.sharpeRatio > 1 ? '#34d399' : 'inherit',
                        }}
                      >
                        {b.sharpeRatio.toFixed(2)}
                      </td>
                    ))}
                    {benchmarkEvaluations.length > 1 && (
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {[...benchmarkEvaluations].sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0]?.item.symbol}
                      </td>
                    )}
                  </tr>

                  {/* Row 4: Volatility */}
                  <tr>
                    <td>Annualized Volatility (Risk)</td>
                    {benchmarkEvaluations.map((b) => (
                      <td key={b.item.id} style={{ fontFamily: 'var(--font-mono)' }}>
                        {b.volatility.toFixed(2)}%
                      </td>
                    ))}
                    {benchmarkEvaluations.length > 1 && (
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {[...benchmarkEvaluations].sort((a, b) => a.volatility - b.volatility)[0]?.item.symbol} (Lowest)
                      </td>
                    )}
                  </tr>

                  {/* Row 5: Max Drawdown */}
                  <tr>
                    <td>Maximum Historic Drawdown</td>
                    {benchmarkEvaluations.map((b) => (
                      <td key={b.item.id} style={{ fontFamily: 'var(--font-mono)', color: '#fb7185' }}>
                        -{b.maxDrawdown.toFixed(2)}%
                      </td>
                    ))}
                    {benchmarkEvaluations.length > 1 && (
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {[...benchmarkEvaluations].sort((a, b) => a.maxDrawdown - b.maxDrawdown)[0]?.item.symbol} (Safest)
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. SIDE-BY-SIDE HOLDINGS COMPARISON (For any compared User Portfolios) */}
          {benchmarkEvaluations.filter((b) => b.isPortfolio && b.holdings.length > 0).length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {benchmarkEvaluations
                .filter((b) => b.isPortfolio && b.holdings.length > 0)
                .map((bench) => (
                  <div
                    key={bench.item.id}
                    className="card glass"
                    style={{
                      padding: '24px',
                      background: '#0d1526',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: bench.color,
                          }}
                        />
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                          {bench.item.name} Holdings
                        </h4>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#94a3b8',
                        }}
                      >
                        {bench.holdings.length} assets
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {bench.holdings.map((h) => (
                        <div
                          key={h.symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(139, 92, 246, 0.16)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                color: '#c4b5fd',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                flexShrink: 0,
                              }}
                            >
                              {h.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.9rem' }}>{h.symbol}</span>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                                {h.quantity} shares @ ${h.currentPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#ffffff' }}>
                              ${Math.round(h.currentValue).toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: h.unrealizedProfit >= 0 ? '#34d399' : '#fb7185',
                              }}
                            >
                              {h.unrealizedProfit >= 0 ? '+' : ''}
                              {h.unrealizedProfitPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Getquin-Style Benchmark Selection Modal */}
      <BenchmarkSelectorModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        selectedBenchmarkIds={selectedBenchmarks.map((b) => b.id)}
        onApplyBenchmarks={(benchmarks) => setSelectedBenchmarks(benchmarks)}
        userPortfolios={portfolios}
      />
    </div>
  );
};
