import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { HoldingPosition } from '../services/portfolioStore';
import type { MarketQuote } from '../types';
import {
  computeHoldingTimeframePL,
  type HoldingTimeframe,
} from '../services/holdingTimeframe';

interface Props {
  holdings: HoldingPosition[];
  quotes?: Record<string, MarketQuote>;
  onAddTrade: (symbol?: string) => void;
  onSimulateSwap: (symbol: string) => void;
}

type SortField =
  | 'symbol'
  | 'currentValue'
  | 'timeframePLDollar'
  | 'timeframePLPercent'
  | 'allocationPercent'
  | 'quantity';

export const HoldingsTable: React.FC<Props> = ({
  holdings,
  quotes = {},
  onAddTrade,
  onSimulateSwap,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('ALL');
  const [timeframe, setTimeframe] = useState<HoldingTimeframe>('Max');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const TIMEFRAMES: HoldingTimeframe[] = ['1D', '1W', '1M', 'YTD', '1Y', '3Y', '5Y', 'Max'];

  // Enrich each holding with its timeframe-specific profit & return
  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => {
      const pl = computeHoldingTimeframePL(h, quotes[h.symbol], timeframe);
      return {
        ...h,
        timeframePLDollar: pl.pnlDollar,
        timeframePLPercent: pl.pnlPercent,
      };
    });
  }, [holdings, quotes, timeframe]);

  // Filter holdings
  const filtered = useMemo(() => {
    return enrichedHoldings.filter((h) => {
      const matchSearch =
        h.symbol.toLowerCase().includes(search.toLowerCase()) ||
        h.name.toLowerCase().includes(search.toLowerCase());
      const matchClass = selectedAssetClass === 'ALL' || h.assetClass === selectedAssetClass;
      return matchSearch && matchClass;
    });
  }, [enrichedHoldings, search, selectedAssetClass]);

  // Sort holdings
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const assetClasses = ['ALL', 'Equity', 'ETF', 'Crypto', 'Bond'];

  return (
    <div
      className="card glass"
      style={{
        marginTop: '24px',
        overflow: 'hidden',
        background: '#0d1526',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Top Header Bar: Title + Badges + Add Transaction */}
      <div
        style={{
          padding: '20px 24px 14px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Positions
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-base)',
                fontWeight: 700,
              }}
            >
              {holdings.length} Assets
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Live portfolio holdings with real-time market pricing & period performance
          </p>
        </div>

        {/* Quick Add Transaction Button (getquin style) */}
        <button
          onClick={() => onAddTrade()}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <Plus size={16} />
          <span>Add transaction</span>
        </button>
      </div>

      {/* TIMEFRAME PILLS BAR (getquin style: 1D, 1W, 1M, YTD, 1Y, 3Y, 5Y, Max) + Filters */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.015)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Timeframe Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginRight: '4px',
            }}
          >
            P/L Period:
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '3px',
              borderRadius: '8px',
              gap: '3px',
            }}
          >
            {TIMEFRAMES.map((tf) => {
              const isSelected = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '4px 11px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isSelected ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
                    boxShadow: isSelected ? '0 2px 6px rgba(0, 0, 0, 0.35)' : 'none',
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Asset Class Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', width: '200px' }}>
            <input
              type="text"
              className="input-custom"
              placeholder="Filter by ticker or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '6px 10px 6px 32px' }}
            />
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
          </div>

          {/* Asset Class Pills */}
          <div
            style={{
              display: 'flex',
              gap: '3px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '3px',
              borderRadius: '8px',
            }}
          >
            {assetClasses.map((ac) => (
              <button
                key={ac}
                onClick={() => setSelectedAssetClass(ac)}
                style={{
                  background: selectedAssetClass === ac ? 'var(--accent-whatif)' : 'transparent',
                  color: selectedAssetClass === ac ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ac}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'rgba(255, 255, 255, 0.025)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <th
                onClick={() => handleSort('symbol')}
                style={{ padding: '12px 20px', textAlign: 'left', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Title</span>
                  {sortField === 'symbol' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem' }}>
                Buy in (Cost & Avg)
              </th>

              <th
                onClick={() => handleSort('currentValue')}
                style={{ padding: '12px 18px', textAlign: 'right', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Position (Value & Price)</span>
                  {sortField === 'currentValue' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              <th
                onClick={() => handleSort('timeframePLPercent')}
                style={{ padding: '12px 18px', textAlign: 'right', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span style={{ color: 'var(--accent-whatif-light)', fontWeight: 800 }}>
                    P/L ({timeframe})
                  </span>
                  {(sortField === 'timeframePLPercent' || sortField === 'timeframePLDollar') &&
                    (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              <th
                onClick={() => handleSort('allocationPercent')}
                style={{ padding: '12px 18px', textAlign: 'right', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Weight</span>
                  {sortField === 'allocationPercent' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>

              <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.78rem' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No holdings match the current filter.
                </td>
              </tr>
            ) : (
              sorted.map((h) => {
                const isPositive = h.timeframePLDollar >= 0;
                return (
                  <tr
                    key={h.symbol}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* TITLE (Avatar Logo + Asset Name + Ticker badge + Shares Pill) */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background:
                              h.assetClass === 'Crypto'
                                ? 'rgba(245, 158, 11, 0.18)'
                                : h.assetClass === 'ETF'
                                ? 'rgba(6, 182, 212, 0.18)'
                                : 'rgba(139, 92, 246, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color:
                              h.assetClass === 'Crypto'
                                ? '#f59e0b'
                                : h.assetClass === 'ETF'
                                ? '#06b6d4'
                                : '#c4b5fd',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            flexShrink: 0,
                          }}
                        >
                          {h.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.98rem' }}>
                            {h.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#cbd5e1',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {h.symbol}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              x{h.quantity < 1 ? h.quantity.toFixed(4) : h.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* BUY IN (Top: Total Cost Basis, Bottom: Average Buy Price) */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#ffffff',
                          fontSize: '0.96rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${h.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          marginTop: '2px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${h.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* POSITION (Top: Total Position Value, Bottom: Current Price) */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#ffffff',
                          fontSize: '1rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${h.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          marginTop: '2px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* P/L FOR SELECTED TIMEFRAME (Top: Dollar P&L, Bottom: Return % with Arrow) */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          fontFamily: 'var(--font-mono)',
                          color: isPositive ? '#34d399' : '#fb7185',
                        }}
                      >
                        {isPositive ? '+' : ''}
                        ${Math.abs(h.timeframePLDollar).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: isPositive ? '#34d399' : '#fb7185',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          marginTop: '2px',
                        }}
                      >
                        {isPositive ? '↗ +' : '↘ '}
                        {h.timeframePLPercent.toFixed(2)}%
                      </div>
                    </td>

                    {/* WEIGHT % WITH PROGRESS BAR */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          color: '#ffffff',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {h.allocationPercent.toFixed(1)}%
                      </div>
                      <div
                        style={{
                          height: '4px',
                          width: '60px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          display: 'inline-block',
                          marginTop: '4px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, h.allocationPercent)}%`,
                            background:
                              h.assetClass === 'Crypto'
                                ? '#f59e0b'
                                : h.assetClass === 'ETF'
                                ? '#06b6d4'
                                : '#8b5cf6',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          className="btn-table-action"
                          onClick={() => onAddTrade(h.symbol)}
                          title={`Record a trade for ${h.symbol}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={12} />
                          <span>Trade</span>
                        </button>
                        <button
                          className="btn-table-action btn-table-action-whatif"
                          onClick={() => onSimulateSwap(h.symbol)}
                          title={`Simulate counterfactual swap for ${h.symbol}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={12} />
                          <span>What-If</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
