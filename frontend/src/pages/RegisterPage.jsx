import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import {
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UserIcon,
} from '../components/Icons';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');

  // Step 1: Details (name, email, password)
  // Step 2: OTP verification
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1: Send OTP to user's email
  async function handleSendOtp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const res = await api.post('/auth_cart/send-register-otp', {
        email: email.trim().toLowerCase(),
        username: name.trim(),
      });

      setIsSuccess(true);
      setMessage(res.data?.message || `Verification code sent to ${email}`);
      setStep(2);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to send verification code.';
      setIsSuccess(false);
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Resend OTP
  async function handleResendOtp() {
    setResending(true);
    setMessage('');
    try {
      const res = await api.post('/auth_cart/send-register-otp', {
        email: email.trim().toLowerCase(),
        username: name.trim(),
      });
      setIsSuccess(true);
      setMessage(res.data?.message || 'New verification code sent to your email.');
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  // Step 2: Verify OTP and complete registration
  async function handleVerifyAndRegister(e) {
    e.preventDefault();
    if (!otp.trim()) {
      setMessage('Please enter the 6-digit verification code.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const res = await api.post('/auth_cart/register', {
        username: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        otp: otp.trim(),
      });

      const data = res.data;
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      setIsSuccess(true);
      setMessage('Account verified and created successfully! Redirecting...');

      setTimeout(() => {
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate('/customer-dashboard');
        }
      }, 700);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Verification failed. Please try again.';
      setIsSuccess(false);
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="st-auth-page-wrapper">
      <div className="st-auth-card">
        {/* Header Branding */}
        <div className="st-auth-header">
          <img
            src="/brightbuy-logo.png"
            alt="BrightBuy"
            style={{ height: '54px', objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
          />
          <h1 className="st-auth-title">
            {step === 1 ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="st-auth-subtitle">
            {step === 1
              ? 'Join thousands of shoppers and unlock exclusive retail deals with instant delivery.'
              : `We sent a 6-digit verification code to ${email}. Enter it below to complete registration.`}
          </p>
        </div>

        {/* Step Progress Pill */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: step === 1 ? 'var(--primary, #0284c7)' : '#e2e8f0',
              color: step === 1 ? '#ffffff' : '#64748b',
            }}
          >
            1. Details
          </span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: step === 2 ? 'var(--primary, #0284c7)' : '#e2e8f0',
              color: step === 2 ? '#ffffff' : '#64748b',
            }}
          >
            2. Email OTP
          </span>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`st-auth-alert ${isSuccess ? 'st-auth-alert-success' : 'st-auth-alert-error'}`}>
            <span>{isSuccess ? '✓' : '⚠️'}</span>
            <span>{message}</span>
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <form className="st-auth-form" onSubmit={handleSendOtp}>
            <div className="st-auth-field">
              <label className="st-auth-label">Full Name / Username</label>
              <div className="st-auth-input-wrap">
                <span className="st-auth-input-icon">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  className="st-auth-input"
                  placeholder="e.g. Kasun Perera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="st-auth-field">
              <label className="st-auth-label">Email Address</label>
              <div className="st-auth-input-wrap">
                <span className="st-auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="st-auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="st-auth-field">
              <label className="st-auth-label">Password</label>
              <div className="st-auth-input-wrap">
                <span className="st-auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="st-auth-input"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="st-auth-submit-btn" disabled={loading}>
              {loading ? 'Sending Verification Code...' : 'Send Verification Code →'}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 2 && (
          <form className="st-auth-form" onSubmit={handleVerifyAndRegister}>
            <div className="st-auth-field">
              <label className="st-auth-label" style={{ textAlign: 'center', display: 'block', fontSize: '0.85rem' }}>
                6-Digit Email Verification Code
              </label>
              <div className="st-auth-input-wrap">
                <input
                  type="text"
                  maxLength={6}
                  className="st-auth-input"
                  style={{
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    letterSpacing: '10px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '12px 14px',
                  }}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="st-auth-submit-btn" disabled={loading}>
              {loading ? 'Verifying Account...' : 'Verify & Create Account'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.82rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Edit Details
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                style={{ background: 'none', border: 'none', color: 'var(--primary, #0284c7)', cursor: 'pointer', fontWeight: 600 }}
              >
                {resending ? 'Resending...' : "Didn't receive code? Resend"}
              </button>
            </div>
          </form>
        )}

        {/* Divider */}
        <div className="st-auth-divider">Or</div>

        {/* Switch to Login */}
        <div className="st-auth-switch-box">
          <span>Already have an account?</span>
          <Link to={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="st-auth-switch-link">
            Sign In Here
          </Link>
        </div>

        {/* Perks Trust Row */}
        <div className="st-auth-perks-row">
          <div className="st-auth-perk-item">
            <TruckIcon className="w-4 h-4 st-auth-perk-icon" />
            <span className="st-auth-perk-label">Fast Delivery</span>
          </div>
          <div className="st-auth-perk-item">
            <ShieldCheckIcon className="w-4 h-4 st-auth-perk-icon" />
            <span className="st-auth-perk-label">100% Genuine</span>
          </div>
          <div className="st-auth-perk-item">
            <CreditCardIcon className="w-4 h-4 st-auth-perk-icon" />
            <span className="st-auth-perk-label">Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}
