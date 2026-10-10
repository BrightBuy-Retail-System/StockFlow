import { useState, useEffect } from 'react';
import api from '../../api/client';
import headsetImg from '../../assets/headset.png';

export default function OrderHistoryView({ activeUserId, onInspectOrder, onNavigateToCheckout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = async (uid = activeUserId) => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/user/${uid}`);
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      const resMsg = err.response?.data?.message;
      if (err.response?.status === 403) {
        setError(resMsg || 'Access forbidden: You cannot view order histories of other users.');
      } else if (err.response?.status === 404) {
        setError(`No past orders found.`);
      } else {
        setError(resMsg || err.message || 'Failed to load order history.');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(activeUserId);
  }, [activeUserId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return { label: 'Delivered', bg: '#dcfce7', color: '#15803d', icon: '✓' };
      case 'SHIPPED':
        return { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1', icon: '●' };
      case 'CONFIRMED':
        return { label: 'Confirmed', bg: '#fef3c7', color: '#b45309', icon: '●' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c', icon: '✕' };
      default:
        return { label: 'Processing', bg: '#f1f5f9', color: '#475569', icon: '●' };
    }
  };

  return (
    <div style={{ padding: '32px 0', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Your Orders
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            View your past purchases, shipment status, and order receipts.
          </p>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', color: '#991b1b', fontSize: '0.875rem', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }} />
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading your orders...</div>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#64748b' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No orders yet</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            When you place an order, it will appear here so you can track delivery and view receipts.
          </p>
          <button
            onClick={onNavigateToCheckout}
            style={{
              background: '#0264d6',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 100, 214, 0.2)',
            }}
          >
            Create New Order via Checkout
          </button>
        </div>
      ) : (
        /* Order Cards List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((ord) => {
            const badge = getStatusBadge(ord.status);
            return (
              <div
                key={ord.order_id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Order Top Banner */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Order Placed</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {ord.placed_at ? new Date(ord.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                      </div>
                    </div>
                    <div style={{ height: '24px', width: '1px', background: '#cbd5e1' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        Rs {parseFloat(ord.total_amount).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ height: '24px', width: '1px', background: '#cbd5e1' }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Order Ref</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0264d6' }}>#{ord.order_id}</div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  </div>
                </div>

                {/* Order Body Details */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>


                    {/* Line Items List */}
                    {Array.isArray(ord.items) && ord.items.length > 0 ? (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {ord.items.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #f1f5f9',
                              background: '#f8fafc',
                            }}
                          >
                            <img src={headsetImg} alt="Item" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            <div>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                                {it.product_title || `Item SKU: ${it.sku || 'N/A'}`}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Qty: {it.quantity} × Rs {parseFloat(it.unit_price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        Order details available in receipt.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => onInspectOrder(ord.order_id)}
                      style={{
                        padding: '10px 18px',
                        background: '#0264d6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 6px rgba(2, 100, 214, 0.2)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                      </svg>
                      <span>View Order</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
