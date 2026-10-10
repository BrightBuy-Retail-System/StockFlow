import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import CheckoutSplitView from '../components/orders/CheckoutSplitView';
import OrderHistoryView from '../components/orders/OrderHistoryView';
import OrderLookupView from '../components/orders/OrderLookupView';
import FulfillmentQueueView from '../components/orders/FulfillmentQueueView';

export default function OrdersPage({ defaultTab = 'history' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // User Identity & Role Context
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const activeUserId = parsedUser?.user_id || parsedUser?.id || 4;
  const activeRoleId = parsedUser?.role_id || 1; // 1 = Customer, 2 = Manager, 3 = Admin
  const isStaff = activeRoleId === 2 || activeRoleId === 3 || activeRoleId === 4;
  const userName = parsedUser?.full_name || parsedUser?.username || `Customer #${activeUserId}`;

  // Read URL query parameters (?tab=checkout | history | lookup | fulfillment, ?id=...)
  const queryParams = new URLSearchParams(location.search);
  const tabFromQuery = queryParams.get('tab');
  const idFromQuery = queryParams.get('id');

  // Read saved tab & inspected order ID from sessionStorage to maintain user context across page switches
  const savedTab = sessionStorage.getItem('stockflow_orders_active_tab');
  const savedInspectedId = sessionStorage.getItem('stockflow_orders_inspected_id');

  // Active Cart Items Count Check
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isCheckingCart, setIsCheckingCart] = useState(!isStaff && !tabFromQuery && !savedTab && location.pathname !== '/checkout');

  // Active Tab State (Staff defaults to 'fulfillment'; Customer defaults to URL param -> savedTab -> 'history')
  const [activeTab, setActiveTab] = useState(() => {
    if (isStaff) {
      if (tabFromQuery === 'lookup' || (tabFromQuery && tabFromQuery !== 'checkout' && tabFromQuery !== 'history')) {
        return tabFromQuery;
      }
      if (savedTab && savedTab !== 'checkout' && savedTab !== 'history') {
        return savedTab;
      }
      return 'fulfillment';
    }
    return tabFromQuery || (location.pathname === '/checkout' ? 'checkout' : (savedTab || 'history'));
  });

  // Selected Order for Inspection
  const [inspectedOrderId, setInspectedOrderId] = useState(
    idFromQuery ? parseInt(idFromQuery, 10) : (savedInspectedId ? parseInt(savedInspectedId, 10) : 1)
  );

  // Fetch cart to determine default routing if no tab is specified and no previous tab saved (Customers only)
  useEffect(() => {
    const isOrdersPath = location.pathname === '/orders' || location.pathname === '/checkout';
    if (!isOrdersPath) return;

    if (isStaff) {
      setIsCheckingCart(false);
      return;
    }

    let isMounted = true;
    api.get('/auth_cart/cart')
      .then((res) => {
        if (!isMounted) return;
        const count = res.data?.item_count ?? (Array.isArray(res.data?.items) ? res.data.items.length : (Array.isArray(res.data) ? res.data.length : 0));
        setCartItemCount(count);

        // If user navigated to orders page without an explicit tab and no saved tab, direct based on cart items
        const qp = new URLSearchParams(location.search);
        const explicitTab = qp.get('tab');
        const storedTab = sessionStorage.getItem('stockflow_orders_active_tab');
        if (!explicitTab && !storedTab && location.pathname !== '/checkout') {
          const defaultTab = count > 0 ? 'checkout' : 'history';
          setActiveTab(defaultTab);
          sessionStorage.setItem('stockflow_orders_active_tab', defaultTab);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCartItemCount(0);
          const qp = new URLSearchParams(location.search);
          const explicitTab = qp.get('tab');
          const storedTab = sessionStorage.getItem('stockflow_orders_active_tab');
          if (!explicitTab && !storedTab && location.pathname !== '/checkout') {
            setActiveTab('history');
            sessionStorage.setItem('stockflow_orders_active_tab', 'history');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingCart(false);
        }
      });
    return () => { isMounted = false; };
  }, [location.pathname, location.search, isStaff]);

  // Sync state if URL changes or user switches page
  useEffect(() => {
    const isOrdersPath = location.pathname === '/orders' || location.pathname === '/checkout';
    if (!isOrdersPath) return;

    const qp = new URLSearchParams(location.search);
    const t = qp.get('tab');
    const orderIdParam = qp.get('id');
    const storedTab = sessionStorage.getItem('stockflow_orders_active_tab');

    if (isStaff) {
      if (t === 'checkout' || t === 'history') {
        setActiveTab('fulfillment');
        sessionStorage.setItem('stockflow_orders_active_tab', 'fulfillment');
        qp.set('tab', 'fulfillment');
        navigate({ pathname: location.pathname, search: qp.toString() }, { replace: true });
        return;
      }
      if (t) {
        setActiveTab(t);
        sessionStorage.setItem('stockflow_orders_active_tab', t);
      } else if (storedTab && storedTab !== 'checkout' && storedTab !== 'history') {
        setActiveTab(storedTab);
      } else {
        setActiveTab('fulfillment');
        sessionStorage.setItem('stockflow_orders_active_tab', 'fulfillment');
      }

      if (orderIdParam) {
        const parsedId = parseInt(orderIdParam, 10);
        setInspectedOrderId(parsedId);
        sessionStorage.setItem('stockflow_orders_inspected_id', String(parsedId));
      }
      return;
    }

    // Customer navigation safeguards
    if (t === 'lookup' && !isStaff && !orderIdParam) {
      setActiveTab('history');
      sessionStorage.setItem('stockflow_orders_active_tab', 'history');
      qp.set('tab', 'history');
      navigate({ pathname: location.pathname, search: qp.toString() }, { replace: true });
      return;
    }

    if (t) {
      setActiveTab(t);
      sessionStorage.setItem('stockflow_orders_active_tab', t);
    } else if (location.pathname === '/checkout') {
      setActiveTab('checkout');
      sessionStorage.setItem('stockflow_orders_active_tab', 'checkout');
    } else if (storedTab) {
      setActiveTab(storedTab);
    } else if (!isCheckingCart) {
      const fallbackTab = cartItemCount > 0 ? 'checkout' : 'history';
      setActiveTab(fallbackTab);
      sessionStorage.setItem('stockflow_orders_active_tab', fallbackTab);
    }

    if (orderIdParam) {
      const parsedId = parseInt(orderIdParam, 10);
      setInspectedOrderId(parsedId);
      sessionStorage.setItem('stockflow_orders_inspected_id', String(parsedId));
    } else {
      const storedId = sessionStorage.getItem('stockflow_orders_inspected_id');
      if (storedId) {
        setInspectedOrderId(parseInt(storedId, 10));
      }
    }
  }, [location.search, location.pathname, isStaff, navigate, cartItemCount, isCheckingCart]);

  const handleTabChange = (tabKey) => {
    if (isStaff && (tabKey === 'checkout' || tabKey === 'history')) {
      tabKey = 'fulfillment';
    }
    // If a customer clicks inspect tab directly, route them to My Orders to choose an order
    if (tabKey === 'lookup' && !isStaff && activeTab !== 'lookup') {
      tabKey = 'history';
    }
    setActiveTab(tabKey);
    sessionStorage.setItem('stockflow_orders_active_tab', tabKey);
    const qp = new URLSearchParams(location.search);
    qp.set('tab', tabKey);
    if (tabKey !== 'lookup') {
      qp.delete('id');
    }
    navigate({ pathname: location.pathname, search: qp.toString() }, { replace: true });
  };

  const handleInspectOrder = (orderId) => {
    setInspectedOrderId(orderId);
    setActiveTab('lookup');
    sessionStorage.setItem('stockflow_orders_active_tab', 'lookup');
    sessionStorage.setItem('stockflow_orders_inspected_id', String(orderId));
    const qp = new URLSearchParams(location.search);
    qp.set('tab', 'lookup');
    qp.set('id', String(orderId));
    navigate({ pathname: location.pathname, search: qp.toString() }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Storefront Orders Hub Bar */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Page Title & User Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Orders &amp; Checkout
            </h1>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#334155', fontWeight: 600 }}>{userName}</span>
              <span
                style={{
                  background: isStaff ? '#eff6ff' : '#f1f5f9',
                  color: isStaff ? '#1e40af' : '#475569',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {activeRoleId === 3 ? 'Admin' : activeRoleId === 2 ? 'Store Manager' : 'Customer'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              gap: '4px',
            }}
          >
            {/* Customer Only: Tab 1 Checkout & Tab 2 Order History */}
            {!isStaff && (
              <>
                {/* Tab 1: Checkout */}
                <button
                  type="button"
                  onClick={() => handleTabChange('checkout')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'checkout' ? '#ffffff' : 'transparent',
                    color: activeTab === 'checkout' ? '#0264d6' : '#64748b',
                    fontWeight: activeTab === 'checkout' ? 700 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'checkout' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  <span>Checkout</span>
                  {cartItemCount > 0 && (
                    <span
                      style={{
                        background: activeTab === 'checkout' ? '#0264d6' : '#cbd5e1',
                        color: activeTab === 'checkout' ? '#ffffff' : '#334155',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {/* Tab 2: History */}
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'history' ? '#ffffff' : 'transparent',
                    color: activeTab === 'history' ? '#0264d6' : '#64748b',
                    fontWeight: activeTab === 'history' ? 700 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7.5 4.27 9 5.15" />
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
                  </svg>
                  <span>Order History</span>
                </button>
              </>
            )}

            {/* Tab 3: Inspect Order / Receipt */}
            {(isStaff || activeTab === 'lookup') && (
              <button
                type="button"
                onClick={() => handleTabChange('lookup')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'lookup' ? '#ffffff' : 'transparent',
                  color: activeTab === 'lookup' ? '#0264d6' : '#64748b',
                  fontWeight: activeTab === 'lookup' ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'lookup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>{activeTab === 'lookup' && inspectedOrderId ? `Order #${inspectedOrderId} Details` : 'Order Details'}</span>
              </button>
            )}

            {/* Tab 4: Warehouse Fulfillment Queue (Staff Only) */}
            {isStaff && (
              <button
                type="button"
                onClick={() => handleTabChange('fulfillment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'fulfillment' ? '#ffffff' : 'transparent',
                  color: activeTab === 'fulfillment' ? '#0264d6' : '#64748b',
                  fontWeight: activeTab === 'fulfillment' ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'fulfillment' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" />
                </svg>
                <span>Fulfillment</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content Display */}
      <div style={{ flex: 1 }}>
        {isCheckingCart ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0264d6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
              Loading orders...
            </span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {!isStaff && activeTab === 'checkout' && (
              <CheckoutSplitView
                onOrderPlaced={(order) => {
                  api.get('/auth_cart/cart')
                    .then((res) => {
                      const count = res.data?.item_count ?? (Array.isArray(res.data?.items) ? res.data.items.length : 0);
                      setCartItemCount(count);
                    })
                    .catch(() => setCartItemCount(0));

                  if (order?.order_id) {
                    setInspectedOrderId(order.order_id);
                  }
                }}
                onNavigateToTrack={(orderId) => handleInspectOrder(orderId)}
              />
            )}

        {!isStaff && activeTab === 'history' && (
          <div style={{ padding: '0 24px' }}>
            <OrderHistoryView
              activeUserId={activeUserId}
              onInspectOrder={handleInspectOrder}
              onNavigateToCheckout={() => handleTabChange('checkout')}
            />
          </div>
        )}

        {activeTab === 'lookup' && (
          <div style={{ padding: '0 24px' }}>
            <OrderLookupView
              initialOrderId={inspectedOrderId}
              onBackToHistory={() => handleTabChange(isStaff ? 'fulfillment' : 'history')}
              isStaff={isStaff}
            />
          </div>
        )}

        {activeTab === 'fulfillment' && isStaff && (
          <div style={{ padding: '0 24px' }}>
            <FulfillmentQueueView
              isStaff={isStaff}
              onInspectOrder={handleInspectOrder}
            />
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
