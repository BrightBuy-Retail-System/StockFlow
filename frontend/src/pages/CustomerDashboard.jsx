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

  // Profile Edit State (Telephone and Warehouse without OTP)
  const [editPhone, setEditPhone] = useState('');
  const [editCityId, setEditCityId] = useState(1);
  const [savingProfile, setSavingProfile] = useState(false);

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const u = JSON.parse(savedUser);
      setUser(u);
      if (u.phone) setEditPhone(u.phone);
      if (u.assigned_city_id) setEditCityId(u.assigned_city_id);
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
        api.get('/auth_cart/me').catch(() => ({ data: { user: null } })),
      ];

      if (userId) {
        requests.push(api.get(`/orders/user/${userId}`).catch(() => ({ data: { data: [] } })));
      }

      const results = await Promise.all(requests);
      const cartRes = results[0];
      const hubsRes = results[1];
      const meRes = results[2];
      const ordersRes = results[3];

      setCartData(cartRes.data || { items: [], item_count: 0, subtotal: 0 });
      setShippingHubs(hubsRes.data?.data || []);
      if (meRes.data?.user) {
        const freshUser = meRes.data.user;
        setUser((prev) => ({ ...prev, ...freshUser }));
        setEditPhone((prev) => (freshUser.phone !== undefined && freshUser.phone !== null ? freshUser.phone : prev));
        setEditCityId((prev) => (freshUser.assigned_city_id || prev || 1));
        localStorage.setItem('user', JSON.stringify({ ...parsedUser, ...freshUser }));
      }
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
    fetchCustomerData();
  }, []);

  // Save updated phone & warehouse directly without OTP
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth_cart/profile', {
        phone: editPhone.trim(),
        assigned_city_id: Number(editCityId) || 1,
      });

      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }
      showToast('Profile Updated! 🎉', 'Telephone number and assigned warehouse hub updated successfully without needing OTP.');
    } catch (err) {
      showToast('Update Failed ⚠️', err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

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

  const statusCounts = useMemo(() => {
    return {
      ALL: orders.length,
      PENDING: orders.filter((o) => o.status === 'PENDING').length,
      CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
      SHIPPED: orders.filter((o) => o.status === 'SHIPPED').length,
      CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
    };
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

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 64px' }}>
      {/* ==========================================================================
          1. Customer Executive Header Banner
          ========================================================================== */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '2px',
          padding: '32px 36px',
          color: '#3b2f2f',
          marginBottom: '32px',
          border: '1.5px solid #e7d7c1',
          boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
          position: 'relative',
        }}
      >
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
                width: '64px',
                height: '64px',
                borderRadius: '2px',
                background: '#faf7f2',
                color: '#2a9d8f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e7d7c1',
                boxShadow: '0 2px 6px rgba(59, 47, 47, 0.04)',
                flexShrink: 0,
              }}
            >
              <UserIcon width={42} height={42} style={{ width: '42px', height: '42px', color: '#2a9d8f' }} strokeWidth="2.2" />
            </div>

            <div>
              <h1
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '2rem',
                  fontWeight: 800,
                  margin: '0 0 4px',
                  letterSpacing: '-0.02em',
                  color: '#3b2f2f',
                }}
              >
                Welcome back, {user.username || user.full_name}!
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#5c4b4b' }}>
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
                background: '#ffffff',
                border: '1.5px solid #e7d7c1',
                color: '#3b2f2f',
                padding: '10px 18px',
                borderRadius: '2px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(59, 47, 47, 0.04)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#faf7f2';
                e.currentTarget.style.borderColor = '#2a9d8f';
                e.currentTarget.style.color = '#2a9d8f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e7d7c1';
                e.currentTarget.style.color = '#3b2f2f';
              }}
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
                background: '#2a9d8f',
                border: '1.5px solid #2a9d8f',
                color: '#ffffff',
                padding: '10px 22px',
                borderRadius: '2px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(42, 157, 143, 0.22)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#22867a';
                e.currentTarget.style.borderColor = '#22867a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a9d8f';
                e.currentTarget.style.borderColor = '#2a9d8f';
              }}
            >
              <ShoppingBagIcon className="w-4 h-4" />
              <span>Shop Tech Drops</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: '#ffffff',
                border: '1.5px solid #fecaca',
                color: '#ef4444',
                padding: '10px 18px',
                borderRadius: '2px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
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
            borderRadius: '2px',
            border: '1.5px solid #e7d7c1',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(59, 47, 47, 0.04)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#5c4b4b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lifetime Orders
            </span>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#3b2f2f', marginBottom: '4px' }}>
            {totalOrdersCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2a9d8f', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircleIcon className="w-3.5 h-3.5" style={{ color: '#2a9d8f' }} />
            <span>Active records on TiDB Cloud</span>
          </div>
        </div>

        {/* Card 2: Total Spent */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '2px',
            border: '1.5px solid #e7d7c1',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(59, 47, 47, 0.04)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#5c4b4b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Purchases
            </span>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#3b2f2f', marginBottom: '4px' }}>
            ${totalSpent.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#5c4b4b', fontWeight: 600 }}>
            ≈ Rs. {Math.round(totalSpent * 315).toLocaleString()} LKR
          </div>
        </div>

        {/* Card 3: Active Shipments */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '2px',
            border: '1.5px solid #e7d7c1',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(59, 47, 47, 0.04)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#5c4b4b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In-Transit / Active
            </span>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#3b2f2f', marginBottom: '4px' }}>
            {activeShipmentsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: activeShipmentsCount > 0 ? '#2a9d8f' : '#826e6e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeShipmentsCount > 0 && <span className="pulse-dot dot-online" style={{ background: '#2a9d8f' }} />}
            <span>{activeShipmentsCount > 0 ? 'Fulfillment in progress' : 'All packages delivered'}</span>
          </div>
        </div>

        {/* Card 4: Active Cart */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '2px',
            border: '1.5px solid #e7d7c1',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(59, 47, 47, 0.04)',
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#5c4b4b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Shopping Cart
            </span>
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.1rem', fontWeight: 800, color: '#3b2f2f', marginBottom: '4px' }}>
            {cartData.item_count || 0} Items
          </div>
          <div style={{ fontSize: '0.8rem', color: '#5c4b4b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Subtotal: ${Number(cartData.subtotal || 0).toFixed(2)}</span>
            <Link to="/auth-cart" style={{ color: '#2a9d8f', fontWeight: 700, textDecoration: 'none' }}>
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
          borderBottom: '1px solid #e7d7c1',
          marginBottom: '28px',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>📦 My Orders &amp; Tracking</span>
            <span className="st-tab-badge">{orders.length}</span>
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
          >
            <span>🛒 Active Cart</span>
            <span className="st-tab-badge">{cartData.item_count || 0}</span>
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            <span>🚚 Texas Delivery Hubs</span>
            <span className="st-tab-badge">{shippingHubs.length}</span>
          </button>
          <button
            type="button"
            className={`st-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>👤 Profile &amp; Security</span>
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#826e6e' }}>
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
              borderRadius: '2px',
              border: '1px solid #e7d7c1',
              boxShadow: '0 1px 4px rgba(59, 47, 47, 0.03)',
            }}
          >
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px', maxWidth: '420px' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#826e6e' }}>
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
                  borderRadius: '2px',
                  border: '1.5px solid #e7d7c1',
                  color: '#3b2f2f',
                  background: '#ffffff',
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
                    background: '#ede6dc',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#5c4b4b',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED'].map((st) => {
                const isSelected = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`st-order-filter-btn ${isSelected ? 'active' : ''}`}
                    title={`Filter by ${st}`}
                  >
                    <span>{st}</span>
                    <span className="st-filter-badge">{statusCounts[st] || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders List / Empty State */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5c4b4b' }}>
              <RefreshCwIcon className="w-8 h-8 spin" style={{ margin: '0 auto 12px', color: '#2a9d8f' }} />
              <p>Loading your order history...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px dashed #e7d7c1',
                borderRadius: '2px',
                padding: '64px 32px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(59, 47, 47, 0.03)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '2px',
                  background: '#e6f6f4',
                  color: '#2a9d8f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <OrdersIcon className="w-8 h-8" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b2f2f', margin: '0 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                {orders.length === 0 ? 'No Orders Placed Yet' : 'No Orders Match Your Filter'}
              </h3>
              <p style={{ color: '#5c4b4b', maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
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
                  ? '#2a9d8f'
                  : isConfirmed
                    ? '#2a9d8f'
                    : isCancelled
                      ? '#d94a38'
                      : '#c08457';

                const statusBg = isShipped
                  ? '#e6f6f4'
                  : isConfirmed
                    ? '#e6f6f4'
                    : isCancelled
                      ? '#fdf2f0'
                      : '#f7eee6';

                // Stepper stages
                const steps = [
                  { label: 'Order Placed', sub: 'Verified' },
                  { label: 'Stock Reserved', sub: 'TiDB Cloud Lock' },
                  { label: 'Texas Hub Dispatch', sub: 'In Transit' },
                  { label: 'Delivered', sub: 'Completed' },
                ];

                let currentStepIdx = 1;
                if (order.status === 'PENDING') currentStepIdx = 0;
                else if (order.status === 'CONFIRMED') currentStepIdx = 1;
                else if (order.status === 'SHIPPED') currentStepIdx = 2;
                else if (order.status === 'DELIVERED') currentStepIdx = 3;

                return (
                  <div
                    key={order.order_id}
                    className="st-order-card"
                  >
                    {/* 1. Top Ribbon Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        background: '#faf7f2',
                        borderBottom: '1px solid #e7d7c1',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#3b2f2f',
                          }}
                        >
                          Order #{order.order_id}
                        </span>
                        <span
                          style={{
                            background: statusBg,
                            color: statusColor,
                            border: `1.5px solid ${statusColor}45`,
                            padding: '3px 10px',
                            borderRadius: '2px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            boxShadow: '0 1px 3px rgba(59, 47, 47, 0.03)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isShipped ? (
                            <span className="pulse-dot dot-online" style={{ background: '#2a9d8f', width: 7, height: 7 }} />
                          ) : (
                            <span>●</span>
                          )}
                          <span>{order.status}</span>
                        </span>
                        <div style={{ fontSize: '0.8rem', color: '#826e6e' }}>
                          Placed on: {order.placed_at ? new Date(order.placed_at).toLocaleString() : 'Recent'}
                        </div>
                      </div>

                      {/* Texas Logistics Tracking Info */}
                      <div
                        onClick={() => {
                          const code = order.tracking_number || `TX-HUB-EXP-${order.order_id}`;
                          navigator.clipboard?.writeText(code);
                          showToast('Tracking Copied', `Copied ${code} to clipboard.`);
                        }}
                        title="Click to copy tracking number"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#ffffff',
                          border: '1px solid #e7d7c1',
                          padding: '6px 14px',
                          borderRadius: '2px',
                          boxShadow: '0 1px 3px rgba(59, 47, 47, 0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2a9d8f';
                          e.currentTarget.style.background = '#faf7f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e7d7c1';
                          e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        <TruckIcon className="w-4 h-4" style={{ color: '#2a9d8f' }} />
                        <span style={{ fontSize: '0.78rem', color: '#5c4b4b', fontWeight: 600 }}>Texas Hub:</span>
                        <strong
                          style={{
                            color: '#2a9d8f',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.82rem',
                          }}
                        >
                          {order.tracking_number || `TX-HUB-EXP-${order.order_id}`}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#826e6e', marginLeft: '2px' }}>📋</span>
                      </div>
                    </div>

                    {/* 2. Visual Stepper Tracker */}
                    {isCancelled ? (
                      <div
                        style={{
                          background: '#fdf2f0',
                          borderBottom: '1px solid #fecaca',
                          padding: '14px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.84rem',
                          color: '#d94a38',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>✕</span>
                        <span>Order cancelled. Reserved inventory was automatically released back to TiDB stock cluster.</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '18px 24px 20px',
                          background: '#faf7f2',
                          borderBottom: '1px solid #ede6dc',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            position: 'relative',
                            gap: '16px',
                          }}
                        >
                          {steps.map((st, idx) => {
                            const isDone = idx < currentStepIdx;
                            const isCurrent = idx === currentStepIdx;
                            return (
                              <div key={st.label} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <div
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '2px',
                                      background: isDone ? '#2a9d8f' : isCurrent ? '#ffffff' : '#ffffff',
                                      border: isDone
                                        ? '1.5px solid #2a9d8f'
                                        : isCurrent
                                        ? '2px solid #2a9d8f'
                                        : '1.5px solid #e7d7c1',
                                      color: isDone ? '#ffffff' : isCurrent ? '#2a9d8f' : '#826e6e',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      boxShadow: isCurrent ? '0 0 0 3px rgba(42, 157, 143, 0.22)' : 'none',
                                      flexShrink: 0,
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    {isDone ? '✓' : idx + 1}
                                  </div>
                                  <div
                                    style={{
                                      height: '2px',
                                      flexGrow: 1,
                                      background: isDone ? '#2a9d8f' : '#e7d7c1',
                                      opacity: idx === steps.length - 1 ? 0 : 1,
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.81rem',
                                    fontWeight: isCurrent ? 800 : isDone ? 700 : 600,
                                    color: isCurrent ? '#2a9d8f' : isDone ? '#3b2f2f' : '#826e6e',
                                  }}
                                >
                                  {st.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.72rem',
                                    color: isCurrent ? '#2a9d8f' : '#826e6e',
                                    fontWeight: isCurrent ? 600 : 400,
                                  }}
                                >
                                  {st.sub}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* 3. Middle: Itemized Manifest */}
                    <div style={{ padding: '20px 24px' }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: '#5c4b4b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Purchased Hardware Manifest ({order.items?.length || 0} items)</span>
                        <span style={{ fontSize: '0.74rem', color: '#826e6e', textTransform: 'none', fontWeight: 500 }}>
                          Verified Authentic Tech Import
                        </span>
                      </div>

                      {order.items && order.items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {order.items.map((item, iIdx) => (
                            <div
                              key={iIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#faf7f2',
                                border: '1px solid #e7d7c1',
                                padding: '12px 18px',
                                borderRadius: '2px',
                                gap: '16px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                                <div
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '2px',
                                    background: '#e6f6f4',
                                    border: '1px solid #a4dbd4',
                                    color: '#2a9d8f',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <BoxIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#3b2f2f', fontSize: '0.92rem', marginBottom: '3px' }}>
                                    {item.product_title}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        padding: '1px 6px',
                                        background: '#f7eee6',
                                        color: '#c08457',
                                        border: '1px solid #e7d7c1',
                                        borderRadius: '2px',
                                        fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace',
                                      }}
                                    >
                                      SKU: {item.sku || 'N/A'}
                                    </span>
                                    {item.attribute_value && (
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          padding: '1px 6px',
                                          background: '#f6f3ee',
                                          color: '#5c4b4b',
                                          border: '1px solid #e7d7c1',
                                          borderRadius: '2px',
                                          fontWeight: 600,
                                        }}
                                      >
                                        {item.attribute_name || 'Variant'}: {item.attribute_value}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#826e6e' }}>
                                  {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                                </span>
                                <span style={{ fontWeight: 800, color: '#3b2f2f', fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif' }}>
                                  ${Number(item.line_total || item.quantity * item.unit_price).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#826e6e',
                            fontStyle: 'italic',
                            padding: '14px',
                            background: '#faf7f2',
                            border: '1px solid #e7d7c1',
                            borderRadius: '2px',
                          }}
                        >
                          Order confirmed with verified inventory reservation.
                        </div>
                      )}
                    </div>

                    {/* 4. Bottom Row: Total Settled & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        background: '#ffffff',
                        borderTop: '1px solid #ede6dc',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                            Total Settled
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.45rem', fontWeight: 800, color: '#3b2f2f' }}>
                              ${Number(order.total_amount).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#826e6e' }}>
                              (≈ Rs. {Math.round(Number(order.total_amount) * 315).toLocaleString()} LKR)
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '2px',
                            background: '#e6f6f4',
                            border: '1px solid #a4dbd4',
                            color: '#2a9d8f',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          <ShieldCheckIcon className="w-3.5 h-3.5" />
                          <span>Stock Guaranteed</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            color: '#3b2f2f',
                            border: '1px solid #e7d7c1',
                            padding: '9px 18px',
                            borderRadius: '2px',
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(59, 47, 47, 0.04)',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#faf7f2';
                            e.currentTarget.style.borderColor = '#2a9d8f';
                            e.currentTarget.style.color = '#2a9d8f';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e7d7c1';
                            e.currentTarget.style.color = '#3b2f2f';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <EyeIcon className="w-3.5 h-3.5" style={{ color: '#2a9d8f' }} />
                          <span>View Official Receipt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate('/catalog')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#2a9d8f',
                            color: '#ffffff',
                            border: '1.5px solid #2a9d8f',
                            padding: '9px 20px',
                            borderRadius: '2px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(42, 157, 143, 0.25)',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#22867a';
                            e.currentTarget.style.borderColor = '#22867a';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#2a9d8f';
                            e.currentTarget.style.borderColor = '#2a9d8f';
                            e.currentTarget.style.transform = 'none';
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
                  borderRadius: '2px',
                  border: '1.5px solid #e7d7c1',
                  padding: '24px',
                  boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#3b2f2f' }}>
                    Active Cart Items ({cartData.item_count})
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#826e6e' }}>Cart ID: #{cartData.cart_id}</span>
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
                        borderRadius: '2px',
                        background: '#f6f3ee',
                        border: '1px solid #e7d7c1',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '2px',
                            background: '#e6f6f4',
                            color: '#2a9d8f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ShoppingBagIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#3b2f2f' }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: '#826e6e' }}>
                            SKU: {item.sku || 'N/A'}{item.attribute_value ? ` • ${item.attribute_name}: ${item.attribute_value}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2a9d8f', fontFamily: 'Outfit, sans-serif' }}>
                          ${Number(item.total_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#826e6e' }}>
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
                  borderRadius: '2px',
                  border: '1.5px solid #e7d7c1',
                  padding: '24px',
                  boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
                  position: 'sticky',
                  top: '90px',
                }}
              >
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px', color: '#3b2f2f' }}>
                  Order Summary
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#5c4b4b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items Subtotal:</span>
                    <strong style={{ color: '#3b2f2f' }}>${Number(cartData.subtotal).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estimated Shipping:</span>
                    <span style={{ color: '#2a9d8f', fontWeight: 700 }}>FREE (Over Rs. 15,000)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Local Tax / Duties:</span>
                    <span>Included</span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #ede6dc', margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#3b2f2f' }}>Total Due:</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#2a9d8f' }}>
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
                border: '1.5px dashed #e7d7c1',
                borderRadius: '2px',
                padding: '64px 32px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(59, 47, 47, 0.03)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '2px',
                  background: '#e6f6f4',
                  color: '#2a9d8f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <ShoppingBagIcon className="w-8 h-8" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b2f2f', margin: '0 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                Your Cart is Empty
              </h3>
              <p style={{ color: '#5c4b4b', maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.9rem' }}>
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
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#3b2f2f', margin: '0 0 6px' }}>
              Texas Logistics Delivery Hubs
            </h3>
            <p style={{ color: '#5c4b4b', fontSize: '0.9rem', margin: 0 }}>
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
                  borderRadius: '2px',
                  border: '1.5px solid #e7d7c1',
                  padding: '24px',
                  boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c08457', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hub ID #{city.city_id}
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#e6f6f4', color: '#2a9d8f', padding: '2px 8px', borderRadius: '2px', fontWeight: 700 }}>
                      ● Active
                    </span>
                  </div>

                  <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: '#3b2f2f', margin: '0 0 4px' }}>
                    {city.city_name}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#5c4b4b', margin: '0 0 16px' }}>
                    Fulfillment Facility: <strong>{city.hub_name}</strong>
                  </p>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid #ede6dc', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#826e6e' }}>Lead Time:</span>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#3b2f2f' }}>
                      {city.base_lead_time_days} Business Days
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#826e6e' }}>Transit Fee:</span>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2a9d8f', fontFamily: 'Outfit, sans-serif' }}>
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
              background: 'linear-gradient(135deg, #f6f3ee 0%, #ede6dc 100%)',
              border: '1px solid #e7d7c1',
              borderRadius: '2px',
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
                borderRadius: '2px',
                background: '#2a9d8f',
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
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#3b2f2f', marginBottom: '2px' }}>
                Islandwide Doorstep Delivery Guarantee
              </div>
              <div style={{ fontSize: '0.85rem', color: '#5c4b4b' }}>
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
          {/* User Profile & Direct Settings Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '2px',
              border: '1.5px solid #e7d7c1',
              padding: '28px',
              boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#3b2f2f' }}>
                Account Identity &amp; Contact
              </h3>
              <span
                style={{
                  background: '#e6f6f4',
                  color: '#2a9d8f',
                  border: '1px solid #a4dbd4',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                }}
              >
                Instant Edit • No OTP Required
              </span>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700 }}>
                  Full Customer Name
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#3b2f2f', marginTop: '2px' }}>
                  {user.username || user.full_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700 }}>
                  Registered Email
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#3b2f2f', marginTop: '2px' }}>
                  {user.email || 'customer@brightbuy.lk'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  Telephone Number (Directly Editable) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#826e6e' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000 or +94 77 123 4567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '2px',
                      border: '1.5px solid #e7d7c1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#3b2f2f',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  Assigned Regional Warehouse / Delivery Hub *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#826e6e' }}>
                    <TruckIcon style={{ width: '16px', height: '16px' }} />
                  </span>
                  <select
                    value={editCityId}
                    onChange={(e) => setEditCityId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '2px',
                      border: '1.5px solid #e7d7c1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#3b2f2f',
                      background: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {shippingHubs.map((hub) => (
                      <option key={hub.city_id} value={hub.city_id}>
                        {hub.city_name} — {hub.hub_name || 'Regional Fulfillment Hub'}
                      </option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#826e6e', marginTop: '4px' }}>
                  All future retail orders will automatically be routed to this warehouse facility for confirmation and dispatch.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  background: '#2a9d8f',
                  border: 'none',
                  color: '#ffffff',
                  padding: '11px 22px',
                  borderRadius: '2px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(42, 157, 143, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {savingProfile ? (
                  <>
                    <RefreshCwIcon className="w-4 h-4 spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Changes (No OTP Needed)</span>
                )}
              </button>

              <div style={{ borderTop: '1px dashed #e7d7c1', paddingTop: '14px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#826e6e', textTransform: 'uppercase', fontWeight: 700 }}>
                  VIP Voucher Code
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '4px',
                    background: '#f6f3ee',
                    padding: '8px 12px',
                    borderRadius: '2px',
                    border: '1px solid #e7d7c1',
                    width: 'fit-content',
                  }}
                >
                  <code style={{ fontWeight: 800, color: '#c08457', fontSize: '0.9rem' }}>BRIGHT10</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('BRIGHT10');
                      showToast('Copied Voucher! 🎉', 'Code BRIGHT10 copied to clipboard for 10% off.');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2a9d8f',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Security & Stack Credentials */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '2px',
              border: '1.5px solid #e7d7c1',
              padding: '28px',
              boxShadow: '0 2px 10px rgba(59, 47, 47, 0.04)',
            }}
          >
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 18px', color: '#3b2f2f' }}>
              Security &amp; Data Isolation
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: '#e6f6f4', color: '#2a9d8f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b2f2f' }}>JWT Bearer 256-Bit Cryptography</div>
                  <div style={{ fontSize: '0.8rem', color: '#5c4b4b' }}>Stateless authenticated API sessions verified on every order mutation.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: '#ede6dc', color: '#3b2f2f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DatabaseIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b2f2f' }}>MySQL InnoDB ACID Compliance</div>
                  <div style={{ fontSize: '0.8rem', color: '#5c4b4b' }}>Row-level locking guarantees stock reservation consistency without overselling.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: '#f7eee6', color: '#c08457', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ZapIcon className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b2f2f' }}>Zero Data Leakage</div>
                  <div style={{ fontSize: '0.8rem', color: '#5c4b4b' }}>Strict role-based tenant filters prevent unauthorized order visibility.</div>
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
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c08457', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Official Order Receipt
                </span>
                <span
                  style={{
                    background: '#e6f6f4',
                    color: '#2a9d8f',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                  }}
                >
                  Order #{selectedOrder.order_id}
                </span>
              </div>

              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#3b2f2f' }}>
                Receipt &amp; Tracking Details
              </h2>

              {/* Status Bar */}
              <div
                style={{
                  background: '#f6f3ee',
                  border: '1px solid #e7d7c1',
                  borderRadius: '2px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#5c4b4b' }}>Texas Tracking ID</div>
                  <div style={{ fontWeight: 800, color: '#3b2f2f', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedOrder.tracking_number || 'TX-DISPATCH-9824'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#5c4b4b' }}>Fulfillment State</div>
                  <div style={{ fontWeight: 800, color: '#2a9d8f' }}>
                    {selectedOrder.status}
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c4b4b', textTransform: 'uppercase', marginBottom: '8px' }}>
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
                        background: '#f6f3ee',
                        border: '1px solid #e7d7c1',
                        borderRadius: '2px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#3b2f2f' }}>{item.product_title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#826e6e' }}>
                          SKU: {item.sku || 'N/A'} • Qty: {item.quantity}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: '#3b2f2f' }}>
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
                  borderTop: '2px dashed #e7d7c1',
                  marginBottom: '20px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#3b2f2f' }}>Final Paid Amount:</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#2a9d8f' }}>
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
