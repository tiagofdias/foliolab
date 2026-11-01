import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  ChevronDown,
  Plus,
  Check,
  Layers,
  Sparkles,
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import type { Portfolio, PortfolioActivity } from '../types';

interface Props {
  portfolios: Portfolio[];
  activePortfolioId: string; // 'ALL' or specific portfolio id
  onSelectPortfolio: (id: string) => void;
  onCreatePortfolio: (name: string, color: string, description?: string) => void;
  onDeletePortfolio?: (
    portfolioId: string,
    action: 'reassign' | 'delete',
    targetPortfolioId?: string
  ) => void;
  activities?: PortfolioActivity[];
}

export const PortfolioSelector: React.FC<Props> = ({
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  onCreatePortfolio,
  onDeletePortfolio,
  activities = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPortName, setNewPortName] = useState('');
  const [newPortColor, setNewPortColor] = useState('#8b5cf6');
  const [newPortDesc, setNewPortDesc] = useState('');

  // Double confirmation deletion state
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [tradeAction, setTradeAction] = useState<'reassign' | 'delete'>('reassign');
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [confirmInputText, setConfirmInputText] = useState<string>('');

  const selectorRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activePort =
    activePortfolioId === 'ALL'
      ? { id: 'ALL', name: 'All Portfolios', color: '#8b5cf6', description: 'Consolidated view of all assets' }
      : portfolios.find((p) => p.id === activePortfolioId) || portfolios[0];

  const PRESET_COLORS = [
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#6366f1', // Indigo
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortName.trim()) return;
    onCreatePortfolio(newPortName.trim(), newPortColor, newPortDesc.trim());
    setNewPortName('');
    setNewPortDesc('');
    setIsModalOpen(false);
    setIsOpen(false);
  };

  const handleStartDelete = (p: Portfolio) => {
    const other = portfolios.filter((item) => item.id !== p.id);
    setDeleteTarget(p);
    setDeleteStep(1);
    setTradeAction('reassign');
    setReassignTargetId(other[0]?.id || 'port-main');
    setConfirmInputText('');
    setIsOpen(false);
  };

  const targetTradeCount = useMemo(() => {
    if (!deleteTarget || !activities) return 0;
    return activities.filter((a) => a.portfolioId === deleteTarget.id).length;
  }, [deleteTarget, activities]);

  return (
    <div ref={selectorRef} style={{ position: 'relative', zIndex: 600 }}>
      {/* Selector Trigger Button */}
      <button
        id="btn-portfolio-selector"
        className="portfolio-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-md)',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
          backdropFilter: 'blur(16px)',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: activePort?.color || '#8b5cf6',
            boxShadow: `0 0 10px ${activePort?.color || '#8b5cf6'}`,
            flexShrink: 0,
          }}
        />
        <Briefcase size={16} style={{ color: 'var(--accent-whatif-light)' }} />
        <span style={{ whiteSpace: 'nowrap', color: '#ffffff', fontWeight: 700 }}>
          {activePort?.name || 'Select Portfolio'}
        </span>
        <ChevronDown size={15} style={{ color: '#cbd5e1', marginLeft: '4px' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="portfolio-dropdown-menu animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '340px',
            background: '#0d1526',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(139, 92, 246, 0.25)',
            zIndex: 999,
            padding: '10px',
          }}
        >
          <div
            style={{
              padding: '8px 12px 6px 12px',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 800,
            }}
          >
            Your Portfolios
          </div>

          {/* All Portfolios Consolidated */}
          <button
            className="portfolio-option-item"
            onClick={() => {
              onSelectPortfolio('ALL');
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 12px',
              borderRadius: '8px',
              background: activePortfolioId === 'ALL' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.02)',
              border: activePortfolioId === 'ALL' ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.92rem',
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c4b5fd',
                }}
              >
                <Layers size={17} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.94rem' }}>All Portfolios</div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500 }}>Consolidated total view</div>
              </div>
            </div>
            {activePortfolioId === 'ALL' && <Check size={17} color="var(--accent-base)" />}
          </button>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

          {/* Individual Portfolios - Sleek, no ugly grey scrollbar! */}
          <div
            className="portfolio-items-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '360px',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              paddingRight: '2px',
            }}
          >
            {portfolios.map((p) => {
              const isSelected = activePortfolioId === p.id;
              return (
                <div
                  key={p.id}
                  className="portfolio-option-item"
                  onClick={() => {
                    onSelectPortfolio(p.id);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: p.color,
                        boxShadow: `0 0 8px ${p.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      {p.description && (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isSelected && <Check size={17} color="var(--accent-base)" />}
                    {portfolios.length > 1 && onDeletePortfolio && (
                      <button
                        type="button"
                        className="btn-delete-portfolio"
                        title={`Delete portfolio "${p.name}"`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDelete(p);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

          {/* Create New Portfolio Button */}
          <button
            onClick={() => {
              setIsModalOpen(true);
              setIsOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px dashed rgba(139, 92, 246, 0.5)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            <Plus size={16} color="var(--accent-whatif-light)" />
            <span>Create New Portfolio</span>
          </button>
        </div>
      )}

      {/* CREATE PORTFOLIO MODAL (Portaled to document.body) */}
      {isModalOpen &&
        createPortal(
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div
              className="modal-content animate-scale-up"
              style={{ maxWidth: '460px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="var(--accent-whatif-light)" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                    Create New Portfolio
                  </h3>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '6px' }}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} style={{ padding: '22px 26px' }}>
                <div className="control-group" style={{ marginBottom: '18px' }}>
                  <label className="control-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    Portfolio Name
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="e.g. Dividend Growth, Speculative Tech, Crypto Bag"
                    value={newPortName}
                    onChange={(e) => setNewPortName(e.target.value)}
                    autoFocus
                    required
                    style={{ fontSize: '0.94rem', padding: '11px 14px', width: '100%', color: '#ffffff' }}
                  />
                </div>

                <div className="control-group" style={{ marginBottom: '18px' }}>
                  <label className="control-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="e.g. Long-term dividend compounders"
                    value={newPortDesc}
                    onChange={(e) => setNewPortDesc(e.target.value)}
                    style={{ fontSize: '0.94rem', padding: '11px 14px', width: '100%', color: '#ffffff' }}
                  />
                </div>

                <div className="control-group" style={{ marginBottom: '24px' }}>
                  <label className="control-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '10px' }}>
                    Portfolio Theme Color
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewPortColor(col)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: col,
                          border: newPortColor === col ? '3px solid #ffffff' : '2px solid transparent',
                          boxShadow: newPortColor === col ? `0 0 14px ${col}` : 'none',
                          cursor: 'pointer',
                          transform: newPortColor === col ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '10px 18px', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    Create Portfolio
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* DOUBLE CONFIRMATION MODAL: STEP 1 & STEP 2 (Portaled to document.body) */}
      {deleteTarget &&
        createPortal(
          <div
            className="modal-overlay animate-fade-in"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="modal-content animate-scale-up"
              style={{
                maxWidth: '480px',
                border: deleteStep === 2 ? '1px solid #ef4444' : '1px solid rgba(245, 158, 11, 0.5)',
                boxShadow:
                  deleteStep === 2
                    ? '0 25px 70px rgba(239, 68, 68, 0.25), 0 0 35px rgba(0, 0, 0, 0.9)'
                    : '0 25px 70px rgba(245, 158, 11, 0.2), 0 0 35px rgba(0, 0, 0, 0.9)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="modal-header"
                style={{
                  borderBottom:
                    deleteStep === 2
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : '1px solid rgba(245, 158, 11, 0.3)',
                  background:
                    deleteStep === 2
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {deleteStep === 1 ? (
                    <AlertTriangle size={22} color="#f59e0b" />
                  ) : (
                    <ShieldAlert size={22} color="#ef4444" />
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                      {deleteStep === 1
                        ? 'Delete Portfolio (1/2)'
                        : 'Final Double Confirmation (2/2)'}
                    </h3>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: deleteStep === 2 ? '#f87171' : '#fbbf24',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {deleteStep === 1
                        ? 'Step 1 of 2: Review Trade Allocation'
                        : 'Step 2 of 2: Irreversible Permanent Deletion'}
                    </div>
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => setDeleteTarget(null)}
                  style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '22px 24px' }}>
                {/* Target Portfolio Banner */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: deleteTarget.color,
                        boxShadow: `0 0 10px ${deleteTarget.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.96rem' }}>
                        {deleteTarget.name}
                      </div>
                      {deleteTarget.description && (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                          {deleteTarget.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                    }}
                  >
                    {targetTradeCount} {targetTradeCount === 1 ? 'Trade' : 'Trades'}
                  </span>
                </div>

                {deleteStep === 1 ? (
                  /* STEP 1: CHOOSE WHAT TO DO WITH TRADES */
                  <div>
                    <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '16px' }}>
                      Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                      {targetTradeCount > 0
                        ? ` This portfolio currently has ${targetTradeCount} recorded transaction(s). Please choose what should happen to these trades:`
                        : ' This portfolio has no recorded trades.'}
                    </p>

                    {targetTradeCount > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {/* Option 1: Reassign */}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: tradeAction === 'reassign' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: tradeAction === 'reassign' ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="tradeAction"
                            checked={tradeAction === 'reassign'}
                            onChange={() => setTradeAction('reassign')}
                            style={{ marginTop: '3px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                              Safely transfer trades to another portfolio
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '8px' }}>
                              Move all {targetTradeCount} trades to preserve your historical performance.
                            </div>
                            {tradeAction === 'reassign' && (
                              <select
                                className="select-custom"
                                value={reassignTargetId}
                                onChange={(e) => setReassignTargetId(e.target.value)}
                                style={{ width: '100%', fontSize: '0.85rem', padding: '7px 10px' }}
                              >
                                {portfolios
                                  .filter((p) => p.id !== deleteTarget.id)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </label>

                        {/* Option 2: Delete trades */}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: tradeAction === 'delete' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: tradeAction === 'delete' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="tradeAction"
                            checked={tradeAction === 'delete'}
                            onChange={() => setTradeAction('delete')}
                            style={{ marginTop: '3px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.88rem' }}>
                              Permanently delete all {targetTradeCount} trade(s)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                              All transaction records associated with this portfolio will be destroyed.
                            </div>
                          </div>
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setDeleteTarget(null)}
                        style={{ padding: '9px 16px', fontSize: '0.88rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setDeleteStep(2)}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          padding: '9px 18px',
                          border: 'none',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <span>Continue to Final Confirmation (1/2)</span>
                        <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STEP 2: FINAL DOUBLE CONFIRMATION */
                  <div>
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#f87171', fontSize: '0.92rem', marginBottom: '6px' }}>
                        🚨 Final Warning: This cannot be undone!
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        Portfolio <strong>{deleteTarget.name}</strong> will be permanently wiped from your system.{' '}
                        {targetTradeCount > 0 &&
                          (tradeAction === 'reassign'
                            ? `Its ${targetTradeCount} trade(s) will be transferred to "${
                                portfolios.find((p) => p.id === reassignTargetId)?.name || 'target'
                              }".`
                            : `All ${targetTradeCount} trade(s) will be completely removed.`)}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          marginBottom: '6px',
                        }}
                      >
                        Type <span style={{ color: '#f87171', letterSpacing: '0.05em' }}>DELETE</span> to confirm:
                      </label>
                      <input
                        type="text"
                        className="input-custom"
                        placeholder="Type DELETE"
                        value={confirmInputText}
                        onChange={(e) => setConfirmInputText(e.target.value)}
                        autoFocus
                        style={{
                          fontSize: '0.94rem',
                          padding: '10px 14px',
                          width: '100%',
                          border:
                            confirmInputText.trim().toUpperCase() === 'DELETE'
                              ? '1px solid #ef4444'
                              : '1px solid var(--border-subtle)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setDeleteStep(1)}
                        style={{ padding: '9px 16px', fontSize: '0.88rem' }}
                      >
                        ⬅ Back to Step 1
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setDeleteTarget(null)}
                          style={{ padding: '9px 14px', fontSize: '0.88rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={confirmInputText.trim().toUpperCase() !== 'DELETE'}
                          onClick={() => {
                            if (onDeletePortfolio && deleteTarget) {
                              onDeletePortfolio(deleteTarget.id, tradeAction, reassignTargetId);
                              setDeleteTarget(null);
                            }
                          }}
                          style={{
                            background:
                              confirmInputText.trim().toUpperCase() === 'DELETE'
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : 'rgba(239, 68, 68, 0.25)',
                            color:
                              confirmInputText.trim().toUpperCase() === 'DELETE'
                                ? '#ffffff'
                                : 'rgba(255, 255, 255, 0.4)',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            padding: '9px 18px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor:
                              confirmInputText.trim().toUpperCase() === 'DELETE'
                                ? 'pointer'
                                : 'not-allowed',
                            boxShadow:
                              confirmInputText.trim().toUpperCase() === 'DELETE'
                                ? '0 0 16px rgba(239, 68, 68, 0.4)'
                                : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Trash2 size={16} /> Permanently Delete Portfolio
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
