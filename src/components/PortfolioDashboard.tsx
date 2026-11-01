import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { HoldingPosition, PortfolioSummary } from '../services/portfolioStore';
import { HoldingsTable } from './HoldingsTable';
import { PortfolioHeroChart } from './PortfolioHeroChart';
import type { Portfolio, PortfolioStatsData, MarketQuote } from '../types';

interface Props {
  summary: PortfolioSummary;
  holdings: HoldingPosition[];
  activePortfolio?: Portfolio | { id: string; name: string; color: string; description?: string };
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  stats: PortfolioStatsData | null;
  quotes: Record<string, MarketQuote>;
  onAddTrade: (symbol?: string) => void;
  onSimulateSwap: (symbol: string) => void;
  onNavigateToWhatIf: () => void;
}

export const PortfolioDashboard: React.FC<Props> = ({
  summary,
  holdings,
  activePortfolio,
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  stats,
  quotes,
  onAddTrade,
  onSimulateSwap,
  onNavigateToWhatIf,
}) => {
  const [activePeriodInfo, setActivePeriodInfo] = useState<{
    timeframe: string;
    diffDollar: number;
    diffPercent: number;
    isCustom: boolean;
  } | null>(null);

  // Active period vs all-time returns
  const hasActivePeriod = !!(activePeriodInfo && activePeriodInfo.timeframe !== 'Max');
  const returnDollar = hasActivePeriod ? activePeriodInfo.diffDollar : summary.unrealizedProfit;
  const returnPercent = hasActivePeriod ? activePeriodInfo.diffPercent : summary.unrealizedProfitPercent;
  const isReturnPositive = returnDollar >= 0;

  // Compute breakdown by asset class
  const classBreakdown = holdings.reduce((acc, h) => {
    acc[h.assetClass] = (acc[h.assetClass] || 0) + h.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const classColors: Record<string, string> = {
    Equity: '#8b5cf6',
    ETF: '#06b6d4',
    Crypto: '#f59e0b',
    Bond: '#10b981',
    Other: '#94a3b8',
  };

  return (
    <div className="animate-fade-in">
      {/* 1. GETQUIN-STYLE PORTFOLIO HERO CHART (Interactive Line, Switcher Pills, Timeframes) */}
      <PortfolioHeroChart
        stats={stats}
        activePortfolio={activePortfolio}
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        onSelectPortfolio={onSelectPortfolio}
        onPeriodMetricsChange={setActivePeriodInfo}
      />

      {/* 2. SUMMARY METRICS ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Invested Capital Card */}
        <div className="card glass" style={{ padding: '20px 24px', background: '#0d1526' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Invested Capital (Cost)
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            ${summary.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
            Across {summary.totalHoldingsCount} active positions ({summary.totalTransactionsCount} total trades)
          </div>
        </div>

        {/* Total Return Card */}
        <div
          className="card glass"
          style={{
            padding: '20px 24px',
            background: '#0d1526',
            borderLeft: `4px solid ${isReturnPositive ? '#34d399' : '#fb7185'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {hasActivePeriod ? `Return (${activePeriodInfo.timeframe})` : 'Total Return (Unrealized)'}
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: isReturnPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isReturnPositive ? '#34d399' : '#fb7185',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isReturnPositive ? '#34d399' : '#fb7185',
            }}
          >
            {isReturnPositive ? '+' : ''}${Math.abs(returnDollar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                color: isReturnPositive ? '#34d399' : '#fb7185',
                padding: '2px 8px',
                borderRadius: '4px',
                background: isReturnPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              }}
            >
              {isReturnPositive ? '+' : ''}{returnPercent.toFixed(2)}%
            </span>
            <span style={{ color: '#94a3b8', fontWeight: 500 }}>
              {hasActivePeriod ? 'in selected period' : 'all-time net profit'}
            </span>
          </div>
        </div>

        {/* What-If Simulation Launch Card */}
        <div
          className="card glass"
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08))',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Sparkles size={16} color="var(--accent-whatif-light)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                What-If Simulator
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
              Test swapping your portfolio holdings or compare two portfolios side-by-side.
            </p>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={onNavigateToWhatIf}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <Sparkles size={14} /> Launch What-If
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onAddTrade()}
              style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600 }}
              title="Add a new transaction"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. ASSET ALLOCATION BAR */}
      <div className="card glass" style={{ padding: '20px 24px', marginBottom: '24px', background: '#0d1526' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
            <PieChart size={16} color="var(--accent-cyan)" />
            <span>Asset Allocation</span>
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Real portfolio diversification
          </span>
        </div>

        {/* Stacked Bar */}
        <div
          style={{
            height: '14px',
            width: '100%',
            borderRadius: '7px',
            background: 'rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '16px',
          }}
        >
          {Object.entries(classBreakdown).map(([assetClass, val]) => {
            const pct = summary.netWorth > 0 ? (val / summary.netWorth) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={assetClass}
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: classColors[assetClass] || '#64748b',
                  transition: 'width 0.3s',
                }}
                title={`${assetClass}: $${val.toLocaleString()} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
          {Object.entries(classBreakdown).map(([assetClass, val]) => {
            const pct = summary.netWorth > 0 ? (val / summary.netWorth) * 100 : 0;
            return (
              <div key={assetClass} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: classColors[assetClass] || '#64748b',
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                  {assetClass}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. LIVE PORTFOLIO HOLDINGS (With getquin-style Timeframes: 1D, 1W, 1M, YTD, 1Y, 3Y, 5Y, Max) */}
      <HoldingsTable
        holdings={holdings}
        quotes={quotes}
        onAddTrade={(sym) => onAddTrade(sym)}
        onSimulateSwap={onSimulateSwap}
      />
    </div>
  );
};
