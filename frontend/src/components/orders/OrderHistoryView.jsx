import { useState, useEffect } from 'react';
import api from '../../api/client';
import headsetImg from '../../assets/headset.png';

export default function OrderHistoryView({ activeUserId, isStaff, onInspectOrder, onNavigateToCheckout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetUserId, setTargetUserId] = useState(activeUserId);

  const fetchOrders = async (uid = targetUserId) => {
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
        setError(`No past orders found for customer #${uid}.`);
      } else {
        setError(resMsg || err.message || 'Failed to load order history.');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(targetUserId);
  }, [targetUserId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return { label: 'Delivered', bg: '#dcfce7', color: '#15803d', icon: '✓' };
      case 'SHIPPED':
        return { label: 'Dispatched / In Transit', bg: '#e0f2fe', color: '#0369a1', icon: '🚚' };
      case 'CONFIRMED':
        return { label: 'Order Confirmed', bg: '#fef3c7', color: '#b45309', icon: '📦' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c', icon: '✕' };
      default:
        return { label: 'Pending Processing', bg: '#f1f5f9', color: '#475569', icon: '⏳' };
    }
  };

  return (
    <div style={{ padding: '32px 0', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>My Orders & Purchase History</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Inspect past deliveries, verified carrier tracking numbers, and financial receipts.
          </p>
        </div>

        {isStaff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Filter Customer ID:</span>
            <input
              type="number"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
            <button
              onClick={() => fetchOrders(targetUserId)}
              style={{ padding: '6px 12px', background: '#0264d6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Fetch
            </button>
          </div>
        )}
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
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading customer order history...</div>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛍️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No orders found yet</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            You haven't submitted any orders yet. Discover high-quality gadgets in our catalog or test our multi-step checkout experience!
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
                    {/* Carrier Tracking Tag */}
                    {ord.tracking_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#64748b' }}>Carrier Tracking:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          {ord.tracking_number}
                        </span>
                      </div>
                    )}

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
                        Itemized line items verified under transactional ledger.
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
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(2, 100, 214, 0.2)',
                      }}
                    >
                      <span>🔍</span>
                      <span>Track Order</span>
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
