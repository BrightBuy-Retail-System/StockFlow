import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import {
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UserIcon,
} from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || '';

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const testAccounts = [
    {
      role: 'Role 1: Customer',
      email: 'customer@stockflow.test',
      password: 'password123',
      badge: 'Customer View',
      badgeColor: 'var(--primary)',
      bgColor: 'rgba(37, 99, 235, 0.08)',
      description: 'Personal orders, lifetime spending, and payment checkout settlement.'
    },
    {
      role: 'Role 2: Store Manager',
      email: 'manager@stockflow.test',
      password: 'password123',
      badge: 'Manager View',
      badgeColor: '#d97706',
      bgColor: 'rgba(217, 119, 6, 0.08)',
      description: 'Top-selling products ranking and category totals.'
    },
    {
      role: 'Role 3: Administrator',
      email: 'admin@stockflow.test',
      password: 'password123',
      badge: 'Admin View',
      badgeColor: '#16a34a',
      bgColor: 'rgba(22, 163, 74, 0.08)',
      description: 'Executive quarterly moving averages, corporate leaderboard, and DCL security grants.'
    }
  ];

  async function doLogin(emailOrUser, pwdToUse) {
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      let data;
      try {
        const res = await api.post('/auth_cart/login', {
          email: emailOrUser,
          username: emailOrUser,
          password: pwdToUse,
        });
        data = res.data;
      } catch (axiosErr) {
        if (axiosErr.response?.data?.message) {
          throw new Error(axiosErr.response.data.message);
        }
        // Fallback to direct fetch if network/proxy issue
        const response = await fetch(`${baseUrl}/api/auth_cart/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailOrUser, username: emailOrUser, password: pwdToUse }),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Invalid credentials. Please try again.');
        }
      }

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      localStorage.setItem('user', JSON.stringify(data.user));

      setIsSuccess(true);
      setMessage('Login successful! Redirecting...');

      setTimeout(() => {
        const roleId = Number(data.user?.role_id);
        if (redirectUrl && roleId === 1) {
          navigate(redirectUrl);
        } else if (roleId === 1) {
          navigate('/customer-dashboard');
        } else if (roleId === 2) {
          navigate('/manager-dashboard');
        } else if (roleId === 3) {
          navigate('/system-administrator');
        } else {
          navigate('/analytics');
        }
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await doLogin(usernameOrEmail, password);
  }

  async function handleForgotSendOtp(e) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage('Please enter your registered email address.');
      setForgotSuccess(false);
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    setForgotSuccess(false);

    try {
      const res = await api.post('/auth_cart/forgot-password', {
        email: forgotEmail.trim().toLowerCase(),
      });
      setForgotSuccess(true);
      setForgotMessage(res.data?.message || `Reset code sent to ${forgotEmail}`);
      setForgotStep(2);
    } catch (err) {
      setForgotSuccess(false);
      setForgotMessage(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword) {
      setForgotMessage('Please enter both the OTP code and your new password.');
      setForgotSuccess(false);
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    setForgotSuccess(false);

    try {
      const res = await api.post('/auth_cart/reset-password', {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        new_password: forgotNewPassword,
      });
      setForgotSuccess(true);
      setForgotMessage(res.data?.message || 'Password reset successfully!');
      setTimeout(() => {
        setShowForgotModal(false);
        setUsernameOrEmail(forgotEmail);
        setPassword('');
        setMessage('Password reset successfully! Please sign in with your new password.');
        setIsSuccess(true);
      }, 1200);
    } catch (err) {
      setForgotSuccess(false);
      setForgotMessage(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  }

  function handleQuickFill(acc) {
    setUsernameOrEmail(acc.email);
    setPassword(acc.password);
    doLogin(acc.email, acc.password);
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
          <h1 className="st-auth-title">Welcome Back</h1>
          <p className="st-auth-subtitle">
            Sign in to track orders, manage analytics, and access role-specific dashboards.
          </p>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`st-auth-alert ${isSuccess ? 'st-auth-alert-success' : 'st-auth-alert-error'}`}>
            <span>{isSuccess ? '✓' : '⚠️'}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="st-auth-form" onSubmit={handleSubmit}>
          <div className="st-auth-field">
            <label className="st-auth-label">Username or Email</label>
            <div className="st-auth-input-wrap">
              <span className="st-auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                type="text"
                className="st-auth-input"
                placeholder="name@example.com or username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="st-auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="st-auth-label" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setForgotEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
                  setForgotOtp('');
                  setForgotNewPassword('');
                  setForgotMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #0284c7)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="st-auth-submit-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Quick 1-Click Role Accounts */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-light, #f1f5f9)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              1-Click Demo Accounts
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Password: <code>password123</code>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testAccounts.map((acc, idx) => (
              <div
                key={idx}
                onClick={() => handleQuickFill(acc)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = acc.badgeColor;
                  e.currentTarget.style.background = acc.bgColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
                  e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {acc.role}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: acc.bgColor, color: acc.badgeColor }}>
                      {acc.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <code>{acc.email}</code>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: `1px solid ${acc.badgeColor}`,
                    color: acc.badgeColor,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Log In →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="st-auth-divider">Or</div>

        {/* Switch to Register */}
        <div className="st-auth-switch-box">
          <span>Don't have an account yet?</span>
          <Link to={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="st-auth-switch-link">
            Create an Account
          </Link>
        </div>

        {/* Perks Trust Row */}
        <div className="st-auth-perks-row">
          <div className="st-auth-perk-item">
            <TruckIcon className="w-4 h-4 st-auth-perk-icon" />
            <span className="st-auth-perk-label">Islandwide Delivery</span>
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

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '440px',
                width: '100%',
                padding: '28px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {forgotStep === 1 ? 'Reset Password' : 'Enter Verification Code'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#64748b' }}>
                {forgotStep === 1
                  ? 'Enter your registered email address to receive a secure 6-digit verification code.'
                  : `Enter the 6-digit code sent to ${forgotEmail} and your new password.`}
              </p>

              {forgotMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '16px',
                    backgroundColor: forgotSuccess ? '#f0fdf4' : '#fef2f2',
                    color: forgotSuccess ? '#166534' : '#991b1b',
                    border: `1px solid ${forgotSuccess ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {forgotMessage}
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSendOtp}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Registered Email
                    </label>
                    <input
                      type="email"
                      className="st-auth-input"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="st-auth-submit-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending Code...' : 'Send Reset Code →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      className="st-auth-input"
                      style={{
                        textAlign: 'center',
                        fontSize: '1.4rem',
                        letterSpacing: '8px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                      }}
                      placeholder="000000"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      className="st-auth-input"
                      placeholder="Enter new secure password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <button type="submit" className="st-auth-submit-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Resetting Password...' : 'Save New Password & Sign In'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      ← Change Email or Resend
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
