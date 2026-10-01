import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { 
  AnalyticsIcon, 
  OrdersIcon, 
  LogisticsIcon, 
  LayersIcon, 
  DatabaseIcon, 
  SearchIcon 
} from '../components/Icons';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Core Analytical & Pipeline Data
  const [executiveOverview, setExecutiveOverview] = useState(null);
  const [pipelineData, setPipelineData] = useState({ pipeline: [], stages: {} });
  const [topProducts, setTopProducts] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'analytics' | 'evaluation'
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED'

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  // Fetch Business Intelligence & Pipeline Data
  const fetchExecutiveData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, pipelineRes, topProdRes, catRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/fulfillment-pipeline'),
        api.get('/analytics/reports/top-products'),
        api.get('/analytics/reports/category-performance'),
      ]);

      setExecutiveOverview(overviewRes.data?.executive_summary || null);
      setPipelineData(pipelineRes.data || { pipeline: [], stages: {} });
      setTopProducts(topProdRes.data?.top_products || []);
      setCategoryPerformance(catRes.data?.category_performance || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load executive analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  // Filtered Fulfillment Pipeline
  const filteredPipeline = useMemo(() => {
    const list = pipelineData.pipeline || [];
    return list.filter((order) => {
      const matchesSearch =
        String(order.order_id).includes(pipelineSearch) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(pipelineSearch.toLowerCase())) ||
        (order.tracking_number && order.tracking_number.toLowerCase().includes(pipelineSearch.toLowerCase())) ||
        (order.destination_city && order.destination_city.toLowerCase().includes(pipelineSearch.toLowerCase()));

      const matchesStage = selectedStage === 'ALL' || order.order_status === selectedStage;
      return matchesSearch && matchesStage;
    });
  }, [pipelineData, pipelineSearch, selectedStage]);

  if (!user) return null;

  const summary = executiveOverview || {};
  const ordersBreakdown = summary.order_breakdown || {};
  const invSummary = summary.inventory_summary || {};

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Executive Command Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--accent, #6366f1)',
          background: 'var(--bg-card)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--accent-light, #e0e7ff)',
                color: 'var(--accent, #6366f1)',
              }}
            >
              Role ID: {user.role_id} · Store Executive &amp; Manager
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: '#f1f5f9',
                color: '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              🔒 Executive Read-Only BI Access
            </span>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, margin: 0 }}>
            Store Performance &amp; Executive Command Center
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Welcome, <strong>{user.username || user.full_name}</strong>. Evaluate retail KPIs, track fulfillment pipeline bottlenecks, and run business intelligence reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Synced: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={fetchExecutiveData}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh Reports'}
          </button>
        </div>
      </div>

      {/* High-Level Store Performance Evaluation (Executive KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Gross Store Revenue */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gross Merchandise Value (GMV)</span>
            <AnalyticsIcon style={{ width: '20px', height: '20px', color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
            ${Number(summary.gross_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Settled via Payments: ${Number(summary.settled_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* KPI 2: Order Fulfillment Volume */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Orders Placed</span>
            <OrdersIcon style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {summary.total_orders || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {ordersBreakdown.confirmed || 0} Confirmed · {ordersBreakdown.shipped || 0} In Transit
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Average Order Value (AOV)</span>
            <LayersIcon style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#8b5cf6' }}>
            ${Number(summary.average_order_value || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {summary.active_customers || 0} active buyer accounts
          </div>
        </div>

        {/* KPI 4: Inventory Capital Tied in Stock */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Inventory Asset Valuation</span>
            <DatabaseIcon style={{ width: '20px', height: '20px', color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7' }}>
            ${Number(invSummary.valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {invSummary.units_on_hand || 0} stock units across {invSummary.total_skus || 0} SKUs
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'pipeline' ? '2px solid var(--accent, #6366f1)' : '2px solid transparent',
            color: activeTab === 'pipeline' ? 'var(--accent, #6366f1)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          🚚 Order Fulfillment Pipeline ({pipelineData.pipeline?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent, #6366f1)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--accent, #6366f1)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          📊 Business Intelligence &amp; Sales Reports
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evaluation')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'evaluation' ? '2px solid var(--accent, #6366f1)' : '2px solid transparent',
            color: activeTab === 'evaluation' ? 'var(--accent, #6366f1)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          📋 Store Health &amp; Executive Assessment
        </button>
      </div>

      {/* -------------------------------------------------------------
          TAB 1: ORDER FULFILLMENT PIPELINE REVIEW
      -------------------------------------------------------------- */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Pipeline Stage Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div
              onClick={() => setSelectedStage('ALL')}
              className="card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: selectedStage === 'ALL' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: selectedStage === 'ALL' ? 'var(--primary-light)' : 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>All Pipelines</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{pipelineData.pipeline?.length || 0}</div>
            </div>

            <div
              onClick={() => setSelectedStage('PENDING')}
              className="card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: selectedStage === 'PENDING' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                background: selectedStage === 'PENDING' ? '#fef3c7' : 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309' }}>1. Awaiting Dispatch</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>
                {ordersBreakdown.pending || 0}
              </div>
            </div>

            <div
              onClick={() => setSelectedStage('CONFIRMED')}
              className="card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: selectedStage === 'CONFIRMED' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                background: selectedStage === 'CONFIRMED' ? '#eff6ff' : 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8' }}>2. Confirmed &amp; Packed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d4ed8' }}>
                {ordersBreakdown.confirmed || 0}
              </div>
            </div>

            <div
              onClick={() => setSelectedStage('SHIPPED')}
              className="card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: selectedStage === 'SHIPPED' ? '2px solid #10b981' : '1px solid var(--border-color)',
                background: selectedStage === 'SHIPPED' ? '#ecfdf5' : 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>3. In Transit (Texas Hubs)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857' }}>
                {ordersBreakdown.shipped || 0}
              </div>
            </div>

            <div
              onClick={() => setSelectedStage('CANCELLED')}
              className="card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: selectedStage === 'CANCELLED' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                background: selectedStage === 'CANCELLED' ? '#fef2f2' : 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>Cancelled / Aborted</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b91c1c' }}>
                {ordersBreakdown.cancelled || 0}
              </div>
            </div>
          </div>

          {/* Search bar & Read-Only Notice */}
          <div
            className="card"
            style={{
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative', minWidth: '320px', flex: 1 }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <SearchIcon style={{ width: '16px', height: '16px' }} />
              </div>
              <input
                type="text"
                placeholder="Search pipeline by Order ID, Buyer Name, Texas City, or Tracking #..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredPipeline.length} of {pipelineData.pipeline?.length || 0} logged pipeline orders
            </span>
          </div>

          {/* Fulfillment Pipeline Data Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading fulfillment pipeline...
              </div>
            ) : filteredPipeline.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No fulfillment orders found matching criteria.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Order ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Buyer Account</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Destination &amp; Hub</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tracking Code</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fulfillment Stage</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipeline.map((order) => {
                    let statusBadge = (
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        PENDING
                      </span>
                    );

                    if (order.order_status === 'CONFIRMED') {
                      statusBadge = (
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          CONFIRMED
                        </span>
                      );
                    } else if (order.order_status === 'SHIPPED') {
                      statusBadge = (
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          IN TRANSIT
                        </span>
                      );
                    } else if (order.order_status === 'CANCELLED') {
                      statusBadge = (
                        <span
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          CANCELLED
                        </span>
                      );
                    }

                    return (
                      <tr key={order.order_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        {/* Order ID */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                            #{order.order_id}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(order.placed_at).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {order.customer_email}
                          </div>
                        </td>

                        {/* Destination */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{order.destination_city}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {order.fulfillment_hub}
                          </div>
                        </td>

                        {/* Tracking */}
                        <td style={{ padding: '12px 16px' }}>
                          {order.tracking_number ? (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                background: 'var(--bg-subtle)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {order.tracking_number}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Stage */}
                        <td style={{ padding: '12px 16px' }}>{statusBadge}</td>

                        {/* Payment */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {order.payment_method}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: order.payment_status === 'SUCCESS' ? '#047857' : '#b45309' }}>
                            {order.payment_status}
                          </div>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <strong style={{ fontSize: '0.95rem' }}>
                            ${Number(order.total_amount).toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: BUSINESS INTELLIGENCE & ANALYTICAL REPORTS
      -------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
          
          {/* Top Selling Products Report */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Top Performing Products by Revenue
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Aggregate units sold, gross merchandise contribution, and live warehouse inventory.
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Product Title</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Stock Left</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={p.product_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '6px' }}>
                        #{idx + 1}
                      </span>
                      <strong>{p.product_name}</strong>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {p.category_name}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                      {p.total_units_sold}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      ${Number(p.total_revenue).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: p.current_stock < 10 ? '#ef4444' : 'var(--text-main)',
                        }}
                      >
                        {p.current_stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Category Sales & Share Breakdown */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Category Revenue Rollup
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Sales share distribution across retail catalog categories.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {categoryPerformance.map((cat) => {
                const totalRev = summary.gross_revenue || 1;
                const percentage = Math.min(100, Math.round((Number(cat.category_revenue) / totalRev) * 100));

                return (
                  <div key={cat.category_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600 }}>{cat.category_name}</span>
                      <strong style={{ color: '#10b981' }}>
                        ${Number(cat.category_revenue).toFixed(2)} ({percentage}%)
                      </strong>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--bg-subtle)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(percentage, 5)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary) 0%, #6366f1 100%)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{cat.total_products} catalog items</span>
                      <span>{cat.total_units_sold} units fulfilled</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: STORE OVERALL HEALTH & EXECUTIVE ASSESSMENT
      -------------------------------------------------------------- */}
      {activeTab === 'evaluation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px 0' }}>
              Financial &amp; Revenue Evaluation
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Assessment of store cash flow, settlement velocity, and checkout conversion.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Gross Merchandise Value</span>
                <strong>${Number(summary.gross_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Successfully Settled Revenue</span>
                <strong style={{ color: '#10b981' }}>${Number(summary.settled_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Average Ticket Size (AOV)</span>
                <strong>${Number(summary.average_order_value || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Financial Health Rating</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>STRONG (Grade A)</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px 0' }}>
              Fulfillment &amp; Dispatch Health
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Tracking bottlenecks in the Texas logistics routing network.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Dispatched &amp; In Transit</span>
                <strong style={{ color: '#047857' }}>{ordersBreakdown.shipped || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Warehouse Queue (Pending)</span>
                <strong style={{ color: '#b45309' }}>{ordersBreakdown.pending || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Order Cancellation Rate</span>
                <strong>
                  {summary.total_orders ? `${Math.round(((ordersBreakdown.cancelled || 0) / summary.total_orders) * 100)}%` : '0%'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Logistics Hub Status</span>
                <span style={{ color: '#047857', fontWeight: 700 }}>Texas Hubs Operational</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px 0' }}>
              Store Owner Governance Summary
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Access privileges and executive audit trail parameters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                ✓ <strong>Read-Only Enforcement:</strong> No accidental inventory or price mutations from executive accounts.
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                ✓ <strong>Live TiDB Aggregations:</strong> Reporting calculations are derived dynamically from transactional tables.
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                ✓ <strong>Audit Trail Compliance:</strong> Session authenticated with JWT Bearer claims for Role ID {user.role_id}.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
