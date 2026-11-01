import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Cpu,
  Briefcase,
  ShoppingBag,
  Factory,
  Globe,
  Coins,
  DollarSign,
  TrendingUp,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Car,
  Activity,
  Flame,
  Building,
  Boxes,
  Radio,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { HoldingPosition } from '../services/portfolioStore';
import {
  computeDimensionAllocation,
  computeDeepDiveLookThrough,
  type AllocationItem,
  type DeepDiveAsset,
} from '../services/assetMetadata';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  holdings: HoldingPosition[];
  portfolioName?: string;
}

export type AllocationDimension =
  | 'Type'
  | 'Positions'
  | 'Deep Dive'
  | 'Regions'
  | 'Sectors'
  | 'Industries'
  | 'Assets'
  | 'Countries'
  | 'Currencies'
  | 'Market cap';

export const AllocationDeepDive: React.FC<Props> = ({
  holdings,
  portfolioName = 'Portfolio',
}) => {
  const [activeDimension, setActiveDimension] = useState<AllocationDimension>('Sectors');
  const [assetClassFilter, setAssetClassFilter] = useState<string>('ALL');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Filter holdings if asset class dropdown is applied
  const filteredHoldings = useMemo(() => {
    if (assetClassFilter === 'ALL') return holdings;
    return holdings.filter((h) => h.assetClass === assetClassFilter);
  }, [holdings, assetClassFilter]);

  const totalPortfolioValue = useMemo(() => {
    return filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [filteredHoldings]);

  // Compute standard dimension allocation
  const allocationItems = useMemo<AllocationItem[]>(() => {
    if (activeDimension === 'Deep Dive') return [];
    const dimensionKey = activeDimension === 'Assets' ? 'Positions' : activeDimension;
    return computeDimensionAllocation(filteredHoldings, dimensionKey as any);
  }, [filteredHoldings, activeDimension]);

  // Compute deep-dive look-through
  const deepDiveItems = useMemo<DeepDiveAsset[]>(() => {
    if (activeDimension !== 'Deep Dive') return [];
    return computeDeepDiveLookThrough(filteredHoldings);
  }, [filteredHoldings, activeDimension]);

  // Active items for donut chart
  const currentDonutItems = useMemo(() => {
    if (activeDimension === 'Deep Dive') {
      return deepDiveItems.slice(0, 10).map((d) => ({
        name: d.name,
        value: d.totalValue,
        weight: d.totalWeight,
        color: d.color,
      }));
    }
    return allocationItems.map((a) => ({
      name: a.name,
      value: a.value,
      weight: a.weight,
      color: a.color,
    }));
  }, [activeDimension, allocationItems, deepDiveItems]);

  const hoveredItem =
    hoveredIndex !== null && currentDonutItems[hoveredIndex]
      ? currentDonutItems[hoveredIndex]
      : null;

  // ChartJS Doughnut data configuration
  const chartData = useMemo(() => {
    if (currentDonutItems.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['rgba(255, 255, 255, 0.05)'],
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      labels: currentDonutItems.map((item) => item.name),
      datasets: [
        {
          data: currentDonutItems.map((item) => item.value),
          backgroundColor: currentDonutItems.map((item, idx) =>
            hoveredIndex === null || hoveredIndex === idx ? item.color : `${item.color}44`
          ),
          borderColor: '#0b0f19',
          borderWidth: 2,
          hoverOffset: 8,
          borderRadius: 4,
          spacing: 2,
        },
      ],
    };
  }, [currentDonutItems, hoveredIndex]);

  const chartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '76%',
    animation: {
      duration: 500,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(11, 15, 25, 0.95)',
        titleColor: '#cbd5e1',
        titleFont: { size: 12, family: 'Poppins', weight: 'bold' },
        bodyFont: { size: 13, family: 'Poppins' },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed;
            const pct = totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(2) : '0';
            return ` $${val.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
    onHover: (_evt, elements) => {
      if (elements && elements.length > 0) {
        setHoveredIndex(elements[0].index);
      } else {
        setHoveredIndex(null);
      }
    },
  };

  // Helper icon for each category item
  const renderItemIcon = (name: string) => {
    const s = name.toLowerCase();
    if (s.includes('tech') || s.includes('semi') || s.includes('software')) {
      return <Cpu size={16} />;
    }
    if (s.includes('financ') || s.includes('business') || s.includes('bank')) {
      return <Briefcase size={16} />;
    }
    if (s.includes('staple') || s.includes('retail') || s.includes('consumer')) {
      return <ShoppingBag size={16} />;
    }
    if (s.includes('industri') || s.includes('manufactur')) {
      return <Factory size={16} />;
    }
    if (s.includes('auto') || s.includes('tesla') || s.includes('transport')) {
      return <Car size={16} />;
    }
    if (s.includes('health') || s.includes('pharma') || s.includes('bio')) {
      return <Activity size={16} />;
    }
    if (s.includes('energy') || s.includes('oil') || s.includes('gas')) {
      return <Flame size={16} />;
    }
    if (s.includes('crypto') || s.includes('bitcoin') || s.includes('digital')) {
      return <Coins size={16} />;
    }
    if (s.includes('broad') || s.includes('index') || s.includes('etf')) {
      return <PieChart size={16} />;
    }
    if (s.includes('comm') || s.includes('media')) {
      return <Radio size={16} />;
    }
    if (s.includes('real estate')) {
      return <Building size={16} />;
    }
    if (s.includes('material')) {
      return <Boxes size={16} />;
    }
    if (s.includes('north america') || s.includes('united states') || s.includes('europe') || s.includes('asia')) {
      return <Globe size={16} />;
    }
    if (s.includes('usd') || s.includes('currency') || s.includes('eur')) {
      return <DollarSign size={16} />;
    }
    if (s.includes('cap')) {
      return <TrendingUp size={16} />;
    }
    return <Layers size={16} />;
  };

  const SUB_TABS: AllocationDimension[] = [
    'Type',
    'Positions',
    'Deep Dive',
    'Regions',
    'Sectors',
    'Industries',
    'Assets',
    'Countries',
    'Currencies',
    'Market cap',
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Section (Getquin Style) */}
      <div
        className="card glass"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#0d1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Breadcrumb & Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              Net worth &gt; Investments &gt; {portfolioName} &gt;{' '}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>
              Analytics
            </span>
          </div>

          {/* Right Asset Class Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--text-dim)' }} />
              <select
                className="select-custom"
                value={assetClassFilter}
                onChange={(e) => setAssetClassFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '150px' }}
              >
                <option value="ALL">All asset classes</option>
                <option value="Equity">Equities / Stocks</option>
                <option value="ETF">ETFs &amp; Funds</option>
                <option value="Crypto">Crypto &amp; Digital</option>
                <option value="Bond">Bonds</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section Heading & Sub-tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Allocation
            </h2>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(139, 92, 246, 0.2)',
                color: 'var(--accent-whatif-light)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
              }}
            >
              PREMIUM
            </span>
            <button
              onClick={() => setShowInfoModal(!showInfoModal)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Information about allocation analytics"
            >
              <Info size={15} />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Pills (Getquin Style) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {SUB_TABS.map((tab) => {
            const isActive = activeDimension === tab;
            const isDeepDive = tab === 'Deep Dive';

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveDimension(tab);
                  setExpandedItemId(null);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: isActive
                    ? '1px solid rgba(139, 92, 246, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive
                    ? isDeepDive
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(6, 182, 212, 0.35))'
                      : 'rgba(139, 92, 246, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 16px rgba(139, 92, 246, 0.35)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isDeepDive && <Sparkles size={13} style={{ color: '#c4b5fd' }} />}
                {tab}
              </button>
            );
          })}
        </div>

        {showInfoModal && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: '#0a0f1d',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
            }}
          >
            <strong>Allocation Analytics:</strong> View portfolio distribution broken down by
            sectors, asset classes, geography, and currencies. The <strong>Deep Dive</strong> tab
            unpacks your ETF holdings (like VOO &amp; QQQ) into their true underlying companies to
            reveal aggregate single-stock exposure.
          </div>
        )}
      </div>

      {/* Main 2-Column Split: Donut Chart on Left, Ranked Breakdown on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 45%) minmax(320px, 55%)',
          gap: '24px',
          alignItems: 'start',
        }}
        className="allocation-grid"
      >
        {/* Left Column: Getquin Glowing Ring Donut Chart */}
        <div
          className="card glass"
          style={{
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '440px',
            position: 'relative',
            background: '#0d1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              height: '360px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Doughnut data={chartData} options={chartOptions} />

            {/* Glowing Ring Center Text (Exact Getquin Style) */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                maxWidth: '180px',
              }}
            >
              <div
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hoveredItem ? hoveredItem.name : activeDimension}
              </div>

              <div
                style={{
                  fontSize: '1.95rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '4px 0',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ${(hoveredItem ? hoveredItem.value : totalPortfolioValue).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                CHART BY FOLIOLAB
              </div>
            </div>
          </div>

          {/* Bottom Footnote info */}
          <div
            style={{
              marginTop: '16px',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textAlign: 'center',
            }}
          >
            {activeDimension === 'Deep Dive'
              ? 'Showing top consolidated company exposures across direct & ETF holdings'
              : `Total allocation across ${currentDonutItems.length} active categories`}
          </div>
        </div>

        {/* Right Column: Ranked Allocation Breakdown List */}
        <div
          className="card glass"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: '440px',
            background: '#0d1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header of Breakdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {activeDimension}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {activeDimension === 'Deep Dive'
                ? `${deepDiveItems.length} Underlying Companies`
                : `${allocationItems.length} Categories · 100%`}
            </span>
          </div>

          {/* VIEW A: Standard Dimensions (Sectors, Regions, Industries, etc.) */}
          {activeDimension !== 'Deep Dive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allocationItems.map((item, idx) => {
                const isHovered = hoveredIndex === idx;
                const isExpanded = expandedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      background: isHovered
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isHovered
                        ? '1px solid var(--border-highlight)'
                        : '1px solid var(--border-subtle)',
                      transition: 'all 0.2s',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        gap: '12px',
                      }}
                    >
                      {/* Left: Icon & Name */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: '150px',
                          flex: '1',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: `${item.color}22`,
                            color: item.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {renderItemIcon(item.name)}
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#ffffff' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500 }}>
                            ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Horizontal Progress Bar (Getquin Style) */}
                      <div
                        style={{
                          flex: '1.2',
                          maxWidth: '160px',
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(2, item.weight))}%`,
                            background: item.color,
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>

                      {/* Right: Percentage & Benchmark Indicator & Chevron */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: '120px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '1rem',
                              fontFamily: 'var(--font-mono)',
                              color: '#ffffff',
                            }}
                          >
                            {item.weight.toFixed(2)}%
                          </div>

                          {/* Benchmark Delta Indicator (e.g. > 25.88%) */}
                          {item.benchmarkWeight !== undefined && (
                            <div
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '3px',
                                color:
                                  (item.benchmarkDelta ?? 0) >= 0
                                    ? '#34d399'
                                    : '#fb7185',
                              }}
                            >
                              {(item.benchmarkDelta ?? 0) >= 0 ? (
                                <ArrowUpRight size={13} />
                              ) : (
                                <ArrowDownRight size={13} />
                              )}
                              <span>&gt; {item.benchmarkWeight.toFixed(2)}%</span>
                            </div>
                          )}
                        </div>

                        <div style={{ color: '#cbd5e1' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Drill-Down Accordion: Contributing Holdings */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '10px 14px 14px 58px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: '4px',
                          }}
                        >
                          Contributing Holdings ({item.contributingHoldings.length})
                        </div>

                        {item.contributingHoldings.map((h) => (
                          <div
                            key={h.symbol}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.76rem',
                              padding: '4px 0',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: '#ffffff', marginRight: '6px' }}>
                                {h.symbol}
                              </span>
                              <span style={{ color: 'var(--text-dim)' }}>{h.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                ${Math.round(h.value).toLocaleString()}
                              </span>
                              <span
                                style={{
                                  color: 'var(--text-dim)',
                                  marginLeft: '8px',
                                  fontSize: '0.72rem',
                                }}
                              >
                                ({h.weightInPortfolio.toFixed(1)}% of total)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW B: Deep Dive (ETF Look-Through True Company Exposure) */}
          {activeDimension === 'Deep Dive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-whatif-light)',
                  marginBottom: '6px',
                }}
              >
                <strong>Look-Through Active:</strong> ETFs unpacked into their underlying company
                weights and combined with direct holdings to show your <strong>True Single-Stock Exposure</strong>.
              </div>

              {deepDiveItems.map((asset, idx) => {
                const isExpanded = expandedItemId === asset.symbol;

                return (
                  <div
                    key={asset.symbol}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      onClick={() => setExpandedItemId(isExpanded ? null : asset.symbol)}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        gap: '12px',
                      }}
                    >
                      {/* Left: Symbol & Name */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: '150px',
                          flex: '1',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: `${asset.color}22`,
                            color: asset.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {asset.symbol.slice(0, 3)}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                            {asset.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {asset.sector}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Progress Bar */}
                      <div
                        style={{
                          flex: '1.2',
                          maxWidth: '160px',
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          display: 'flex',
                        }}
                      >
                        {/* Direct holding part */}
                        <div
                          style={{
                            height: '100%',
                            width: `${asset.directWeight}%`,
                            background: asset.color,
                          }}
                          title={`Direct: ${asset.directWeight.toFixed(1)}%`}
                        />
                        {/* Indirect ETF part */}
                        <div
                          style={{
                            height: '100%',
                            width: `${asset.indirectWeight}%`,
                            background: `${asset.color}77`,
                          }}
                          title={`Through ETFs: ${asset.indirectWeight.toFixed(1)}%`}
                        />
                      </div>

                      {/* Right: Total Weight & Chevron */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          minWidth: '110px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              fontFamily: 'var(--font-mono)',
                              color: '#ffffff',
                            }}
                          >
                            {asset.totalWeight.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            ${asset.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>

                        <div style={{ color: 'var(--text-dim)' }}>
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </div>
                      </div>
                    </div>

                    {/* Drill-down for Look-Through sources */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '10px 14px 14px 58px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: '4px',
                          }}
                        >
                          Exposure Breakdown
                        </div>

                        {asset.directValue > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.76rem',
                            }}
                          >
                            <span style={{ color: '#ffffff' }}>Direct Shares Owned:</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              ${asset.directValue.toLocaleString()} ({asset.directWeight.toFixed(1)}% of portfolio)
                            </span>
                          </div>
                        )}

                        {asset.sources.map((src) => (
                          <div
                            key={src.sourceName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.76rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span>Look-through via {src.sourceName}:</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                              ${Math.round(src.indirectValue).toLocaleString()} ({src.weightContributed.toFixed(2)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
