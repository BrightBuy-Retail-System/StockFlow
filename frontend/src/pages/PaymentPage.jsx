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
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8824');
  const [cardHolder, setCardHolder] = useState('ALEXANDER WRIGHT');
  const [expiry, setExpiry] = useState('09/28');
  const [cvv, setCvv] = useState('742');

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

  // Quick preset orders for easy testing and viva demonstration
  const presetOrders = [
    { id: 90002, label: 'Customer Order #90002 (Test Customer)', amount: 1304.98, city: 'Dallas Hub' },
    { id: 150006, label: 'Customer Order #150006 (Test Customer)', amount: 1304.98, city: 'Houston Hub' },
    { id: 1, label: 'Platform Order #1', amount: 1299.00, city: 'Dallas Hub' },
    { id: 2, label: 'Platform Order #2', amount: 3450.00, city: 'Houston Hub' },
  ];

  const handlePresetSelect = (preset) => {
    setOrderId(String(preset.id));
    setAmount(String(preset.amount));
    setError(null);
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
              1. Select Order & Payment Mode
            </h2>

            {/* Quick Presets for Demo */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                Quick Presets (Viva Demonstration)
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {presetOrders.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: orderId === String(p.id) ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: orderId === String(p.id) ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      color: orderId === String(p.id) ? 'var(--primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    #{p.id} · ${p.amount}
                  </button>
                ))}
              </div>
            </div>

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
                      Delivery settlement · Status remains <strong style={{ color: 'var(--warning-text)' }}>Pending</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Conditional Card Simulation Inputs */}
              {paymentMethod === 'card' && (
                <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Card Information (Simulated Gateway)
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="card-number-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Card Number</label>
                    <input
                      id="card-number-input"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label htmlFor="card-holder-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cardholder</label>
                      <input
                        id="card-holder-input"
                        type="text"
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
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="card-cvv-input" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CVV</label>
                      <input
                        id="card-cvv-input"
                        type="password"
                        maxLength="4"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
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
                    Pay ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} Now
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Visual Card Preview & DB Guarantees */}
          <div>
            {/* Visual Glassmorphism Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', opacity: 0.8 }}>BRIGHTBUY CORPORATE</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>VISA</span>
              </div>

              <div style={{ width: '38px', height: '28px', borderRadius: '4px', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', marginBottom: '20px' }} />

              <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', letterSpacing: '0.15em', marginBottom: '20px' }}>
                {cardNumber || '•••• •••• •••• ••••'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ opacity: 0.6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Cardholder</div>
                  <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{cardHolder || 'CUSTOMER NAME'}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Expires</div>
                  <div style={{ fontWeight: 600 }}>{expiry || 'MM/YY'}</div>
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
