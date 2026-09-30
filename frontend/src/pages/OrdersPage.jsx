import { useState, useEffect } from 'react';
import api from '../api/client';

export default function OrdersPage() {
  // Navigation Tabs: 'checkout' | 'history' | 'lookup'
  const [activeTab, setActiveTab] = useState('checkout');

  // Customer Order History States
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  // Single Order Inspection States
  const [selectedOrderId, setSelectedOrderId] = useState(1);
  const [lookupInput, setLookupInput] = useState('1');
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // User Identity Resolution
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const activeUserId = parsedUser?.user_id || parsedUser?.id || 4;
  const userName = parsedUser?.full_name || parsedUser?.name || `Customer #${activeUserId}`;

  // Checkout Pre-Flight Validation Form States
  const [checkoutUserId, setCheckoutUserId] = useState(activeUserId);
  const [shippingCityId, setShippingCityId] = useState(1);
  const [variantId, setVariantId] = useState(1);
  const [quantity, setQuantity] = useState(1);

  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(null);
  const [calculationData, setCalculationData] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [stockConflict, setStockConflict] = useState(null);

  // Live Order Placement (validate_only: false) States
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placementSuccess, setPlacementSuccess] = useState(null);
  const [placementError, setPlacementError] = useState(null);

  // 1. Fetch customer past orders on mount or user change
  const fetchCustomerOrders = async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const response = await api.get(`/orders/user/${activeUserId}`);
      if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
        const fetchedOrders = response.data.data;
        setOrders(fetchedOrders);
        if (fetchedOrders.length > 0 && !selectedOrderId) {
          setSelectedOrderId(fetchedOrders[0].order_id);
          setLookupInput(String(fetchedOrders[0].order_id));
        }
      } else if (Array.isArray(response.data)) {
        setOrders(response.data);
        if (response.data.length > 0 && !selectedOrderId) {
          setSelectedOrderId(response.data[0].order_id);
          setLookupInput(String(response.data[0].order_id));
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? `No orders found for customer #${activeUserId} (404).`
          : err.message || 'Failed to fetch customer orders.');
      setOrdersError(message);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, [activeUserId]);

  // 2. Fetch single order details whenever selectedOrderId changes
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
              ? `Order #${selectedOrderId} does not exist in the database (404).`
              : err.message || `Failed to fetch Order #${selectedOrderId}.`);
          setDetailsError(message);
          setOrderDetails(null);
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

  // Pre-Flight Estimation Handler (validate_only: true)
  const handleValidateCheckout = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setValidating(true);
    setValidationSuccess(null);
    setCalculationData(null);
    setValidationError(null);
    setStockConflict(null);
    setPlacementSuccess(null);
    setPlacementError(null);

    const payload = {
      user_id: parseInt(checkoutUserId, 10),
      shipping_city_id: parseInt(shippingCityId, 10),
      validate_only: true,
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
      const resData = err.response?.data;
      if (err.response?.status === 409 || resData?.code === 'OUT_OF_STOCK') {
        setStockConflict(
          resData?.message || 'Insufficient stock for requested items. Quantity exceeds available warehouse inventory.'
        );
      } else {
        const msg =
          resData?.message ||
          (err.response?.status === 404
            ? 'Referenced entity not found (User, Texas City, or Product Variant 404).'
            : err.response?.status === 400
            ? 'Validation failed: Invalid checkout payload.'
            : err.message || 'Error occurred while validating payload.');
        setValidationError(msg);
      }
    } finally {
      setValidating(false);
    }
  };

  // Live Order Placement Handler (validate_only: false)
  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setPlacementSuccess(null);
    setPlacementError(null);
    setStockConflict(null);

    const payload = {
      user_id: parseInt(checkoutUserId, 10),
      shipping_city_id: parseInt(shippingCityId, 10),
      validate_only: false,
      items: [
        {
          variant_id: parseInt(variantId, 10),
          quantity: parseInt(quantity, 10),
        },
      ],
    };

    try {
      const response = await api.post('/orders/checkout', payload);
      if (response.data && (response.status === 201 || response.data.status === 'success')) {
        const orderData = response.data.data;
        setPlacementSuccess(orderData);
        // Refresh customer orders history so it immediately includes the new order
        fetchCustomerOrders();
        // Update selected order ID for inspection tab
        if (orderData?.order_id) {
          setSelectedOrderId(orderData.order_id);
          setLookupInput(String(orderData.order_id));
        }
      } else {
        setPlacementSuccess(response.data);
      }
    } catch (err) {
      const resData = err.response?.data;
      if (err.response?.status === 409 || resData?.code === 'OUT_OF_STOCK') {
        setStockConflict(
          resData?.message || 'Insufficient stock to complete purchase under pessimistic transactional lock.'
        );
      } else {
        const msg =
          resData?.message ||
          (err.response?.status === 404
            ? 'Referenced entity not found (404).'
            : err.response?.status === 400
            ? 'Order execution failed: Invalid payload.'
            : err.message || 'Error occurred while placing live order.');
        setPlacementError(msg);
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  // Lookup Order by ID Form Submit
  const handleLookupSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const id = parseInt(lookupInput, 10);
    if (id && id > 0) {
      setSelectedOrderId(id);
    }
  };

  // Helper styles for badges
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
    <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Top Header & Identity Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px 28px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--primary, #2563eb)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            <span>StockFlow E-Commerce Operations</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Orders & Checkout Center
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            ACID transaction execution, pessimistic stock reservation, pre-flight estimation, and live tracking.
          </p>
        </div>

        {/* User Identity Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-subtle, #f8fafc)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--primary-light, #eff6ff)',
              color: 'var(--primary, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            {activeUserId}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Customer
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {userName}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: 'var(--bg-subtle, #f1f5f9)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'checkout' ? 700 : 500,
            border: 'none',
            background: activeTab === 'checkout' ? '#ffffff' : 'transparent',
            color: activeTab === 'checkout' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #475569)',
            boxShadow: activeTab === 'checkout' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Checkout & Place Order</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'history' ? 700 : 500,
            border: 'none',
            background: activeTab === 'history' ? '#ffffff' : 'transparent',
            color: activeTab === 'history' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #475569)',
            boxShadow: activeTab === 'history' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Order History ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'lookup' ? 700 : 500,
            border: 'none',
            background: activeTab === 'lookup' ? '#ffffff' : 'transparent',
            color: activeTab === 'lookup' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #475569)',
            boxShadow: activeTab === 'lookup' ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Track / Inspect Order #{selectedOrderId || ''}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHECKOUT & PLACE ORDER (PRE-FLIGHT + LIVE ACID PLACEMENT)          */}
      {/* ========================================================================= */}
      {activeTab === 'checkout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Form Card */}
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                  Order Checkout & Pre-Flight Verification
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #64748b)', margin: '3px 0 0 0' }}>
                  Estimate delivery fees and live TiDB pricing with <code>validate_only: true</code>, then execute live purchase.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'var(--primary-light, #eff6ff)',
                  color: 'var(--primary, #2563eb)',
                  border: '1px solid var(--primary-border, #bfdbfe)',
                }}
              >
                Pessimistic Lock Protected
              </span>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handleValidateCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* User ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Customer User ID
                  </label>
                  <input
                    type="number"
                    value={checkoutUserId}
                    onChange={(e) => setCheckoutUserId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '3px', display: 'block' }}>
                    Active customer is #{activeUserId}
                  </span>
                </div>

                {/* Shipping City ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Texas City ID (Shipping)
                  </label>
                  <input
                    type="number"
                    value={shippingCityId}
                    onChange={(e) => setShippingCityId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '3px', display: 'block' }}>
                    1: Dallas, 2: Houston, 3: Austin
                  </span>
                </div>

                {/* Variant ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Product Variant ID
                  </label>
                  <input
                    type="number"
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '3px', display: 'block' }}>
                    Product catalog SKU variant
                  </span>
                </div>

                {/* Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Purchase Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '3px', display: 'block' }}>
                    Must be at least 1 unit
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={validating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--primary, #2563eb)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: validating ? 'not-allowed' : 'pointer',
                    opacity: validating ? 0.75 : 1,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {validating ? (
                    <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>{validating ? 'Verifying & Reserving...' : '1. Run Pre-Flight Price & Stock Check'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--success, #10b981)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: placingOrder ? 'not-allowed' : 'pointer',
                    opacity: placingOrder ? 0.75 : 1,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {placingOrder ? (
                    <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span>{placingOrder ? 'Executing ACID Transaction...' : '2. Place Order (Live Transaction) 🚀'}</span>
                </button>
              </div>
            </form>

            {/* Validation Success Banner */}
            {validationSuccess && (
              <div
                style={{
                  marginTop: '18px',
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
                  <span>{validationSuccess.message || 'Payload passed verification and lock checks.'}</span>
                </div>
                {validationSuccess.order_summary && (
                  <div style={{ fontSize: '0.82rem', opacity: 0.95 }}>
                    Order Summary: User #{validationSuccess.order_summary.user_id} · Destination City #{validationSuccess.order_summary.shipping_city_id} · Items: {validationSuccess.order_summary.total_items}
                  </div>
                )}
              </div>
            )}

            {/* Stock Conflict Warning Banner (HTTP 409 OUT_OF_STOCK) */}
            {stockConflict && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: 'var(--warning-bg, #fffbeb)',
                  border: '1px solid var(--warning-border, #fde68a)',
                  color: 'var(--warning-text, #b45309)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
                }}
              >
                <svg
                  style={{ width: '22px', height: '22px', flexShrink: 0, marginTop: '2px' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                    Inventory Conflict (Out of Stock - HTTP 409)
                  </div>
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {stockConflict}
                  </div>
                  <div style={{ fontSize: '0.78rem', marginTop: '6px', opacity: 0.9 }}>
                    The requested quantity exceeds live TiDB database stock under transactional lock. Reduce quantity to proceed.
                  </div>
                </div>
              </div>
            )}

            {/* Validation / Execution Errors */}
            {(validationError || placementError) && (
              <div
                style={{
                  marginTop: '18px',
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
                  <strong>Checkout Error:</strong> {validationError || placementError}
                </div>
              </div>
            )}

            {/* Live Order Placement Success Banner */}
            {placementSuccess && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '20px 24px',
                  borderRadius: '12px',
                  background: 'var(--success-bg, #ecfdf5)',
                  border: '1px solid var(--success-border, #a7f3d0)',
                  color: 'var(--success-text, #047857)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.1rem' }}>
                    <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Order #{placementSuccess.order_id} Placed & ACID Committed!</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: '#ffffff', color: 'var(--success-text, #047857)', border: '1px solid var(--success-border, #a7f3d0)' }}>
                    Inventory Decremented
                  </span>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', opacity: 0.95 }}>
                  The transaction was atomically committed: shipment tracking was created, stock decremented, and order items persisted.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '8px',
                    border: '1px solid var(--success-border, #a7f3d0)',
                    color: 'var(--text-main, #0f172a)',
                    fontSize: '0.85rem',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block' }}>Order ID</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary, #2563eb)' }}>#{placementSuccess.order_id}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block' }}>Shipment ID</span>
                    <strong>#{placementSuccess.shipment_id}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block' }}>Tracking Number</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--text-main, #0f172a)' }}>{placementSuccess.tracking_number}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', display: 'block' }}>Total Charged</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--success-text, #047857)' }}>{formatCurrency(placementSuccess.total_amount)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (placementSuccess.order_id) {
                        setSelectedOrderId(placementSuccess.order_id);
                        setLookupInput(String(placementSuccess.order_id));
                        setActiveTab('lookup');
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Track & Inspect Order #{placementSuccess.order_id} →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      color: 'var(--text-main, #0f172a)',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      cursor: 'pointer',
                    }}
                  >
                    View in Order History
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Authoritative Cost Summary Breakdown */}
          {calculationData && (
            <div
              style={{
                borderRadius: '16px',
                border: '1px solid var(--border-color, #e2e8f0)',
                background: '#ffffff',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                overflow: 'hidden',
              }}
            >
              {/* Header / Verified Entities */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  background: 'var(--bg-subtle, #f8fafc)',
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
                      letterSpacing: '0.05em',
                      display: 'block',
                      marginBottom: '2px',
                    }}
                  >
                    Verified Database Pricing
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                    Authoritative Cost Summary
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)' }}>
                  <div>
                    Customer: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{calculationData.user || 'Unknown'}</strong>
                  </div>
                  <div>
                    Destination: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{calculationData.destination_city || 'Texas'}</strong>
                  </div>
                </div>
              </div>

              {/* Verified Line Items Table */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Verified Line Items ({calculationData.items?.length || 0})
                </div>

                {(!calculationData.items || calculationData.items.length === 0) ? (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                    No items calculated.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {calculationData.items.map((item, idx) => (
                      <div
                        key={item.variant_id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'var(--bg-subtle, #f8fafc)',
                          border: '1px solid var(--border-color, #e2e8f0)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: '180px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #0f172a)', background: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)' }}>
                            {item.sku || `Variant #${item.variant_id}`}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-text, #047857)', background: 'var(--success-bg, #ecfdf5)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--success-border, #a7f3d0)' }}>
                            Available Stock: {item.available_stock ?? 'N/A'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                            Qty: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{item.quantity}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                            {formatCurrency(item.unit_price)}
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', minWidth: '80px', textAlign: 'right' }}>
                            {formatCurrency(item.line_total)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Totals & CTA */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color, #e2e8f0)',
                  padding: '20px 24px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--text-secondary, #475569)' }}>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(calculationData.subtotal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--text-secondary, #475569)' }}>
                  <span>Texas Shipping Fee ({calculationData.destination_city || 'Regional'})</span>
                  <strong>{formatCurrency(calculationData.shipping_fee)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--primary, #2563eb)',
                    borderTop: '1px dashed var(--border-color, #e2e8f0)',
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}
                >
                  <span>Grand Total</span>
                  <span>{formatCurrency(calculationData.total_amount)}</span>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={placingOrder}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 24px',
                      borderRadius: '8px',
                      background: 'var(--success, #10b981)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.94rem',
                      border: 'none',
                      cursor: placingOrder ? 'not-allowed' : 'pointer',
                      opacity: placingOrder ? 0.75 : 1,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {placingOrder ? (
                      <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>{placingOrder ? 'Processing Purchase...' : 'Confirm & Place Live Order'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER ORDER HISTORY WITH NESTED LINE ITEMS                     */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* History Header Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '18px 24px',
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Past Order History
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>
                All historical purchases for Customer #{activeUserId} ({userName})
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCustomerOrders}
              disabled={loadingOrders}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--bg-subtle, #f1f5f9)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid var(--border-color, #cbd5e1)',
                cursor: loadingOrders ? 'not-allowed' : 'pointer',
              }}
            >
              <svg style={{ width: '14px', height: '14px', animation: loadingOrders ? 'spin 1s linear infinite' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loadingOrders ? 'Refreshing...' : 'Refresh Orders'}</span>
            </button>
          </div>

          {/* Loading Orders */}
          {loadingOrders && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '48px 24px',
                background: 'var(--bg-card, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #e2e8f0)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '0.95rem',
              }}
            >
              <svg style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              <span>Fetching customer orders...</span>
            </div>
          )}

          {/* Orders Fetch Error */}
          {!loadingOrders && ordersError && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--danger-bg, #fef2f2)',
                border: '1px solid var(--danger-border, #fecaca)',
                color: 'var(--danger-text, #b91c1c)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Unable to load past orders:</strong> {ordersError}
              </div>
            </div>
          )}

          {/* Empty Orders State */}
          {!loadingOrders && !ordersError && orders.length === 0 && (
            <div
              style={{
                padding: '60px 24px',
                borderRadius: '16px',
                background: 'var(--bg-card, #ffffff)',
                border: '1px dashed var(--border-color, #e2e8f0)',
                textAlign: 'center',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 4px 0' }}>
                No past orders found
              </h3>
              <p style={{ fontSize: '0.88rem', margin: '0 0 16px 0' }}>
                You have not placed any orders yet. Place your first order using the Checkout tab!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('checkout')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Go to Checkout Tab
              </button>
            </div>
          )}

          {/* Orders List Cards */}
          {!loadingOrders && !ordersError && orders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((ord) => {
                const items = ord.items || [];
                const isCurrentSelected = ord.order_id === selectedOrderId;
                return (
                  <div
                    key={ord.order_id}
                    style={{
                      background: 'var(--bg-card, #ffffff)',
                      borderRadius: '16px',
                      border: isCurrentSelected ? '2px solid var(--primary, #2563eb)' : '1px solid var(--border-color, #e2e8f0)',
                      padding: '22px 24px',
                      boxShadow: isCurrentSelected ? '0 4px 16px rgba(37, 99, 235, 0.1)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Header Row: ID, Badge, Date, Shipment, and Total */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                          Order #{ord.order_id}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                          Placed: <strong style={{ color: 'var(--text-secondary, #475569)' }}>{formatDate(ord.placed_at)}</strong>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                          Shipment: <strong style={{ color: 'var(--text-secondary, #475569)' }}>{ord.shipment_id ? `#${ord.shipment_id}` : 'Unassigned'}</strong>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary, #2563eb)' }}>
                          {formatCurrency(ord.total_amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(ord.order_id);
                            setLookupInput(String(ord.order_id));
                            setActiveTab('lookup');
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: isCurrentSelected ? 'var(--primary, #2563eb)' : 'var(--bg-subtle, #f1f5f9)',
                            color: isCurrentSelected ? '#ffffff' : 'var(--text-secondary, #475569)',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Inspect Details →
                        </button>
                      </div>
                    </div>

                    {/* Itemized Line Items for Order */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-color, #e2e8f0)',
                        paddingTop: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Itemized Products ({items.length})
                      </div>

                      {items.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontStyle: 'italic', padding: '4px 0' }}>
                          No line items recorded for this order.
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
                                gap: '10px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: 'var(--bg-subtle, #f8fafc)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                              }}
                            >
                              <div style={{ minWidth: '200px', flex: '1 1 auto' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                                  {item.product_title}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                                  {item.attribute_name && item.attribute_value && (
                                    <span>
                                      {item.attribute_name}: <strong>{item.attribute_value}</strong>
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span style={{ fontFamily: 'monospace', background: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)' }}>
                                      {item.sku}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SINGLE ORDER INSPECTION & TRACKING                                 */}
      {/* ========================================================================= */}
      {activeTab === 'lookup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lookup Input Bar */}
          <div
            style={{
              padding: '20px 24px',
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
                Single Order Inspection (`GET /api/orders/:id`)
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted, #64748b)', margin: '3px 0 0 0' }}>
                Lookup any order record in TiDB by ID to inspect header details, delivery shipment ID, and nested order items.
              </p>
            </div>

            <form onSubmit={handleLookupSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min="1"
                placeholder="Enter Order ID (e.g. 1)"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                style={{
                  width: '240px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loadingDetails}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: loadingDetails ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {loadingDetails ? (
                  <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <span>Inspect Order</span>
              </button>

              {orders.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Quick Pick:</span>
                  {orders.slice(0, 4).map((ord) => (
                    <button
                      key={ord.order_id}
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(ord.order_id);
                        setLookupInput(String(ord.order_id));
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: selectedOrderId === ord.order_id ? 'var(--primary-light, #eff6ff)' : 'var(--bg-subtle, #f1f5f9)',
                        color: selectedOrderId === ord.order_id ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #475569)',
                        border: selectedOrderId === ord.order_id ? '1px solid var(--primary-border, #bfdbfe)' : '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      #{ord.order_id}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Loading Details State */}
          {loadingDetails && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '48px 24px',
                background: 'var(--bg-card, #ffffff)',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #e2e8f0)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '0.95rem',
              }}
            >
              <svg style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              <span>Loading details for Order #{selectedOrderId}...</span>
            </div>
          )}

          {/* Error Details State */}
          {!loadingDetails && detailsError && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'var(--danger-bg, #fef2f2)',
                border: '1px solid var(--danger-border, #fecaca)',
                color: 'var(--danger-text, #b91c1c)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Inspection Query Error:</strong> {detailsError}
              </div>
            </div>
          )}

          {/* Order Details Presentation Card */}
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
              {/* Detail Header */}
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
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted, #64748b)',
                      letterSpacing: '0.05em',
                      display: 'block',
                      marginBottom: '2px',
                    }}
                  >
                    Database Record
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
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
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Customer ID</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>User #{orderDetails.user_id ?? 'N/A'}</div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Shipment ID</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{orderDetails.shipment_id ? `#${orderDetails.shipment_id}` : 'Unassigned'}</div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Placed Date</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{formatDate(orderDetails.placed_at)}</div>
                </div>

                <div style={{ padding: '14px', background: 'var(--primary-light, #eff6ff)', borderRadius: '10px', border: '1px solid var(--primary-border, #bfdbfe)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--primary, #2563eb)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary, #2563eb)' }}>{formatCurrency(orderDetails.total_amount)}</div>
                </div>
              </div>

              {/* Line Items Section */}
              <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 16px 0' }}>
                  Itemized Line Items ({orderDetails.items?.length || 0})
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
                    No line items attached to this order record.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
      )}
    </div>
  );
}
