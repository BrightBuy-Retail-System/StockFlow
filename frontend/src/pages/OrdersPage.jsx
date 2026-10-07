import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CheckoutSplitView from '../components/orders/CheckoutSplitView';
import OrderHistoryView from '../components/orders/OrderHistoryView';
import OrderLookupView from '../components/orders/OrderLookupView';
import FulfillmentQueueView from '../components/orders/FulfillmentQueueView';

export default function OrdersPage({ defaultTab = 'checkout' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // User Identity & Role Context
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const activeUserId = parsedUser?.user_id || parsedUser?.id || 4;
  const activeRoleId = parsedUser?.role_id || 1; // 1 = Customer, 2 = Manager, 3 = Admin
  const isStaff = activeRoleId === 2 || activeRoleId === 3;
  const userName = parsedUser?.full_name || parsedUser?.username || `Customer #${activeUserId}`;

  // Read URL query parameters (?tab=checkout | history | lookup | fulfillment, ?id=...)
  const queryParams = new URLSearchParams(location.search);
  const tabFromQuery = queryParams.get('tab');
  const idFromQuery = queryParams.get('id');

  // Active Tab State
  const [activeTab, setActiveTab] = useState(
    tabFromQuery || (location.pathname === '/checkout' ? 'checkout' : defaultTab)
  );

  // Selected Order for Inspection
  const [inspectedOrderId, setInspectedOrderId] = useState(
    idFromQuery ? parseInt(idFromQuery, 10) : 1
  );

  // Sync state if URL changes
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const t = qp.get('tab');
    const orderIdParam = qp.get('id');
    if (t) {
      setActiveTab(t);
    } else if (location.pathname === '/checkout') {
      setActiveTab('checkout');
    }
    if (orderIdParam) {
      setInspectedOrderId(parseInt(orderIdParam, 10));
    }
  }, [location.search, location.pathname]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const qp = new URLSearchParams(location.search);
    qp.set('tab', tabKey);
    navigate({ search: qp.toString() }, { replace: true });
  };

  const handleInspectOrder = (orderId) => {
    setInspectedOrderId(orderId);
    setActiveTab('lookup');
    const qp = new URLSearchParams(location.search);
    qp.set('tab', 'lookup');
    qp.set('id', String(orderId));
    navigate({ search: qp.toString() }, { replace: true });
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
          {/* Brand & User Identification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => handleTabChange('checkout')}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Bright</span>
              <span style={{ background: '#0264d6', color: '#ffffff', fontWeight: 900, fontSize: '0.95rem', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                BUY
              </span>
            </div>

            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

            <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Authenticated as</span>
              <strong style={{ color: '#0f172a' }}>{userName}</strong>
              <span
                style={{
                  background: isStaff ? '#eff6ff' : '#f1f5f9',
                  color: isStaff ? '#1e40af' : '#475569',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeRoleId === 3 ? 'System Administrator' : activeRoleId === 2 ? 'Store Manager' : 'Customer'}
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
            {/* Tab 1: Checkout */}
            <button
              type="button"
              onClick={() => handleTabChange('checkout')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
              <span>🛒</span>
              <span>Checkout</span>
            </button>

            {/* Tab 2: History */}
            <button
              type="button"
              onClick={() => handleTabChange('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
              <span>📦</span>
              <span>My Orders</span>
            </button>

            {/* Tab 3: Track / Lookup */}
            <button
              type="button"
              onClick={() => handleTabChange('lookup')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
              <span>🔍</span>
              <span>Track Order</span>
            </button>

            {/* Tab 4: Warehouse Fulfillment Queue (Staff Only) */}
            {isStaff && (
              <button
                type="button"
                onClick={() => handleTabChange('fulfillment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
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
                <span>🏭</span>
                <span>Fulfillment Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content Display */}
      <div style={{ flex: 1 }}>
        {activeTab === 'checkout' && (
          <CheckoutSplitView
            onOrderPlaced={(order) => {
              if (order?.order_id) {
                setInspectedOrderId(order.order_id);
              }
            }}
            onNavigateToTrack={(orderId) => handleInspectOrder(orderId)}
          />
        )}

        {activeTab === 'history' && (
          <div style={{ padding: '0 24px' }}>
            <OrderHistoryView
              activeUserId={activeUserId}
              isStaff={isStaff}
              onInspectOrder={handleInspectOrder}
              onNavigateToCheckout={() => handleTabChange('checkout')}
            />
          </div>
        )}

        {activeTab === 'lookup' && (
          <div style={{ padding: '0 24px' }}>
            <OrderLookupView
              initialOrderId={inspectedOrderId}
              onBackToHistory={() => handleTabChange('history')}
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
      </div>
    </div>
  );
}
