import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import headsetImg from '../../assets/headset.png';

export default function OrderLookupView({ initialOrderId = 1, onBackToHistory, isStaff = false }) {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [customerOrdersList, setCustomerOrdersList] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [lookupMessage, setLookupMessage] = useState(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);

  const fetchOrderDetails = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data?.status === 'success' && res.data.data) {
        setOrderData(res.data.data);
      } else {
        setOrderData(null);
        setError(`Order #${id} not found.`);
      }
    } catch (err) {
      setOrderData(null);
      const resMsg = err.response?.data?.message;
      if (err.response?.status === 403) {
        setError(resMsg || 'Access forbidden: You cannot view orders belonging to another customer.');
      } else if (err.response?.status === 404) {
        setError(`Order #${id} does not exist in the platform registry (404).`);
      } else {
        setError(resMsg || err.message || 'Failed to inspect order record.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      setSearchOrderId(initialOrderId);
      fetchOrderDetails(initialOrderId);
    }
  }, [initialOrderId]);

  const handleFilterCustomer = async () => {
    if (!filterCustomerId) return;
    setFetchingCustomer(true);
    setLookupMessage(null);
    try {
      const res = await api.get(`/orders/user/${filterCustomerId}`);
      const orders = res.data?.status === 'success' && Array.isArray(res.data.data)
        ? res.data.data
        : (Array.isArray(res.data) ? res.data : []);

      setCustomerOrdersList(orders);
      if (orders.length > 0) {
        const custName = orders[0].customer_name || null;
        setCustomerInfo({ id: filterCustomerId, name: custName });
        // Automatically inspect the latest order
        fetchOrderDetails(orders[0].order_id);
        setSearchOrderId(orders[0].order_id);
      } else {
        setCustomerInfo({ id: filterCustomerId, name: null });
        setLookupMessage(`No orders recorded for Customer #${filterCustomerId}.`);
      }
    } catch (err) {
      setCustomerOrdersList([]);
      setCustomerInfo(null);
      const resMsg = err.response?.data?.message;
      setLookupMessage(resMsg || `Error loading orders for Customer #${filterCustomerId}.`);
    } finally {
      setFetchingCustomer(false);
    }
  };

  const handleLookupOrder = () => {
    if (!searchOrderId) return;
    fetchOrderDetails(searchOrderId);
  };

  // Commercial Order Lifecycle Progress
  const getTimelineProgress = (status) => {
    const steps = [
      { key: 'PLACED', label: 'Order Placed', desc: 'Order received & confirmed' },
      { key: 'CONFIRMED', label: 'Processing', desc: 'Preparing for fulfillment' },
      { key: 'FULFILLED', label: 'Fulfilled', desc: 'Delivered & completed' },
    ];

    let activeIndex = 0;
    if (status === 'CONFIRMED') activeIndex = 1;
    else if (status === 'SHIPPED' || status === 'DELIVERED') activeIndex = 2;
    else if (status === 'CANCELLED') activeIndex = -1;

    return { steps, activeIndex };
  };

  const { steps, activeIndex } = getTimelineProgress(orderData?.status);

  return (
    <div style={{ padding: '32px 0', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Header and Lookup Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onBackToHistory && (
              <button
                type="button"
                onClick={onBackToHistory}
                style={{ background: 'none', border: 'none', color: '#0264d6', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
              >
                &lt; Back to Orders
              </button>
            )}
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Order Details &amp; Receipt
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Itemized order summary, shipping address, and tracking status for Order #{orderData?.order_id || searchOrderId || initialOrderId}
            {orderData?.customer_name ? ` • Customer: ${orderData.customer_name} (ID: #${orderData.user_id})` : orderData?.user_id ? ` • Customer #${orderData.user_id}` : ''}.
          </p>
        </div>

        {onBackToHistory && (
          <button
            type="button"
            onClick={onBackToHistory}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>&larr;</span>
            <span>Back to Orders</span>
          </button>
        )}
      </div>

      {/* Staff / Manager Inspection Toolbar */}
      {isStaff && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  Staff Order Search
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Look up by Customer ID or Order ID
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Filter Customer ID (exact UI moved from My Orders) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Filter Customer ID:</span>
                <input
                  type="number"
                  placeholder="e.g. 150003"
                  value={filterCustomerId}
                  onChange={(e) => setFilterCustomerId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFilterCustomer()}
                  style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
                <button
                  type="button"
                  onClick={handleFilterCustomer}
                  disabled={fetchingCustomer}
                  style={{
                    padding: '6px 14px',
                    background: '#0264d6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {fetchingCustomer ? 'Fetching...' : 'Fetch'}
                </button>
              </div>

              <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

              {/* Direct Order ID Inspector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Order ID:</span>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupOrder()}
                  style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
                <button
                  type="button"
                  onClick={handleLookupOrder}
                  style={{
                    padding: '6px 14px',
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Inspect
                </button>
              </div>
            </div>
          </div>

          {/* Quick Order Selection Chips if filtered customer has orders */}
          {customerOrdersList && customerOrdersList.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {customerInfo?.name ? `${customerInfo.name} ` : ''}(ID: #{customerInfo?.id || filterCustomerId}) Orders ({customerOrdersList.length}):
              </span>
              {customerOrdersList.map((ord) => {
                const isSelected = orderData?.order_id === ord.order_id;
                return (
                  <button
                    key={ord.order_id}
                    type="button"
                    onClick={() => {
                      setSearchOrderId(ord.order_id);
                      fetchOrderDetails(ord.order_id);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: isSelected ? '#0264d6' : '#cbd5e1',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#0264d6' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    #{ord.order_id} • {ord.status}
                  </button>
                );
              })}
            </div>
          )}

          {lookupMessage && (
            <div style={{ fontSize: '0.8rem', color: '#b91c1c', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
              {lookupMessage}
            </div>
          )}
        </div>
      )}

      {/* Error / Data Isolation Alert */}
      {error && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #ffe4e6',
            borderRadius: '10px',
            padding: '16px 20px',
            color: '#9f1239',
            fontSize: '0.875rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <div>
              <strong>Access Alert:</strong> {error}
            </div>
          </div>
          {onBackToHistory && (
            <button
              type="button"
              onClick={onBackToHistory}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Return to My Orders
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }} />
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Retrieving order ledger & tracking records...</div>
        </div>
      ) : orderData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Order Overview Header Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Order #{orderData.order_id}</h2>
                  <span
                    style={{
                      background: orderData.status === 'CANCELLED' ? '#fee2e2' : orderData.status === 'DELIVERED' ? '#dcfce7' : '#e0f2fe',
                      color: orderData.status === 'CANCELLED' ? '#b91c1c' : orderData.status === 'DELIVERED' ? '#15803d' : '#0369a1',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {orderData.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Placed on {orderData.placed_at ? new Date(orderData.placed_at).toLocaleString() : 'N/A'} • {orderData.customer_name ? `${orderData.customer_name} (ID: #${orderData.user_id})` : `Customer #${orderData.user_id}`}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Settled</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0264d6' }}>
                  Rs {parseFloat(orderData.total_amount).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Visual Commercial Order Timeline */}
            {orderData.status !== 'CANCELLED' ? (
              <div style={{ margin: '32px 0 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, position: 'relative' }}>
                  {/* Background Progress Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '12%',
                      right: '12%',
                      height: '4px',
                      background: '#e2e8f0',
                      zIndex: 1,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '12%',
                      width: `${(activeIndex / (steps.length - 1)) * 76}%`,
                      height: '4px',
                      background: '#0264d6',
                      zIndex: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />

                  {steps.map((st, i) => {
                    const isDone = i <= activeIndex;
                    const isCurrent = i === activeIndex;
                    return (
                      <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 3 }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: isDone ? '#0264d6' : '#ffffff',
                            color: isDone ? '#ffffff' : '#94a3b8',
                            border: isDone ? '2px solid #0264d6' : '2px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            marginBottom: '8px',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(2, 100, 214, 0.2)' : 'none',
                          }}
                        >
                          {isDone ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: isDone ? 700 : 500, color: isDone ? '#0f172a' : '#64748b' }}>
                          {st.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', maxWidth: '140px' }}>
                          {st.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '14px', color: '#991b1b', fontSize: '0.875rem' }}>
                ⚠️ <strong>Order Cancelled:</strong> This order was cancelled. Reserved inventory was restored to the warehouse catalog.
              </div>
            )}
          </div>

          {/* Details Grid: Commercial Overview & Recipient Snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Commercial Order Summary Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span>
                <span>Commercial Order Overview</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Order Reference:</span>
                  <span style={{ fontWeight: 700, color: '#0264d6', fontFamily: 'monospace' }}>
                    #{orderData.order_id}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Order Status:</span>
                  <span
                    style={{
                      background: orderData.status === 'CANCELLED' ? '#fee2e2' : orderData.status === 'CONFIRMED' ? '#fef3c7' : '#e0f2fe',
                      color: orderData.status === 'CANCELLED' ? '#b91c1c' : orderData.status === 'CONFIRMED' ? '#b45309' : '#0369a1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {orderData.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Customer Account:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {orderData.customer_name ? `${orderData.customer_name} (ID: #${orderData.user_id})` : `Customer #${orderData.user_id}`}
                  </span>
                </div>
                {orderData.customer_email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Customer Email:</span>
                    <span style={{ fontWeight: 500, color: '#475569' }}>
                      {orderData.customer_email}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Placed Date:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {orderData.placed_at ? new Date(orderData.placed_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Fulfillment Method:</span>
                  <span style={{ fontWeight: 600, color: '#0264d6' }}>
                    {orderData.delivery_type === 'PICKUP' ? 'Store Pickup' : 'Doorstep Delivery'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient & Shipping Snapshot Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📍</span>
                <span>Delivery & Recipient Snapshot</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Recipient Name</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {orderData.recipient_name || orderData.customer_name || `Customer #${orderData.user_id}`}
                  </div>
                </div>
                {orderData.phone && (
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Contact Phone</div>
                    <div style={{ color: '#0f172a' }}>{orderData.phone}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Shipping Destination</div>
                  <div style={{ color: '#1e293b', lineHeight: 1.4 }}>
                    {orderData.shipping_address || orderData.delivery_address || 'Regional Shipping Hub Destination'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Fulfillment Type</div>
                  <div style={{ fontWeight: 600, color: '#0264d6' }}>
                    {orderData.delivery_type === 'PICKUP' ? 'In-Store Pickup' : 'Direct Doorstep Delivery'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Domain Separation Info Notice */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.8125rem',
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚚</span>
              <span>Looking for physical courier tracking, package dispatch, or delivery waypoints?</span>
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
              }}
            >
              <span>View in Logistics</span>
              <span>&rarr;</span>
            </Link>
          </div>

          {/* Itemized Line Items & Financial Matrix */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Itemized Product Matrix</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Product</th>
                    <th style={{ padding: '10px 12px' }}>SKU</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(orderData.items) && orderData.items.length > 0 ? (
                    orderData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={headsetImg} alt="Thumb" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_title || `Product Variant #${item.variant_id}`}</div>
                            {item.attribute_value && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.attribute_value}</div>}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', fontFamily: 'monospace', color: '#475569' }}>{item.sku || 'N/A'}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>Rs {parseFloat(item.unit_price).toFixed(2)}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          Rs {(item.quantity * parseFloat(item.unit_price)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No line item records stored.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fee Breakdown Summary */}
            <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '48px', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#0f172a', minWidth: '90px', textAlign: 'right' }}>
                  Rs {parseFloat(orderData.subtotal || orderData.total_amount).toFixed(2)}
                </span>
              </div>
              {orderData.service_fee !== undefined && (
                <div style={{ display: 'flex', gap: '48px', color: '#64748b' }}>
                  <span>Online Service Fee:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', minWidth: '90px', textAlign: 'right' }}>
                    Rs {parseFloat(orderData.service_fee).toFixed(2)}
                  </span>
                </div>
              )}
              {orderData.shipping_fee !== undefined && (
                <div style={{ display: 'flex', gap: '48px', color: '#64748b' }}>
                  <span>Shipping Fee:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', minWidth: '90px', textAlign: 'right' }}>
                    Rs {parseFloat(orderData.shipping_fee).toFixed(2)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '48px', fontSize: '1.1rem', fontWeight: 800, color: '#0264d6', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span>Grand Total:</span>
                <span style={{ minWidth: '90px', textAlign: 'right' }}>Rs {parseFloat(orderData.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Ledger Snapshot Card */}
          {orderData.payment && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💳</span>
                <span>Financial Ledger Snapshot (payments table)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Transaction Ref</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{orderData.payment.transaction_ref}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Payment Method</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{orderData.payment.payment_method}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Settlement State</div>
                  <span
                    style={{
                      display: 'inline-block',
                      background: orderData.payment.payment_status === 'SUCCESS' ? '#dcfce7' : '#fef9c3',
                      color: orderData.payment.payment_status === 'SUCCESS' ? '#15803d' : '#854d0e',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '2px',
                    }}
                  >
                    {orderData.payment.payment_status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Amount Processed</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Rs {parseFloat(orderData.payment.amount).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
