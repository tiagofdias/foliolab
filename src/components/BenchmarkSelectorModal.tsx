import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Portfolio } from '../types';
import { type BenchmarkItem, PRESET_BENCHMARKS } from '../services/benchmarkCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedBenchmarkIds: string[];
  onApplyBenchmarks: (benchmarks: BenchmarkItem[]) => void;
  userPortfolios: Portfolio[];
}

type CategoryFilter = 'all' | 'portfolios' | 'indices' | 'etfs' | 'stocks';

export const BenchmarkSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedBenchmarkIds,
  onApplyBenchmarks,
  userPortfolios,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [currentSelectedIds, setCurrentSelectedIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<BenchmarkItem[]>([]);
  const [isSearchingYahoo, setIsSearchingYahoo] = useState(false);

  // Synchronize initial selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSelectedIds([...selectedBenchmarkIds]);
      setSearch('');
      setCategory('all');
      setSearchResults([]);
    }
  }, [isOpen, selectedBenchmarkIds]);

  // Transform user portfolios into BenchmarkItems
  const portfolioBenchmarks = useMemo<BenchmarkItem[]>(() => {
    const items: BenchmarkItem[] = [];

    // Consolidated All Portfolios item
    items.push({
      id: 'port-all-consolidated',
      name: 'All Portfolios (Consolidated)',
      symbol: 'ALL',
      category: 'portfolio',
      color: '#8b5cf6',
      avatarText: 'ALL',
      avatarBg: 'rgba(139, 92, 246, 0.25)',
      isUserPortfolio: true,
      portfolioId: 'ALL',
      description: 'Your combined holdings across every portfolio',
    });

    // Individual user portfolios
    userPortfolios.forEach((p) => {
      items.push({
        id: `port-${p.id}`,
        name: p.name,
        symbol: p.name.toUpperCase().slice(0, 4),
        category: 'portfolio',
        color: p.color || '#06b6d4',
        avatarText: p.name.slice(0, 2).toUpperCase(),
        avatarBg: `${p.color || '#06b6d4'}28`,
        isUserPortfolio: true,
        portfolioId: p.id,
        description: p.description || `User Portfolio: ${p.name}`,
      });
    });

    return items;
  }, [userPortfolios]);

  // Combined full catalog of selectable benchmarks
  const fullCatalog = useMemo<BenchmarkItem[]>(() => {
    return [...portfolioBenchmarks, ...PRESET_BENCHMARKS, ...searchResults];
  }, [portfolioBenchmarks, searchResults]);

  // Filter items by category & search query
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fullCatalog.filter((item) => {
      // Category match
      if (category === 'portfolios' && item.category !== 'portfolio') return false;
      if (category === 'indices' && item.category !== 'index') return false;
      if (category === 'etfs' && item.category !== 'etf') return false;
      if (category === 'stocks' && (item.category !== 'stock' && item.category !== 'crypto')) return false;

      // Text search match
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchSym = item.symbol.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q) || false;
        return matchName || matchSym || matchDesc;
      }
      return true;
    });
  }, [fullCatalog, category, search]);

  // Selected items mapped
  const selectedItems = useMemo(() => {
    return currentSelectedIds
      .map((id) => fullCatalog.find((item) => item.id === id))
      .filter((item): item is BenchmarkItem => item !== undefined);
  }, [currentSelectedIds, fullCatalog]);

  // Search Yahoo Finance live if no exact matches found
  const handleSearchYahoo = async () => {
    if (!search.trim()) return;
    setIsSearchingYahoo(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(search.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const apiQuotes: any[] = data.quotes || [];
        const newItems: BenchmarkItem[] = apiQuotes.slice(0, 5).map((q) => ({
          id: `bench-${q.symbol.toLowerCase()}`,
          name: q.shortname || q.longname || q.symbol,
          symbol: q.symbol,
          category: q.quoteType === 'ETF' ? 'etf' : q.quoteType === 'CRYPTOCURRENCY' ? 'crypto' : 'stock',
          color: '#8b5cf6',
          avatarText: q.symbol.slice(0, 3),
          avatarBg: 'rgba(139, 92, 246, 0.2)',
          description: `${q.exchange || ''} · ${q.quoteType || 'Asset'}`,
        }));
        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...newItems.filter((n) => !existingIds.has(n.id))];
        });
      }
    } catch (e) {
      console.warn('Yahoo search failed:', e);
    } finally {
      setIsSearchingYahoo(false);
    }
  };

  const toggleItem = (item: BenchmarkItem) => {
    setCurrentSelectedIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      } else {
        if (prev.length >= 6) {
          alert('Maximum 6 benchmarks can be compared simultaneously.');
          return prev;
        }
        return [...prev, item.id];
      }
    });
  };

  const removeSelection = (id: string) => {
    setCurrentSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleApply = () => {
    onApplyBenchmarks(selectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card glass animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1526',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(139, 92, 246, 0.15)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header (Exact Getquin Style) */}
        <div
          style={{
            padding: '20px 24px 14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Benchmark
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Select up to 6 portfolios, indices, or assets to compare side-by-side
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar (Getquin Style) */}
        <div style={{ padding: '16px 24px 12px 24px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              className="input-custom"
              placeholder="Search ticker, portfolio, ETF or stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchYahoo();
              }}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: search ? '36px' : '14px',
                height: '42px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
              }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (Popular | Portfolios | Indices | ETFs | Stocks & Crypto) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 24px 14px 24px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {(
            [
              { id: 'all', label: 'Popular' },
              { id: 'portfolios', label: 'Portfolios' },
              { id: 'indices', label: 'Indices' },
              { id: 'etfs', label: 'ETFs' },
              { id: 'stocks', label: 'Stocks & Crypto' },
            ] as const
          ).map((cat) => {
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: isSelected ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Benchmark Items List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '380px',
          }}
        >
          {filteredItems.map((item) => {
            const isChecked = currentSelectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: isChecked ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: isChecked
                    ? '1px solid rgba(139, 92, 246, 0.4)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isChecked) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isChecked) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Left: Avatar + Title & Subtitle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: item.avatarBg || 'rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: item.symbol.length > 4 ? '0.68rem' : '0.8rem',
                      color: item.color || '#c4b5fd',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      flexShrink: 0,
                    }}
                  >
                    {item.avatarText || item.symbol.slice(0, 3)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </span>
                      {item.isUserPortfolio && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(139, 92, 246, 0.25)',
                            color: 'var(--accent-whatif-light)',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          PORTFOLIO
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <strong style={{ color: '#cbd5e1', marginRight: '6px' }}>{item.symbol}</strong>
                      {item.description || ''}
                    </div>
                  </div>
                </div>

                {/* Right: Checkbox (Getquin Style) */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: isChecked ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.25)',
                    background: isChecked ? '#8b5cf6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                No default benchmarks match "{search}"
              </p>
              <button
                className="btn btn-secondary"
                onClick={handleSearchYahoo}
                disabled={isSearchingYahoo}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {isSearchingYahoo ? 'Searching Yahoo Finance...' : `Search Global Market for "${search}"`}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Drawer / Footer Bar (Getquin Style) */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 15, 29, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Selected Chips Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Your selection <strong style={{ color: '#ffffff' }}>{currentSelectedIds.length}/6</strong>
            </span>
            {currentSelectedIds.length > 0 && (
              <button
                onClick={() => setCurrentSelectedIds([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Selected Tags Horizontal Scroll */}
          {selectedItems.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px',
              }}
            >
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.5)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: item.color,
                    }}
                  />
                  <span>{item.symbol}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelection(item.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Button: Benchmark */}
          <button
            className="btn btn-primary"
            onClick={handleApply}
            style={{
              width: '100%',
              padding: '12px 18px',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
            }}
          >
            <Sparkles size={16} />
            <span>Benchmark ({currentSelectedIds.length} Selected)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
