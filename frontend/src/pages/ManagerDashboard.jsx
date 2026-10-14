import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  AnalyticsIcon,
  OrdersIcon,
  LayersIcon,
  DatabaseIcon,
  SearchIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  TruckIcon
} from '../components/Icons';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Core Analytical & Pipeline Data
  const [executiveOverview, setExecutiveOverview] = useState(null);
  const [pipelineData, setPipelineData] = useState({ pipeline: [], stages: {}, assigned_warehouse: null });
  const [topProducts, setTopProducts] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // UI Tabs & Filters: 'pipeline' | 'analytics' | 'evaluation'
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');

  // Confirmation Action State
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [notice, setNotice] = useState(null);

  const showNotice = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4500);
  };

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      const role = Number(parsed.role_id);
      if (role !== 2 && role !== 3 && role !== 4) {
        navigate('/customer-dashboard');
      }
    }
  }, [navigate]);

  // Fetch Business Intelligence & Pipeline Data for this Manager's Warehouse
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
      setPipelineData(pipelineRes.data || { pipeline: [], stages: {}, assigned_warehouse: null });
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

  // Confirm incoming pending order
  const handleConfirmOrder = async (orderId) => {
    try {
      setConfirmingOrderId(orderId);
      const res = await api.post(`/orders/${orderId}/confirm`);
      showNotice(res.data?.message || `Order #${orderId} confirmed successfully!`);
      await fetchExecutiveData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to confirm order.';
      showNotice(msg, 'error');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Dispatch / Ship order
  const handleDispatchOrder = async (orderId) => {
    try {
      setConfirmingOrderId(orderId);
      const res = await api.patch(`/orders/${orderId}/status`, { status: 'SHIPPED' });
      showNotice(res.data?.message || `Order #${orderId} marked as Dispatched & In Transit!`);
      await fetchExecutiveData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch order.';
      showNotice(msg, 'error');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Export CSV Helper
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        keys.join(','),
        ...data.map((row) =>
          keys
            .map((k) => {
              let val = row[k];
              if (val === null || val === undefined) return '""';
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              return val;
            })
            .join(',')
        )
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  const warehouse = pipelineData.assigned_warehouse || (user.city_name ? { city_name: user.city_name, hub_name: user.hub_name } : null);

  return (
    <div className="st-admin-container">

      {/* Floating Notification Toast */}
      {notice && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '4px',
          background: notice.type === 'error' ? '#fde8e8' : '#e6f6f4',
          border: notice.type === 'error' ? '1px solid #f98080' : '1px solid #a8ded8',
          color: notice.type === 'error' ? '#9b1c1c' : '#0f766e',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
        }}>
          {notice.type === 'error' ? '⚠️ ' : '✓ '} {notice.msg}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. CLEAN EXECUTIVE HEADER                                            */}
      {/* ==================================================================== */}
      <div className="st-admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="st-badge-admin-role">Warehouse Manager</span>
            
            {/* Assigned Warehouse Hub Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e6f6f4',
              color: '#0f766e',
              border: '1px solid #a8ded8',
              padding: '3px 10px',
              borderRadius: '3px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <TruckIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              Assigned Hub: {warehouse?.city_name || user.city_name || 'Texas Regional Warehouse'} {warehouse?.hub_name ? `(${warehouse.hub_name})` : ''}
            </span>

            <span className="st-badge-cluster-status">
              <span className="st-pulse-dot" />
              Railway DB Connected
            </span>

            <span style={{ fontSize: '0.8rem', color: '#826e6e' }}>
              Signed in as <strong>{user.username || user.full_name || user.email}</strong>
            </span>
          </div>

          <h1 className="st-admin-title">Warehouse Management &amp; Order Confirmation</h1>
          <p className="st-admin-subtitle">
            Authorize incoming customer orders, manage regional fulfillment, and monitor Texas warehouse logistics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchExecutiveData}
            disabled={refreshing}
            className="st-btn-header-sync"
          >
            <RefreshCwIcon style={{ width: '0.875rem', height: '0.875rem', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. 4-COLUMN KPI METRIC CARDS                                         */}
      {/* ==================================================================== */}
      <div className="st-admin-kpi-grid">
        {/* KPI 1: GMV Gross Revenue */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Warehouse Gross Volume</span>
            <div className="st-admin-kpi-iconbox">
              <AnalyticsIcon style={{ width: '1rem', height: '1rem', color: '#2a9d8f' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(summary.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            Net settled: <strong style={{ color: '#1f2937', fontWeight: 500 }}>${Number(summary.settled_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Regional Orders Placed</span>
            <div className="st-admin-kpi-iconbox">
              <OrdersIcon style={{ width: '1rem', height: '1rem', color: '#c08457' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {summary.total_orders || 0}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#0284c7', fontWeight: 600 }}>{ordersBreakdown.pending || 0}</strong> awaiting confirmation · <strong style={{ color: '#1f2937', fontWeight: 500 }}>{ordersBreakdown.confirmed || 0}</strong> confirmed
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Average Ticket Size</span>
            <div className="st-admin-kpi-iconbox">
              <LayersIcon style={{ width: '1rem', height: '1rem', color: '#2a9d8f' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(summary.average_order_value || 0).toFixed(2)}
          </div>
          <div className="st-admin-kpi-foot">
            Across <strong style={{ color: '#1f2937', fontWeight: 500 }}>{summary.active_customers || 0}</strong> regional customers
          </div>
        </div>

        {/* KPI 4: Inventory Asset Valuation */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Warehouse Inventory Assets</span>
            <div className="st-admin-kpi-iconbox">
              <DatabaseIcon style={{ width: '1rem', height: '1rem', color: '#c08457' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(invSummary.valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#1f2937', fontWeight: 500 }}>{invSummary.units_on_hand || 0}</strong> units across <strong style={{ color: '#1f2937', fontWeight: 500 }}>{invSummary.total_skus || 0}</strong> SKUs
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. NAVIGATION TAB BAR                                                */}
      {/* ==================================================================== */}
      <div className="st-admin-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`st-admin-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
        >
          <OrdersIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Fulfillment &amp; Confirmation</span>
          <span className="st-pill-badge-blue">{pipelineData.pipeline?.length || 0}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`st-admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          <AnalyticsIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Sales &amp; Category Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evaluation')}
          className={`st-admin-tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
        >
          <ShieldCheckIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Warehouse Health Assessment</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ORDER FULFILLMENT & CONFIRMATION                              */}
      {/* ==================================================================== */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Incoming Orders Awaiting Confirmation Banner */}
          {Number(ordersBreakdown.pending || 0) > 0 && (
            <div style={{
              padding: '14px 20px',
              borderRadius: '4px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <div>
                  <div style={{ color: '#92400e', fontSize: '0.92rem', fontWeight: 600 }}>
                    {ordersBreakdown.pending} Incoming Customer Order{ordersBreakdown.pending > 1 ? 's' : ''} Awaiting Warehouse Confirmation
                  </div>
                  <div style={{ color: '#b45309', fontSize: '0.78rem' }}>
                    Click &quot;Confirm Order&quot; on pending orders below to verify inventory, authorize dispatch, and notify the customer.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStage('PENDING')}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '7px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View Pending Orders ({ordersBreakdown.pending})
              </button>
            </div>
          )}

          {/* Pipeline Stage Segments */}
          <div className="st-pipeline-segment">
            {[
              { id: 'ALL', label: 'All Warehouse Orders', count: pipelineData.pipeline?.length || 0 },
              { id: 'PENDING', label: 'Pending Confirmation', count: ordersBreakdown.pending || 0 },
              { id: 'CONFIRMED', label: 'Confirmed & Packing', count: ordersBreakdown.confirmed || 0 },
              { id: 'SHIPPED', label: 'In Transit', count: ordersBreakdown.shipped || 0 },
              { id: 'CANCELLED', label: 'Cancelled', count: ordersBreakdown.cancelled || 0 },
            ].map((stg) => (
              <div
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`st-stage-pill ${selectedStage === stg.id ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <span className="st-stage-label">{stg.label}</span>
                <span className="st-stage-count">{stg.count}</span>
              </div>
            ))}
          </div>

          {/* Search Bar */}
          <div className="st-admin-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="st-admin-search-wrap">
              <span className="st-admin-search-icon">
                <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              </span>
              <input
                type="text"
                placeholder="Search orders by ID, recipient name, tracking #, or city..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="st-admin-search-input"
              />
            </div>

            <button
              type="button"
              onClick={() => exportToCSV(filteredPipeline, 'warehouse_orders_export')}
              className="st-btn-pill-export"
            >
              Export CSV
            </button>
          </div>

          {/* Warehouse Orders Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Fulfillment Hub</th>
                    <th>Tracking</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'center' }}>Warehouse Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        Loading warehouse fulfillment pipeline...
                      </td>
                    </tr>
                  ) : filteredPipeline.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No orders match the selected filters for your warehouse.
                      </td>
                    </tr>
                  ) : (
                    filteredPipeline.map((order) => {
                      const isPaid = (order.payment_status || '').toUpperCase() === 'PAID' || (order.payment_status || '').toUpperCase() === 'SUCCESS';
                      const isPending = order.order_status === 'PENDING';
                      const isConfirmed = order.order_status === 'CONFIRMED';
                      const isShipped = order.order_status === 'SHIPPED';

                      return (
                        <tr key={order.order_id} style={{ background: isPending ? '#fffbeb' : 'inherit' }}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>#{order.order_id}</span>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                              {order.placed_at ? new Date(order.placed_at).toLocaleDateString() : 'Recent'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#1f2937' }}>{order.customer_name || 'Retail Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{order.customer_email || '—'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#4b5563' }}>{order.destination_city || 'Texas Central'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>{order.fulfillment_hub || 'Direct Dispatch'}</div>
                          </td>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#4b5563' }}>
                              {order.tracking_number || 'Pending Assignment'}
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                isConfirmed
                                  ? 'st-chip-confirmed'
                                  : isShipped
                                  ? 'st-chip-shipped'
                                  : order.order_status === 'CANCELLED'
                                  ? 'st-chip-danger'
                                  : 'st-chip-pending'
                              }
                            >
                              {order.order_status || 'PENDING'}
                            </span>
                          </td>
                          <td>
                            <span className={isPaid ? 'st-chip-paid' : 'st-chip-pending'}>
                              {order.payment_status || 'PENDING'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, color: '#1f2937' }}>
                            ${Number(order.total_amount || 0).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(order.order_id)}
                                disabled={confirmingOrderId === order.order_id}
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '6px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                              >
                                {confirmingOrderId === order.order_id ? 'Confirming...' : '✓ Confirm Order'}
                              </button>
                            ) : isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => handleDispatchOrder(order.order_id)}
                                disabled={confirmingOrderId === order.order_id}
                                style={{
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '6px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {confirmingOrderId === order.order_id ? 'Dispatching...' : 'Dispatch / Ship →'}
                              </button>
                            ) : isShipped ? (
                              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                                In Transit
                              </span>
                            ) : order.order_status === 'CANCELLED' ? (
                              <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 500 }}>
                                Cancelled
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                Delivered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BUSINESS INTELLIGENCE & ANALYTICAL REPORTS                    */}
      {/* ==================================================================== */}
      {activeTab === 'analytics' && (
        <div className="manager-bi-grid">
          
          {/* Top Selling Products */}
          <div className="st-admin-card">
            <div className="st-admin-card-header">
              <div>
                <h3 className="st-admin-card-title">Top Performing Products by Revenue</h3>
                <p className="st-admin-card-subtitle">
                  Units sold, gross merchandise contribution, and live warehouse inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportToCSV(topProducts, 'top_products_report')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>

            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Units Sold</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={p.product_id}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          width: '24px',
                          height: '24px',
                          borderRadius: '2px',
                          background: idx === 0 ? '#fef8e7' : idx === 1 ? '#f7eee6' : idx === 2 ? '#e6f6f4' : '#faf7f2',
                          color: idx === 0 ? '#b45309' : idx === 1 ? '#c08457' : idx === 2 ? '#0f766e' : '#6b7280',
                          border: '1px solid #e7d7c1',
                          textAlign: 'center',
                          lineHeight: '22px',
                          fontWeight: 500,
                          fontSize: '0.78rem'
                        }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#1f2937' }}>{p.product_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>ID #{p.product_id}</div>
                      </td>
                      <td>
                        <span style={{ background: '#fdfbf7', border: '1px solid #e7d7c1', padding: '2px 8px', borderRadius: '2px', fontSize: '0.76rem', color: '#4b5563' }}>
                          {p.category_name}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 400, color: '#4b5563' }}>
                        {p.total_units_sold} units
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: '#1f2937' }}>
                        ${Number(p.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Revenue Breakdown */}
          <div className="st-admin-card">
            <div className="st-admin-card-header">
              <div>
                <h3 className="st-admin-card-title">Category Revenue Rollup</h3>
                <p className="st-admin-card-subtitle">
                  Sales share distribution across retail catalog categories.
                </p>
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {categoryPerformance.map((cat) => {
                const totalRev = summary.gross_revenue || 1;
                const percentage = Math.min(100, Math.round((Number(cat.category_revenue) / totalRev) * 100));

                return (
                  <div key={cat.category_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                      <span style={{ fontWeight: 500, color: '#1f2937' }}>{cat.category_name}</span>
                      <span style={{ fontWeight: 500, color: '#1f2937' }}>
                        ${Number(cat.category_revenue || 0).toFixed(2)} ({percentage}%)
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        background: '#f4ede4',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(percentage, 4)}%`,
                          height: '100%',
                          background: '#2a9d8f',
                          borderRadius: '2px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#826e6e' }}>
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

      {/* ==================================================================== */}
      {/* TAB 3: STORE OVERALL HEALTH & EXECUTIVE ASSESSMENT                   */}
      {/* ==================================================================== */}
      {activeTab === 'evaluation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '6px' }}>
              Financial &amp; Revenue Evaluation
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Assessment of warehouse cash flow, settlement velocity, and checkout conversion.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Warehouse Gross Merchandise Value</span>
                <strong style={{ color: '#1f2937', fontWeight: 500 }}>${Number(summary.gross_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Successfully Settled Revenue</span>
                <strong style={{ color: '#2a9d8f', fontWeight: 500 }}>${Number(summary.settled_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Average Ticket Size (AOV)</span>
                <strong style={{ color: '#1f2937', fontWeight: 500 }}>${Number(summary.average_order_value || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#826e6e' }}>Financial Health Rating</span>
                <span className="st-chip-paid">Strong (Grade A)</span>
              </div>
            </div>
          </div>

          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '6px' }}>
              Fulfillment &amp; Dispatch Health
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Tracking bottlenecks in the Texas logistics routing network.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Dispatched &amp; In Transit</span>
                <strong style={{ color: '#2a9d8f', fontWeight: 500 }}>{ordersBreakdown.shipped || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Warehouse Queue (Pending)</span>
                <strong style={{ color: '#c08457', fontWeight: 500 }}>{ordersBreakdown.pending || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4ede4', paddingBottom: '8px' }}>
                <span style={{ color: '#826e6e' }}>Order Cancellation Rate</span>
                <strong style={{ color: '#1f2937', fontWeight: 500 }}>
                  {summary.total_orders ? `${Math.round(((ordersBreakdown.cancelled || 0) / summary.total_orders) * 100)}%` : '0%'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#826e6e' }}>Logistics Hub Status</span>
                <span className="st-chip-confirmed">{warehouse?.city_name || 'Regional'} Hub Operational</span>
              </div>
            </div>
          </div>

          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '6px' }}>
              Warehouse Governance &amp; Security
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Role isolation and regional partition enforcement.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.835rem' }}>
              <div style={{ padding: '10px 12px', background: '#fdfbf7', border: '1px solid #e7d7c1', borderRadius: '2px', color: '#5c4b4b' }}>
                <strong>Warehouse Partitioning:</strong> All queries, pipelines, and revenue statistics are strictly isolated to {warehouse?.city_name || 'your assigned warehouse'}.
              </div>
              <div style={{ padding: '10px 12px', background: '#fdfbf7', border: '1px solid #e7d7c1', borderRadius: '2px', color: '#5c4b4b' }}>
                <strong>Order Confirmation Authority:</strong> Incoming orders for this warehouse must be reviewed and confirmed prior to final dispatch.
              </div>
              <div style={{ padding: '10px 12px', background: '#fdfbf7', border: '1px solid #e7d7c1', borderRadius: '2px', color: '#5c4b4b' }}>
                <strong>Staff Onboarding Restricted:</strong> Internal staff credentials can only be created by System Administrators.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
