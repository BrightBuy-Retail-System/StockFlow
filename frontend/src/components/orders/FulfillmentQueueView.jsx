import { useState, useEffect } from 'react';
import api from '../../api/client';

export default function FulfillmentQueueView({ isStaff, onInspectOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Status transition state
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionErrorMessage, setActionErrorMessage] = useState(null);

  const fetchPlatformOrders = async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders/');
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
        setError(resMsg || 'Access forbidden: Staff permissions required.');
      } else {
        setError(resMsg || err.message || 'Failed to retrieve warehouse orders queue.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformOrders();
  }, [isStaff]);

  // Execute Lifecycle Transition
  const handleTransitionStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data?.status === 'success') {
        setActionSuccessMessage(`Order #${orderId} successfully transitioned to ${newStatus}.`);
        // Refresh feed immediately
        fetchPlatformOrders();
      } else {
        setActionErrorMessage(res.data?.message || 'Failed to transition order status.');
      }
    } catch (err) {
      setActionErrorMessage(err.response?.data?.message || err.message || 'Server error updating status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!isStaff) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '32px auto', maxWidth: '600px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Staff Access Restricted</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          The warehouse fulfillment queue is reserved for Warehouse Managers and System Administrators.
        </p>
      </div>
    );
  }

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(o.order_id).includes(q) ||
      String(o.user_id).includes(q) ||
      (o.tracking_number && o.tracking_number.toLowerCase().includes(q)) ||
      (o.shipping_address && o.shipping_address.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: '32px 0', maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Warehouse Fulfillment Queue</h1>
            <span style={{ background: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
              STAFF PORTAL
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0' }}>
            System-wide order lifecycle execution, inventory restock on cancellation, and courier dispatch.
          </p>
        </div>

        <button
          onClick={fetchPlatformOrders}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🔄</span>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {actionSuccessMessage && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 18px', color: '#15803d', fontSize: '0.875rem', marginBottom: '20px' }}>
          ✓ {actionSuccessMessage}
        </div>
      )}
      {actionErrorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 18px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '20px' }}>
          ⚠️ {actionErrorMessage}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 18px', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search Order #, Customer ID, or Tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: '280px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === st ? '1px solid #0264d6' : '1px solid #e2e8f0',
                  background: statusFilter === st ? '#0264d6' : '#ffffff',
                  color: statusFilter === st ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Showing <strong>{filteredOrders.length}</strong> of {orders.length} orders
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading platform fulfillment queue...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No orders matching filter criteria.
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Order ID</th>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Placed Date</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Carrier Tracking</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Fulfillment Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const isUpdating = updatingOrderId === ord.order_id;
                  return (
                    <tr key={ord.order_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0264d6' }}>
                        #{ord.order_id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>Customer #{ord.user_id}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8125rem' }}>
                        {ord.placed_at ? new Date(ord.placed_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: ord.status === 'CANCELLED' ? '#fee2e2' : ord.status === 'DELIVERED' ? '#dcfce7' : ord.status === 'SHIPPED' ? '#e0f2fe' : ord.status === 'CONFIRMED' ? '#fef3c7' : '#f1f5f9',
                            color: ord.status === 'CANCELLED' ? '#b91c1c' : ord.status === 'DELIVERED' ? '#15803d' : ord.status === 'SHIPPED' ? '#0369a1' : ord.status === 'CONFIRMED' ? '#b45309' : '#475569',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#334155' }}>
                        {ord.tracking_number || <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        Rs {parseFloat(ord.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Inspect Link */}
                          <button
                            type="button"
                            onClick={() => onInspectOrder(ord.order_id)}
                            style={{ padding: '5px 10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Inspect
                          </button>

                          {/* Confirm */}
                          {ord.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleTransitionStatus(ord.order_id, 'CONFIRMED')}
                              style={{ padding: '5px 10px', background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Confirm
                            </button>
                          )}

                          {/* Ship */}
                          {(ord.status === 'PENDING' || ord.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleTransitionStatus(ord.order_id, 'SHIPPED')}
                              style={{ padding: '5px 10px', background: '#0264d6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Ship / Dispatch
                            </button>
                          )}

                          {/* Mark Delivered */}
                          {ord.status === 'SHIPPED' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleTransitionStatus(ord.order_id, 'DELIVERED')}
                              style={{ padding: '5px 10px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Mark Delivered
                            </button>
                          )}

                          {/* Cancel */}
                          {ord.status !== 'CANCELLED' && ord.status !== 'SHIPPED' && ord.status !== 'DELIVERED' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to cancel Order #${ord.order_id}? Inventory will be restocked.`)) {
                                  handleTransitionStatus(ord.order_id, 'CANCELLED');
                                }
                              }}
                              style={{ padding: '5px 10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
