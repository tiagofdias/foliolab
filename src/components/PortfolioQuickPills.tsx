import React from 'react';
import { Layers } from 'lucide-react';
import type { Portfolio } from '../types';

interface Props {
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolio: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PortfolioQuickPills: React.FC<Props> = ({
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`portfolio-quick-pills-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        ...style,
      }}
    >
      {/* Consolidated 'All Portfolios' Pill */}
      <button
        type="button"
        id="quick-pill-portfolio-all"
        onClick={() => onSelectPortfolio('ALL')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background:
            activePortfolioId === 'ALL'
              ? 'rgba(139, 92, 246, 0.25)'
              : 'rgba(255, 255, 255, 0.04)',
          border:
            activePortfolioId === 'ALL'
              ? '1px solid rgba(139, 92, 246, 0.6)'
              : '1px solid rgba(255, 255, 255, 0.08)',
          color: activePortfolioId === 'ALL' ? '#ffffff' : '#94a3b8',
          boxShadow:
            activePortfolioId === 'ALL'
              ? '0 0 16px rgba(139, 92, 246, 0.35)'
              : 'none',
        }}
      >
        <Layers size={13} style={{ color: activePortfolioId === 'ALL' ? '#c4b5fd' : '#64748b' }} />
        <span>All Portfolios</span>
      </button>

      {/* Individual Portfolios Pills */}
      {portfolios.map((p) => {
        const isSelected = activePortfolioId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            id={`quick-pill-portfolio-${p.id}`}
            onClick={() => onSelectPortfolio(p.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isSelected
                ? 'rgba(139, 92, 246, 0.25)'
                : 'rgba(255, 255, 255, 0.04)',
              border: isSelected
                ? '1px solid rgba(139, 92, 246, 0.6)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              color: isSelected ? '#ffffff' : '#94a3b8',
              boxShadow: isSelected
                ? '0 0 16px rgba(139, 92, 246, 0.35)'
                : 'none',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: p.color || '#8b5cf6',
                boxShadow: isSelected ? `0 0 8px ${p.color || '#8b5cf6'}` : 'none',
              }}
            />
            <span>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
};
