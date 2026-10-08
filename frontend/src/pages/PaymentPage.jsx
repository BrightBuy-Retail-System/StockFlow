import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '../components/Icons';

export default function PaymentPage() {
  const [searchParams] = useSearchParams();

  // Form State
  const [orderId, setOrderId] = useState(searchParams.get('order_id') || '1');
  const [amount, setAmount] = useState(searchParams.get('amount') || '1299.00');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'cod'

  // Simulated Card Details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const qOrderId = searchParams.get('order_id');
    const qAmount = searchParams.get('amount');
    if (qOrderId) setOrderId(qOrderId);
    if (qAmount) setAmount(qAmount);
  }, [searchParams]);

  // Format card number with auto 4-digit division (e.g. 1234 5678 1234 5678)
  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = digits.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : digits);
  };

  // Format expiry date with auto slash division (MM/YY)
  const handleExpiryChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else if (digits.length === 2 && !raw.endsWith('/') && expiry.length < 2) {
      setExpiry(`${digits}/`);
    } else {
      setExpiry(digits);
    }
  };

  // Auto-detect brand based on card digits
  const getCardType = () => {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(clean)) return 'MASTERCARD';
    if (/^3[47]/.test(clean)) return 'AMEX';
    if (/^6(?:011|5)/.test(clean)) return 'DISCOVER';
    return 'VISA';
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        order_id: parseInt(orderId, 10),
        amount: parseFloat(amount),
        payment_method: paymentMethod === 'card' ? 'Credit Card' : 'Cash on Delivery',
      };

      const res = await api.post('/analytics/payments/process', payload);

      if (res.data && res.data.status === 'success') {
        setReceipt(res.data.data);
      } else {
        setError(res.data.error || 'Payment execution failed.');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        'Failed to connect to /api/analytics/payments/process. Ensure backend is running.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
          Checkout & Secure Settlement
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '4px' }}>
          Enforces strict ACID atomicity, pessimistic row locks (<code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>FOR UPDATE</code>), and automatic order synchronization.
        </p>
      </div>

      {receipt ? (
        /* ====================================================================
           RECEIPT DISPLAY (Phase 3 Requirement)
           ==================================================================== */
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', padding: '36px', border: '1px solid var(--success-border)', background: 'var(--bg-card)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          {/* Top Decorative Border */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: receipt.payment_status === 'Paid' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)' }} />

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: receipt.payment_status === 'Paid' ? 'var(--success-bg)' : 'var(--warning-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: receipt.payment_status === 'Paid' ? 'var(--success)' : 'var(--warning-text)', marginBottom: '12px' }}>
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {receipt.payment_status === 'Paid' ? 'Payment Confirmed' : 'Order Recorded (COD)'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              Transaction saved to <code style={{ fontWeight: 600 }}>PAYMENT_TRANSACTION</code> table
            </p>
          </div>

          {/* Receipt Key Metrics */}
          <div style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px dashed var(--border-color)', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount Processed</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Number</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{receipt.order_id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</span>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: receipt.payment_status === 'Paid' ? 'var(--success-bg)' : 'var(--warning-bg)', color: receipt.payment_status === 'Paid' ? 'var(--success-text)' : 'var(--warning-text)', border: `1px solid ${receipt.payment_status === 'Paid' ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                  {receipt.payment_status}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Method</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{receipt.payment_method}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</span>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {new Date(receipt.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Txn Reference (Unique Key)</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {receipt.transaction_reference}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/analytics" className="btn-hero-primary" style={{ textAlign: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              <span>View Updated Analytics Dashboard</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <button type="button" onClick={handleReset} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              Process Another Payment
            </button>
          </div>
        </div>
      ) : (
        /* ====================================================================
           PAYMENT FORM & PREVIEW (Phase 3 Requirement)
           ==================================================================== */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(280px, 0.8fr)', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Payment Form */}
          <div className="card" style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
              1. Order & Payment Details
            </h2>

            <form onSubmit={handleProcessPayment}>
              {/* Order ID & Amount Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label htmlFor="order-id-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Order ID
                  </label>
                  <input
                    id="order-id-input"
                    type="number"
                    min="1"
                    required
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="amount-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Amount (USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
                    <input
                      id="amount-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 28px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
                  Choose Payment Method
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Option 1: Card */}
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '14px',
                      borderRadius: '10px',
                      border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: paymentMethod === 'card' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: paymentMethod === 'card' ? 'var(--primary)' : 'var(--text-main)' }}>
                        💳 Card Payment
                      </span>
                      <input
                        type="radio"
                        name="payment_method"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Instant settlement · Status becomes <strong style={{ color: 'var(--success-text)' }}>Paid</strong>
                    </span>
                  </label>

                  {/* Option 2: COD */}
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '14px',
                      borderRadius: '10px',
                      border: paymentMethod === 'cod' ? '2px solid var(--warning)' : '1px solid var(--border-color)',
                      background: paymentMethod === 'cod' ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: paymentMethod === 'cod' ? 'var(--warning-text)' : 'var(--text-main)' }}>
                        💵 Cash on Delivery
                      </span>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Doorstep settlement · Status remains <strong style={{ color: 'var(--warning-text)' }}>Pending</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Conditional Card Simulation Inputs */}
              {paymentMethod === 'card' ? (
                <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Card Information (Simulated Gateway)
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="card-number-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Card Number</label>
                    <input
                      id="card-number-input"
                      type="text"
                      placeholder="4532 8824 1234 5678"
                      maxLength={19}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label htmlFor="card-holder-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cardholder</label>
                      <input
                        id="card-holder-input"
                        type="text"
                        placeholder="ALEXANDER WRIGHT"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="card-expiry-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Expiry</label>
                      <input
                        id="card-expiry-input"
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={expiry}
                        onChange={handleExpiryChange}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="card-cvv-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CVV</label>
                      <input
                        id="card-cvv-input"
                        type="password"
                        placeholder="742"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--warning-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--warning-border)', color: 'var(--warning-text)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>💵</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>Cash on Delivery Selected</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                      No card details required. You will pay in cash upon doorstep delivery.
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  <strong>Execution Error:</strong> {error}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="btn-hero-primary"
                style={{ width: '100%', justifyContent: 'center', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <span>Executing ACID Transaction...</span>
                ) : (
                  <span>
                    {paymentMethod === 'card'
                      ? `Pay $${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Now`
                      : `Confirm Cash on Delivery ($${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
                    }
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Visual Card Preview & DB Guarantees */}
          <div>
            {/* 3D Flip Card Container */}
            <div style={{ perspective: '1000px', marginBottom: '20px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '225px',
                  transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
                  transformStyle: 'preserve-3d',
                  transform: paymentMethod === 'cod' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* FRONT FACE: ATM Card Preview */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.8 }}>BRIGHTBUY CORPORATE</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>{getCardType()}</span>
                  </div>

                  <div style={{ width: '38px', height: '28px', borderRadius: '4px', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' }} />

                  <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', letterSpacing: '0.15em' }}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ opacity: 0.6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Cardholder</div>
                      <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{cardHolder ? cardHolder.toUpperCase() : 'ALEXANDER WRIGHT'}</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Expires</div>
                      <div style={{ fontWeight: 600 }}>{expiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>

                {/* BACK FACE: Cash on Delivery Preview */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(6, 78, 59, 0.4)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.9, color: '#a7f3d0' }}>
                      BRIGHTBUY LOGISTICS
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(52, 211, 153, 0.2)',
                      border: '1px solid #34d399',
                      color: '#6ee7b7',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                    }}>
                      CASH ON DELIVERY
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', padding: '6px 0' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      marginBottom: '8px',
                      fontSize: '1.4rem'
                    }}>
                      💵
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                      Cash on Delivery
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 600, marginTop: '2px' }}>
                      No card details required
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', opacity: 0.9, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '10px' }}>
                    <div>
                      <span style={{ opacity: 0.7, fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Amount Due at Doorstep</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#6ee7b7' }}>
                        ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ opacity: 0.7, fontSize: '0.65rem', display: 'block', textTransform: 'uppercase' }}>Settlement Mode</span>
                      <span style={{ fontWeight: 600 }}>Cash Handover</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Relational & ACID Guarantees Box */}
            <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ShieldCheckIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  ACID Relational Enforcements
                </span>
              </div>
              <ul style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li><strong>Atomicity:</strong> Rollback on failure guarantees no orphan payments.</li>
                <li><strong>Consistency:</strong> Enforced by foreign key <code style={{ fontSize: '0.7rem' }}>fk_payment_order</code> and check constraint <code style={{ fontSize: '0.7rem' }}>CHECK (amount &gt; 0)</code>.</li>
                <li><strong>Isolation:</strong> Row-level lock <code style={{ fontSize: '0.7rem' }}>SELECT ... FOR UPDATE</code> blocks concurrent write collisions.</li>
                <li><strong>Durability:</strong> TiDB distributed Raft consensus commits immediately to storage.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
