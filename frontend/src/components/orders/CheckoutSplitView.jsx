import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import headsetImg from '../../assets/headset.png';

export default function CheckoutSplitView({ onOrderPlaced, onNavigateToTrack }) {
  const navigate = useNavigate();

  // Auth User Context
  const storedUser = localStorage.getItem('user');
  let parsedUser = null;
  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    parsedUser = null;
  }

  // Extract email from parsedUser or JWT token payload
  let initialResolvedEmail = parsedUser?.email || '';
  if (!initialResolvedEmail) {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        initialResolvedEmail = payload?.email || '';
      }
    } catch {
      // ignore decode errors
    }
  }

  const activeUserId = parsedUser?.user_id || parsedUser?.id || null;
  const userEmail = initialResolvedEmail || '';
  const userName = parsedUser?.full_name || parsedUser?.username || '';

  // Persistent Checkout Session Storage Key
  const CHECKOUT_DRAFT_KEY = 'stockflow_checkout_draft';
  const getSavedDraft = () => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const savedDraft = getSavedDraft();

  // Multi-Step Progress State: 1 = Information, 2 = Shipping, 3 = Payment, 4 = Order Confirmation
  const [currentStep, setCurrentStep] = useState(() => {
    if (savedDraft?.currentStep && savedDraft.currentStep >= 1 && savedDraft.currentStep <= 3) {
      return savedDraft.currentStep;
    }
    return 1;
  });

  // Delivery Method: 'SHIP' | 'PICKUP'
  const [deliveryType, setDeliveryType] = useState(() => savedDraft?.deliveryType || 'SHIP');

  // Shipping Cities from Backend (Texas delivery hubs)
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  // Cart / Items to Checkout
  const [cartItems, setCartItems] = useState([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
  const [loadingCart, setLoadingCart] = useState(false);

  // Toggle individual item or select/deselect all items for checkout
  const toggleItemSelection = (variantId) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedVariantIds(new Set(cartItems.map((it) => it.variant_id)));
  };

  const deselectAllItems = () => {
    setSelectedVariantIds(new Set());
  };

  const activeCheckoutItems = useMemo(
    () => cartItems.filter((it) => selectedVariantIds.has(it.variant_id)),
    [cartItems, selectedVariantIds]
  );
  const allSelected = cartItems.length > 0 && activeCheckoutItems.length === cartItems.length;
  const noneSelected = activeCheckoutItems.length === 0;

  // Information Form State
  const [contactEmail, setContactEmail] = useState(() => savedDraft?.contactEmail || userEmail);
  const [firstName, setFirstName] = useState(() => (savedDraft?.firstName !== undefined ? savedDraft.firstName : (userName ? userName.trim().split(' ')[0] : '')));
  const [lastName, setLastName] = useState(() => (savedDraft?.lastName !== undefined ? savedDraft.lastName : (userName ? userName.trim().split(' ').slice(1).join(' ') : '')));
  const [company, setCompany] = useState(() => savedDraft?.company || '');
  const [country, setCountry] = useState(() => savedDraft?.country || 'United States');
  const [address, setAddress] = useState(() => savedDraft?.address || '1201 Elm Street');
  const [apartment, setApartment] = useState(() => savedDraft?.apartment || 'Suite 450');
  const [selectedCityId, setSelectedCityId] = useState(() => savedDraft?.selectedCityId || 1);
  const [cityName, setCityName] = useState(() => savedDraft?.cityName || 'Dallas');
  const [postalCode, setPostalCode] = useState(() => savedDraft?.postalCode || '75270');
  const [phone, setPhone] = useState(() => savedDraft?.phone || '(214) 555-0199');
  const [saveInfo, setSaveInfo] = useState(() => savedDraft?.saveInfo ?? true);

  // Shipping Method State
  const [shippingMethod, setShippingMethod] = useState(() => savedDraft?.shippingMethod || 'STANDARD');

  // Payment Method State: 'CREDIT_CARD' | 'MINTPAY' | 'KOKO' | 'PAYHERE' | 'COD'
  const [paymentMethod, setPaymentMethod] = useState(() => savedDraft?.paymentMethod || 'CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState(() => savedDraft?.cardNumber || '4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState(() => savedDraft?.cardExpiry || '12 / 28');
  const [cardCvc, setCardCvc] = useState(() => savedDraft?.cardCvc || '321');
  const [cardName, setCardName] = useState(() => savedDraft?.cardName || userName);
  const [cardErrors, setCardErrors] = useState({});
  const [payhereTenure, setPayhereTenure] = useState(() => savedDraft?.payhereTenure || '3_MONTHS'); // '3_MONTHS' | '6_MONTHS' | '12_MONTHS'
  const [paymentSimulationMessage, setPaymentSimulationMessage] = useState(null);

  // Card formatting & validation helpers
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (cardErrors.number) setCardErrors((prev) => ({ ...prev, number: null }));
  };

  const handleCardExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    } else if (raw.length >= 1) {
      setCardExpiry(raw);
    } else {
      setCardExpiry('');
    }
    if (cardErrors.expiry) setCardErrors((prev) => ({ ...prev, expiry: null }));
  };

  const handleCardCvcChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    if (cardErrors.cvc) setCardErrors((prev) => ({ ...prev, cvc: null }));
  };

  const validateCardDetails = () => {
    const errors = {};
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanNumber)) {
      errors.number = 'Please enter a valid 16-digit card number.';
    }
    if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(cardExpiry)) {
      errors.expiry = 'Valid MM / YY date required (e.g., 12 / 28).';
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      errors.cvc = 'Enter 3 or 4-digit CVC.';
    }
    if (!cardName.trim()) {
      errors.name = 'Cardholder name is required.';
    }
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Billing Address Option: 'SAME' | 'DIFFERENT'
  const [billingOption, setBillingOption] = useState(() => savedDraft?.billingOption || 'SAME');
  const [billingAddress, setBillingAddress] = useState(() => savedDraft?.billingAddress || '');

  // Discount & Fees Breakdown
  const [discountCode, setDiscountCode] = useState(() => savedDraft?.discountCode || '');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [serviceFeeExpanded, setServiceFeeExpanded] = useState(true);

  // Automatically sync checkout draft to sessionStorage so user never loses their place
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 3) {
      const draft = {
        currentStep,
        deliveryType,
        shippingMethod,
        contactEmail,
        firstName,
        lastName,
        company,
        country,
        address,
        apartment,
        selectedCityId,
        cityName,
        postalCode,
        phone,
        saveInfo,
        billingOption,
        billingAddress,
        paymentMethod,
        cardNumber,
        cardExpiry,
        cardCvc,
        cardName,
        payhereTenure,
        discountCode,
        selectedVariantIds: Array.from(selectedVariantIds),
      };
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    }
  }, [
    currentStep,
    deliveryType,
    shippingMethod,
    contactEmail,
    firstName,
    lastName,
    company,
    country,
    address,
    apartment,
    selectedCityId,
    cityName,
    postalCode,
    phone,
    saveInfo,
    billingOption,
    billingAddress,
    paymentMethod,
    cardNumber,
    cardExpiry,
    cardCvc,
    cardName,
    payhereTenure,
    discountCode,
    selectedVariantIds,
  ]);

  // Calculated Pricing from Backend Pre-Flight Sync
  const [pricing, setPricing] = useState({
    subtotal: 0,
    service_fee: 0,
    shipping_fee: 0,
    total: 0,
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
          const draft = getSavedDraft();
          if (!draft?.selectedCityId && res.data.data.length > 0) {
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

  // Sync Logged-In User Profile if not in localStorage
  useEffect(() => {
    if (!contactEmail) {
      api.get('/auth_cart/me')
        .then((res) => {
          if (res.data?.email) {
            setContactEmail(res.data.email);
          }
          if (res.data?.username) {
            const parts = res.data.username.trim().split(' ');
            setFirstName((prev) => prev || parts[0] || '');
            setLastName((prev) => prev || parts.slice(1).join(' ') || '');
            setCardName((prev) => prev || res.data.username);
          }
        })
        .catch(() => {
          // If not authenticated or error, leave empty
        });
    }
  }, [contactEmail]);

  // 2. Fetch User Cart - Only allow checkout if user has active items in cart
  useEffect(() => {
    async function loadCart() {
      try {
        setLoadingCart(true);
        const res = await api.get('/auth_cart/cart');
        const rawItems = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
          ? res.data
          : [];

        if (rawItems.length > 0) {
          const formatted = rawItems.map((it) => ({
            variant_id: parseInt(it.variant_id, 10),
            product_name: it.product_name || `Product Variant #${it.variant_id}`,
            attribute_value: it.attribute_value || '',
            quantity: parseInt(it.quantity, 10) || 1,
            unit_price: parseFloat(it.unit_price) || 0,
            total_price: parseFloat(it.total_price) || (parseInt(it.quantity, 10) * (parseFloat(it.unit_price) || 0)),
            image: it.image || headsetImg,
          }));
          setCartItems(formatted);
          const draft = getSavedDraft();
          if (draft?.selectedVariantIds && Array.isArray(draft.selectedVariantIds) && draft.selectedVariantIds.length > 0) {
            const availableSet = new Set(formatted.map((it) => it.variant_id));
            const validSavedIds = draft.selectedVariantIds.filter((id) => availableSet.has(id));
            if (validSavedIds.length > 0) {
              setSelectedVariantIds(new Set(validSavedIds));
            } else {
              setSelectedVariantIds(new Set(formatted.map((it) => it.variant_id)));
            }
          } else {
            setSelectedVariantIds(new Set(formatted.map((it) => it.variant_id)));
          }
        } else {
          setCartItems([]);
          setSelectedVariantIds(new Set());
        }
      } catch (err) {
        setCartItems([]);
        setSelectedVariantIds(new Set());
      } finally {
        setLoadingCart(false);
      }
    }
    loadCart();
  }, []);

  // 3. Sync Pricing with Backend Pre-Flight (validate_only: true) for SELECTED items only
  const itemsDependencyKey = activeCheckoutItems.map((it) => `${it.variant_id}:${it.quantity}:${it.unit_price}`).join(',');

  useEffect(() => {
    if (activeCheckoutItems.length === 0) {
      setPricing((prev) => {
        if (prev.subtotal === 0 && prev.service_fee === 0 && prev.shipping_fee === 0 && prev.total === 0) {
          return prev;
        }
        return {
          subtotal: 0,
          service_fee: 0,
          shipping_fee: 0,
          total: 0,
        };
      });
      return;
    }

    const itemsPayload = activeCheckoutItems.map((it) => ({
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
          const calculatedSubtotal = activeCheckoutItems.reduce((acc, it) => acc + (parseFloat(it.total_price) || parseFloat(it.unit_price) * it.quantity || 7249.00), 0);
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
  }, [deliveryType, selectedCityId, itemsDependencyKey, appliedDiscount, activeUserId, firstName, lastName, phone, address, apartment, cityName, postalCode, billingOption, billingAddress, paymentMethod]);

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
    if (activeCheckoutItems.length === 0) {
      setErrorMessage('Please select at least one item from your cart to proceed with checkout.');
      return;
    }
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
    if (activeCheckoutItems.length === 0) {
      setErrorMessage('Please select at least one item from your cart before proceeding.');
      setCurrentStep(1);
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Live ACID Order Placement ("Pay now")
  const handlePayNow = async () => {
    setErrorMessage(null);
    setStockConflictMessage(null);

    if (activeCheckoutItems.length === 0) {
      setErrorMessage('Please select at least one item to complete your order.');
      return;
    }

    // Client-side Card Validation (PCI-DSS Simulation)
    if (paymentMethod === 'CREDIT_CARD') {
      const isCardValid = validateCardDetails();
      if (!isCardValid) {
        setErrorMessage('Please verify your credit / debit card details before proceeding.');
        return;
      }
    }

    setSubmittingOrder(true);

    // High-fidelity simulation messaging & authentic network delay
    let simMessage = 'Contacting card network & verifying 3D Secure...';
    let simDelay = 1200;

    if (paymentMethod === 'KLARNA') {
      simMessage = 'Connecting to Klarna US & authorizing 4-installment plan...';
      simDelay = 1200;
    } else if (paymentMethod === 'AFTERPAY') {
      simMessage = 'Connecting to Afterpay / Affirm & approving credit line...';
      simDelay = 1200;
    } else if (paymentMethod === 'COD') {
      simMessage = 'Confirming Cash on Delivery dispatch voucher...';
      simDelay = 300;
    }

    setPaymentSimulationMessage(simMessage);

    // Simulate authentic payment processing latency
    await new Promise((resolve) => setTimeout(resolve, simDelay));

    const fullShippingAddress = deliveryType === 'PICKUP'
      ? 'In-Store Pickup (BrightBuy Texas Flagship Hub, Austin)'
      : `${address}, ${apartment ? apartment + ', ' : ''}${cityName}, TX ${postalCode}, United States`;

    const fullBillingAddress = billingOption === 'SAME'
      ? fullShippingAddress
      : (billingAddress.trim() || fullShippingAddress);

    const itemsPayload = activeCheckoutItems.map((it) => ({
      variant_id: parseInt(it.variant_id || 1, 10),
      quantity: parseInt(it.quantity || 1, 10),
    }));

    // PCI-DSS: Transmit only commercial order metadata (never client-side card/CVC numbers)
    const livePayload = {
      user_id: parseInt(activeUserId, 10),
      delivery_type: deliveryType,
      recipient_name: `${firstName} ${lastName}`.trim() || userName,
      phone: phone || '(214) 555-0199',
      shipping_address: fullShippingAddress,
      billing_address: fullBillingAddress,
      shipping_city_id: parseInt(selectedCityId, 10) || 1,
      payment_method: paymentMethod, // 'CREDIT_CARD' | 'MINTPAY' | 'KOKO' | 'PAYHERE' | 'COD'
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
          transaction_ref: orderData.transaction_ref,
          recipient_name: `${firstName} ${lastName}`.trim(),
          shipping_address: fullShippingAddress,
          phone: phone,
          items: activeCheckoutItems,
          placed_at: new Date().toISOString(),
        });
        setCurrentStep(4);
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
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
        setErrorMessage(resData?.message || err.message || 'Payment transaction failed. Please verify payment details.');
      }
    } finally {
      setSubmittingOrder(false);
      setPaymentSimulationMessage(null);
    }
  };

  const formattedFormattedAddress = `${firstName} ${lastName}, ${address}, ${apartment ? apartment + ', ' : ''}${cityName}, TX ${postalCode}, United States`;

  // Cart Loading State
  if (loadingCart) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }} />
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Verifying your shopping cart...</div>
      </div>
    );
  }

  // Active Cart Gatekeeper: Only accessible when cart has items
  if (cartItems.length === 0 && !placedOrder) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#f8fafc' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            maxWidth: '520px',
            width: '100%',
            padding: '48px 36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#0264d6',
              fontSize: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            🛒
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
            Checkout Requires an Active Cart
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 28px' }}>
            Checkout can only be entered through your Shopping Cart with items ready for purchase. Your cart is currently empty.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              id="btn-go-to-cart"
              onClick={() => {
                navigate('/auth-cart');
                window.location.href = '/auth-cart';
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: '#0264d6',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.925rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(2, 100, 214, 0.25)',
                cursor: 'pointer',
              }}
            >
              <span>🛍️</span>
              <span>Go to Shopping Cart</span>
            </button>
            <button
              type="button"
              id="btn-browse-catalog"
              onClick={() => {
                navigate('/catalog');
                window.location.href = '/catalog';
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              Browse Products Catalog
            </button>
            {onNavigateToTrack && (
              <button
                type="button"
                onClick={() => onNavigateToTrack(1)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Track Past Orders
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          {/* Checkout Header */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Checkout
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
              Review your items and complete your order
            </p>
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
                <strong>Stock Notice:</strong> {stockConflictMessage}
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
              {/* Select Items to Order Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Select Items to Order
                      </h2>
                      <span
                        style={{
                          background: noneSelected ? '#fee2e2' : '#eff6ff',
                          color: noneSelected ? '#b91c1c' : '#1e40af',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        {activeCheckoutItems.length} of {cartItems.length} selected
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                      Choose which items from your cart to checkout now. Unselected items will stay in your cart.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={allSelected ? deselectAllItems : selectAllItems}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#0264d6',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cartItems.map((item) => {
                    const isSelected = selectedVariantIds.has(item.variant_id);
                    return (
                      <div
                        key={item.variant_id}
                        onClick={() => toggleItemSelection(item.variant_id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #0264d6' : '1px solid #e2e8f0',
                          background: isSelected ? '#f8faff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.variant_id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: '#0264d6',
                            cursor: 'pointer',
                          }}
                        />
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={item.image || headsetImg}
                            alt={item.product_name}
                            style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: isSelected ? '#0f172a' : '#64748b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Qty: {item.quantity || 1} {item.attribute_value ? `• ${item.attribute_value}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? '#0f172a' : '#64748b' }}>
                            Rs {((parseFloat(item.unit_price) || 0) * (item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: isSelected ? '#16a34a' : '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            {isSelected ? '✓ In order' : 'Remains in cart'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {noneSelected && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#991b1b',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>⚠️</span>
                    <span>Please select at least one item to proceed with checkout.</span>
                  </div>
                )}
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
                {contactEmail ? (
                  <div style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, marginBottom: '6px' }}>
                    ({contactEmail})
                  </div>
                ) : null}
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
                            setAddress('1201 Elm Street');
                            setApartment('Suite 450');
                            setPostalCode('75270');
                            setPhone('(214) 555-0199');
                          } else if (e.target.value === 'new') {
                            setAddress('');
                            setApartment('');
                            setPostalCode('');
                            setPhone('');
                          }
                        }}
                      >
                        <option value="default">Use saved address: {userName || 'Customer'} (Dallas, TX 75270)</option>
                        <option value="new">Use a new address</option>
                      </select>
                    </div>

                    {/* Country/Region */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Country/Region</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#0f172a' }}
                      >
                        <option value="United States">United States</option>
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
                        placeholder="Street address (e.g. 1201 Elm Street)"
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
                        placeholder="Apartment, suite, unit, etc. (optional)"
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
                          placeholder="ZIP code (e.g. 75270)"
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
                        placeholder="Phone (e.g. 214-555-0199)"
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
                    BrightBuy Texas Flagship Hub
                    <br />
                    100 Congress Ave, Suite 200, Austin, TX 78701, United States
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
                  disabled={noneSelected}
                  style={{
                    background: noneSelected ? '#94a3b8' : '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: noneSelected ? 'not-allowed' : 'pointer',
                    boxShadow: noneSelected ? 'none' : '0 2px 8px rgba(2, 100, 214, 0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  {noneSelected ? 'Select items to continue' : 'Continue to shipping'}
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
                {/* Items Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Items</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {activeCheckoutItems.length} of {cartItems.length} item(s) selected
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setCurrentStep(1)}
                  >
                    Change
                  </button>
                </div>
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
                {/* Items Row */}
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: '#64748b', minWidth: '70px' }}>Items</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{activeCheckoutItems.length} of {cartItems.length} item(s) selected</span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#0264d6', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentStep(1)}>
                    Change
                  </button>
                </div>
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

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  {/* ========================================================= */}
                  {/* 1. CREDIT / DEBIT CARD                                   */}
                  {/* ========================================================= */}
                  <div
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: paymentMethod === 'CREDIT_CARD' ? '#f8faff' : '#ffffff',
                      transition: 'background 0.2s',
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
                        <input
                          type="radio"
                          checked={paymentMethod === 'CREDIT_CARD'}
                          onChange={() => setPaymentMethod('CREDIT_CARD')}
                          style={{ accentColor: '#0264d6', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Credit / Debit Card
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>VISA</span>
                        <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>MC</span>
                        <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>AMEX</span>
                        <span style={{ background: '#f97316', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '3px' }}>DISCOVER</span>
                      </div>
                    </label>

                    {/* Credit Card Input Drawer */}
                    {paymentMethod === 'CREDIT_CARD' && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                        <div>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Card number (16 digits)"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              maxLength={19}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: cardErrors.number ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: '0.875rem',
                                letterSpacing: '0.04em',
                                fontFamily: 'monospace',
                              }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b', fontSize: '0.9rem' }}>🔒</span>
                          </div>
                          {cardErrors.number && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px' }}>{cardErrors.number}</div>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <input
                              type="text"
                              placeholder="MM / YY"
                              value={cardExpiry}
                              onChange={handleCardExpiryChange}
                              maxLength={7}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: cardErrors.expiry ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: '0.875rem',
                                letterSpacing: '0.04em',
                              }}
                            />
                            {cardErrors.expiry && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px' }}>{cardErrors.expiry}</div>}
                          </div>

                          <div>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="password"
                                placeholder="Security code (CVC)"
                                value={cardCvc}
                                onChange={handleCardCvcChange}
                                maxLength={4}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: cardErrors.cvc ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                  fontSize: '0.875rem',
                                }}
                              />
                              <span
                                title="3-digit security code on the back of Visa/Mastercard/Discover, or 4-digit code on front of Amex"
                                style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8', cursor: 'help' }}
                              >
                                ❓
                              </span>
                            </div>
                            {cardErrors.cvc && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px' }}>{cardErrors.cvc}</div>}
                          </div>
                        </div>

                        <div>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Name on card"
                              value={cardName}
                              onChange={(e) => {
                                setCardName(e.target.value);
                                if (cardErrors.name) setCardErrors((prev) => ({ ...prev, name: null }));
                              }}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: cardErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: '0.875rem',
                              }}
                            />
                            <span
                              onClick={() => setCardName('')}
                              style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8', cursor: 'pointer' }}
                            >
                              ✕
                            </span>
                          </div>
                          {cardErrors.name && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px' }}>{cardErrors.name}</div>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          <span>🔒</span>
                          <span>256-bit SSL Encrypted • PCI-DSS Certified Simulated Gateway</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* 2. KLARNA | SHOP NOW. PAY LATER (PAY IN 4)               */}
                  {/* ========================================================= */}
                  <div
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: paymentMethod === 'KLARNA' ? '#fdf2f8' : '#ffffff',
                      transition: 'background 0.2s',
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
                      onClick={() => setPaymentMethod('KLARNA')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          checked={paymentMethod === 'KLARNA'}
                          onChange={() => setPaymentMethod('KLARNA')}
                          style={{ accentColor: '#db2777', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Klarna | Shop now. Pay later.
                        </span>
                      </div>
                      <span style={{ background: '#ffb3c7', color: '#000000', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                        KLARNA PAY IN 4
                      </span>
                    </label>

                    {/* Klarna Drawer */}
                    {paymentMethod === 'KLARNA' && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #fbcfe8', paddingTop: '16px' }}>
                        <div style={{ background: '#fdf2f8', border: '1px solid #f472b6', borderRadius: '8px', padding: '12px 14px', color: '#9d174d', fontSize: '0.84rem', lineHeight: 1.5 }}>
                          <strong>Pay in 4 interest-free bi-weekly payments of Rs {(pricing.total / 4).toFixed(2)} with Klarna.</strong> No hidden fees or impact on your credit score.
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#be185d', background: '#fce7f3', padding: '4px 10px', borderRadius: '9999px', fontWeight: 600, border: '1px solid #fbcfe8', width: 'fit-content' }}>
                          <span>✓</span>
                          <span>Pre-approved for registered US phone: {phone || '(214) 555-0199'}</span>
                        </div>

                        {/* 4 Payments Timeline Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                          <div style={{ background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#db2777', fontWeight: 700, textTransform: 'uppercase' }}>1. Today</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Due upon order</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#db2777', fontWeight: 700, textTransform: 'uppercase' }}>2. 2 Weeks</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Automated debit</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#db2777', fontWeight: 700, textTransform: 'uppercase' }}>3. 4 Weeks</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Automated debit</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#db2777', fontWeight: 700, textTransform: 'uppercase' }}>4. 6 Weeks</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Final payment</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>• 0% APR</span>
                          <span>• US Debit & Credit Cards</span>
                          <span>• Instant soft credit verification</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* 3. AFTERPAY / AFFIRM: BUY NOW, PAY LATER                  */}
                  {/* ========================================================= */}
                  <div
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: paymentMethod === 'AFTERPAY' ? '#f0fdf4' : '#ffffff',
                      transition: 'background 0.2s',
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
                      onClick={() => setPaymentMethod('AFTERPAY')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          checked={paymentMethod === 'AFTERPAY'}
                          onChange={() => setPaymentMethod('AFTERPAY')}
                          style={{ accentColor: '#059669', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Afterpay / Affirm: Buy Now, Pay Later
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ background: '#b2fce4', color: '#000000', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          AFTERPAY
                        </span>
                        <span style={{ background: '#000000', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          AFFIRM
                        </span>
                      </div>
                    </label>

                    {/* Afterpay Drawer */}
                    {paymentMethod === 'AFTERPAY' && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #86efac', paddingTop: '16px' }}>
                        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '12px 14px', color: '#065f46', fontSize: '0.84rem', lineHeight: 1.5 }}>
                          <strong>Split into 4 interest-free installments of Rs {(pricing.total / 4).toFixed(2)} every 2 weeks via Afterpay.</strong>
                        </div>

                        {/* 4 Installments Timeline Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                          <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>1st Pay (Now)</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Due today</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>2nd (Week 2)</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>In 14 days</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>3rd (Week 4)</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>In 28 days</div>
                          </div>
                          <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>4th (Week 6)</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>Rs {(pricing.total / 4).toFixed(2)}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>In 42 days</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#047857', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>• US Debit or Credit Card accepted</span>
                          <span>• 0% Interest</span>
                          <span>• Zero late fee simulation</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* 4. CASH ON DELIVERY (COD)                                 */}
                  {/* ========================================================= */}
                  <div
                    style={{
                      background: paymentMethod === 'COD' ? '#fffbeb' : '#ffffff',
                      transition: 'background 0.2s',
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
                      onClick={() => setPaymentMethod('COD')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          style={{ accentColor: '#b45309', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                        Pay courier upon receipt
                      </span>
                    </label>

                    {/* COD Drawer */}
                    {paymentMethod === 'COD' && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #fde68a', paddingTop: '16px' }}>
                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 14px', color: '#92400e', fontSize: '0.84rem', lineHeight: 1.5 }}>
                          <strong>Please have the exact amount of Rs {pricing.total.toFixed(2)} ready upon doorstep delivery.</strong> Payment will be collected in cash by our authorized delivery partner.
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#78350f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📞</span>
                          <span>Courier will place a dispatch verification call to <strong>{phone || '(214) 555-0199'}</strong> before delivery.</span>
                        </div>
                      </div>
                    )}
                  </div>
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
                  disabled={submittingOrder || noneSelected}
                  onClick={handlePayNow}
                  style={{
                    background: noneSelected ? '#94a3b8' : '#0264d6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 36px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    cursor: submittingOrder || noneSelected ? 'not-allowed' : 'pointer',
                    boxShadow: noneSelected ? 'none' : '0 2px 8px rgba(2, 100, 214, 0.25)',
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
                  ) : noneSelected ? (
                    <span>Select items to pay</span>
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
                  Confirmation and tracking updates have been sent to {contactEmail ? <strong>{contactEmail}</strong> : 'your registered email'}.
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
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Payment Method</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      {placedOrder.payment_method === 'KLARNA' ? 'Klarna (Pay in 4 BNPL)' :
                       placedOrder.payment_method === 'AFTERPAY' ? 'Afterpay / Affirm (4 Payments)' :
                       placedOrder.payment_method === 'COD' ? 'Cash on Delivery (COD)' :
                       'Credit / Debit Card'}
                    </div>
                    {placedOrder.transaction_ref && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                        Ref: {placedOrder.transaction_ref}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Settlement Status</div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: placedOrder.payment_method === 'COD' ? '#fef9c3' :
                                    placedOrder.payment_method === 'KLARNA' ? '#fdf2f8' :
                                    placedOrder.payment_method === 'AFTERPAY' ? '#ecfdf5' : '#dcfce7',
                        color: placedOrder.payment_method === 'COD' ? '#854d0e' :
                               placedOrder.payment_method === 'KLARNA' ? '#be185d' :
                               placedOrder.payment_method === 'AFTERPAY' ? '#047857' : '#15803d',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        marginTop: '4px',
                      }}
                    >
                      {placedOrder.payment_method === 'COD' ? 'Cash on Delivery • Pay upon delivery' :
                       placedOrder.payment_method === 'KLARNA' ? 'Klarna • 1st Payment Complete' :
                       placedOrder.payment_method === 'AFTERPAY' ? 'Afterpay • 1st Payment Authorized' :
                       'Payment Confirmed'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Paid</div>
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
                  Track Order
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Items ({activeCheckoutItems.length}/{cartItems.length} selected)
                </div>
                <button
                  type="button"
                  onClick={allSelected ? deselectAllItems : selectAllItems}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#93c5fd',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {cartItems.map((item, idx) => {
                const isSelected = selectedVariantIds.has(item.variant_id);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleItemSelection(item.variant_id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                      opacity: isSelected ? 1 : 0.45,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.variant_id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#3b82f6',
                          cursor: 'pointer',
                        }}
                        title={isSelected ? 'Included in this order' : 'Excluded from this order'}
                      />
                      <div
                        style={{
                          position: 'relative',
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          background: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
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
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc', lineHeight: 1.3, maxWidth: '200px' }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isSelected ? '#94a3b8' : '#f87171', marginTop: '2px' }}>
                          {isSelected ? (item.attribute_value || 'Included in order') : 'Excluded from this order'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? '#f8fafc' : '#64748b', textAlign: 'right' }}>
                      Rs {((parseFloat(item.unit_price) || 7249.00) * (item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
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
                <span>Subtotal · {activeCheckoutItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} items</span>
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

      {/* ========================================================= */}
      {/* HIGH-FIDELITY PAYMENT SIMULATION AUTHORIZATION MODAL     */}
      {/* ========================================================= */}
      {submittingOrder && paymentSimulationMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '36px 32px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Gateway Logo / Brand Icon Badge */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background:
                  paymentMethod === 'KLARNA'
                    ? '#fdf2f8'
                    : paymentMethod === 'AFTERPAY'
                    ? '#ecfdf5'
                    : paymentMethod === 'COD'
                    ? '#fffbeb'
                    : '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                border: `2px solid ${
                  paymentMethod === 'KLARNA'
                    ? '#f472b6'
                    : paymentMethod === 'AFTERPAY'
                    ? '#6ee7b7'
                    : paymentMethod === 'COD'
                    ? '#fde68a'
                    : '#bae6fd'
                }`,
              }}
            >
              {paymentMethod === 'KLARNA' && '🛍️'}
              {paymentMethod === 'AFTERPAY' && '⚡'}
              {paymentMethod === 'COD' && '📦'}
              {paymentMethod === 'CREDIT_CARD' && '🔒'}
            </div>

            {/* Gateway Header Badge */}
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:
                  paymentMethod === 'KLARNA'
                    ? '#db2777'
                    : paymentMethod === 'AFTERPAY'
                    ? '#059669'
                    : paymentMethod === 'COD'
                    ? '#b45309'
                    : '#0284c7',
                background:
                  paymentMethod === 'KLARNA'
                    ? '#fdf2f8'
                    : paymentMethod === 'AFTERPAY'
                    ? '#ecfdf5'
                    : paymentMethod === 'COD'
                    ? '#fffbeb'
                    : '#f0f9ff',
                padding: '4px 12px',
                borderRadius: '9999px',
              }}
            >
              {paymentMethod === 'KLARNA' && 'Klarna Pay in 4 US Gateway'}
              {paymentMethod === 'AFTERPAY' && 'Afterpay / Affirm BNPL Checkout'}
              {paymentMethod === 'COD' && 'BrightBuy Express Dispatch'}
              {paymentMethod === 'CREDIT_CARD' && '3D Secure 2.0 • Card Network'}
            </div>

            {/* Main Title */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
              {paymentMethod === 'COD' ? 'Confirming Your Order' : 'Authorizing Payment Simulation'}
            </h3>

            {/* Dynamic Status Message */}
            <p
              style={{
                fontSize: '0.9rem',
                color: '#475569',
                margin: 0,
                lineHeight: 1.5,
                fontWeight: 500,
                maxWidth: '380px',
              }}
            >
              {paymentSimulationMessage}
            </p>

            {/* Amount authorized display */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 18px',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '4px 0',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Simulated Amount:</span>
              <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>
                Rs {pricing.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Animated Spinner & Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <div
                className="spinner"
                style={{
                  width: '20px',
                  height: '20px',
                  borderWidth: '2.5px',
                  borderColor:
                    paymentMethod === 'KLARNA'
                      ? '#db2777 #fce7f3 #fce7f3 #fce7f3'
                      : paymentMethod === 'AFTERPAY'
                      ? '#059669 #d1fae5 #d1fae5 #d1fae5'
                      : paymentMethod === 'COD'
                      ? '#b45309 #fef3c7 #fef3c7 #fef3c7'
                      : '#0284c7 #e0f2fe #e0f2fe #e0f2fe',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
                Verifying credentials securely...
              </span>
            </div>

            {/* Security Notice */}
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span>🔒</span>
              <span>Encrypted 256-bit SSL • Please do not close or reload this window</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

