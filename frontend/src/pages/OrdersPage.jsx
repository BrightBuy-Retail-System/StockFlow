import { useState, useEffect } from 'react';
import api from '../api/client';

export default function OrdersPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/orders/1');
        if (isMounted) {
          if (response.data && response.data.status === 'success') {
            setOrder(response.data.data);
          } else {
            setOrder(response.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.response?.data?.message ||
            (err.response?.status === 404 ? 'Order #1 not found (404).' : err.message || 'Failed to fetch order.');
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'DELIVERED':
        return {
          backgroundColor: 'var(--success-bg, #ecfdf5)',
          color: 'var(--success-text, #047857)',
          border: '1px solid var(--success-border, #a7f3d0)',
        };
      case 'PENDING':
      case 'PROCESSING':
        return {
          backgroundColor: 'var(--warning-bg, #fffbeb)',
          color: 'var(--warning-text, #b45309)',
          border: '1px solid var(--warning-border, #fde68a)',
        };
      case 'CANCELLED':
      case 'FAILED':
        return {
          backgroundColor: 'var(--danger-bg, #fef2f2)',
          color: 'var(--danger-text, #b91c1c)',
          border: '1px solid var(--danger-border, #fecaca)',
        };
      default:
        return {
          backgroundColor: 'var(--info-bg, #f0f9ff)',
          color: 'var(--info-text, #0369a1)',
          border: '1px solid var(--info-border, #bae6fd)',
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    const val = Number(amount);
    return isNaN(val) ? '$0.00' : `$${val.toFixed(2)}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary, #2563eb)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Backend Parity View
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
          Order Verification
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', marginTop: '4px', fontSize: '0.95rem' }}>
          Direct inspection of live order header records from TiDB / Flask API.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '48px 24px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
            color: 'var(--text-secondary, #475569)',
            fontSize: '0.95rem',
          }}
        >
          <svg
            style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <span>Fetching Order #1 from backend...</span>
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: 'var(--danger-bg, #fef2f2)',
            border: '1px solid var(--danger-border, #fecaca)',
            color: 'var(--danger-text, #b91c1c)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <svg
            style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>Order Query Failed</strong>
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Order Inspection Card */}
      {!loading && !error && order && (
        <div
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--bg-subtle, #f8fafc)',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted, #64748b)',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Inspection Target
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Order #{order.order_id}
              </h2>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                ...getStatusBadgeStyle(order.status),
              }}
            >
              {order.status || 'UNKNOWN'}
            </span>
          </div>

          {/* Card Body / Field Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              padding: '24px',
            }}
          >
            {/* Customer / User ID */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Customer ID
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                User #{order.user_id ?? 'N/A'}
              </div>
            </div>

            {/* Shipment ID */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Shipment ID
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                {order.shipment_id ? `#${order.shipment_id}` : 'Unassigned'}
              </div>
            </div>

            {/* Placed At */}
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Placement Date
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                {formatDate(order.placed_at)}
              </div>
            </div>

            {/* Total Amount */}
            <div
              style={{
                padding: '16px',
                background: 'var(--primary-light, #eff6ff)',
                borderRadius: '10px',
                border: '1px solid var(--primary-border, #bfdbfe)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--primary, #2563eb)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Amount
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary, #2563eb)' }}>
                {formatCurrency(order.total_amount)}
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 16px 0' }}>
              Order Line Items
            </h3>

            {(!order.items || order.items.length === 0) ? (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px dashed var(--border-color, #e2e8f0)',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}
              >
                No line items are attached to this record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {order.items.map((item) => (
                  <div
                    key={item.order_item_id || item.variant_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      background: 'var(--bg-card, #ffffff)',
                    }}
                  >
                    {/* Item Info */}
                    <div style={{ minWidth: '220px', flex: '1 1 auto' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: '4px' }}>
                        {item.product_title}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                        {item.attribute_name && item.attribute_value && (
                          <span style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                            {item.attribute_name}: {item.attribute_value}
                          </span>
                        )}
                        {item.sku && (
                          <span style={{ fontFamily: 'monospace', background: 'var(--bg-subtle, #f1f5f9)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-light, #e2e8f0)' }}>
                            SKU: {item.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing and Quantity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {formatCurrency(item.line_total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

