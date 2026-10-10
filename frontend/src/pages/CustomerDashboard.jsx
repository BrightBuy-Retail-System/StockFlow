import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
  ShoppingBagIcon,
  OrdersIcon,
  TruckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserIcon,
  BoxIcon,
  StarIcon,
  CreditCardIcon,
  RefreshCwIcon,
  SearchIcon,
  EyeIcon,
  XIcon,
  ZapIcon,
  DatabaseIcon,
} from '../components/Icons';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Core Data States
  const [orders, setOrders] = useState([]);
  const [cartData, setCartData] = useState({ items: [], item_count: 0, subtotal: 0 });
  const [shippingHubs, setShippingHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'cart' | 'shipping' | 'profile'
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED'

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  // Fetch Dashboard Data
  const fetchCustomerData = async () => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    const parsedUser = JSON.parse(savedUser);
    const userId = parsedUser.id || parsedUser.user_id;

    try {
      setRefreshing(true);
      const requests = [
        api.get('/auth_cart/cart').catch(() => ({ data: { items: [], item_count: 0, subtotal: 0 } })),
        api.get('/orders/shipping-cities').catch(() => ({ data: { data: [] } })),
      ];

      if (userId) {
        requests.push(api.get(`/orders/user/${userId}`).catch(() => ({ data: { data: [] } })));
      }

      const results = await Promise.all(requests);
      const cartRes = results[0];
      const hubsRes = results[1];
      const ordersRes = results[2];

      setCartData(cartRes.data || { items: [], item_count: 0, subtotal: 0 });
      setShippingHubs(hubsRes.data?.data || []);
      setOrders(ordersRes?.data?.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  // Toast feedback
  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // KPI Calculations
  const totalOrdersCount = orders.length;
  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const activeShipmentsCount = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'SHIPPED' || o.status === 'CONFIRMED' || o.status === 'PENDING'
    ).length;
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'ALL' && o.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase();
        const matchesId = String(o.order_id).includes(query);
        const matchesTracking = (o.tracking_number || '').toLowerCase().includes(query);
        const matchesItems = (o.items || []).some(
          (item) =>
            (item.product_title || '').toLowerCase().includes(query) ||
            (item.sku || '').toLowerCase().includes(query)
        );
        return matchesId || matchesTracking || matchesItems;
      }
      return true;
    });
  }, [orders, statusFilter, orderSearch]);

  if (!user) return null;

  const initials = (user.username || user.full_name || 'C')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 64px' }}>
      {/* ==========================================================================
          1. Customer Executive Header Banner
          ========================================================================== */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Left: Avatar & Customer Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.25)',
                    border: '1px solid rgba(147, 197, 253, 0.4)',
                    color: '#93c5fd',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Customer Account • Role ID: {user.role_id || 1}
                </span>

                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(253, 230, 138, 0.3)',
                    color: '#fcd34d',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  ✨ BrightBuy VIP Club Member
                </span>

                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  ID #{user.id || user.user_id || 'CUST-01'}
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '2rem',
                  fontWeight: 800,
                  margin: '0 0 4px',
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome back, {user.username || user.full_name}!
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                Manage your tech orders, track shipments from Texas logistics hubs, and review your cart.
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchCustomerData}
              disabled={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            >
              <RefreshCwIcon className={`w-4 h-4 ${refreshing ? 'spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <Link
              to="/catalog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                padding: '10px 22px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <ShoppingBagIcon className="w-4 h-4" />
              <span>Shop Tech Drops</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '10px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#f87171';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          2. Customer Key Performance Metric Cards (4 Cards)
          ========================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '36px',
        }}
      >
        {/* Card 1: Total Orders */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lifetime Orders
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <OrdersIcon className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {totalOrdersCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>Active records on TiDB Cloud</span>
          </div>
        </div>

        {/* Card 2: Total Spent */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Purchases
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCardIcon className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            ${totalSpent.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            ≈ Rs. {Math.round(totalSpent * 315).toLocaleString()} LKR
          </div>
        </div>

        {/* Card 3: Active Shipments */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In-Transit / Active
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TruckIcon className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {activeShipmentsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: activeShipmentsCount > 0 ? '#2563eb' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeShipmentsCount > 0 && <span className="pulse-dot dot-online" />}
            <span>{activeShipmentsCount > 0 ? 'Fulfillment in progress' : 'All packages delivered'}</span>
          </div>
        </div>

        {/* Card 4: Active Cart */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Shopping Cart
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#f5f3ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBagIcon className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {cartData.item_count || 0} Items
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Subtotal: ${Number(cartData.subtotal || 0).toFixed(2)}</span>
            <Link to="/auth-cart" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
              View Cart &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          3. Multi-Tab Navigation Toolbar
          ========================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '28px',
          paddingBottom: '4px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 My Orders &amp; Tracking ({orders.length})
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
          >
            🛒 Active Cart ({cartData.item_count || 0})
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            🚚 Texas Delivery Hubs ({shippingHubs.length})
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile &amp; Security
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Last Synced: {lastRefreshed.toLocaleTimeString()}
        </div>
      </div>

      {/* ==========================================================================
          4. TAB 1: Order History & Real-Time Tracking
          ========================================================================== */}
      {activeTab === 'orders' && (
        <div>
          {/* Order Search & Status Filter Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px', maxWidth: '420px' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search by Order ID, Product, or Tracking #..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 16px 9px 40px',
                  borderRadius: '9999px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
              {orderSearch && (
                <button
                  type="button"
                  onClick={() => setOrderSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    border: statusFilter === st ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    background: statusFilter === st ? '#eff6ff' : '#ffffff',
                    color: statusFilter === st ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List / Empty State */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RefreshCwIcon className="w-8 h-8 spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
              <p>Loading your order history...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '24px',
                padding: '64px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <OrdersIcon className="w-8 h-8" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                {orders.length === 0 ? 'No Orders Placed Yet' : 'No Orders Match Your Filter'}
              </h3>
              <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
                {orders.length === 0
                  ? 'Your order archive is currently empty. Browse our catalog to experience 100% genuine tech imports with islandwide delivery!'
                  : 'Try adjusting your search query or status filter to locate your desired purchase.'}
              </p>
              <Link
                to="/catalog"
                className="st-btn-pill-primary"
                style={{ display: 'inline-flex', padding: '12px 28px' }}
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span>Explore Catalog &amp; Shop Now</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredOrders.map((order) => {
                const isShipped = order.status === 'SHIPPED';
                const isConfirmed = order.status === 'CONFIRMED';
                const isCancelled = order.status === 'CANCELLED';

                const statusColor = isShipped
                  ? '#2563eb'
                  : isConfirmed
                    ? '#10b981'
                    : isCancelled
                      ? '#ef4444'
                      : '#f59e0b';

                const statusBg = isShipped
                  ? '#eff6ff'
                  : isConfirmed
                    ? '#ecfdf5'
                    : isCancelled
                      ? '#fef2f2'
                      : '#fffbeb';

                return (
                  <div
                    key={order.order_id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      border: '1.5px solid #e2e8f0',
                      padding: '24px',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {/* Top Row: Order Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontFamily: 'Outfit, sans-serif',
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: '#0f172a',
                            }}
                          >
                            Order #{order.order_id}
                          </span>
                          <span
                            style={{
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusColor}40`,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            ● {order.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '3px' }}>
                          Placed on: {order.placed_at ? new Date(order.placed_at).toLocaleString() : 'Recent'}
                        </div>
                      </div>

                      {/* Texas Logistics Tracking Info */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Texas Hub Tracking:{' '}
                          <strong style={{ color: '#2563eb', fontFamily: 'JetBrains Mono, monospace' }}>
                            {order.tracking_number || 'TX-DISPATCH-PENDING'}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                          Status: {order.shipping_status || 'Texas Hub Processing'}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Itemized Line Items */}
                    <div style={{ marginBottom: '18px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Purchased Items:
                      </div>

                      {order.items && order.items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {order.items.map((item, iIdx) => (
                            <div
                              key={iIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BoxIcon className="w-4 h-4" style={{ color: '#64748b' }} />
                                <div>
                                  <strong style={{ color: '#0f172a' }}>{item.product_title}</strong>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>
                                    (SKU: {item.sku || 'N/A'}{item.attribute_value ? ` • ${item.attribute_value}` : ''})
                                  </span>
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {item.quantity}x @ ${Number(item.unit_price).toFixed(2)} ={' '}
                                <span style={{ color: '#2563eb' }}>${Number(item.line_total || item.quantity * item.unit_price).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                          Order confirmed with verified inventory reservation.
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Total & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '16px',
                        borderTop: '1px solid #f1f5f9',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Paid:</span>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                          ${Number(order.total_amount).toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          (Rs. {Math.round(Number(order.total_amount) * 315).toLocaleString()})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>View Full Receipt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate('/catalog')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #e2e8f0',
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <span>Reorder Tech</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          5. TAB 2: Active Shopping Cart
          ========================================================================== */}
      {activeTab === 'cart' && (
        <div>
          {cartData.items && cartData.items.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Cart Items List */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Active Cart Items ({cartData.item_count})
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Cart ID: #{cartData.cart_id}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {cartData.items.map((item) => (
                    <div
                      key={item.cart_item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '10px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ShoppingBagIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                            SKU: {item.sku || 'N/A'}{item.attribute_value ? ` • ${item.attribute_name}: ${item.attribute_value}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2563eb', fontFamily: 'Outfit, sans-serif' }}>
                          ${Number(item.total_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {item.quantity}x @ ${Number(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Checkout Summary Box */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                  position: 'sticky',
                  top: '90px',
                }}
              >
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px' }}>
                  Order Summary
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items Subtotal:</span>
                    <strong style={{ color: '#0f172a' }}>${Number(cartData.subtotal).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estimated Shipping:</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>FREE (Over Rs. 15,000)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Local Tax / Duties:</span>
                    <span>Included</span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Total Due:</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>
                      ${Number(cartData.subtotal).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/auth-cart')}
                    className="st-btn-pill-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>Proceed to Full Checkout</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="st-btn-pill-secondary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>Add More Gadgets</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '24px',
                padding: '64px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#f5f3ff',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <ShoppingBagIcon className="w-8 h-8" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                Your Cart is Empty
              </h3>
              <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
                Explore Apple MacBooks, Sony ANC headphones, Samsung smartwatches, and fast chargers on BrightBuy.
              </p>
              <Link to="/catalog" className="st-btn-pill-primary" style={{ display: 'inline-flex' }}>
                <ShoppingBagIcon className="w-4 h-4" />
                <span>Shop Tech Deals</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          6. TAB 3: Texas Shipping Hubs & Logistics Estimator
          ========================================================================== */}
      {activeTab === 'shipping' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Texas Logistics Delivery Hubs
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              All BrightBuy inventory routes through high-throughput fulfillment centers in Texas for express international and islandwide delivery.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            {shippingHubs.map((city) => (
              <div
                key={city.city_id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hub ID #{city.city_id}
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      ● Active
                    </span>
                  </div>

                  <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    {city.city_name}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>
                    Fulfillment Facility: <strong>{city.hub_name}</strong>
                  </p>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lead Time:</span>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                      {city.base_lead_time_days} Business Days
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Transit Fee:</span>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2563eb', fontFamily: 'Outfit, sans-serif' }}>
                      ${Number(city.shipping_fee || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Express Guarantee Callout */}
          <div
            style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '20px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a', marginBottom: '2px' }}>
                Islandwide Doorstep Delivery Guarantee
              </div>
              <div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>
                Every consignment is fully insured during transit with tamper-evident serial seals and SMS dispatch notifications.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          7. TAB 4: Profile & Security Overview
          ========================================================================== */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* User Profile Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              padding: '28px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 18px', color: '#0f172a' }}>
              Account Identity
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Full Customer Name
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {user.username || user.full_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Registered Email
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {user.email || 'customer@brightbuy.lk'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Account Level / Role
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>
                  Verified Consumer (Role ID: {user.role_id || 1})
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  VIP Voucher Code
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '4px',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    width: 'fit-content',
                  }}
                >
                  <code style={{ fontWeight: 800, color: '#d97706', fontSize: '0.9rem' }}>BRIGHT10</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('BRIGHT10');
                      showToast('Copied Voucher! 🎉', 'Code BRIGHT10 copied to clipboard for 10% off.');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Stack Credentials */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              padding: '28px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
            }}
          >
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 18px', color: '#0f172a' }}>
              Security &amp; Data Isolation
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>JWT Bearer 256-Bit Cryptography</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Stateless authenticated API sessions verified on every order mutation.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DatabaseIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>MySQL InnoDB ACID Compliance</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Row-level locking guarantees stock reservation consistency without overselling.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ZapIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Zero Data Leakage</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Strict role-based tenant filters prevent unauthorized order visibility.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          8. Detailed Order Inspection Modal
          ========================================================================== */}
      {selectedOrder && (
        <div className="st-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="st-modal-dialog"
            style={{ maxWidth: '640px', gridTemplateColumns: '1fr', padding: '32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="st-modal-close"
              onClick={() => setSelectedOrder(null)}
              aria-label="Close dialog"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Official Order Receipt
                </span>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                  }}
                >
                  Order #{selectedOrder.order_id}
                </span>
              </div>

              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                Receipt &amp; Tracking Details
              </h2>

              {/* Status Bar */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Texas Tracking ID</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedOrder.tracking_number || 'TX-DISPATCH-9824'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Fulfillment State</div>
                  <div style={{ fontWeight: 800, color: '#10b981' }}>
                    {selectedOrder.status}
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Itemized Manifest:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <strong>{item.product_title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          SKU: {item.sku || 'N/A'} • Qty: {item.quantity}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        ${Number(item.line_total || item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '16px',
                  borderTop: '2px dashed #e2e8f0',
                  marginBottom: '20px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Final Paid Amount:</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>
                  ${Number(selectedOrder.total_amount).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                className="st-btn-pill-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setSelectedOrder(null)}
              >
                Close Receipt View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          9. Toast Notification System
          ========================================================================== */}
      {toast && (
        <div className="st-toast-container">
          <div className="st-toast">
            <div className="st-toast-icon">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div className="st-toast-content">
              <div className="st-toast-title">{toast.title}</div>
              <div className="st-toast-msg">{toast.message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
