import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  AnalyticsIcon,
  OrdersIcon,
  LogisticsIcon,
  LayersIcon,
  DatabaseIcon,
  SearchIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  TruckIcon
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

  // UI Tabs & Filters: 'pipeline' | 'analytics' | 'evaluation' | 'staff'
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');

  // Staff Management State
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 2,
  });
  const [staffFormSubmitting, setStaffFormSubmitting] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSuccess, setStaffFormSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  // Fetch Internal Staff Roster
  const fetchStaffMembers = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.get('/auth_cart/staff');
      setStaffList(res.data?.staff || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
    fetchStaffMembers();
  }, []);

  // Quick Random Password Generator
  const generateRandomPassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'Stf!';
    for (let i = 0; i < 8; i++) {
      generated += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setStaffForm((prev) => ({ ...prev, password: generated }));
    setShowPassword(true);
  };

  // Handle Staff Registration
  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setStaffFormSubmitting(true);
    setStaffFormError('');
    setStaffFormSuccess('');

    try {
      await api.post('/auth_cart/staff/register', {
        username: staffForm.username.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        role_id: Number(staffForm.role_id),
      });

      const roleTitle = Number(staffForm.role_id) === 3 ? 'System Administrator' : 'Store Executive & Manager';
      setStaffFormSuccess(`Successfully registered ${staffForm.username} as ${roleTitle}!`);

      await fetchStaffMembers();

      setStaffForm({
        username: '',
        email: '',
        password: '',
        role_id: 2,
      });
      setShowPassword(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Staff registration failed.';
      setStaffFormError(msg);
    } finally {
      setStaffFormSubmitting(false);
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

  // Filtered Staff Roster
  const filteredStaff = useMemo(() => {
    return staffList.filter((member) => {
      const q = staffSearch.toLowerCase();
      const matchesSearch =
        !q ||
        (member.full_name && member.full_name.toLowerCase().includes(q)) ||
        (member.email && member.email.toLowerCase().includes(q)) ||
        String(member.user_id).includes(q);

      const matchesRole =
        staffRoleFilter === 'ALL' || String(member.role_id) === String(staffRoleFilter);

      return matchesSearch && matchesRole;
    });
  }, [staffList, staffSearch, staffRoleFilter]);

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
    <div className="st-admin-container">

      {/* ==================================================================== */}
      {/* 1. CLEAN EXECUTIVE HEADER                                            */}
      {/* ==================================================================== */}
      <div className="st-admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="st-badge-admin-role">Store Executive &amp; Manager</span>
            <span className="st-badge-cluster-status">
              <span className="st-pulse-dot" />
              TiDB Cluster Operational
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Signed in as <strong>{user.username || user.full_name || user.email}</strong>
            </span>
          </div>

          <h1 className="st-admin-title">Manager Pipeline &amp; Fulfillment</h1>
          <p className="st-admin-subtitle">
            Evaluate retail KPIs, monitor dispatch bottlenecks, track Texas regional hubs, and manage store access.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              fetchExecutiveData();
              fetchStaffMembers();
            }}
            disabled={refreshing}
            className="st-btn-header-sync"
          >
            <RefreshCwIcon style={{ width: '0.875rem', height: '0.875rem', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStaffFormError('');
              setStaffFormSuccess('');
              setIsRegisterModalOpen(true);
            }}
            className="st-btn-primary"
          >
            + Onboard Staff Member
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
            <span className="st-admin-kpi-label">Gross Merchandise Value</span>
            <div className="st-admin-kpi-iconbox">
              <AnalyticsIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(summary.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            Net settled: <strong style={{ color: '#0f172a' }}>${Number(summary.settled_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Total Orders Placed</span>
            <div className="st-admin-kpi-iconbox">
              <OrdersIcon style={{ width: '1rem', height: '1rem', color: '#059669' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {summary.total_orders || 0}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#0f172a' }}>{ordersBreakdown.confirmed || 0}</strong> confirmed · <strong style={{ color: '#0f172a' }}>{ordersBreakdown.shipped || 0}</strong> in transit
          </div>
        </div>

        {/* KPI 3: Average Order Value */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Average Order Value</span>
            <div className="st-admin-kpi-iconbox">
              <LayersIcon style={{ width: '1rem', height: '1rem', color: '#4f46e5' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(summary.average_order_value || 0).toFixed(2)}
          </div>
          <div className="st-admin-kpi-foot">
            Across <strong style={{ color: '#0f172a' }}>{summary.active_customers || 0}</strong> registered buyer accounts
          </div>
        </div>

        {/* KPI 4: Inventory Asset Valuation */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Inventory Asset Valuation</span>
            <div className="st-admin-kpi-iconbox">
              <DatabaseIcon style={{ width: '1rem', height: '1rem', color: '#0284c7' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(invSummary.valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#0f172a' }}>{invSummary.units_on_hand || 0}</strong> units across <strong style={{ color: '#0f172a' }}>{invSummary.total_skus || 0}</strong> SKUs
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
          <span>Fulfillment Pipeline</span>
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
          <span>Store Health Assessment</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`st-admin-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
        >
          <UserIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Staff Directory</span>
          <span className="st-pill-badge-blue">{staffList.length}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ORDER FULFILLMENT PIPELINE                                    */}
      {/* ==================================================================== */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Pipeline Stage Segments */}
          <div className="st-pipeline-segment">
            {[
              { id: 'ALL', label: 'All Orders', count: pipelineData.pipeline?.length || 0 },
              { id: 'PENDING', label: 'Pending Processing', count: ordersBreakdown.pending || 0 },
              { id: 'CONFIRMED', label: 'Confirmed & Packed', count: ordersBreakdown.confirmed || 0 },
              { id: 'SHIPPED', label: 'In Transit', count: ordersBreakdown.shipped || 0 },
              { id: 'CANCELLED', label: 'Cancelled', count: ordersBreakdown.cancelled || 0 },
            ].map((stg) => (
              <div
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`st-pipeline-chip ${selectedStage === stg.id ? 'active' : ''}`}
              >
                <div className="st-pipeline-chip-label">{stg.label}</div>
                <div className="st-pipeline-chip-val">{stg.count}</div>
              </div>
            ))}
          </div>

          {/* Search & Export Toolbar */}
          <div className="st-admin-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="st-admin-search-wrap">
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.835rem', color: '#64748b' }}>
                Showing <strong>{filteredPipeline.length}</strong> orders
              </span>
              <button
                type="button"
                onClick={() => exportToCSV(filteredPipeline, 'manager_pipeline_orders')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Destination Hub</th>
                    <th>Tracking</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        Loading fulfillment pipeline...
                      </td>
                    </tr>
                  ) : filteredPipeline.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No orders match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPipeline.map((order) => {
                      const isPaid = (order.payment_status || '').toUpperCase() === 'PAID' || (order.payment_status || '').toUpperCase() === 'SUCCESS';
                      return (
                        <tr key={order.order_id}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>#{order.order_id}</span>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {order.placed_at ? new Date(order.placed_at).toLocaleDateString() : 'Recent'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{order.customer_name || 'Retail Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customer_email || '—'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#334155' }}>{order.destination_city || 'Texas Central'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{order.fulfillment_hub || 'Direct Dispatch'}</div>
                          </td>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                              {order.tracking_number || 'Pending'}
                            </div>
                          </td>
                          <td>
                            <span
                              className={
                                order.order_status === 'CONFIRMED'
                                  ? 'st-chip-confirmed'
                                  : order.order_status === 'SHIPPED'
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
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            ${Number(order.total_amount || 0).toFixed(2)}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
          
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
                          borderRadius: '50%',
                          background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#eff6ff' : '#ffffff',
                          color: idx === 0 ? '#92400e' : idx === 1 ? '#334155' : idx === 2 ? '#1d4ed8' : '#64748b',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          lineHeight: '22px',
                          fontWeight: 700,
                          fontSize: '0.78rem'
                        }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.product_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ID #{p.product_id}</div>
                      </td>
                      <td>
                        <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#475569' }}>
                          {p.category_name}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>
                        {p.total_units_sold} units
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
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
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{cat.category_name}</span>
                      <strong style={{ color: '#059669' }}>
                        ${Number(cat.category_revenue || 0).toFixed(2)} ({percentage}%)
                      </strong>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(percentage, 4)}%`,
                          height: '100%',
                          background: '#2563eb',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
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
              Assessment of store cash flow, settlement velocity, and checkout conversion.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Total Gross Merchandise Value</span>
                <strong style={{ color: '#0f172a' }}>${Number(summary.gross_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Successfully Settled Revenue</span>
                <strong style={{ color: '#059669' }}>${Number(summary.settled_revenue || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Average Ticket Size (AOV)</span>
                <strong style={{ color: '#0f172a' }}>${Number(summary.average_order_value || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Financial Health Rating</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Dispatched &amp; In Transit</span>
                <strong style={{ color: '#2563eb' }}>{ordersBreakdown.shipped || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Warehouse Queue (Pending)</span>
                <strong style={{ color: '#d97706' }}>{ordersBreakdown.pending || 0} orders</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Order Cancellation Rate</span>
                <strong style={{ color: '#0f172a' }}>
                  {summary.total_orders ? `${Math.round(((ordersBreakdown.cancelled || 0) / summary.total_orders) * 100)}%` : '0%'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Logistics Hub Status</span>
                <span className="st-chip-confirmed">Texas Hubs Operational</span>
              </div>
            </div>
          </div>

          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '6px' }}>
              Store Owner Governance Summary
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Access privileges and executive audit trail parameters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.835rem' }}>
              <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                <strong>Read-Only Enforcement:</strong> No accidental inventory mutations from manager reporting views.
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                <strong>Live TiDB Aggregations:</strong> Reporting calculations are derived dynamically from transaction tables.
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                <strong>Audit Trail Compliance:</strong> Session authenticated with JWT Bearer claims for Role ID {user.role_id}.
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
          
          <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="st-admin-card-title">Corporate Staff Accounts</h3>
              <p className="st-admin-card-subtitle">
                Manage internal credentials, store managers, and administrators with role-based access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStaffFormError('');
                setStaffFormSuccess('');
                setIsRegisterModalOpen(true);
              }}
              className="st-btn-primary"
            >
              + Onboard Staff Member
            </button>
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
                    borderRadius: '7px',
                    border: staffRoleFilter === pill.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: staffRoleFilter === pill.id ? '#eff6ff' : '#ffffff',
                    color: staffRoleFilter === pill.id ? '#1d4ed8' : '#64748b',
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
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
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
                                borderRadius: '50%',
                                background: isAdmin ? '#eff6ff' : '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: isAdmin ? '#1e40af' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {initials}
                              </div>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{st.full_name}</span>
                            </div>
                          </td>
                          <td style={{ color: '#475569' }}>{st.email}</td>
                          <td>
                            <span className={isAdmin ? 'st-chip-role-admin' : 'st-chip-role-mgr'}>
                              {isAdmin ? 'System Administrator' : 'Store Manager'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Onboard Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {staffFormError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.825rem', marginBottom: '14px' }}>
                {staffFormError}
              </div>
            )}

            {staffFormSuccess && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.825rem', marginBottom: '14px' }}>
                {staffFormSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                    Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Generate Secure Password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="st-modal-form-input"
                    style={{ paddingRight: '56px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
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
