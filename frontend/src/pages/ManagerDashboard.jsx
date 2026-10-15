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
  const [pipelinePage, setPipelinePage] = useState(1);
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

  // Reset pagination on filter or search changes
  useEffect(() => {
    setPipelinePage(1);
  }, [selectedStage, pipelineSearch]);

  const PIPELINE_PAGE_SIZE = 10;
  const totalPipelinePages = Math.max(1, Math.ceil(filteredPipeline.length / PIPELINE_PAGE_SIZE));
  const safePipelinePage = Math.min(Math.max(1, pipelinePage), totalPipelinePages);
  const paginatedPipeline = useMemo(() => {
    const start = (safePipelinePage - 1) * PIPELINE_PAGE_SIZE;
    return filteredPipeline.slice(start, start + PIPELINE_PAGE_SIZE);
  }, [filteredPipeline, safePipelinePage]);

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
      {/* 1. COMPACT EXECUTIVE HEADER                                          */}
      {/* ==================================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '-8px' }}>
        <div>
          <h1 className="st-admin-title" style={{ fontSize: '1.35rem', fontWeight: 600 }}>Manager Pipeline &amp; Fulfillment</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchExecutiveData}
            disabled={refreshing}
            className="st-btn-header-sync"
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
          >
            <RefreshCwIcon style={{ width: '0.8rem', height: '0.8rem', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Consolidated Filter & Search Toolbar */}
          <div className="st-admin-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top Row: Inline Filter Pills & Export CSV */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'All Orders', count: pipelineData.pipeline?.length || 0 },
                  { id: 'PENDING', label: 'Pending Processing', count: ordersBreakdown.pending || 0 },
                  { id: 'CONFIRMED', label: 'Confirmed & Packed', count: ordersBreakdown.confirmed || 0 },
                  { id: 'SHIPPED', label: 'In Transit', count: ordersBreakdown.shipped || 0 },
                  { id: 'CANCELLED', label: 'Cancelled', count: ordersBreakdown.cancelled || 0 },
                ].map((stg) => {
                  const isActive = selectedStage === stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => setSelectedStage(stg.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '6px 13px',
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 600 : 500,
                        borderRadius: '2px',
                        border: `1.5px solid ${isActive ? '#2a9d8f' : '#e7d7c1'}`,
                        background: isActive ? '#f0faf9' : '#ffffff',
                        color: isActive ? '#2a9d8f' : '#4b5563',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{stg.label}</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: isActive ? '#2a9d8f' : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#64748b',
                        }}
                      >
                        {stg.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => exportToCSV(filteredPipeline, 'manager_pipeline_orders')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>

            {/* Bottom Row: Search Box & Showing Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f4ede4', paddingTop: '10px' }}>
              <div className="st-admin-search-wrap" style={{ flex: '1 1 320px', maxWidth: '520px' }}>
                <span className="st-admin-search-icon">
                  <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
                </span>
                <input
                  type="text"
                  placeholder="Search orders by customer, Order ID, city, or tracking number..."
                  value={pipelineSearch}
                  onChange={(e) => setPipelineSearch(e.target.value)}
                  className="st-admin-search-input"
                />
              </div>

              <span style={{ fontSize: '0.835rem', color: '#64748b' }}>
                {filteredPipeline.length > 0 ? (
                  <>
                    Showing <strong>{(safePipelinePage - 1) * PIPELINE_PAGE_SIZE + 1}–{Math.min(safePipelinePage * PIPELINE_PAGE_SIZE, filteredPipeline.length)}</strong> of <strong>{filteredPipeline.length}</strong> orders
                  </>
                ) : (
                  <>Showing <strong>0</strong> orders</>
                )}
              </span>
            </div>
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
                  ) : paginatedPipeline.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No orders match the selected filters for your warehouse.
                      </td>
                    </tr>
                  ) : (
                    paginatedPipeline.map((order) => {
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

            {/* Pagination Controls */}
            {totalPipelinePages > 1 && (
              <div
                style={{
                  padding: '12px 18px',
                  borderTop: '1.5px solid #e7d7c1',
                  background: '#faf7f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ color: '#826e6e' }}>
                  Showing page <strong style={{ color: '#3b2f2f' }}>{safePipelinePage}</strong> of{' '}
                  <strong style={{ color: '#3b2f2f' }}>{totalPipelinePages}</strong> ({filteredPipeline.length} orders total)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Previous Button */}
                  <button
                    type="button"
                    disabled={safePipelinePage <= 1}
                    onClick={() => setPipelinePage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '2px',
                      border: '1px solid #e7d7c1',
                      background: safePipelinePage <= 1 ? '#f4ede4' : '#ffffff',
                      color: safePipelinePage <= 1 ? '#a89696' : '#3b2f2f',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: safePipelinePage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    &larr; Previous
                  </button>

                  {/* Page Number Buttons */}
                  {Array.from({ length: totalPipelinePages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPipelinePages || Math.abs(p - safePipelinePage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) => {
                      if (item === '...') {
                        return (
                          <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#826e6e' }}>
                            …
                          </span>
                        );
                      }
                      const isCurrent = item === safePipelinePage;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPipelinePage(item)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '2px',
                            border: isCurrent ? '1px solid #2a9d8f' : '1px solid #e7d7c1',
                            background: isCurrent ? '#2a9d8f' : '#ffffff',
                            color: isCurrent ? '#ffffff' : '#3b2f2f',
                            fontWeight: isCurrent ? 700 : 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}

                  {/* Next Button */}
                  <button
                    type="button"
                    disabled={safePipelinePage >= totalPipelinePages}
                    onClick={() => setPipelinePage((p) => Math.min(totalPipelinePages, p + 1))}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '2px',
                      border: '1px solid #e7d7c1',
                      background: safePipelinePage >= totalPipelinePages ? '#f4ede4' : '#ffffff',
                      color: safePipelinePage >= totalPipelinePages ? '#a89696' : '#3b2f2f',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: safePipelinePage >= totalPipelinePages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
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

      {/* ==================================================================== */}
      {/* TAB 4: STAFF DIRECTORY & ACCESS CONTROL                              */}
      {/* ==================================================================== */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="st-admin-card-header" style={{ borderRadius: '2px', border: '1.5px solid #e7d7c1' }}>
            <div>
              <h3 className="st-admin-card-title">Corporate Staff Accounts</h3>
              <p className="st-admin-card-subtitle">
                View internal directory of store managers and system administrators.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="st-admin-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="st-admin-search-wrap">
              <span className="st-admin-search-icon">
                <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              </span>
              <input
                type="text"
                placeholder="Search staff by full name, email, or ID..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="st-admin-search-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[
                { id: 'ALL', label: 'All Roles' },
                { id: '2', label: 'Managers' },
                { id: '3', label: 'System Admins' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStaffRoleFilter(pill.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '2px',
                    border: staffRoleFilter === pill.id ? '1px solid #2a9d8f' : '1px solid #e7d7c1',
                    background: staffRoleFilter === pill.id ? '#e6f6f4' : '#ffffff',
                    color: staffRoleFilter === pill.id ? '#2a9d8f' : '#5c4b4b',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => exportToCSV(filteredStaff, 'staff_directory_export')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Identity</th>
                    <th>Corporate Email</th>
                    <th>Role</th>
                    <th>Privilege Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#826e6e' }}>
                        No staff accounts match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((st) => {
                      const isAdmin = Number(st.role_id) === 3 || Number(st.role_id) === 4;
                      const initials = (st.full_name || 'Staff')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={st.user_id}>
                          <td>#{st.user_id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '2px',
                                background: isAdmin ? '#f7eee6' : '#e6f6f4',
                                border: isAdmin ? '1px solid #e7d7c1' : '1px solid #a8ded8',
                                color: isAdmin ? '#c08457' : '#2a9d8f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {initials}
                              </div>
                              <span style={{ fontWeight: 500, color: '#1f2937' }}>{st.full_name}</span>
                            </div>
                          </td>
                          <td style={{ color: '#5c4b4b' }}>{st.email}</td>
                          <td>
                            <span className={isAdmin ? 'st-chip-role-admin' : 'st-chip-role-mgr'}>
                              {isAdmin ? 'System Administrator' : 'Store Manager'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#826e6e' }}>
                            {isAdmin
                              ? 'Full administration, catalog edits, staff onboarding, report exports'
                              : 'Order fulfillment dispatch, warehouse inventory monitoring'}
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
      {/* MODAL: ONBOARD STAFF MEMBER                                          */}
      {/* ==================================================================== */}
      {isRegisterModalOpen && (
        <div className="st-admin-modal-backdrop">
          <div className="st-admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
                Onboard Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#826e6e' }}
              >
                &times;
              </button>
            </div>

            {staffFormError && (
              <div style={{ padding: '8px 12px', borderRadius: '2px', background: '#fdeeed', border: '1px solid #ffcdd2', color: '#c62828', fontSize: '0.825rem', marginBottom: '14px' }}>
                {staffFormError}
              </div>
            )}

            {staffFormSuccess && (
              <div style={{ padding: '8px 12px', borderRadius: '2px', background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', fontSize: '0.825rem', marginBottom: '14px' }}>
                {staffFormSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5c4b4b', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jennifer Taylor"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5c4b4b', marginBottom: '4px' }}>
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., jennifer.t@brightbuy.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5c4b4b', marginBottom: '4px' }}>
                  Default Temporary Password
                </label>
                <input
                  type="text"
                  disabled
                  readOnly
                  value="password123"
                  className="st-modal-form-input"
                  style={{ background: '#f5f0f0', color: '#5c4b4b', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#826e6e' }}>
                  Fixed default temporary password: <code>password123</code>. The staff member will receive this password in their welcome email and can change it once logged in.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5c4b4b', marginBottom: '4px' }}>
                  Assigned Role *
                </label>
                <select
                  value={staffForm.role_id}
                  onChange={(e) => setStaffForm({ ...staffForm, role_id: Number(e.target.value) })}
                  className="st-modal-form-input"
                >
                  <option value={2}>Store Executive &amp; Manager (Role 2)</option>
                  <option value={3}>System Administrator (Role 3)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="st-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffFormSubmitting}
                  className="st-btn-primary"
                >
                  {staffFormSubmitting ? 'Registering...' : 'Confirm Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
