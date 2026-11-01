import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, DollarSign, Calendar, CheckCircle2, Briefcase, Loader2 } from 'lucide-react';
import type { PortfolioActivity, Portfolio } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Omit<PortfolioActivity, 'id'>) => void;
  initialSymbol?: string;
  portfolios?: Portfolio[];
  activePortfolioId?: string;
}

interface SearchQuote {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

export const AddTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialSymbol = '',
  portfolios = [],
  activePortfolioId,
}) => {
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbolQuery, setSymbolQuery] = useState<string>(initialSymbol);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [assetName, setAssetName] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchQuote[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<string>('10');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [fee, setFee] = useState<string>('0.00');
  const [portfolioId, setPortfolioId] = useState<string>(() => {
    if (activePortfolioId && activePortfolioId !== 'ALL') return activePortfolioId;
    return portfolios[0]?.id || 'port-main';
  });
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchTimeoutRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set initial symbol if passed
  useEffect(() => {
    if (initialSymbol) {
      setSymbolQuery(initialSymbol);
      setSelectedSymbol(initialSymbol);
      fetchCurrentPrice(initialSymbol);
    }
  }, [initialSymbol]);

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search autocomplete query
  useEffect(() => {
    if (!symbolQuery || symbolQuery === selectedSymbol) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(symbolQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.quotes || []);
          setShowDropdown(true);
        }
      } catch (e) {
        console.warn('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [symbolQuery, selectedSymbol]);

  // Fetch real-time price for selected symbol
  const fetchCurrentPrice = async (sym: string) => {
    if (!sym) return;
    setIsLoadingPrice(true);
    try {
      const res = await fetch(`/api/market/chart/${encodeURIComponent(sym)}?range=1d`);
      if (res.ok) {
        const data = await res.json();
        if (data.currentPrice) {
          setUnitPrice(data.currentPrice.toFixed(2));
        }
        if (data.shortName || data.longName) {
          setAssetName(data.shortName || data.longName);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch price for', sym);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleSelectQuote = (quote: SearchQuote) => {
    setSelectedSymbol(quote.symbol);
    setSymbolQuery(quote.symbol);
    setAssetName(quote.shortname || quote.longname || quote.symbol);
    setShowDropdown(false);
    fetchCurrentPrice(quote.symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(unitPrice);
    const parsedFee = parseFloat(fee) || 0;

    if (!selectedSymbol.trim()) {
      setErrorMsg('Please select or enter an asset ticker symbol.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid unit price.');
      return;
    }

    const targetPort = portfolios.find((p) => p.id === portfolioId);
    onSave({
      date,
      symbol: selectedSymbol.toUpperCase().trim(),
      name: assetName || selectedSymbol.toUpperCase().trim(),
      type,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      fee: parsedFee,
      currency: 'USD',
      portfolioId,
      account: targetPort?.name || 'Main Wealth',
    });

    onClose();
  };

  if (!isOpen) return null;

  const totalAmount =
    (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0) +
    (type === 'BUY' ? (parseFloat(fee) || 0) : -(parseFloat(fee) || 0));

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: type === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: type === 'BUY' ? 'var(--accent-base)' : 'var(--accent-rose)',
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Add Transaction</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Record a real trade in your portfolio
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {/* Buy / Sell Toggle */}
          <div style={{ marginBottom: '18px' }}>
            <label className="control-label" style={{ marginBottom: '8px', display: 'block' }}>
              Transaction Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setType('BUY')}
                className="btn"
                style={{
                  background:
                    type === 'BUY'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: type === 'BUY' ? '#ffffff' : 'var(--text-muted)',
                  border: type === 'BUY' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                BUY (Add Shares)
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className="btn"
                style={{
                  background:
                    type === 'SELL'
                      ? 'linear-gradient(135deg, #f43f5e, #e11d48)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: type === 'SELL' ? '#ffffff' : 'var(--text-muted)',
                  border: type === 'SELL' ? '1px solid #f43f5e' : '1px solid var(--border-subtle)',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                SELL (Reduce Shares)
              </button>
            </div>
          </div>

          {/* Symbol Lookup */}
          <div style={{ marginBottom: '16px', position: 'relative' }} ref={dropdownRef}>
            <label className="control-label" style={{ marginBottom: '6px', display: 'block' }}>
              Asset / Symbol <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-custom"
                placeholder="Search symbol or name (e.g. VOO, AAPL, BTC-USD, NVDA)..."
                value={symbolQuery}
                onChange={(e) => {
                  setSymbolQuery(e.target.value);
                  setSelectedSymbol(e.target.value.toUpperCase());
                }}
                style={{ paddingRight: '40px', fontWeight: 600 }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#0e172a',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
                  zIndex: 100,
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((q) => (
                  <div
                    key={q.symbol}
                    onClick={() => handleSelectQuote(q)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#ffffff', marginRight: '8px' }}>
                        {q.symbol}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {q.shortname || q.longname}
                      </span>
                    </div>
                    {q.exchange && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {q.exchange}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {assetName && (
              <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--accent-whatif-light)' }}>
                {assetName}
              </div>
            )}
          </div>

          {/* Date & Account row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="control-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} /> Trade Date
              </label>
              <input
                type="date"
                className="input-custom"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="control-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Briefcase size={13} /> Destination Portfolio
              </label>
              <select
                className="input-custom"
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {portfolios.length > 0 ? (
                  portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <option value="port-main">Main Wealth</option>
                )}
              </select>
            </div>
          </div>

          {/* Quantity, Unit Price, Fee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="control-label" style={{ marginBottom: '6px', display: 'block' }}>
                Quantity / Shares <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.000001"
                className="input-custom"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="control-label" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Price (USD) <span style={{ color: 'var(--accent-rose)' }}>*</span></span>
                {isLoadingPrice && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Fetching...</span>}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="input-custom"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="control-label" style={{ marginBottom: '6px', display: 'block' }}>
                Broker Fee ($)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="input-custom"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
          </div>

          {/* Total Value Summary Box */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Estimated Total {type === 'BUY' ? 'Cost' : 'Proceeds'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: type === 'BUY' ? 'var(--text-main)' : 'var(--accent-base)' }}>
                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
              {(parseFloat(quantity) || 0).toLocaleString()} sh @ ${(parseFloat(unitPrice) || 0).toFixed(2)}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)',
                fontSize: '0.82rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{
                background:
                  type === 'BUY'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: '#ffffff',
                fontWeight: 700,
                padding: '10px 20px',
                boxShadow: type === 'BUY' ? '0 4px 16px rgba(16, 185, 129, 0.35)' : '0 4px 16px rgba(244, 63, 94, 0.35)',
              }}
            >
              <CheckCircle2 size={16} /> Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
