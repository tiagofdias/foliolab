import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Calendar,
  Percent,
  PieChart,
  RotateCcw,
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
import type { PortfolioStatsData, Portfolio } from '../types';
import type { HoldingPosition } from '../services/portfolioStore';
import { AllocationDeepDive } from './AllocationDeepDive';
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

interface Props {
  stats: PortfolioStatsData | null;
  holdings: HoldingPosition[];
  activePortfolio: Portfolio | { id: string; name: string; color: string };
  portfolios?: Portfolio[];
  activePortfolioId?: string;
  onSelectPortfolio?: (id: string) => void;
  onNavigateToTrades: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PortfolioStats: React.FC<Props> = ({
  stats,
  holdings,
  activePortfolio,
  portfolios = [],
  activePortfolioId = 'ALL',
  onSelectPortfolio,
  onNavigateToTrades,
}) => {
  const [viewMode, setViewMode] = useState<'allocation' | 'quant'>('allocation');
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
        (chartRef.current as any).resetZoom?.('none');
      } catch (e) {}
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  };

  // Reset zoom when switching active portfolio
  useEffect(() => {
    handleResetZoom();
  }, [activePortfolioId]);

  // Drawdown Chart Data
  const drawdownChartData = useMemo(() => {
    if (!stats || stats.timelineDates.length === 0) {
      return { labels: [], datasets: [] };
    }

    const downsampledStep = Math.max(1, Math.floor(stats.timelineDates.length / 250));
    const chartLabels: string[] = [];
    const chartDrawdowns: number[] = [];

    for (let i = 0; i < stats.timelineDates.length; i += downsampledStep) {
      chartLabels.push(stats.timelineDates[i]);
      chartDrawdowns.push(-stats.drawdownSeries[i]); // negative values for underwater curve
    }
    if (chartLabels[chartLabels.length - 1] !== stats.timelineDates[stats.timelineDates.length - 1]) {
      chartLabels.push(stats.timelineDates[stats.timelineDates.length - 1]);
      chartDrawdowns.push(-stats.drawdownSeries[stats.drawdownSeries.length - 1]);
    }

    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Drawdown from Peak (%)',
          data: chartDrawdowns,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          borderWidth: 2,
          tension: 0.2,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#f43f5e',
          pointHoverBorderColor: '#ffffff',
        },
      ],
    };
  }, [stats]);

  // Dynamic peak drop and bounds for visible window
  const { maxDrawdownInWindow, visibleMinDrawdown } = useMemo(() => {
    if (!stats || stats.timelineDates.length === 0) {
      return { maxDrawdownInWindow: 0, visibleMinDrawdown: -10 };
    }

    let sIdx = 0;
    let eIdx = stats.timelineDates.length - 1;
    if (customZoomSelection) {
      const foundStart = stats.timelineDates.findIndex((d) => d >= customZoomSelection.startDate);
      let foundEnd = stats.timelineDates.findIndex((d) => d > customZoomSelection.endDate);
      if (foundEnd === -1) foundEnd = stats.timelineDates.length;
      sIdx = foundStart === -1 ? 0 : foundStart;
      eIdx = Math.max(sIdx + 1, Math.min(stats.timelineDates.length - 1, foundEnd - 1));
    }

    let maxDd = 0;
    for (let i = sIdx; i <= eIdx; i++) {
      const dd = stats.drawdownSeries[i];
      if (dd != null && dd > maxDd) {
        maxDd = dd;
      }
    }

    const minVal = -Math.max(5, Math.ceil(maxDd * 1.15));
    return {
      maxDrawdownInWindow: maxDd,
      visibleMinDrawdown: minVal,
    };
  }, [stats, customZoomSelection]);

  const drawdownOptions: ChartOptions<'line'> = useMemo(() => {
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
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#94a3b8',
          titleFont: { size: 12, family: 'Poppins', weight: 'bold' },
          bodyFont: { size: 13, family: 'Poppins' },
          borderColor: 'rgba(244, 63, 94, 0.3)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` Drawdown: ${(ctx.parsed.y ?? 0).toFixed(2)}%`,
          },
        },
        zoom: {
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: 'rgba(244, 63, 94, 0.25)',
              borderColor: 'rgba(244, 63, 94, 0.8)',
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
          pan: { enabled: false },
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
          min: customZoomSelection ? visibleMinDrawdown : undefined,
          max: 0,
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 11, family: 'Poppins' },
            callback: (val) => `${val}%`,
          },
        },
      },
    };
  }, [customZoomSelection, visibleMinDrawdown]);

  // Helper for matrix tile background
  const getMatrixColor = (ret: number) => {
    if (ret > 7) return 'rgba(16, 185, 129, 0.65)';
    if (ret > 3) return 'rgba(16, 185, 129, 0.45)';
    if (ret > 0) return 'rgba(16, 185, 129, 0.25)';
    if (ret === 0) return 'rgba(255, 255, 255, 0.04)';
    if (ret > -3) return 'rgba(244, 63, 94, 0.25)';
    if (ret > -7) return 'rgba(244, 63, 94, 0.45)';
    return 'rgba(244, 63, 94, 0.65)';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. TOP QUICK PORTFOLIO SWITCHER PILLS (Unified with Tab 1 & Tab 2) */}
      {onSelectPortfolio && (
        <PortfolioQuickPills
          portfolios={portfolios}
          activePortfolioId={activePortfolioId}
          onSelectPortfolio={onSelectPortfolio}
        />
      )}

      {/* 2. Top Level Sub-Navigation Switcher between Allocation Deep-Dive & Quant Risk */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '4px',
          }}
        >
          <button
            id="subtab-allocation-deepdive"
            className={`btn-tab-toggle ${viewMode === 'allocation' ? 'active' : ''}`}
            onClick={() => setViewMode('allocation')}
            style={{
              padding: '7px 20px',
              fontSize: '0.82rem',
              borderRadius: '9999px',
              border: viewMode === 'allocation' ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid transparent',
              background: viewMode === 'allocation' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
              color: viewMode === 'allocation' ? '#ffffff' : '#94a3b8',
              boxShadow: viewMode === 'allocation' ? '0 0 16px rgba(139, 92, 246, 0.35)' : 'none',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <PieChart size={15} />
            <span>Allocation &amp; Deep Dive</span>
          </button>

          <button
            id="subtab-quant-risk"
            className={`btn-tab-toggle ${viewMode === 'quant' ? 'active' : ''}`}
            onClick={() => setViewMode('quant')}
            style={{
              padding: '7px 20px',
              fontSize: '0.82rem',
              borderRadius: '9999px',
              border: viewMode === 'quant' ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid transparent',
              background: viewMode === 'quant' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
              color: viewMode === 'quant' ? '#ffffff' : '#94a3b8',
              boxShadow: viewMode === 'quant' ? '0 0 16px rgba(139, 92, 246, 0.35)' : 'none',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={15} />
            <span>Quantitative Risk &amp; Ratios</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Getquin Allocation & Deep Dive */}
      {viewMode === 'allocation' && (
        <AllocationDeepDive holdings={holdings} portfolioName={activePortfolio.name} />
      )}

      {/* VIEW 2: Quantitative Stats & Heatmap & Drawdowns */}
      {viewMode === 'quant' && (
        <>
          {!stats ? (
            <div
              className="card glass"
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#94a3b8',
                background: '#0d1526',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
              }}
            >
              <BarChart3 size={40} style={{ margin: '0 auto 16px', color: '#64748b' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                No Statistical Timeline Data Available
              </h3>
              <p style={{ fontSize: '0.82rem', maxWidth: '420px', margin: '0 auto 20px', color: '#94a3b8' }}>
                Add purchases to this portfolio or select a portfolio with active trades to generate deep quantitative analytics.
              </p>
              <button className="btn btn-primary" onClick={onNavigateToTrades} style={{ padding: '8px 18px', fontWeight: 700 }}>
                Go to Trades
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Portfolio Info Ribbon */}
              <div
                className="card glass"
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: '#0d1526',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderLeft: `4px solid ${activePortfolio.color}`,
                  borderRadius: '16px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: activePortfolio.color,
                      boxShadow: `0 0 10px ${activePortfolio.color}`,
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        {activePortfolio.name}
                      </h3>
                      <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}>
                        {stats.totalTradingDays} Days Tracked
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                      Quantitative statistical overview vs. S&P 500 Benchmark (VOO)
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      All-Time High
                    </span>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                      ${stats.allTimeHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      Concentration
                    </span>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color:
                          stats.hhiRating === 'Well Diversified'
                            ? '#34d399'
                            : stats.hhiRating === 'Moderately Concentrated'
                            ? '#f59e0b'
                            : '#fb7185',
                      }}
                    >
                      {stats.hhiRating}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Hero KPI Cards (Unified with Tab 1 & Tab 2 cards) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Card 1: CAGR */}
                <div
                  className="card glass"
                  style={{
                    padding: '20px 24px',
                    background: '#0d1526',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '4px solid #34d399',
                    borderRadius: '16px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Compound Annual Growth
                    </span>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                      }}
                    >
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    {stats.cagr >= 0 ? '+' : ''}{stats.cagr.toFixed(2)}%
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                    1-Year: {stats.oneYearReturnPercent.toFixed(1)}% · YTD: {stats.ytdReturnPercent.toFixed(1)}%
                  </div>
                </div>

                {/* Card 2: Sharpe Ratio */}
                <div
                  className="card glass"
                  style={{
                    padding: '20px 24px',
                    background: '#0d1526',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '4px solid #8b5cf6',
                    borderRadius: '16px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Sharpe Ratio (Rf = 2%)
                    </span>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#c4b5fd',
                      }}
                    >
                      <Percent size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {stats.sharpeRatio.toFixed(2)}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                    {stats.sharpeRatio > 1.5 ? 'Excellent Efficiency' : stats.sharpeRatio > 1.0 ? 'Good Risk-Adjusted' : 'Sub-Optimal Efficiency'}
                  </div>
                </div>

                {/* Card 3: Max Drawdown */}
                <div
                  className="card glass"
                  style={{
                    padding: '20px 24px',
                    background: '#0d1526',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '4px solid #fb7185',
                    borderRadius: '16px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Max Historical Drop
                    </span>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fb7185',
                      }}
                    >
                      <ShieldAlert size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
                    -{stats.maxDrawdown.toFixed(2)}%
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                    Current from ATH: -{stats.currentDrawdown.toFixed(2)}%
                  </div>
                </div>

                {/* Card 4: Daily VaR 95% */}
                <div
                  className="card glass"
                  style={{
                    padding: '20px 24px',
                    background: '#0d1526',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '16px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Value at Risk (VaR 95%)
                    </span>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f59e0b',
                      }}
                    >
                      <ShieldAlert size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    -{stats.var95Daily.toFixed(2)}%
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                    CVaR (Expected Shortfall): -{stats.cvar95Daily.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Statistical Ratio & Benchmark Analytics Table */}
              <div
                className="card glass"
                style={{
                  padding: '22px 24px',
                  background: '#0d1526',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Statistical &amp; Risk-Adjusted Ratios Breakdown
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                    Institutional quantitative metrics evaluated over daily time-weighted returns.
                  </p>
                </div>

                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Metric Category</th>
                        <th style={{ width: '22%' }}>Portfolio Value</th>
                        <th style={{ width: '25%' }}>Benchmark / Standard</th>
                        <th style={{ width: '25%' }}>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Sortino Ratio</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stats.sortinoRatio.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-dim)' }}>&gt; 1.50 Target</td>
                        <td style={{ color: 'var(--accent-base)' }}>Penalizes downside variance only</td>
                      </tr>
                      <tr>
                        <td><strong>Calmar Ratio</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stats.calmarRatio.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-dim)' }}>&gt; 1.00 Target</td>
                        <td style={{ color: 'var(--text-muted)' }}>CAGR relative to Max Drawdown</td>
                      </tr>
                      <tr>
                        <td><strong>Annualized Volatility (σ)</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{stats.annualizedVolatility.toFixed(2)}%</td>
                        <td style={{ color: 'var(--text-dim)' }}>S&amp;P 500 ~ 15.5%</td>
                        <td style={{ color: stats.annualizedVolatility < 20 ? 'var(--accent-base)' : 'var(--accent-amber)' }}>
                          {stats.annualizedVolatility < 16 ? 'Low Volatility' : stats.annualizedVolatility < 24 ? 'Moderate Volatility' : 'High Volatility'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Downside Deviation</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{stats.downsideDeviation.toFixed(2)}%</td>
                        <td style={{ color: 'var(--text-dim)' }}>-</td>
                        <td style={{ color: 'var(--text-muted)' }}>Only negative day fluctuations</td>
                      </tr>
                      <tr>
                        <td><strong>Beta vs. S&P 500 (VOO)</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stats.beta.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-dim)' }}>1.00 Benchmark</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {stats.beta > 1.1 ? 'Aggressive market sensitivity' : stats.beta < 0.9 ? 'Defensive lower sensitivity' : 'Neutral market correlation'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Jensen's Alpha (Annualized)</strong></td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: stats.alpha >= 0 ? 'var(--accent-base)' : 'var(--accent-rose)',
                          }}
                        >
                          {stats.alpha >= 0 ? '+' : ''}{stats.alpha.toFixed(2)}%
                        </td>
                        <td style={{ color: 'var(--text-dim)' }}>0.00% Alpha Neutral</td>
                        <td style={{ color: stats.alpha >= 0 ? 'var(--accent-base)' : 'var(--accent-rose)' }}>
                          {stats.alpha >= 0 ? 'Excess return above market risk' : 'Underperformance vs expected risk'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Trading Day Win Rate</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {stats.winRateDaysPercent.toFixed(1)}%
                        </td>
                        <td style={{ color: 'var(--text-dim)' }}>
                          {stats.positiveDaysCount} green / {stats.negativeDaysCount} red days
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          Profit Factor: {stats.profitFactor.toFixed(2)}x
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Best / Worst Single Day</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--accent-base)' }}>+{stats.bestDay.returnPercent.toFixed(2)}%</span> /{' '}
                          <span style={{ color: 'var(--accent-rose)' }}>{stats.worstDay.returnPercent.toFixed(2)}%</span>
                        </td>
                        <td style={{ color: 'var(--text-dim)' }}>
                          {stats.bestDay.date} / {stats.worstDay.date}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>Historical single-day extremes</td>
                      </tr>
                      <tr>
                        <td><strong>Concentration (HHI Score)</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{stats.hhiScore} / 10,000</td>
                        <td style={{ color: 'var(--text-dim)' }}>&lt; 1,500 Diversified</td>
                        <td style={{ color: 'var(--accent-base)' }}>{stats.hhiRating}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly & Annual Returns Heatmap Matrix */}
              <div
                className="card glass"
                style={{
                  padding: '22px 24px',
                  background: '#0d1526',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="var(--accent-whatif-light)" />
                      <span>Monthly &amp; Annual Return Matrix</span>
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Historical monthly breakdown across every trading year.
                    </p>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: '0.8rem', textAlign: 'center' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Year</th>
                        {MONTH_NAMES.map((m) => (
                          <th key={m} style={{ textAlign: 'center', padding: '8px 4px' }}>
                            {m}
                          </th>
                        ))}
                        <th style={{ textAlign: 'right', paddingRight: '12px' }}>Total Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.monthlyMatrix.map((row) => (
                        <tr key={row.year}>
                          <td style={{ fontWeight: 800, textAlign: 'left', color: '#ffffff' }}>
                            {row.year}
                          </td>
                          {row.months.map((mCell, mIdx) => {
                            if (!mCell) {
                              return (
                                <td key={mIdx} style={{ color: 'var(--text-dim)', opacity: 0.3 }}>
                                  —
                                </td>
                              );
                            }
                            const isPositive = mCell.returnPercent >= 0;
                            return (
                              <td
                                key={mIdx}
                                style={{
                                  background: getMatrixColor(mCell.returnPercent),
                                  color: isPositive ? '#4ade80' : '#f87171',
                                  fontWeight: 600,
                                  fontFamily: 'var(--font-mono)',
                                  borderRadius: '3px',
                                  padding: '6px 2px',
                                }}
                                title={`${MONTH_NAMES[mIdx]} ${row.year}: ${mCell.returnPercent >= 0 ? '+' : ''}${mCell.returnPercent.toFixed(2)}% ($${Math.round(mCell.profit).toLocaleString()} profit)`}
                              >
                                {isPositive ? '+' : ''}{mCell.returnPercent.toFixed(1)}%
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                background: row.totalReturnPercent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                color: row.totalReturnPercent >= 0 ? 'var(--accent-base)' : 'var(--accent-rose)',
                              }}
                            >
                              {row.totalReturnPercent >= 0 ? '+' : ''}{row.totalReturnPercent.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Underwater Drawdown Chart */}
              <div
                className="card glass"
                style={{
                  padding: '22px 24px',
                  background: '#0d1526',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={16} color="var(--accent-rose)" />
                      <span>Underwater Drawdown History</span>
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      {customZoomSelection ? (
                        <span style={{ color: '#c4b5fd', fontWeight: 600 }}>
                          Custom Zoom: {customZoomSelection.startDate} to {customZoomSelection.endDate}
                        </span>
                      ) : (
                        'Historical peak-to-trough drop depth across the portfolio timeline. Drag horizontally to zoom.'
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                      Peak Drop: -{(customZoomSelection ? maxDrawdownInWindow : stats.maxDrawdown).toFixed(2)}%
                    </span>
                    {(customZoomSelection || isZoomed) && (
                      <button
                        className="btn btn-reset-zoom"
                        onClick={handleResetZoom}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          background: 'rgba(244, 63, 94, 0.25)',
                          border: '1px solid rgba(244, 63, 94, 0.6)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)',
                        }}
                      >
                        <RotateCcw size={12} />
                        Reset Zoom
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ height: '260px', width: '100%', position: 'relative' }}>
                  <Line ref={chartRef} data={drawdownChartData} options={drawdownOptions} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
