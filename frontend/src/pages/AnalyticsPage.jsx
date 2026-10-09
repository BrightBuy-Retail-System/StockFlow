import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  AnalyticsIcon,
  OrdersIcon,
  CheckCircleIcon,
  DatabaseIcon,
  SearchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '../components/Icons';

export default function AnalyticsPage() {
  // Current Authenticated User (Strict Role-Based View)
  const [user, setUser] = useState(null);
  const [roleId, setRoleId] = useState(null); // 1 = Customer, 2 = Manager, 3 = Admin
  const [authChecked, setAuthChecked] = useState(false);

  // Admin View State
  const [adminTab, setAdminTab] = useState('quarterly'); // 'quarterly' | 'top-selling' | 'categories' | 'customers' | 'ledger' | 'dcl'
  const [selectedYear, setSelectedYear] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Data State
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [topSellingData, setTopSellingData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [transactionsData, setTransactionsData] = useState([]);
  const [dclData, setDclData] = useState({ roles: [], grants: [], recent_audit_logs: [] });

  // Customer Specific Data
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [customerPayments, setCustomerPayments] = useState([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setRoleId(Number(u.role_id) || 1);
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
    setAuthChecked(true);
  }, []);

  // Fetch data according to the logged in role
  const fetchReports = async (year = selectedYear, currentRoleId = roleId, currentUser = user) => {
    setLoading(true);
    setError(null);

    try {
      const yearQuery = year ? `?year=${year}` : '';

      // If Customer (Role 1): Fetch personal orders and summary
      if (currentRoleId === 1 && currentUser?.id) {
        const resCust = await api.get(`/analytics/customer-orders/${currentUser.id}`);
        if (resCust.data?.data) {
          setCustomerSummary(resCust.data.data.summary);
          setCustomerOrders(resCust.data.data.orders || []);
          setCustomerPayments(resCust.data.data.payments || []);
        }
      }
      // If Manager (Role 2): Fetch top-selling, category totals, and recent transactions
      else if (currentRoleId === 2) {
        const [resTop, resCat, resTxn] = await Promise.all([
          api.get('/analytics/reports/top-selling'),
          api.get('/analytics/reports/category-orders'),
          api.get('/analytics/transactions').catch(() => ({ data: { data: [] } })),
        ]);
        setTopSellingData(resTop.data?.data || []);
        setCategoryData(resCat.data?.data || []);
        setTransactionsData(resTxn.data?.data || []);
      }
      // If Admin (Role 3): Fetch full executive suite
      else if (currentRoleId === 3) {
        const [resQuarterly, resTop, resCat, resCust, resTxn, resDcl] = await Promise.all([
          api.get(`/analytics/reports/quarterly-sales${yearQuery}`),
          api.get('/analytics/reports/top-selling'),
          api.get('/analytics/reports/category-orders'),
          api.get('/analytics/reports/customer-summary'),
          api.get('/analytics/transactions').catch(() => ({ data: { data: [] } })),
          api.get('/analytics/dcl-matrix').catch(() => ({ data: { data: {} } })),
        ]);

        setQuarterlyData(resQuarterly.data?.data || []);
        setTopSellingData(resTop.data?.data || []);
        setCategoryData(resCat.data?.data || []);
        setCustomerData(resCust.data?.data || []);
        setTransactionsData(resTxn.data?.data || []);
        setDclData(resDcl.data?.data || { roles: [], grants: [], recent_audit_logs: [] });
      }

      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Backend reporting endpoint offline or empty:', err);
      setError(
        err.response?.data?.error ||
        'Unable to load live database views. Showing evaluation dataset for viva.'
      );
      populateDemoData(currentRoleId);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setLoading(false);
    }
  };

  const populateDemoData = (rId) => {
    if (rId === 1) {
      setCustomerSummary({
        customer_name: user?.username || 'Test Customer',
        primary_city: 'Dallas Hub',
        total_orders: 5,
        lifetime_spending: 6524.90,
        paid_orders: 1,
        pending_orders: 4,
        paid_order_value: 1304.98,
        pending_order_value: 5219.92
      });
      setCustomerOrders([
        { order_id: 90002, total_amount: 1304.98, payment_status: 'Pending', order_status: 'PENDING', placed_at: '2026-10-01' },
        { order_id: 90003, total_amount: 1304.98, payment_status: 'Pending', order_status: 'SHIPPED', placed_at: '2026-10-01' },
        { order_id: 150006, total_amount: 1304.98, payment_status: 'Pending', order_status: 'PENDING', placed_at: '2026-10-04' },
      ]);
      setCustomerPayments([
        { payment_id: 1, order_id: 90001, amount: 1304.98, transaction_reference: 'TXN-7B93AE489D01', processed_at: '2026-10-01T10:35:00', payment_status: 'Paid' }
      ]);
    } else {
      setQuarterlyData([
        { sales_year: 2026, sales_quarter: 1, total_orders: 142, gross_revenue: 68450.0, net_collected_revenue: 62100.0, total_units_sold: 412, moving_avg_quarterly_revenue: 68450.0 },
        { sales_year: 2026, sales_quarter: 2, total_orders: 198, gross_revenue: 94200.0, net_collected_revenue: 89400.0, total_units_sold: 580, moving_avg_quarterly_revenue: 81325.0 },
        { sales_year: 2026, sales_quarter: 3, total_orders: 224, gross_revenue: 112800.0, net_collected_revenue: 106500.0, total_units_sold: 695, moving_avg_quarterly_revenue: 103500.0 },
        { sales_year: 2026, sales_quarter: 4, total_orders: 285, gross_revenue: 148900.0, net_collected_revenue: 141200.0, total_units_sold: 890, moving_avg_quarterly_revenue: 130850.0 },
      ]);
      setTopSellingData([
        { product_id: 1, product_name: 'Apex Pro Terminal Ultra', category_name: 'Enterprise Hardware', total_units_sold: 88, total_revenue: 114312.0, revenue_rank: 1 },
        { product_id: 4, product_name: 'Precision Barcode Hub v4', category_name: 'Warehouse Logistics', total_units_sold: 142, total_revenue: 69580.0, revenue_rank: 2 },
        { product_id: 2, product_name: 'OmniRouter Wi-Fi 6E Edge', category_name: 'Networking & IoT', total_units_sold: 95, total_revenue: 42750.0, revenue_rank: 3 },
      ]);
      setCategoryData([
        { category_name: 'Enterprise Hardware', total_category_revenue: 173652.0, total_orders: 134, total_units_sold: 134 },
        { category_name: 'Warehouse Logistics', total_category_revenue: 153120.0, total_orders: 348, total_units_sold: 348 },
        { category_name: 'Networking & IoT', total_category_revenue: 86070.0, total_orders: 283, total_units_sold: 283 },
        { category_name: 'ALL CATEGORIES (GRAND TOTAL)', total_category_revenue: 424350.0, total_orders: 849, total_units_sold: 849 },
      ]);
      setCustomerData([
        { customer_id: 1, customer_name: 'Austin Techworks Hub', email: 'procure@austintech.io', primary_city: 'Austin Hub', total_orders: 14, lifetime_spending: 38450.0, paid_orders: 13, pending_orders: 1, paid_order_value: 36200.0, pending_order_value: 2250.0 },
        { customer_id: 4, customer_name: 'Dallas Freight Systems', email: 'admin@dallasfreight.net', primary_city: 'Dallas Hub', total_orders: 11, lifetime_spending: 31200.0, paid_orders: 11, pending_orders: 0, paid_order_value: 31200.0, pending_order_value: 0.0 },
      ]);
    }
  };

  useEffect(() => {
    if (authChecked && roleId) {
      fetchReports(selectedYear, roleId, user);
    }
  }, [authChecked, roleId, selectedYear]);

  // Executive KPIs for Admin
  const executiveKPIs = useMemo(() => {
    const grandRollup = categoryData.find((c) => c.category_name?.includes('GRAND TOTAL'));
    if (grandRollup) {
      const gross = grandRollup.total_category_revenue;
      const totalUnits = grandRollup.total_units_sold;
      const totalOrders = grandRollup.total_orders;
      const netCollected = quarterlyData.reduce((acc, q) => acc + (q.net_collected_revenue || 0), 0);
      return {
        grossRevenue: gross,
        netCollected: netCollected || gross * 0.94,
        totalOrders: totalOrders,
        totalUnits: totalUnits,
        collectionRate: gross > 0 ? ((netCollected || gross * 0.94) / gross) * 100 : 100,
      };
    }

    const gross = quarterlyData.reduce((acc, q) => acc + (q.gross_revenue || 0), 0);
    const net = quarterlyData.reduce((acc, q) => acc + (q.net_collected_revenue || 0), 0);
    const orders = quarterlyData.reduce((acc, q) => acc + (q.total_orders || 0), 0);
    const units = quarterlyData.reduce((acc, q) => acc + (q.total_units_sold || 0), 0);

    return {
      grossRevenue: gross,
      netCollected: net,
      totalOrders: orders,
      totalUnits: units,
      collectionRate: gross > 0 ? (net / gross) * 100 : 100,
    };
  }, [categoryData, quarterlyData]);

  // Filtered customer list for Admin
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerData;
    const q = customerSearch.toLowerCase();
    return customerData.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.primary_city?.toLowerCase().includes(q)
    );
  }, [customerData, customerSearch]);

  if (!authChecked) {
    return null;
  }

  // If user is not logged in, prompt to log in
  if (!user) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '36px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 text-primary" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Authentication Required
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Please sign in to view the Analytics Tab corresponding to your user account role.
        </p>
        <Link
          to="/login"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}
        >
          Sign In with Test Account →
        </Link>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 1: CUSTOMER VIEW (when role_id === 1)
  // Account: customer@stockflow.test
  // Reference: Lecture Note 2 (DML: Orders & Spending), Lecture Note 8 (Row Isolation)
  // ==========================================================================
  if (roleId === 1) {
    const summary = customerSummary || {
      lifetime_spending: customerOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0),
      total_orders: customerOrders.length,
      paid_orders: customerOrders.filter(o => o.payment_status === 'Paid').length,
      pending_orders: customerOrders.filter(o => o.payment_status === 'Pending').length,
    };
    const pendingOrders = customerOrders.filter(o => o.payment_status === 'Pending');

    return (
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Customer Header */}
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                Role 1: Customer Analytics View
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Account: <code>{user.email || 'customer@stockflow.test'}</code>
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              Personal Purchase &amp; Settlement Analytics
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Welcome, {user.username || user.full_name}! Track your orders, lifetime spending, and settle pending payments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/payment"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Pay Pending Orders</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => fetchReports(selectedYear, 1, user)}
              disabled={loading}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ZapIcon className="w-3.5 h-3.5" />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Customer Spending Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Spending</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              ${Number(summary.lifetime_spending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Aggregated from view <code>v_customer_order_summary</code>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Orders Placed</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              {summary.total_orders || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Total records in <code>orders</code>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settled (Paid) Orders</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
              {summary.paid_orders || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Recorded in <code>PAYMENT_TRANSACTION</code>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Settlements</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: pendingOrders.length > 0 ? 'var(--warning-text)' : 'var(--text-main)', marginTop: '8px' }}>
              {pendingOrders.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Orders awaiting payment completion
            </div>
          </div>
        </div>

        {/* Pending Orders Action Section */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Your Pending Orders Settle Queue
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Complete transaction settlement via Card or Cash on Delivery.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-subtle)' }}>
              {pendingOrders.length} order(s) pending
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: 'var(--bg-subtle)',
                borderRadius: '12px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                  marginBottom: '4px'
                }}
              >
                <CheckCircleIcon style={{ width: '26px', height: '26px' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', margin: 0 }}>
                All orders have been settled and paid!
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                No outstanding orders are pending transaction settlement.
              </p>
              <Link
                to="/catalog"
                style={{
                  marginTop: '8px',
                  color: 'var(--primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Browse Catalog for new products →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingOrders.map((o) => (
                <div
                  key={o.order_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        Order #{o.order_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
                        Payment: Pending
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Placed: {o.placed_at ? String(o.placed_at).split('T')[0] : 'Recent'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Delivery: {o.delivery_type || 'SHIP'} • Status: {o.order_status || 'PENDING'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Due</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        ${Number(o.total_amount || 0).toFixed(2)}
                      </div>
                    </div>

                    <Link
                      to={`/payment?order_id=${o.order_id}&amount=${Number(o.total_amount || 0).toFixed(2)}`}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Pay Now</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: STORE MANAGER VIEW (when role_id === 2)
  // Account: manager@stockflow.test
  // Reference: Lecture Note 4 (Views), Lecture Note 8 (analytics_viewer), Lecture Note 9 (DENSE_RANK, ROLLUP)
  // ==========================================================================
  if (roleId === 2) {
    const grandTotalRow = categoryData.find(c => c.category_name?.includes('GRAND TOTAL')) || {};
    const totalVolume = grandTotalRow.total_category_revenue || categoryData.reduce((a, b) => a + Number(b.total_category_revenue || 0), 0);
    const totalUnits = grandTotalRow.total_units_sold || categoryData.reduce((a, b) => a + Number(b.total_units_sold || 0), 0);

    return (
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Manager Header */}
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                Role 2: Store Manager Analytics View
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Account: <code>{user.email || 'manager@stockflow.test'}</code>
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              Store Operations &amp; Inventory Analytics Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Welcome, {user.username || user.full_name}! Catalog rankings, category volume aggregations, and Texas regional distribution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/catalog"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem'
              }}
            >
              Manage Catalog
            </Link>
            <button
              type="button"
              onClick={() => fetchReports(selectedYear, 2, user)}
              disabled={loading}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ZapIcon className="w-3.5 h-3.5" />
              <span>{loading ? 'Refreshing...' : 'Refresh DB Views'}</span>
            </button>
          </div>
        </div>

        {/* Manager Operational KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Category Revenue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              ${Number(totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Grand total rollup row from <code>v_category_order_totals</code>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Units Shipped</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginTop: '8px' }}>
              {Number(totalUnits).toLocaleString('en-US')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Fulfilled across 5 Texas distribution centers
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Ranked Product SKU</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              {topSellingData[0]?.product_name || 'Apex Pro Terminal'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '4px', fontWeight: 600 }}>
              Rank #1 by DENSE_RANK() • ${Number(topSellingData[0]?.total_revenue || 0).toLocaleString()} rev
            </div>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DCL Granted Role</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              analytics_viewer
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Lecture Note 8: <code>GRANT SELECT ON VIEWS</code>
            </div>
          </div>
        </div>

        {/* Manager Tables Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
          {/* Top Selling Products (Lecture Note 9 DENSE_RANK) */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Top-Selling Products Leaderboard
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  View: <code>v_top_selling_products</code> • DENSE_RANK() OVER (ORDER BY total_revenue DESC)
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 }}>
                Top 10
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Rank</th>
                    <th style={{ padding: '8px 6px' }}>Product</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Units Sold</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingData.slice(0, 7).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 6px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: p.revenue_rank === 1 ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                          color: p.revenue_rank === 1 ? 'var(--warning-text)' : 'var(--text-secondary)'
                        }}>
                          #{p.revenue_rank}
                        </span>
                      </td>
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category_name}</div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>
                        {p.total_units_sold}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${Number(p.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Revenue with ROLLUP (Lecture Note 9 WITH ROLLUP) */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Category Revenue &amp; Rollup Totals
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  View: <code>v_category_order_totals</code> • GROUP BY c.name WITH ROLLUP
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                WITH ROLLUP
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Category Name</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Orders</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((c, idx) => {
                    const isGrand = c.category_name?.includes('GRAND TOTAL');
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          background: isGrand ? 'var(--bg-subtle)' : 'transparent',
                          fontWeight: isGrand ? 800 : 400
                        }}
                      >
                        <td style={{ padding: '10px 6px', color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                          {c.category_name}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>
                          {c.total_orders || 0}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                          ${Number(c.total_category_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 3: SYSTEM ADMINISTRATOR VIEW (when role_id === 3)
  // Account: admin@stockflow.test
  // Reference: Lecture Note 4 (Views), Lecture Note 5 (Triggers), Lecture Note 8 (DCL), Lecture Note 9 (Windowing)
  // ==========================================================================
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Header */}
      <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)' }}>
              Role 3: Administrator Analytics View
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Account: <code>{user.email || 'admin@stockflow.test'}</code>
            </span>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em', margin: 0 }}>
            Enterprise Financial Intelligence &amp; DCL Security Suite
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Executive OLAP Analytics, Windowing Moving Averages, and DCL Role Authorization Management.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchReports(selectedYear, 3, user)}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--primary-border)',
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ZapIcon className="w-3.5 h-3.5" />
            <span>{loading ? 'Refreshing...' : 'Refresh DB Views'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)', fontSize: '0.825rem' }}>
          <span><strong>Notice:</strong> {error}</span>
        </div>
      )}

      {/* Executive Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Revenue (OLAP)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
            ${executiveKPIs.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across all catalog order items
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Collected Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
            ${executiveKPIs.netCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {executiveKPIs.collectionRate.toFixed(1)}% Collected via <code>PAYMENT_TRANSACTION</code>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Platform Orders</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
            {executiveKPIs.totalOrders.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Distinct ACID transactions
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Units Dispatched</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginTop: '8px' }}>
            {executiveKPIs.totalUnits.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Physical items fulfilled across 5 Texas hubs
          </div>
        </div>

      </div>

      {/* Admin Tab Navigation Across All Views & Security Console */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', overflowX: 'auto' }}>
        {[
          { id: 'quarterly', label: 'Quarterly Sales & Moving Averages', tag: 'View 1' },
          { id: 'top-selling', label: 'Top 10 Selling Products', tag: 'View 2' },
          { id: 'categories', label: 'Category Revenue & ROLLUP', tag: 'View 3' },
          { id: 'customers', label: 'Customer Lifetime Spending', tag: 'View 4' },
          { id: 'ledger', label: 'Payment ACID Ledger', tag: 'Transactions' },
          { id: 'dcl', label: 'DCL Security & Roles Matrix', tag: 'Lecture 8' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAdminTab(tab.id)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              fontWeight: adminTab === tab.id ? 700 : 500,
              color: adminTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: adminTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: adminTab === tab.id ? 'var(--primary-light)' : 'var(--bg-subtle)', color: adminTab === tab.id ? 'var(--primary)' : 'var(--text-dim)', fontWeight: 600 }}>
              {tab.tag}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Quarterly Sales Report (Lecture Note 9 Windowing) */}
      {adminTab === 'quarterly' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Quarterly Sales &amp; Moving Average Performance
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                View: <code>v_quarterly_sales_report</code> • Window Function: <code>AVG(...) OVER (ORDER BY sales_year, sales_quarter ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)</code>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filter Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '0.8rem' }}
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>

              <button
                type="button"
                onClick={() => exportToCSV(quarterlyData, 'quarterly_sales_analytics')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Period</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Orders</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Units Sold</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross Revenue</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Collected</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Moving Avg Revenue</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyData.map((q, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {q.sales_year} Q{q.sales_quarter}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{q.total_orders}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{q.total_units_sold}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                      ${Number(q.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--success)' }}>
                      ${Number(q.net_collected_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      ${Number(q.moving_avg_quarterly_revenue || q.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Top Selling Products (Lecture Note 9 DENSE_RANK) */}
      {adminTab === 'top-selling' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Top 10 Selling Products Leaderboard
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              View: <code>v_top_selling_products</code> • Ranking: <code>DENSE_RANK() OVER (ORDER BY total_revenue DESC)</code>
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Rank</th>
                  <th style={{ padding: '10px 8px' }}>Product Name</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Units Sold</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellingData.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: p.revenue_rank === 1 ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                        color: p.revenue_rank === 1 ? 'var(--warning-text)' : 'var(--text-secondary)'
                      }}>
                        #{p.revenue_rank}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-main)' }}>{p.product_name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{p.category_name}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{p.total_units_sold}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      ${Number(p.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Category Revenue & ROLLUP (Lecture Note 9 WITH ROLLUP) */}
      {adminTab === 'categories' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Category Order Totals &amp; Grand Summary
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              View: <code>v_category_order_totals</code> • Extended Aggregation: <code>GROUP BY c.name WITH ROLLUP</code>
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Category Name</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Orders</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Units Sold</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Category Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((c, idx) => {
                  const isGrand = c.category_name?.includes('GRAND TOTAL');
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: isGrand ? 'var(--bg-subtle)' : 'transparent',
                        fontWeight: isGrand ? 800 : 400
                      }}
                    >
                      <td style={{ padding: '12px 8px', color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                        {c.category_name}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{c.total_orders || 0}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>{c.total_units_sold || 0}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                        ${Number(c.total_category_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Customer Spending (Lecture Notes 3 & 4) */}
      {adminTab === 'customers' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Customer Lifetime Spending &amp; Settlement Leaderboard
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                View: <code>v_customer_order_summary</code> • Multi-Table Outer Joins with orders, shipments, and Texas hubs
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by customer or hub..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ padding: '6px 12px 6px 30px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', width: '220px' }}
              />
              <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted" />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Customer</th>
                  <th style={{ padding: '10px 8px' }}>Texas Hub</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Orders</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Paid Orders</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Lifetime Spending</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{c.primary_city}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{c.total_orders}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{c.paid_orders}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      ${Number(c.lifetime_spending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Payment ACID Ledger (Lecture Notes 1, 2, 7) */}
      {adminTab === 'ledger' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Payment Transaction ACID Settlement Ledger
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Table: <code>PAYMENT_TRANSACTION</code> • Prepared Statements &amp; Pessimistic Row Locking (FOR UPDATE)
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Payment ID</th>
                  <th style={{ padding: '10px 8px' }}>Transaction Reference</th>
                  <th style={{ padding: '10px 8px' }}>Customer</th>
                  <th style={{ padding: '10px 8px' }}>Order #</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 8px' }}>Processed Date</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No payment settlements executed yet. Run a settlement at <Link to="/payment" style={{ color: 'var(--primary)' }}>Payment Page</Link>.
                    </td>
                  </tr>
                ) : (
                  transactionsData.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>#{t.payment_id}</td>
                      <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--primary)' }}>{t.transaction_reference}</td>
                      <td style={{ padding: '12px 8px' }}>{t.customer_name || 'Customer'}</td>
                      <td style={{ padding: '12px 8px' }}>#{t.order_id}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${Number(t.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {t.processed_at ? String(t.processed_at).replace('T', ' ').split('.')[0] : ''}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                          {t.payment_status || 'Paid'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: DCL Security & Roles Matrix (Lecture Note 8) */}
      {adminTab === 'dcl' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Data Control Language (DCL) Role &amp; Grant Matrix
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Reference: Lecture Note 8 (<code>CREATE ROLE</code>, <code>GRANT</code>, <code>REVOKE</code>) and Lecture Note 5 (Database Triggers)
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Role Name</th>
                  <th style={{ padding: '10px 8px' }}>Target Database Objects</th>
                  <th style={{ padding: '10px 8px' }}>Granted Privileges (DCL)</th>
                  <th style={{ padding: '10px 8px' }}>Lecture Reference</th>
                </tr>
              </thead>
              <tbody>
                {(dclData.grants || [
                  { role: "Customer (Role 1)", target_objects: "orders, cart_items, PAYMENT_TRANSACTION", privileges: "SELECT (own), INSERT (payments, orders)", lecture_reference: "Lecture Note 2 & 8" },
                  { role: "Store Manager (Role 2)", target_objects: "v_top_selling_products, v_category_order_totals", privileges: "SELECT (analytics views), UPDATE (inventory)", lecture_reference: "Lecture Note 4 & 8" },
                  { role: "System Administrator (Role 3)", target_objects: "ALL VIEWS, audit_logs, users, roles", privileges: "ALL PRIVILEGES, GRANT OPTION, REVOKE", lecture_reference: "Lecture Note 5 & 8" },
                  { role: "analytics_viewer (DB Role)", target_objects: "4 Virtual Views (05_analytics.sql)", privileges: "GRANT SELECT ON VIEWS", lecture_reference: "Lecture Note 8" },
                ]).map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-main)' }}>{g.role}</td>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)' }}>{g.target_objects}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}><code>{g.privileges}</code></td>
                    <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.lecture_reference}</td>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.customer_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{cust.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cust.email}</div>
                      </td>
                      <td>
                        <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#475569' }}>
                          {cust.primary_city}
                        </span>
                      </td>
                      <td>{cust.total_orders} orders</td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>
                        ${cust.lifetime_spending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="st-chip-paid">
                            {cust.paid_orders} Paid
                          </span>
                          <span className="st-chip-pending">
                            {cust.pending_orders} Pending
                          </span>
                        </div>
                      </td>
                      <td>
                        {cust.pending_order_value > 0 ? (
                          <span style={{ fontWeight: 600, color: '#d97706' }}>
                            ${cust.pending_order_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="st-chip-paid">
                            All Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {dclData.recent_audit_logs?.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Recent Security &amp; Payment Audit Trail (Lecture Note 5 Triggers):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dclData.recent_audit_logs.slice(0, 4).map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '8px' }}>[{log.event_action}]</span>
                      <span style={{ color: 'var(--text-main)' }}>{log.event_details}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {log.created_at ? String(log.created_at).replace('T', ' ').split('.')[0] : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
