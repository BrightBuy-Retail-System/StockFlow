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
  CheckCircleIcon
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
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'analytics' | 'evaluation' | 'staff'
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED'

  // Staff Management State
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL'); // 'ALL' | '2' | '3'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 2, // 2: Manager, 3: System Administrator
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
      const res = await api.post('/auth_cart/staff/register', {
        username: staffForm.username.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        role_id: Number(staffForm.role_id),
      });

      const roleTitle = Number(staffForm.role_id) === 3 ? 'System Administrator' : 'Store Executive & Manager';
      setStaffFormSuccess(`Successfully registered ${staffForm.username} as ${roleTitle}!`);

      await fetchStaffMembers();

      // Reset form fields
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
          <button
            type="button"
            onClick={() => {
              setStaffFormError('');
              setStaffFormSuccess('');
              setIsRegisterModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: '1' }}>+</span> Onboard Staff Member
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Synced: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={() => {
              fetchExecutiveData();
              fetchStaffMembers();
            }}
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
            <AnalyticsIcon style={{ width: '10px', height: '10px', color: '#10b981' }} />
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

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'staff' ? '2px solid var(--accent, #6366f1)' : '2px solid transparent',
            color: activeTab === 'staff' ? 'var(--accent, #6366f1)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>👥 Staff &amp; Access Management</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '1px 8px',
              borderRadius: '999px',
              background: activeTab === 'staff' ? 'var(--accent, #6366f1)' : 'var(--bg-subtle)',
              color: activeTab === 'staff' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            {staffList.length}
          </span>
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

      {/* -------------------------------------------------------------
          TAB 4: STAFF & ACCESS MANAGEMENT (Onboard New Staff)
      -------------------------------------------------------------- */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick Staff KPI Metrics Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            
            <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <UserIcon style={{ width: '24px', height: '24px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Staff Roster</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.2' }}>
                  {staffList.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#10b981' }}>Active</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <AnalyticsIcon style={{ width: '22px', height: '22px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Store Managers (Role 2)</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', lineHeight: '1.2' }}>
                  {staffList.filter((s) => s.role_id === 2).length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                <ShieldCheckIcon style={{ width: '24px', height: '24px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>System Admins (Role 3)</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7c3aed', lineHeight: '1.2' }}>
                  {staffList.filter((s) => s.role_id === 3).length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <CheckCircleIcon style={{ width: '24px', height: '24px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Access Governance</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>
                  RBAC Multi-Tier Secured
                </div>
              </div>
            </div>

          </div>

          {/* Directory Action & Filter Bar */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search staff by full name, email, or ID..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Role Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[
                  { id: 'ALL', label: 'All Roles' },
                  { id: '2', label: 'Managers (Role 2)' },
                  { id: '3', label: 'System Admins (Role 3)' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStaffRoleFilter(pill.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: staffRoleFilter === pill.id ? '1px solid var(--accent, #6366f1)' : '1px solid var(--border-color)',
                      background: staffRoleFilter === pill.id ? 'var(--accent-light, #e0e7ff)' : 'transparent',
                      color: staffRoleFilter === pill.id ? 'var(--accent, #6366f1)' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => {
                  setStaffFormError('');
                  setStaffFormSuccess('');
                  setIsRegisterModalOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span> Onboard New Staff Member
              </button>

            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Internal Staff Directory ({filteredStaff.length})
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Verified personnel with operational or technical credentials.
                </span>
              </div>
              <button
                type="button"
                onClick={fetchStaffMembers}
                disabled={loadingStaff}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {loadingStaff ? 'Loading...' : '↻ Refresh Roster'}
              </button>
            </div>

            {loadingStaff ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Loading verified staff personnel...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                  <UserIcon style={{ width: '28px', height: '28px' }} />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>No Staff Members Found</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                  {staffSearch ? `No staff matched "${staffSearch}".` : 'No staff personnel registered under this filter.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStaffSearch('');
                    setStaffRoleFilter('ALL');
                    setIsRegisterModalOpen(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent, #6366f1)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  + Onboard New Staff Member
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>Staff Personnel</th>
                      <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>Official Email</th>
                      <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>Assigned Role</th>
                      <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>Access Scope</th>
                      <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member) => {
                      const isCurrentUser = user && (member.user_id === user.id || member.email === user.email);
                      const isSystemAdmin = member.role_id === 3;
                      const initials = (member.full_name || 'Staff')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr
                          key={member.user_id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: isCurrentUser ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Name & Avatar */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '10px',
                                  background: isSystemAdmin
                                    ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                                    : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {member.full_name}
                                  {isCurrentUser && (
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: '#e0e7ff',
                                        color: '#4338ca',
                                        fontWeight: 600,
                                      }}
                                    >
                                      You
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ID: #STF-00{member.user_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{ padding: '14px 20px', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {member.email}
                          </td>

                          {/* Role Badge */}
                          <td style={{ padding: '14px 20px' }}>
                            {isSystemAdmin ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: '#f5f3ff',
                                  color: '#6d28d9',
                                  border: '1px solid #ddd6fe',
                                }}
                              >
                                🛡️ System Administrator (3)
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                📊 Store Executive &amp; Manager (2)
                              </span>
                            )}
                          </td>

                          {/* Access Scope Description */}
                          <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {isSystemAdmin
                              ? 'Catalog Schema, SKUs, Stock Thresholds'
                              : 'Order Logistics, GMV Reports, Dispatch'}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                              Active Staff
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: ONBOARD NEW STAFF MEMBER (Managers & Admins only)
      -------------------------------------------------------------- */}
      {isRegisterModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRegisterModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '28px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--accent-light, #e0e7ff)',
                    color: 'var(--accent, #6366f1)',
                  }}
                >
                  🔒 Executive Access Delegator
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-main)' }}>
                  Onboard New Staff Member
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Grant operational or administrative access credentials to a verified team member.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {/* Notification Alerts */}
            {staffFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{staffFormError}</span>
              </div>
            )}

            {staffFormSuccess && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>✓</span>
                <span>{staffFormSuccess}</span>
              </div>
            )}

            {/* Staff Registration Form */}
            <form onSubmit={handleRegisterStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 1. Interactive Role Picker Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Assign Staff Operational Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  
                  {/* Option: Store Manager */}
                  <div
                    onClick={() => setStaffForm({ ...staffForm, role_id: 2 })}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: Number(staffForm.role_id) === 2 ? '2px solid #059669' : '1.5px solid var(--border-color)',
                      background: Number(staffForm.role_id) === 2 ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1rem' }}>📊</span>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: Number(staffForm.role_id) === 2 ? '5px solid #059669' : '2px solid var(--border-color)',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: Number(staffForm.role_id) === 2 ? '#047857' : 'var(--text-main)' }}>
                      Store Manager
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                      Fulfillment pipeline, Texas logistics &amp; BI reports.
                    </div>
                  </div>

                  {/* Option: System Administrator */}
                  <div
                    onClick={() => setStaffForm({ ...staffForm, role_id: 3 })}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: Number(staffForm.role_id) === 3 ? '2px solid #7c3aed' : '1.5px solid var(--border-color)',
                      background: Number(staffForm.role_id) === 3 ? '#faf5ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1rem' }}>🛡️</span>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: Number(staffForm.role_id) === 3 ? '5px solid #7c3aed' : '2px solid var(--border-color)',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: Number(staffForm.role_id) === 3 ? '#6d28d9' : 'var(--text-main)' }}>
                      System Admin
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                      Database, SKU creation &amp; stock management.
                    </div>
                  </div>

                </div>
              </div>

              {/* 2. Full Name / Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Full Name / Staff Username <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <UserIcon style={{ width: '16px', height: '16px' }} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasun Fernando"
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 3. Official Corporate Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Official Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    ✉️
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="staff.name@brightbuy.lk"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 4. Password with Generator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Initial Access Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--accent, #6366f1)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    🎲 Generate Secure Password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    🔑
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password or click Generate"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 70px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: showPassword ? 'monospace' : 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  The staff member can use either their username or email together with this password to log in.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffFormSubmitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: Number(staffForm.role_id) === 3
                      ? 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)'
                      : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  }}
                >
                  {staffFormSubmitting ? 'Registering Staff...' : 'Onboard Staff Member'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
