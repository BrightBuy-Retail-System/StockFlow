import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.shipping_address && o.shipping_address.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  // Derived Pagination Data
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <div style={{ padding: '32px 0', maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Order Fulfillment Queue
            </h1>
            <span style={{ background: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
              Staff Portal
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Review customer orders, confirm processing, and manage order status.
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
            gap: '8px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" />
          </svg>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Domain Separation Notice */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8125rem',
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <strong style={{ color: '#0f172a' }}>Order Operations:</strong> Confirm incoming orders or handle cancellations. For courier dispatch and delivery tracking, visit the <strong>Logistics</strong> portal.
          </div>
        </div>
        <Link
          to="/logistics"
          style={{
            color: '#0264d6',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8125rem',
            padding: '4px 10px',
            background: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
          }}
        >
          <span>Open Logistics</span>
          <span>&rarr;</span>
        </Link>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of {totalItems} orders
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.75rem',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
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
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((ord) => {
                  const isUpdating = updatingOrderId === ord.order_id;
                  return (
                    <tr key={ord.order_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0264d6' }}>
                        #{ord.order_id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {ord.customer_name ? `${ord.customer_name} (ID: #${ord.user_id})` : `Customer #${ord.user_id}`}
                        </div>
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
                            View
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

                          {/* Logistics Handoff Indication for CONFIRMED */}
                          {ord.status === 'CONFIRMED' && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  padding: '4px 9px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                Ready for Dispatch
                              </span>
                              <Link
                                to="/logistics"
                                style={{
                                  padding: '4px 8px',
                                  background: '#f8fafc',
                                  color: '#0264d6',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="Open Logistics portal to dispatch"
                              >
                                Logistics &rarr;
                              </Link>
                            </div>
                          )}

                          {/* Read-only status tag for SHIPPED */}
                          {ord.status === 'SHIPPED' && (
                            <span
                              style={{
                                padding: '4px 9px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>🚚</span>
                              <span>Dispatched via Logistics</span>
                            </span>
                          )}

                          {/* Read-only status tag for DELIVERED */}
                          {ord.status === 'DELIVERED' && (
                            <span
                              style={{
                                padding: '4px 9px',
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>✓</span>
                              <span>Delivered</span>
                            </span>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ color: '#64748b' }}>
                Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: safePage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: safePage <= 1 ? '#94a3b8' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s',
                  }}
                >
                  &larr; Previous
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
                          …
                        </span>
                      );
                    }
                    const isCurrent = item === safePage;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: isCurrent ? '1px solid #0264d6' : '1px solid #e2e8f0',
                          background: isCurrent ? '#0264d6' : '#ffffff',
                          color: isCurrent ? '#ffffff' : '#334155',
                          fontWeight: isCurrent ? 700 : 500,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: safePage >= totalPages ? '#f1f5f9' : '#ffffff',
                    color: safePage >= totalPages ? '#94a3b8' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s',
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
