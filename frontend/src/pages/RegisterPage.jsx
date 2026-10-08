import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UserIcon,
} from '../components/Icons';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || '';

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      let data;
      try {
        const res = await api.post('/auth_cart/register', {
          username: name,
          email: email,
          password: password,
        });
        data = res.data;
      } catch (axiosErr) {
        if (axiosErr.response?.data) {
          throw new Error(axiosErr.response.data.message || 'Registration failed.');
        }
        const response = await fetch(`${baseUrl}/api/auth_cart/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, email: email, password: password }),
        });
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Registration failed. Please check your details.');
        }
      }

      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      setIsSuccess(true);
      setMessage('Registration successful! Redirecting to your dashboard...');

      setTimeout(() => {
        navigate('/customer-dashboard');
      }, 600);
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(error.response?.data?.message || error.message || "An error occurred during registration. Please try again.");

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
          <h1 className="st-auth-title">Create Account</h1>
          <p className="st-auth-subtitle">
            Join thousands of gadget enthusiasts across Sri Lanka and unlock exclusive VIP tech deals.
          </p>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`st-auth-alert ${isSuccess ? 'st-auth-alert-success' : 'st-auth-alert-error'}`}>
            <span>{isSuccess ? '✓' : '⚠️'}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Registration Form */}
        <form className="st-auth-form" onSubmit={handleSubmit}>
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
              />
            </div>
          </div>

          <button type="submit" className="st-auth-submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="st-auth-divider">Or</div>

        {/* Switch to Login */}
        <div className="st-auth-switch-box">
          <span>Already have an account?</span>
          <Link to="/login" className="st-auth-switch-link">
            Sign In Here
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
