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

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      // Use api client (handles proxy + base url) with fallback
      let data;
      try {
        const res = await api.post('/auth_cart/login', { email: usernameOrEmail, username: usernameOrEmail, password });
        data = res.data;
      } catch (axiosErr) {
        if (axiosErr.response?.data) {
          throw new Error(axiosErr.response.data.message || 'Invalid email or password.');
        }
        // Fallback to direct fetch if network/proxy issue
        const response = await fetch(`${baseUrl}/api/auth_cart/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: usernameOrEmail, username: usernameOrEmail, password }),
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
      setMessage('Login successful! Redirecting to your dashboard...');

      setTimeout(() => {
        const roleId = Number(data.user?.role_id);
        if (redirectUrl && roleId === 1) {
          navigate(redirectUrl);
        } else if (roleId === 1) {
          navigate('/customer-dashboard');
        } else if (roleId === 2) {
          navigate('/manager-dashboard');
        } else if (roleId === 3 || roleId === 4) {
          navigate('/system-administrator');
        } else {
          navigate('/');
        }
      }, 600);
    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="st-auth-page-wrapper">
      <div className="st-auth-card">
        {/* Header Branding */}
        <div className="st-auth-header">
          <div className="st-auth-logo-badge">
            <ShoppingBagIcon className="w-6 h-6" />
          </div>
          <h1 className="st-auth-title">Welcome Back</h1>
          <p className="st-auth-subtitle">
            Sign in to track orders, manage your cart, and access genuine tech warranties.
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
