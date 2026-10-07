import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import headsetImg from '../../assets/headset.png';

export default function CheckoutSplitView({ onOrderPlaced, onNavigateToTrack }) {
  const navigate = useNavigate();

  // Auth User Context
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const activeUserId = parsedUser?.user_id || parsedUser?.id || 4;
  const userEmail = parsedUser?.email || 'nipunsankalana2004@gmail.com';
  const userName = parsedUser?.full_name || parsedUser?.username || 'Nipun Sankalana';

  // Multi-Step Progress State: 1 = Information, 2 = Shipping, 3 = Payment, 4 = Order Confirmation
  const [currentStep, setCurrentStep] = useState(1);

  // Delivery Method: 'SHIP' | 'PICKUP'
  const [deliveryType, setDeliveryType] = useState('SHIP');

  // Shipping Cities from Backend (Texas delivery hubs)
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  // Cart / Items to Checkout
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);

  // Information Form State
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [firstName, setFirstName] = useState(userName.split(' ')[0] || 'Nipun');
  const [lastName, setLastName] = useState(userName.split(' ').slice(1).join(' ') || 'Sankalana');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('Shilpa, Gurugammanaya, 5 th mile post');
  const [apartment, setApartment] = useState('Nannapurawa, Bibila');
  const [selectedCityId, setSelectedCityId] = useState(1);
  const [cityName, setCityName] = useState('Austin Central Hub');
  const [postalCode, setPostalCode] = useState('91500');
  const [phone, setPhone] = useState('0771234567');
  const [saveInfo, setSaveInfo] = useState(true);

  // Shipping Method State
  const [shippingMethod, setShippingMethod] = useState('STANDARD');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12 / 28');
  const [cardCvc, setCardCvc] = useState('321');
  const [cardName, setCardName] = useState(userName);

  // Billing Address Option: 'SAME' | 'DIFFERENT'
  const [billingOption, setBillingOption] = useState('SAME');
  const [billingAddress, setBillingAddress] = useState('');

  // Discount & Fees Breakdown
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [serviceFeeExpanded, setServiceFeeExpanded] = useState(true);

  // Calculated Pricing from Backend Pre-Flight Sync
  const [pricing, setPricing] = useState({
    subtotal: 7249.00,
    service_fee: 217.47,
    shipping_fee: 499.00,
    total: 7965.47,
  });

  // Action States
  const [syncingPricing, setSyncingPricing] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [stockConflictMessage, setStockConflictMessage] = useState(null);

  // Placed Order Receipt Data
  const [placedOrder, setPlacedOrder] = useState(null);

  // Mobile Order Summary Collapse
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // 1. Fetch Shipping Hubs
  useEffect(() => {
    async function loadCities() {
      try {
        setLoadingCities(true);
        const res = await api.get('/orders/shipping-cities');
        if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
          setCities(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedCityId(res.data.data[0].city_id);
            setCityName(res.data.data[0].city_name);
            setPricing((prev) => ({
              ...prev,
              shipping_fee: parseFloat(res.data.data[0].shipping_fee) || 499.00,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load shipping hubs:', err);
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  // 2. Fetch User Cart or Fallback to Default Showcase Item
  useEffect(() => {
    async function loadCart() {
      try {
        setLoadingCart(true);
        const res = await api.get('/auth_cart/cart');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setCartItems(res.data);
        } else {
          // Default showcase item for preview
          setCartItems([
            {
              variant_id: 1,
              product_name: 'Anker Soundcore R50i NC True Wireless Bluetooth Earbuds',
              attribute_value: 'Black',
              quantity: 1,
              unit_price: 7249.00,
              total_price: 7249.00,
              image: headsetImg,
            },
          ]);
        }
      } catch (err) {
        // Fallback default
        setCartItems([
          {
            variant_id: 1,
            product_name: 'Anker Soundcore R50i NC True Wireless Bluetooth Earbuds',
            attribute_value: 'Black',
            quantity: 1,
            unit_price: 7249.00,
            total_price: 7249.00,
            image: headsetImg,
          },
        ]);
      } finally {
        setLoadingCart(false);
      }
    }
    loadCart();
  }, []);

  // 3. Sync Pricing with Backend Pre-Flight (validate_only: true)
  useEffect(() => {
    if (cartItems.length === 0) return;

    const itemsPayload = cartItems.map((it) => ({
      variant_id: it.variant_id || 1,
      quantity: it.quantity || 1,
    }));

    const fullShippingAddress = `${address}, ${apartment ? apartment + ', ' : ''}${cityName}, ${postalCode}`;

    const estimatePayload = {
      user_id: parseInt(activeUserId, 10),
      delivery_type: deliveryType,
      recipient_name: `${firstName} ${lastName}`.trim(),
      phone: phone,
      shipping_address: fullShippingAddress,
      billing_address: billingOption === 'SAME' ? fullShippingAddress : billingAddress,
      shipping_city_id: parseInt(selectedCityId, 10) || 1,
      payment_method: paymentMethod,
      validate_only: true,
      service_fee: '217.47',
      items: itemsPayload,
    };

    let isMounted = true;
    async function syncBackendFees() {
      setSyncingPricing(true);
      try {
        const res = await api.post('/orders/checkout', estimatePayload);
        if (isMounted && res.data && res.data.calculation) {
          const calc = res.data.calculation;
          const discountAmt = appliedDiscount ? (calc.subtotal * appliedDiscount.pct) / 100 : 0;
          setPricing({
            subtotal: calc.subtotal,
            service_fee: calc.service_fee || 217.47,
            shipping_fee: deliveryType === 'PICKUP' ? 0.00 : (calc.shipping_fee || 499.00),
            total: Math.max(0, calc.total_amount - discountAmt),
          });
          setStockConflictMessage(null);
        }
      } catch (err) {
        if (!isMounted) return;
        const resData = err.response?.data;
        if (err.response?.status === 409 || resData?.code === 'OUT_OF_STOCK') {
          setStockConflictMessage(resData?.message || 'Stock conflict: An item exceeds available warehouse inventory.');
        } else {
          // Local fallback computation
          const calculatedSubtotal = cartItems.reduce((acc, it) => acc + (parseFloat(it.total_price) || parseFloat(it.unit_price) * it.quantity || 7249.00), 0);
          const shipFee = deliveryType === 'PICKUP' ? 0.00 : 499.00;
          const sFee = 217.47;
          const discountAmt = appliedDiscount ? (calculatedSubtotal * appliedDiscount.pct) / 100 : 0;
          setPricing({
            subtotal: calculatedSubtotal,
            service_fee: sFee,
            shipping_fee: shipFee,
            total: Math.max(0, calculatedSubtotal + sFee + shipFee - discountAmt),
          });
        }
      } finally {
        if (isMounted) setSyncingPricing(false);
      }
    }

    syncBackendFees();
    return () => {
      isMounted = false;
    };
  }, [deliveryType, selectedCityId, cartItems, appliedDiscount, activeUserId, firstName, lastName, phone, address, apartment, cityName, postalCode, billingOption, billingAddress, paymentMethod]);

  // Handle City Change
  const handleCityChange = (e) => {
    const cityId = parseInt(e.target.value, 10);
    setSelectedCityId(cityId);
    const matchedCity = cities.find((c) => c.city_id === cityId);
    if (matchedCity) {
      setCityName(matchedCity.city_name);
      if (deliveryType === 'SHIP') {
        setPricing((prev) => ({
          ...prev,
          shipping_fee: parseFloat(matchedCity.shipping_fee) || 499.00,
        }));
      }
    }
  };

  // Discount Code Application
  const handleApplyDiscount = (e) => {
    e.preventDefault();
    setDiscountError('');
    const code = discountCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'BRIGHT10' || code === 'WELCOME10') {
      setAppliedDiscount({ code, pct: 10, label: '10% Store Discount' });
      setDiscountCode('');
    } else if (code === 'FREESHIP') {
      setAppliedDiscount({ code, pct: 0, freeShipping: true, label: 'Free Delivery Voucher' });
      setPricing((prev) => ({ ...prev, shipping_fee: 0, total: prev.subtotal + prev.service_fee }));
      setDiscountCode('');
    } else {
      setDiscountError('Enter a valid discount code or gift card.');
    }
  };

  // Step 1 Validation & Proceed
  const handleProceedToShipping = (e) => {
    e.preventDefault();
    setErrorMessage(null);
    if (deliveryType === 'SHIP') {
      if (!address.trim()) {
        setErrorMessage('Please enter your delivery street address.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('Please enter your contact phone number.');
        return;
      }
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 Validation & Proceed
  const handleProceedToPayment = () => {
    setErrorMessage(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Live ACID Order Placement ("Pay now")
  const handlePayNow = async () => {
    setSubmittingOrder(true);
    setErrorMessage(null);
    setStockConflictMessage(null);

    const fullShippingAddress = deliveryType === 'PICKUP'
      ? 'In-Store Pickup (BrightBuy Flagship Store)'
      : `${address}, ${apartment ? apartment + ', ' : ''}${cityName}, ${postalCode}`;

    const fullBillingAddress = billingOption === 'SAME'
      ? fullShippingAddress
      : (billingAddress.trim() || fullShippingAddress);

    const itemsPayload = cartItems.map((it) => ({
      variant_id: parseInt(it.variant_id || 1, 10),
      quantity: parseInt(it.quantity || 1, 10),
    }));

    const livePayload = {
      user_id: parseInt(activeUserId, 10),
      delivery_type: deliveryType,
      recipient_name: `${firstName} ${lastName}`.trim() || userName,
      phone: phone || '0771234567',
      shipping_address: fullShippingAddress,
      billing_address: fullBillingAddress,
      shipping_city_id: parseInt(selectedCityId, 10) || 1,
      payment_method: paymentMethod,
      validate_only: false,
      service_fee: '217.47',
      items: itemsPayload,
    };

    try {
      const res = await api.post('/orders/checkout', livePayload);
      if (res.status === 201 || res.data?.status === 'success') {
        const orderData = res.data.data;
        setPlacedOrder({
          order_id: orderData.order_id,
          tracking_number: orderData.tracking_number,
          shipment_id: orderData.shipment_id,
          total_amount: orderData.total_amount,
          subtotal: orderData.subtotal || pricing.subtotal,
          service_fee: orderData.service_fee || pricing.service_fee,
          shipping_fee: orderData.shipping_fee || pricing.shipping_fee,
          delivery_type: orderData.delivery_type || deliveryType,
          payment_method: orderData.payment_method || paymentMethod,
          payment_status: orderData.payment_status,
          recipient_name: `${firstName} ${lastName}`.trim(),
          shipping_address: fullShippingAddress,
          phone: phone,
          items: cartItems,
          placed_at: new Date().toISOString(),
        });
        setCurrentStep(4);
        if (typeof onOrderPlaced === 'function') {
          onOrderPlaced(orderData);
        }
      } else {
        setErrorMessage(res.data?.message || 'Order placement failed.');
      }
    } catch (err) {
      const resData = err.response?.data;
      if (err.response?.status === 409 || resData?.code === 'OUT_OF_STOCK') {
        setStockConflictMessage(
          resData?.message || 'Insufficient stock for requested item. Quantity exceeds available warehouse inventory.'
        );
      } else {
        setErrorMessage(resData?.message || err.message || 'Payment transaction failed. Please verify card details.');
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  const formattedFormattedAddress = `${firstName} ${lastName}, ${address}, ${apartment ? apartment + ', ' : ''}${cityName}, ${postalCode}, Sri Lanka`;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Split-Screen Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)',
          minHeight: '100vh',
          width: '100%',
        }}
        className="st-checkout-split-layout"
      >
        {/* ================================================================= */}
        {/* LEFT SIDE: CLEAN LIGHT STOREFRONT (Forms & Navigation)            */}
        {/* ================================================================= */}
        <div
          style={{
            padding: '40px 60px 80px',
            maxWidth: '680px',
            width: '100%',
            marginLeft: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="st-checkout-left-col"
        >
          {/* Logo Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer' }} onClick={() => navigate('/catalog')}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>Bright</span>
              <span style={{ background: '#0264d6', color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                BUY
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>
              YOUR TRUSTED RETAIL STORE
            </div>
          </div>

          {/* Breadcrumbs Navigation */}
          {currentStep < 4 && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#64748b', marginBottom: '32px' }}>
              <span style={{ color: '#0264d6', cursor: 'pointer' }} onClick={() => navigate('/auth-cart')}>
                Cart
              </span>
              <span>&gt;</span>
              <span
                style={{
                  color: currentStep === 1 ? '#0f172a' : '#0264d6',
                  fontWeight: currentStep === 1 ? 700 : 500,
                  cursor: currentStep > 1 ? 'pointer' : 'default',
                }}
                onClick={() => currentStep > 1 && setCurrentStep(1)}
              >
                Information
              </span>
              <span>&gt;</span>
              <span
                style={{
                  color: currentStep === 2 ? '#0f172a' : currentStep > 2 ? '#0264d6' : '#94a3b8',
                  fontWeight: currentStep === 2 ? 700 : 500,
                  cursor: currentStep > 2 ? 'pointer' : 'default',
                }}
                onClick={() => currentStep > 2 && setCurrentStep(2)}
              >
                Shipping
              </span>
              <span>&gt;</span>
              <span
                style={{
                  color: currentStep === 3 ? '#0f172a' : '#94a3b8',
                  fontWeight: currentStep === 3 ? 700 : 500,
                }}
              >
                Payment
              </span>
            </nav>
          )}

          {/* Conflict & Error Banners */}
          {stockConflictMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#991b1b',
                fontSize: '0.875rem',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div>
                <strong>Inventory Conflict (HTTP 409):</strong> {stockConflictMessage}
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #ffe4e6',
                borderRadius: '8px',
                padding: '14px 18px',
                color: '#be123c',
                fontSize: '0.875rem',
                marginBottom: '24px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 1: INFORMATION VIEW                                        */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 1 && (
            <form onSubmit={handleProceedToShipping} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Express Checkout */}
              <div>
                <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', marginBottom: '10px' }}>Express checkout</div>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                  onClick={() => alert('Google Pay Express session ready. Continuing to shipping details.')}
                >
                  <span style={{ letterSpacing: '0.04em' }}>G Pay</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0 10px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Contact</h2>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/login');
                    }}
                  >
                    Sign out
                  </button>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, marginBottom: '6px' }}>({contactEmail})</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#475569', cursor: 'pointer', marginTop: '8px' }}>
                  <input type="checkbox" defaultChecked />
                  Email me with news and offers
                </label>
              </div>

              {/* Delivery Method Toggle */}
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Delivery method</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: deliveryType === 'SHIP' ? '2px solid #0264d6' : '1px solid transparent',
                      background: deliveryType === 'SHIP' ? '#ffffff' : 'transparent',
                      color: deliveryType === 'SHIP' ? '#0264d6' : '#475569',
                      fontWeight: deliveryType === 'SHIP' ? 700 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxShadow: deliveryType === 'SHIP' ? '0 2px 6px rgba(2, 100, 214, 0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setDeliveryType('SHIP')}
                  >
                    <span>📦</span>
                    <span>Ship</span>
                  </button>
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: deliveryType === 'PICKUP' ? '2px solid #0264d6' : '1px solid transparent',
                      background: deliveryType === 'PICKUP' ? '#ffffff' : 'transparent',
                      color: deliveryType === 'PICKUP' ? '#0264d6' : '#475569',
                      fontWeight: deliveryType === 'PICKUP' ? 700 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxShadow: deliveryType === 'PICKUP' ? '0 2px 6px rgba(2, 100, 214, 0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setDeliveryType('PICKUP')}
                  >
                    <span>🏬</span>
                    <span>Pickup</span>
                  </button>
                </div>
              </div>

              {/* Shipping Address Fields (Rendered if Ship is active) */}
              {deliveryType === 'SHIP' ? (
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Shipping address</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Saved Addresses dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Saved addresses</label>
                      <select
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#0f172a' }}
                        onChange={(e) => {
                          if (e.target.value === 'default') {
                            setAddress('Shilpa, Gurugammanaya, 5 th mile post');
                            setApartment('Nannapurawa, Bibila');
                            setPostalCode('91500');
                          }
                        }}
                      >
                        <option value="default">Use saved address: {userName} (Bibila, 91500)</option>
                        <option value="new">Use a new address</option>
                      </select>
                    </div>

                    {/* Country/Region */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Country/Region</label>
                      <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#f8fafc', color: '#0f172a' }} disabled>
                        <option>Sri Lanka</option>
                      </select>
                    </div>

                    {/* First & Last Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <input
                          type="text"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>

                    {/* Company (Optional) */}
                    <div>
                      <input
                        type="text"
                        placeholder="Company (optional)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                      />
                    </div>

                    {/* Street Address */}
                    <div>
                      <input
                        type="text"
                        placeholder="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                      />
                    </div>

                    {/* Apartment, Suite (Optional) */}
                    <div>
                      <input
                        type="text"
                        placeholder="Apartment, suite, etc. (optional)"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                      />
                    </div>

                    {/* City & Postal Code */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <select
                          value={selectedCityId}
                          onChange={handleCityChange}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}
                        >
                          {cities.map((c) => (
                            <option key={c.city_id} value={c.city_id}>
                              {c.city_name} (Rs {parseFloat(c.shipping_fee).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Postal code (optional)"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                      />
                      <span
                        title="In case we need to contact you regarding order delivery"
                        style={{ position: 'absolute', right: '12px', top: '13px', color: '#94a3b8', fontSize: '0.9rem', cursor: 'help' }}
                      >
                        ❓
                      </span>
                    </div>

                    {/* Save Info Checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#475569', cursor: 'pointer', marginTop: '4px' }}>
                      <input type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} />
                      Save this information for next time
                    </label>
                  </div>
                </div>
              ) : (
                /* Pickup Location Notice */
                <div style={{ padding: '20px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Pickup Location</div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                    BrightBuy Experience Center
                    <br />
                    No. 452 Galle Road, Colombo 03, Sri Lanka
                    <br />
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Usually ready in 2 hours • Free Pickup</span>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => navigate('/auth-cart')}
                >
                  &lt; Return to cart
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 100, 214, 0.25)',
                    transition: 'background 0.2s',
                  }}
                >
                  Continue to shipping
                </button>
              </div>

              {/* Legal Footer Links */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: '#0264d6' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Refund policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Shipping</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Privacy policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of service</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Cancellations</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Contact</span>
              </div>
            </form>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 2: SHIPPING VIEW                                           */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Review Summary Box */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', fontSize: '0.875rem' }}>
                {/* Contact Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Contact</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{contactEmail}</span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setCurrentStep(1)}
                  >
                    Change
                  </button>
                </div>
                {/* Ship to Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Ship to</span>
                    <span style={{ color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>{formattedFormattedAddress}</span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setCurrentStep(1)}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Shipping Method Selector */}
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Shipping method</h2>
                <div
                  style={{
                    border: '2px solid #0264d6',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' }}>
                    <input type="radio" checked readOnly style={{ accentColor: '#0264d6' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                        {deliveryType === 'PICKUP' ? 'Store Pickup (Ready in 2 hours)' : 'Standard Delivery'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {deliveryType === 'PICKUP' ? 'BrightBuy Colombo Flagship Store' : '3 - 5 business days'}
                      </div>
                    </div>
                  </label>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem', whiteSpace: 'nowrap' }}>
                    {deliveryType === 'PICKUP' ? 'Free' : `Rs ${pricing.shipping_fee.toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setCurrentStep(1)}
                >
                  &lt; Return to information
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  style={{
                    background: '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 100, 214, 0.25)',
                    transition: 'background 0.2s',
                  }}
                >
                  Continue to payment
                </button>
              </div>

              {/* Legal Footer Links */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: '#0264d6' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Refund policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Shipping</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Privacy policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of service</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Cancellations</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Contact</span>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 3: PAYMENT VIEW                                            */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Review Summary Box (3 Rows) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', fontSize: '0.875rem' }}>
                {/* Contact Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Contact</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{contactEmail}</span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentStep(1)}>
                    Change
                  </button>
                </div>
                {/* Ship to Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Ship to</span>
                    <span style={{ color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>{formattedFormattedAddress}</span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentStep(1)}>
                    Change
                  </button>
                </div>
                {/* Shipping Method Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Shipping</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {deliveryType === 'PICKUP' ? 'Store Pickup • Free' : `Standard Delivery • Rs ${pricing.shipping_fee.toFixed(2)}`}
                    </span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentStep(2)}>
                    Change
                  </button>
                </div>
              </div>

              {/* Payment Section */}
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Payment</h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '14px' }}>All transactions are secure and encrypted.</div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Option 1: Credit Card */}
                  <div
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: paymentMethod === 'CREDIT_CARD' ? '#f0f7ff' : '#ffffff',
                    }}
                  >
                    <label
                      style={{
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="radio" checked={paymentMethod === 'CREDIT_CARD'} onChange={() => setPaymentMethod('CREDIT_CARD')} style={{ accentColor: '#0264d6' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Credit card</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>VISA</span>
                        <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>MC</span>
                        <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>AMEX</span>
                      </div>
                    </label>

                    {/* Credit Card Details Inputs */}
                    {paymentMethod === 'CREDIT_CARD' && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Card number"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }}>🔒</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input
                            type="text"
                            placeholder="Expiration date (MM / YY)"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                          />
                          <div style={{ position: 'relative' }}>
                            <input
                              type="password"
                              placeholder="Security code"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }}>❓</span>
                          </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Name on card"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                          />
                          <span
                            onClick={() => setCardName('')}
                            style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8', cursor: 'pointer' }}
                          >
                            ✕
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Mintpay */}
                  <label
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: paymentMethod === 'MINTPAY' ? '#f0f7ff' : '#ffffff',
                    }}
                    onClick={() => setPaymentMethod('MINTPAY')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" checked={paymentMethod === 'MINTPAY'} onChange={() => setPaymentMethod('MINTPAY')} style={{ accentColor: '#0264d6' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a' }}>Mintpay | Shop now. Pay later.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>VISA</span>
                      <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>MC</span>
                    </div>
                  </label>

                  {/* Option 3: Koko */}
                  <label
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: paymentMethod === 'KOKO' ? '#f0f7ff' : '#ffffff',
                    }}
                    onClick={() => setPaymentMethod('KOKO')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" checked={paymentMethod === 'KOKO'} onChange={() => setPaymentMethod('KOKO')} style={{ accentColor: '#0264d6' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a' }}>Koko: Buy Now Pay Later</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>VISA</span>
                      <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>MC</span>
                    </div>
                  </label>

                  {/* Option 4: Installments Payhere */}
                  <label
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: paymentMethod === 'PAYHERE' ? '#f0f7ff' : '#ffffff',
                    }}
                    onClick={() => setPaymentMethod('PAYHERE')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" checked={paymentMethod === 'PAYHERE'} onChange={() => setPaymentMethod('PAYHERE')} style={{ accentColor: '#0264d6' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a' }}>Credit / Debit Card Installments - Payhere</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>VISA</span>
                      <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>MC</span>
                    </div>
                  </label>

                  {/* Option 5: Cash on Delivery (COD) */}
                  <label
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: paymentMethod === 'COD' ? '#f0f7ff' : '#ffffff',
                    }}
                    onClick={() => setPaymentMethod('COD')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} style={{ accentColor: '#0264d6' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Cash on Delivery (COD)</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pay courier upon receipt</span>
                  </label>
                </div>
              </div>

              {/* Billing Address Options */}
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Billing address</h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '14px' }}>Select the address that matches your card or payment method.</div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <label
                    style={{
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: billingOption === 'SAME' ? '#f0f7ff' : '#ffffff',
                    }}
                    onClick={() => setBillingOption('SAME')}
                  >
                    <input type="radio" checked={billingOption === 'SAME'} onChange={() => setBillingOption('SAME')} style={{ accentColor: '#0264d6' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Same as shipping address</span>
                  </label>

                  <div style={{ background: billingOption === 'DIFFERENT' ? '#f0f7ff' : '#ffffff' }}>
                    <label
                      style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onClick={() => setBillingOption('DIFFERENT')}
                    >
                      <input type="radio" checked={billingOption === 'DIFFERENT'} onChange={() => setBillingOption('DIFFERENT')} style={{ accentColor: '#0264d6' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Use a different billing address</span>
                    </label>

                    {billingOption === 'DIFFERENT' && (
                      <div style={{ padding: '0 16px 16px' }}>
                        <textarea
                          placeholder="Enter complete billing street address, city, and postal code..."
                          rows={2}
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setCurrentStep(2)}
                >
                  &lt; Return to shipping
                </button>
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={handlePayNow}
                  style={{
                    background: '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 36px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    cursor: submittingOrder ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 100, 214, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.2s',
                  }}
                >
                  {submittingOrder ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px' }} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Pay now</span>
                  )}
                </button>
              </div>

              {/* Legal Footer Links */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: '#0264d6' }}>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Refund policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Shipping</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Privacy policy</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of service</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Cancellations</span>
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>Contact</span>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 4: ORDER CONFIRMATION & RECEIPT VIEW                       */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 4 && placedOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', background: '#22c55e', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 16px' }}>
                  ✓
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d', margin: '0 0 6px' }}>Order Placed Successfully!</h1>
                <p style={{ color: '#166534', margin: 0, fontSize: '0.9rem' }}>
                  Confirmation and tracking updates have been sent to <strong>{contactEmail}</strong>.
                </p>
              </div>

              {/* Order Meta Snapshot Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Order Number</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>#{placedOrder.order_id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Carrier Tracking Ref</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0264d6', fontFamily: 'monospace' }}>{placedOrder.tracking_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Settlement Status</div>
                    <span style={{ display: 'inline-block', background: placedOrder.payment_status === 'SUCCESS' ? '#dcfce7' : '#fef9c3', color: placedOrder.payment_status === 'SUCCESS' ? '#15803d' : '#854d0e', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', marginTop: '4px' }}>
                      {placedOrder.payment_status === 'SUCCESS' ? 'PAID IN FULL' : 'COD INITIATED'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Settled</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Rs {parseFloat(placedOrder.total_amount).toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Delivery Destination</div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                    <strong>{placedOrder.recipient_name}</strong> • {placedOrder.phone}
                    <br />
                    {placedOrder.shipping_address}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '8px',
                    background: '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 100, 214, 0.2)',
                  }}
                  onClick={() => onNavigateToTrack && onNavigateToTrack(placedOrder.order_id)}
                >
                  Track Package in Live Inspector
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/catalog')}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* RIGHT SIDE: DARK THEME ORDER SUMMARY (Cosmic / Slate Palette)     */}
        {/* ================================================================= */}
        <div
          style={{
            background: 'radial-gradient(circle at 85% 25%, rgba(30, 64, 175, 0.35) 0%, transparent 55%), radial-gradient(circle at 75% 75%, rgba(14, 165, 233, 0.2) 0%, transparent 45%), #070e1c',
            color: '#f8fafc',
            padding: '40px 48px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="st-checkout-right-col"
        >
          {/* Subtle Constellation / Star Mesh Vector Backdrop */}
          <svg
            style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="85%" cy="20%" r="2" fill="#ffffff" />
            <circle cx="70%" cy="35%" r="3" fill="#60a5fa" />
            <circle cx="90%" cy="50%" r="2" fill="#ffffff" />
            <circle cx="60%" cy="70%" r="2" fill="#38bdf8" />
            <circle cx="80%" cy="85%" r="2" fill="#ffffff" />
            <line x1="85%" y1="20%" x2="70%" y2="35%" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="70%" y1="35%" x2="90%" y2="50%" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="70%" y1="35%" x2="60%" y2="70%" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="60%" y1="70%" x2="80%" y2="85%" stroke="#3b82f6" strokeWidth="0.8" />
          </svg>

          <div style={{ position: 'relative', zIndex: 2, maxWidth: '440px', width: '100%' }}>
            {/* Items Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
              {/* 1. Service Fees Row (Collapsible platform verification fee) */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: '10px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '1.25rem',
                      }}
                    >
                      <span>💳</span>
                      <span
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#475569',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        1
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>Service fees</div>
                      <div
                        style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setServiceFeeExpanded(!serviceFeeExpanded)}
                      >
                        {serviceFeeExpanded ? 'Hide 1 item ⌃' : 'Show 1 item ⌄'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                    Rs {pricing.service_fee.toFixed(2)}
                  </div>
                </div>

                {serviceFeeExpanded && (
                  <div style={{ marginTop: '10px', paddingLeft: '70px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    1 × Online Platform & Payment Verification Fee: Rs 217.47 LKR
                  </div>
                )}
              </div>

              {/* 2. Merchandise Cart Line Items */}
              {cartItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={item.image || headsetImg}
                        alt={item.product_name}
                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#475569',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.quantity || 1}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc', lineHeight: 1.3, maxWidth: '220px' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {item.attribute_value || 'Black'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                    Rs {((parseFloat(item.unit_price) || 7249.00) * (item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Code Input Box */}
            <form onSubmit={handleApplyDiscount} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Discount code or gift card"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    background: 'rgba(51, 65, 85, 0.9)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Apply
                </button>
              </div>
              {discountError && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px' }}>{discountError}</div>}
              {appliedDiscount && (
                <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✓ {appliedDiscount.label} applied</span>
                  <button type="button" onClick={() => setAppliedDiscount(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Remove
                  </button>
                </div>
              )}
            </form>

            {/* Price Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#94a3b8' }}>
                <span>Subtotal · {cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} items</span>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                  Rs {pricing.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Shipping <span title="Carrier logistics rate based on selected destination">ℹ️</span>
                </span>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                  {pricing.shipping_fee === 0 ? 'Free' : `Rs ${pricing.shipping_fee.toFixed(2)}`}
                </span>
              </div>

              {appliedDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#4ade80' }}>
                  <span>Discount ({appliedDiscount.code})</span>
                  <span>- Rs {((pricing.subtotal * (appliedDiscount.pct || 0)) / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '20px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Total</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '6px' }}>LKR</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                  Rs {pricing.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {syncingPricing && (
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '10px', textAlign: 'right' }}>
                Syncing live fees with backend...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
