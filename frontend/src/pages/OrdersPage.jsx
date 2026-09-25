import { useState, useEffect } from 'react';
import api from '../api/client';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // User Identity Resolution
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const activeUserId = parsedUser?.user_id || parsedUser?.id || 4;

  // Checkout Pre-Flight Validation Form States
  const [checkoutUserId, setCheckoutUserId] = useState(activeUserId);
  const [shippingCityId, setShippingCityId] = useState(1);
  const [variantId, setVariantId] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(null);
  const [calculationData, setCalculationData] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const handleValidateCheckout = async (e) => {
    e.preventDefault();
    setValidating(true);
    setValidationSuccess(null);
    setCalculationData(null);
    setValidationError(null);

    // Payload contract: positive integers
    const payload = {
      user_id: parseInt(checkoutUserId, 10),
      shipping_city_id: parseInt(shippingCityId, 10),
      items: [
        {
          variant_id: parseInt(variantId, 10),
          quantity: parseInt(quantity, 10),
        },
      ],
    };

    try {
      const response = await api.post('/orders/checkout', payload);
      if (response.data && (response.data.status === 'verified' || response.data.status === 'validated')) {
        setValidationSuccess(response.data);
        if (response.data.calculation) {
          setCalculationData(response.data.calculation);
        }
      } else {
        setValidationSuccess(response.data);
      }
    } catch (err) {
      setCalculationData(null);
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? 'Entity not found (404).'
          : err.response?.status === 400
          ? 'Validation failed: Invalid checkout payload.'
          : err.message || 'Error occurred while validating payload.');
      setValidationError(msg);
    } finally {
      setValidating(false);
    }
  };

  // 1. Fetch customer past orders on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const response = await api.get('/orders/user/4');
        if (isMounted) {
          if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
            const fetchedOrders = response.data.data;
            setOrders(fetchedOrders);
            // Default select the first order if available
            if (fetchedOrders.length > 0) {
              setSelectedOrderId(fetchedOrders[0].order_id);
            }
          } else if (Array.isArray(response.data)) {
            setOrders(response.data);
            if (response.data.length > 0) {
              setSelectedOrderId(response.data[0].order_id);
            }
          } else {
            setOrders([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.response?.data?.message ||
            (err.response?.status === 404
              ? 'Customer orders not found (404).'
              : err.message || 'Failed to fetch customer orders.');
          setOrdersError(message);
        }
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch detailed order information whenever selectedOrderId changes
  useEffect(() => {
    if (!selectedOrderId) return;
    let isMounted = true;

    async function fetchDetails() {
      setLoadingDetails(true);
      setDetailsError(null);
      try {
        const response = await api.get(`/orders/${selectedOrderId}`);
        if (isMounted) {
          if (response.data && response.data.status === 'success') {
            setOrderDetails(response.data.data);
          } else {
            setOrderDetails(response.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.response?.data?.message ||
            (err.response?.status === 404
              ? `Order #${selectedOrderId} not found (404).`
              : err.message || `Failed to fetch Order #${selectedOrderId}.`);
          setDetailsError(message);
        }
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
        }
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedOrderId]);

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
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary, #2563eb)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Customer Orders & Inspection
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
          My Orders & Details
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', marginTop: '4px', fontSize: '0.95rem' }}>
          Live customer order history and itemized inspection powered by TiDB & Flask API.
        </p>
      </div>

      {/* Checkout Pre-Flight Validation Panel */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Checkout Pre-Flight Validation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>
              Validates order payload structure against backend endpoint (<code>POST /api/orders/checkout</code>).
            </p>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'var(--info-bg, #f0f9ff)',
              color: 'var(--info-text, #0369a1)',
              border: '1px solid var(--info-border, #bae6fd)',
            }}
          >
            Structural Check Only
          </span>
        </div>

        {/* Validation Form */}
        <form onSubmit={handleValidateCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}
          >
            {/* User ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                User ID
              </label>
              <input
                type="number"
                value={checkoutUserId}
                onChange={(e) => setCheckoutUserId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Shipping City ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                Shipping City ID
              </label>
              <input
                type="number"
                value={shippingCityId}
                onChange={(e) => setShippingCityId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Variant ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                Variant ID
              </label>
              <input
                type="number"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Quantity */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="submit"
              disabled={validating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'var(--primary, #2563eb)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.88rem',
                border: 'none',
                cursor: validating ? 'not-allowed' : 'pointer',
                opacity: validating ? 0.75 : 1,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.2s',
              }}
            >
              {validating && (
                <svg
                  style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
              )}
              <span>{validating ? 'Validating...' : 'Validate Checkout Payload'}</span>
            </button>
          </div>
        </form>

        {/* Validation Success Banner */}
        {validationSuccess && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'var(--success-bg, #ecfdf5)',
              border: '1px solid var(--success-border, #a7f3d0)',
              color: 'var(--success-text, #047857)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem' }}>
              <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{validationSuccess.message || 'Payload passed verification.'}</span>
            </div>
            {validationSuccess.order_summary && (
              <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.95 }}>
                Order Summary: User #{validationSuccess.order_summary.user_id} · Destination City #{validationSuccess.order_summary.shipping_city_id} · Total Items: {validationSuccess.order_summary.total_items}
              </div>
            )}
          </div>
        )}

        {/* Authoritative Cost Summary Breakdown */}
        {calculationData && (
          <div
            style={{
              marginTop: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--bg-subtle, #f8fafc)',
              overflow: 'hidden',
            }}
          >
            {/* Header / Verified Entities */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-color, #e2e8f0)',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--primary, #2563eb)',
                    letterSpacing: '0.04em',
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  Verified Database Pricing
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                  Authoritative Cost Summary
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-secondary, #475569)' }}>
                <div>
                  Customer: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{calculationData.user || 'Unknown'}</strong>
                </div>
                <div>
                  Destination: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{calculationData.destination_city || 'Texas'}</strong>
                </div>
              </div>
            </div>

            {/* Verified Line Items Table */}
            <div style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                Verified Line Items ({calculationData.items?.length || 0})
              </div>

              {(!calculationData.items || calculationData.items.length === 0) ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                  No items calculated.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {calculationData.items.map((item, idx) => (
                    <div
                      key={item.variant_id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: '180px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main, #0f172a)', background: 'var(--bg-subtle, #f1f5f9)', padding: '2px 8px', borderRadius: '4px' }}>
                          {item.sku || `Variant #${item.variant_id}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-text, #047857)', background: 'var(--success-bg, #ecfdf5)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--success-border, #a7f3d0)' }}>
                          In Stock: {item.available_stock ?? 'N/A'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                          Qty: <strong>{item.quantity}</strong>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                          {formatCurrency(item.unit_price)}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', minWidth: '70px', textAlign: 'right' }}>
                          {formatCurrency(item.line_total)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div
              style={{
                borderTop: '1px solid var(--border-color, #e2e8f0)',
                padding: '16px 18px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary, #475569)' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(calculationData.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary, #475569)' }}>
                <span>Texas Shipping Fee</span>
                <span>{formatCurrency(calculationData.shipping_fee)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  color: 'var(--primary, #2563eb)',
                  borderTop: '1px dashed var(--border-color, #e2e8f0)',
                  paddingTop: '8px',
                  marginTop: '4px',
                }}
              >
                <span>Total Amount</span>
                <span>{formatCurrency(calculationData.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Failure Alert */}
        {validationError && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'var(--danger-bg, #fef2f2)',
              border: '1px solid var(--danger-border, #fecaca)',
              color: 'var(--danger-text, #b91c1c)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.88rem',
            }}
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
            <div>
              <strong>Validation Error:</strong> {validationError}
            </div>
          </div>
        )}
      </div>

      {/* Loading Orders State */}
      {loadingOrders && (
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
          <span>Fetching order history...</span>
        </div>
      )}

      {/* Orders Error Alert */}
      {!loadingOrders && ordersError && (
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
            <span style={{ fontSize: '0.9rem' }}>{ordersError}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingOrders && !ordersError && orders.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            borderRadius: '12px',
            background: 'var(--bg-card, #ffffff)',
            border: '1px dashed var(--border-color, #e2e8f0)',
            color: 'var(--text-muted, #64748b)',
            fontSize: '0.95rem',
            textAlign: 'center',
          }}
        >
          No past orders found for this customer.
        </div>
      )}

      {/* Main Container: Orders List & Detailed Inspection */}
      {!loadingOrders && !ordersError && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Order Selector List */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Past Orders ({orders.length}) — Click an order to inspect details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((ord) => {
                const isSelected = ord.order_id === selectedOrderId;
                const items = ord.items || [];
                return (
                  <div
                    key={ord.order_id}
                    onClick={() => setSelectedOrderId(ord.order_id)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-light, #eff6ff)' : 'var(--bg-card, #ffffff)',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid var(--primary, #2563eb)'
                        : '1px solid var(--border-color, #e2e8f0)',
                      padding: '20px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(37, 99, 235, 0.12)'
                        : '0 1px 4px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    {/* Header Row: ID, Status, Placed Date, Shipment, and Total */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          #{ord.order_id}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            ...getStatusBadgeStyle(ord.status),
                          }}
                        >
                          {ord.status || 'UNKNOWN'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                          Placed on {new Date(ord.placed_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                          Shipment: <strong style={{ color: 'var(--text-secondary, #475569)' }}>{ord.shipment_id ? `#${ord.shipment_id}` : 'Unassigned'}</strong>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary, #2563eb)' }}>
                          {formatCurrency(ord.total_amount)}
                        </div>
                      </div>
                    </div>

                    {/* Nested Itemized Breakdown per Order Card */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-color, #e2e8f0)',
                        paddingTop: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Itemized Products ({items.length})
                      </div>

                      {items.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontStyle: 'italic', padding: '6px 0' }}>
                          No line items recorded.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {items.map((item) => (
                            <div
                              key={item.order_item_id || item.variant_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: isSelected ? '#ffffff' : 'var(--bg-subtle, #f8fafc)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                              }}
                            >
                              <div style={{ minWidth: '200px', flex: '1 1 auto' }}>
                                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                                  {item.product_title}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                                  {item.attribute_name && item.attribute_value && (
                                    <span>
                                      {item.attribute_name}: {item.attribute_value}
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
                                      {item.sku}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                                  Qty: {item.quantity}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                                  {formatCurrency(item.unit_price)}
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', minWidth: '70px', textAlign: 'right' }}>
                                  {formatCurrency(item.line_total)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Inspection Area for Selected Order */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Selected Order Inspection
            </div>

            {loadingDetails && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '40px 24px',
                  background: 'var(--bg-card, #ffffff)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-secondary, #475569)',
                  fontSize: '0.95rem',
                }}
              >
                <svg
                  style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
                <span>Loading details for Order #{selectedOrderId}...</span>
              </div>
            )}

            {!loadingDetails && detailsError && (
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--danger-bg, #fef2f2)',
                  border: '1px solid var(--danger-border, #fecaca)',
                  color: 'var(--danger-text, #b91c1c)',
                }}
              >
                <strong>Inspection Query Failed:</strong> {detailsError}
              </div>
            )}

            {!loadingDetails && !detailsError && orderDetails && (
              <div
                style={{
                  background: 'var(--bg-card, #ffffff)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
                  overflow: 'hidden',
                }}
              >
                {/* Detail Card Header */}
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
                      Inspecting Record
                    </span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                      Order #{orderDetails.order_id}
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
                      ...getStatusBadgeStyle(orderDetails.status),
                    }}
                  >
                    {orderDetails.status || 'UNKNOWN'}
                  </span>
                </div>

                {/* Field Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    padding: '24px',
                  }}
                >
                  <div style={{ padding: '14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Customer ID</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>User #{orderDetails.user_id ?? 'N/A'}</div>
                  </div>

                  <div style={{ padding: '14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Shipment ID</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{orderDetails.shipment_id ? `#${orderDetails.shipment_id}` : 'Unassigned'}</div>
                  </div>

                  <div style={{ padding: '14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Placed Date</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{formatDate(orderDetails.placed_at)}</div>
                  </div>

                  <div style={{ padding: '14px', background: 'var(--primary-light, #eff6ff)', borderRadius: '10px', border: '1px solid var(--primary-border, #bfdbfe)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary, #2563eb)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary, #2563eb)' }}>{formatCurrency(orderDetails.total_amount)}</div>
                  </div>
                </div>

                {/* Line Items Section */}
                <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 16px 0' }}>
                    Itemized Line Items
                  </h3>

                  {(!orderDetails.items || orderDetails.items.length === 0) ? (
                    <div
                      style={{
                        padding: '18px',
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
                      {orderDetails.items.map((item) => (
                        <div
                          key={item.order_item_id || item.variant_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '16px',
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            background: 'var(--bg-card, #ffffff)',
                          }}
                        >
                          <div style={{ minWidth: '220px', flex: '1 1 auto' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: '4px' }}>
                              {item.product_title}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                                {formatCurrency(item.unit_price)} × {item.quantity}
                              </div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
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
        </div>
      )}
    </div>
  );
}



