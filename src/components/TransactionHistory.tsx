import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  ReceiptText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { PortfolioActivity, Portfolio } from '../types';
import { PortfolioQuickPills } from './PortfolioQuickPills';

interface Props {
  activities: PortfolioActivity[];
  portfolios?: Portfolio[];
  activePortfolioId?: string;
  onSelectPortfolio?: (id: string) => void;
  onAddTransaction: () => void;
  onDeleteTransaction: (id: string) => void;
  onImportActivities: (imported: PortfolioActivity[]) => void;
  onResetSample: () => void;
  onClearAll: () => void;
}

export const TransactionHistory: React.FC<Props> = ({
  activities,
  portfolios = [],
  activePortfolioId = 'ALL',
  onSelectPortfolio,
  onAddTransaction,
  onDeleteTransaction,
  onImportActivities,
  onResetSample,
  onClearAll,
}) => {
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);

  // Filtered activities based on current portfolio scope and filters
  const scopedActivities = useMemo(() => {
    if (activePortfolioId === 'ALL') return activities;
    return activities.filter((a) => (a.portfolioId || 'port-main') === activePortfolioId);
  }, [activities, activePortfolioId]);

  const filtered = useMemo(() => {
    return scopedActivities.filter((act) => {
      const matchSearch =
        act.symbol.toLowerCase().includes(search.toLowerCase()) ||
        (act.name && act.name.toLowerCase().includes(search.toLowerCase()));
      const matchType = typeFilter === 'ALL' || act.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [scopedActivities, search, typeFilter]);

  // Sort descending by date
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  // Summary KPIs for current portfolio scope (matching Tab 1's 3 Hero Cards)
  const stats = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    let totalFees = 0;

    for (const a of scopedActivities) {
      const gross = a.quantity * a.unitPrice;
      totalFees += a.fee || 0;
      if (a.type === 'BUY') {
        buyCount++;
        buyVolume += gross;
      } else {
        sellCount++;
        sellVolume += gross;
      }
    }

    return {
      totalCount: scopedActivities.length,
      buyCount,
      sellCount,
      buyVolume,
      sellVolume,
      totalFees,
    };
  }, [scopedActivities]);

  // Export as JSON file
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `foliolab_ledger_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let items: PortfolioActivity[] = [];

        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed.activities && Array.isArray(parsed.activities)) {
          items = parsed.activities.map((o: any, idx: number) => ({
            id: o.id || `gf-${idx}-${Date.now()}`,
            date: o.date ? o.date.split('T')[0] : new Date().toISOString().split('T')[0],
            symbol: o.SymbolProfile?.symbol || o.symbol || 'ASSET',
            name: o.SymbolProfile?.name || o.name || o.symbol || 'Asset',
            type: o.type === 'SELL' ? 'SELL' : 'BUY',
            quantity: Math.abs(o.quantity),
            unitPrice: o.unitPrice,
            fee: o.fee || 0,
            currency: o.currency || 'USD',
            account: o.Account?.name || 'Imported Account',
            portfolioId: activePortfolioId !== 'ALL' ? activePortfolioId : 'port-main',
          }));
        }

        if (items.length > 0) {
          onImportActivities(items);
        } else {
          alert('Could not find valid transactions in file.');
        }
      } catch (err: any) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper color for asset avatars
  const getAvatarColor = (symbol: string) => {
    const sym = symbol.toUpperCase();
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) {
      return { bg: 'rgba(245, 158, 11, 0.18)', text: '#f59e0b' };
    }
    if (sym === 'VOO' || sym === 'QQQ' || sym === 'SPY' || sym === 'SCHD' || sym === 'SMH') {
      return { bg: 'rgba(6, 182, 212, 0.18)', text: '#06b6d4' };
    }
    return { bg: 'rgba(139, 92, 246, 0.18)', text: '#c4b5fd' };
  };

  return (
    <div className="animate-fade-in">
      {/* 1. TOP QUICK PORTFOLIO SWITCHER PILLS (Unified with Tab 1) */}
      {onSelectPortfolio && (
        <PortfolioQuickPills
          portfolios={portfolios}
          activePortfolioId={activePortfolioId}
          onSelectPortfolio={onSelectPortfolio}
        />
      )}

      {/* 2. SUMMARY METRICS ROW (3 Cards matching Tab 1's hero cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Orders Card */}
        <div
          className="card glass"
          style={{
            padding: '20px 24px',
            background: '#0d1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: '#cbd5e1',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Total Executed Orders
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
              <ReceiptText size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {stats.totalCount}{' '}
            <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>
              Trades
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
            {stats.buyCount} Buys · {stats.sellCount} Sells recorded in ledger
          </div>
        </div>

        {/* Capital Deployed Card */}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: '#cbd5e1',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Total Capital Deployed (Buys)
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#34d399',
              fontFamily: 'var(--font-mono)',
            }}
          >
            $
            {stats.buyVolume.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
            Deployed across {stats.buyCount} buy transactions
          </div>
        </div>

        {/* Realized Sales & Broker Fees Card */}
        <div
          className="card glass"
          style={{
            padding: '20px 24px',
            background: '#0d1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: '#cbd5e1',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Realized Proceeds & Fees
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06b6d4',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            $
            {stats.sellVolume.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
            ${stats.totalFees.toFixed(2)} total broker commission fees paid
          </div>
        </div>
      </div>

      {/* 3. TRANSACTION LEDGER CARD (Harmonized with HoldingsTable) */}
      <div
        className="card glass"
        style={{
          background: '#0d1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header Bar */}
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
                Transaction Ledger
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: 'var(--accent-whatif-light)',
                  fontWeight: 700,
                }}
              >
                {filtered.length} Orders
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Audited historical record of asset purchases, sales, and portfolio activities
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              id="btn-add-trade-trades-tab"
              className="btn btn-primary"
              onClick={onAddTransaction}
              style={{ fontWeight: 700, padding: '8px 16px', fontSize: '0.84rem' }}
            >
              <Plus size={16} /> Add Trade
            </button>

            <label
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <Upload size={14} /> Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>

            <button
              className="btn btn-secondary"
              onClick={handleExportJSON}
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600 }}
              title="Export portfolio as backup JSON"
            >
              <Download size={14} /> Export
            </button>

            <button
              className="btn btn-secondary"
              onClick={onResetSample}
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600 }}
              title="Reset to sample balanced portfolio"
            >
              <RotateCcw size={13} /> Sample
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setIsClearAllModalOpen(true)}
              style={{
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--accent-rose)',
                borderColor: 'rgba(244, 63, 94, 0.25)',
              }}
              title="Clear all transactions and start fresh"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Filter Controls Row (Harmonized with HoldingsTable pill style) */}
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
          {/* Order Type Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Filter Type:
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
              {['ALL', 'BUY', 'SELL'].map((t) => {
                const isSelected = typeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      border: isSelected
                        ? '1px solid rgba(255, 255, 255, 0.25)'
                        : '1px solid transparent',
                      boxShadow: isSelected ? '0 2px 6px rgba(0, 0, 0, 0.35)' : 'none',
                    }}
                  >
                    {t === 'ALL' ? 'All Orders' : t === 'BUY' ? 'Buys Only' : 'Sells Only'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              className="input-custom"
              placeholder="Search symbol or name..."
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
                color: '#64748b',
              }}
            />
          </div>
        </div>

        {/* Ledger Table (Harmonized Table styling) */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem' }}>
                  Date
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.78rem' }}>
                  Type
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.78rem' }}>
                  Asset
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem' }}>
                  Quantity
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem' }}>
                  Unit Price
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem' }}>
                  Broker Fee
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.78rem' }}>
                  Total Cashflow
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.78rem' }}>
                  Portfolio
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.78rem' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}
                  >
                    No transactions found. Click <strong>+ Add Trade</strong> to record your first
                    transaction.
                  </td>
                </tr>
              ) : (
                sorted.map((act) => {
                  const totalCash =
                    act.quantity * act.unitPrice + (act.type === 'BUY' ? act.fee : -act.fee);
                  const avatarColor = getAvatarColor(act.symbol);
                  const portObj = portfolios.find(
                    (p) => p.id === (act.portfolioId || 'port-main')
                  );

                  return (
                    <tr
                      key={act.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Date */}
                      <td
                        style={{
                          padding: '14px 18px',
                          color: '#cbd5e1',
                          fontSize: '0.84rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {act.date}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '4px',
                            background:
                              act.type === 'BUY'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(244, 63, 94, 0.15)',
                            color: act.type === 'BUY' ? '#34d399' : '#fb7185',
                            border:
                              act.type === 'BUY'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        >
                          {act.type}
                        </span>
                      </td>

                      {/* Asset Avatar & Name (Getquin style) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: avatarColor.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: avatarColor.text,
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              flexShrink: 0,
                            }}
                          >
                            {act.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                color: '#ffffff',
                                fontSize: '0.94rem',
                              }}
                            >
                              {act.symbol}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {act.name || act.symbol}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td
                        style={{
                          padding: '14px 18px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#ffffff',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {act.quantity < 1
                          ? act.quantity.toFixed(4)
                          : act.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>

                      {/* Unit Price */}
                      <td
                        style={{
                          padding: '14px 18px',
                          textAlign: 'right',
                          color: '#cbd5e1',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        $
                        {act.unitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Broker Fee */}
                      <td
                        style={{
                          padding: '14px 18px',
                          textAlign: 'right',
                          color: '#94a3b8',
                          fontSize: '0.82rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ${act.fee.toFixed(2)}
                      </td>

                      {/* Total Cashflow */}
                      <td
                        style={{
                          padding: '14px 18px',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: act.type === 'BUY' ? '#ffffff' : '#34d399',
                        }}
                      >
                        {act.type === 'BUY' ? '-' : '+'}$
                        {totalCash.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Portfolio Badge */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${portObj?.color || 'rgba(255, 255, 255, 0.1)'}`,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: portObj?.color || '#8b5cf6',
                            }}
                          />
                          {portObj?.name || act.account || 'Main Wealth'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          className="btn-icon"
                          onClick={() => setTradeToDelete(act.id)}
                          style={{ color: '#64748b', padding: '6px', cursor: 'pointer' }}
                          title="Delete transaction"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL: Delete Single Trade */}
      {tradeToDelete &&
        createPortal(
          <div className="modal-backdrop" style={{ zIndex: 10000 }}>
            <div
              className="card glass modal-content"
              style={{
                maxWidth: '420px',
                padding: '24px',
                background: '#0d1526',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fb7185',
                    }}
                  >
                    <Trash2 size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    Delete Trade?
                  </h3>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setTradeToDelete(null)}
                  style={{ color: '#94a3b8' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                Are you sure you want to remove this transaction from your ledger? Your portfolio
                holdings and historical metrics will recalculate immediately.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setTradeToDelete(null)}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    onDeleteTransaction(tradeToDelete);
                    setTradeToDelete(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Delete Trade
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRMATION MODAL: Clear All Transactions */}
      {isClearAllModalOpen &&
        createPortal(
          <div className="modal-backdrop" style={{ zIndex: 10000 }}>
            <div
              className="card glass modal-content"
              style={{
                maxWidth: '440px',
                padding: '24px',
                background: '#0d1526',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: '16px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fb7185',
                    }}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    Clear All Transactions?
                  </h3>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setIsClearAllModalOpen(false)}
                  style={{ color: '#94a3b8' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                This will purge all {activities.length} orders from your local browser storage. You
                can load sample trades at any time via the <strong>Sample</strong> button.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsClearAllModalOpen(false)}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    onClearAll();
                    setIsClearAllModalOpen(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  Confirm Clear All
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
