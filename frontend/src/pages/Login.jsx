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
      console.error("Login error:", error);
      setMessage(error.response?.data?.message || "An error occurred during login. Please try again.");

    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await doLogin(usernameOrEmail, password);
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
          <div className="st-auth-logo-badge">
            <ShoppingBagIcon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
          </div>
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
      </div>
    </div>
  );
}
