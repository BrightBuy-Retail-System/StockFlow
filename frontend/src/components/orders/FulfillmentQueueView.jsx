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
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '2px', border: '1.5px solid #e7d7c1', margin: '32px auto', maxWidth: '600px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b2f2f', margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>Staff Access Restricted</h2>
        <p style={{ color: '#826e6e', fontSize: '0.875rem', margin: 0 }}>
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
      (o.tracking_number && o.tracking_number.toLowerCase().includes(q)) ||
      (o.destination_city && o.destination_city.toLowerCase().includes(q));
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b2f2f', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>
              Order Fulfillment Queue
            </h1>
            <span style={{ background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #a8ded8', padding: '3px 10px', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700 }}>
              Staff Portal
            </span>
          </div>
          <p style={{ color: '#826e6e', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Review customer orders, confirm processing, and manage order fulfillment lifecycle.
          </p>
        </div>

        <button
          onClick={fetchPlatformOrders}
          style={{
            background: '#ffffff',
            border: '1px solid #e7d7c1',
            borderRadius: '2px',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#3b2f2f',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
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
          background: '#fdfbf7',
          border: '1.5px solid #e7d7c1',
          borderRadius: '2px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8125rem',
          color: '#5c4b4b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <strong style={{ color: '#3b2f2f' }}>Order Operations:</strong> Confirm incoming orders or handle cancellations. For courier dispatch and delivery tracking, visit the <strong>Logistics</strong> portal.
          </div>
        </div>
        <Link
          to="/logistics"
          style={{
            color: '#2a9d8f',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8125rem',
            padding: '4px 10px',
            background: '#ffffff',
            borderRadius: '2px',
            border: '1px solid #e7d7c1',
          }}
        >
          <span>Open Logistics</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Feedback Alerts */}
      {actionSuccessMessage && (
        <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '2px', padding: '12px 18px', color: '#2e7d32', fontSize: '0.875rem', marginBottom: '20px' }}>
          ✓ {actionSuccessMessage}
        </div>
      )}
      {actionErrorMessage && (
        <div style={{ background: '#fdeeed', border: '1px solid #ffcdd2', borderRadius: '2px', padding: '12px 18px', color: '#c62828', fontSize: '0.875rem', marginBottom: '20px' }}>
          ⚠️ {actionErrorMessage}
        </div>
      )}
      {error && (
        <div style={{ background: '#fdeeed', border: '1px solid #ffcdd2', borderRadius: '2px', padding: '12px 18px', color: '#c62828', fontSize: '0.875rem', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e7d7c1', borderRadius: '2px', padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search Order #, Customer ID, or Tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: '280px', padding: '8px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.875rem', color: '#3b2f2f' }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '2px',
                  border: statusFilter === st ? '1px solid #2a9d8f' : '1px solid #e7d7c1',
                  background: statusFilter === st ? '#2a9d8f' : '#ffffff',
                  color: statusFilter === st ? '#ffffff' : '#5c4b4b',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8125rem', color: '#826e6e' }}>
            Showing <strong style={{ color: '#3b2f2f' }}>{totalItems === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of {totalItems} orders
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#826e6e' }}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '2px',
                border: '1px solid #e7d7c1',
                background: '#ffffff',
                fontSize: '0.75rem',
                color: '#3b2f2f',
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
          <div style={{ color: '#826e6e', fontSize: '0.875rem' }}>Loading platform fulfillment queue...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1.5px solid #e7d7c1', borderRadius: '2px', padding: '40px', textAlign: 'center', color: '#826e6e' }}>
          No orders matching filter criteria.
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1.5px solid #e7d7c1', borderRadius: '2px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(59,47,47,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#faf7f2', borderBottom: '1.5px solid #e7d7c1', color: '#3b2f2f', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                    <tr key={ord.order_id} style={{ borderBottom: '1px solid #f4ede4' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#2a9d8f' }}>
                        #{ord.order_id}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#3b2f2f' }}>
                          {ord.customer_name ? `${ord.customer_name} (ID: #${ord.user_id})` : `Customer #${ord.user_id}`}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#826e6e', fontSize: '0.8125rem' }}>
                        {ord.placed_at ? new Date(ord.placed_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: ord.status === 'CANCELLED' ? '#fdeeed' : ord.status === 'DELIVERED' ? '#e8f5e9' : ord.status === 'SHIPPED' ? '#e6f6f4' : ord.status === 'CONFIRMED' ? '#fbf3ea' : '#fef8e7',
                            color: ord.status === 'CANCELLED' ? '#c62828' : ord.status === 'DELIVERED' ? '#2e7d32' : ord.status === 'SHIPPED' ? '#2a9d8f' : ord.status === 'CONFIRMED' ? '#c08457' : '#b45309',
                            border: ord.status === 'CANCELLED' ? '1px solid #ffcdd2' : ord.status === 'DELIVERED' ? '1px solid #c8e6c9' : ord.status === 'SHIPPED' ? '1px solid #a8ded8' : ord.status === 'CONFIRMED' ? '1px solid #e7d7c1' : '1px solid #fde68a',
                            padding: '3px 10px',
                            borderRadius: '2px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#3b2f2f' }}>
                        ${parseFloat(ord.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Inspect Link */}
                          <button
                            type="button"
                            onClick={() => onInspectOrder(ord.order_id)}
                            style={{ padding: '5px 12px', background: '#faf7f2', color: '#3b2f2f', border: '1px solid #e7d7c1', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            View
                          </button>

                          {/* Confirm */}
                          {ord.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleTransitionStatus(ord.order_id, 'CONFIRMED')}
                              style={{ padding: '5px 12px', background: '#2a9d8f', color: '#ffffff', border: '1px solid #22867a', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
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
                                  background: '#fbf3ea',
                                  color: '#c08457',
                                  border: '1px solid #e7d7c1',
                                  borderRadius: '2px',
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
                                  background: '#ffffff',
                                  color: '#2a9d8f',
                                  border: '1px solid #e7d7c1',
                                  borderRadius: '2px',
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
                                background: '#e6f6f4',
                                color: '#2a9d8f',
                                border: '1px solid #a8ded8',
                                borderRadius: '2px',
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
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                border: '1px solid #c8e6c9',
                                borderRadius: '2px',
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
                              style={{ padding: '5px 12px', background: '#fdeeed', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
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
                borderTop: '1.5px solid #e7d7c1',
                background: '#faf7f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ color: '#826e6e' }}>
                Page <strong style={{ color: '#3b2f2f' }}>{safePage}</strong> of <strong style={{ color: '#3b2f2f' }}>{totalPages}</strong>
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
                    borderRadius: '2px',
                    border: '1px solid #e7d7c1',
                    background: safePage <= 1 ? '#f4ede4' : '#ffffff',
                    color: safePage <= 1 ? '#a89696' : '#3b2f2f',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
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
                        <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#826e6e' }}>
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
                          borderRadius: '2px',
                          border: isCurrent ? '1px solid #2a9d8f' : '1px solid #e7d7c1',
                          background: isCurrent ? '#2a9d8f' : '#ffffff',
                          color: isCurrent ? '#ffffff' : '#3b2f2f',
                          fontWeight: isCurrent ? 700 : 500,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
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
                    borderRadius: '2px',
                    border: '1px solid #e7d7c1',
                    background: safePage >= totalPages ? '#f4ede4' : '#ffffff',
                    color: safePage >= totalPages ? '#a89696' : '#3b2f2f',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
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
