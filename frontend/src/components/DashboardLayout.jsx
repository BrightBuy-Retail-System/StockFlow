import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client';
import { ShoppingBagIcon, UserIcon } from './Icons';

export default function DashboardLayout() {
  const [isOnline, setIsOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const checkHealth = () => {
      api
        .get('/health')
        .then(() => {
          if (isMounted) setIsOnline(true);
        })
        .catch(() => {
          if (isMounted) setIsOnline(false);
        });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close mobile navigation on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="storefront-app">
      {/* Top Horizontal Navigation Bar */}
      <header className="storefront-navbar">
        <div className="navbar-inner">
          {/* Left: Brand Logo & Typography */}
          <Link to="/" className="navbar-brand">
            <div className="brand-logo-badge">
              <ShoppingBagIcon className="brand-logo-icon" />
            </div>
            <span className="brand-text">
              Bright<span className="brand-text-accent">Buy</span>
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className={`navbar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Products
            </NavLink>
            <NavLink to="/auth-cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Cart
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Orders
            </NavLink>
            <NavLink to="/logistics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Logistics
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Analytics
            </NavLink>
          </nav>

          {/* Right: Actions & Connectivity Status */}
          <div className="navbar-actions">
            {/* Discrete Connectivity Badge */}
            <div
              className={`connection-badge ${isOnline ? 'online' : 'offline'}`}
              title={isOnline ? 'Backend Connected (Port 5000)' : 'Backend Offline'}
            >
              <span className={`pulse-dot ${isOnline ? 'dot-online' : 'dot-offline'}`}></span>
              <span className="badge-text">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Retail Action Buttons */}
            <Link to="/auth-cart" className="btn-ghost">
              <UserIcon className="btn-icon" />
              <span>Login</span>
            </Link>
            <Link to="/auth-cart" className="btn-register">
              <span>Register</span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Outlet Container */}
      <main className="storefront-main">
        <Outlet />
      </main>

      {/* Modern Clean Consumer Footer */}
      <footer className="storefront-footer">
        <div className="footer-inner">
          <div className="footer-col-brand">
            <div className="footer-brand-title">
              <ShoppingBagIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <span>Bright Buy Retail Systems</span>
            </div>
            <p className="footer-brand-desc">
              Next-generation retail inventory & transactional order management engine powered by high-concurrency MySQL InnoDB and distributed Texas routing.
            </p>
            <span className="footer-meta-tag">CS3043 · Database Systems</span>
          </div>

          <div className="footer-links-group">
            <div className="footer-links-col">
              <span className="footer-col-header">Platform</span>
              <Link to="/catalog">Products Catalog</Link>
              <Link to="/auth-cart">Cart & User Accounts</Link>
              <Link to="/orders">Order Tracking</Link>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-header">Infrastructure</span>
              <Link to="/logistics">Texas Logistics Hubs</Link>
              <Link to="/analytics">Analytics & BI</Link>
              <Link to="/">Executive Overview</Link>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-header">Database Stack</span>
              <span className="footer-tech-item">TiDB Cloud InnoDB</span>
              <span className="footer-tech-item">Flask REST Blueprints</span>
              <span className="footer-tech-item">React 19 + Vite</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} BrightBuy Inc. All rights reserved.</span>
          <div className="footer-bottom-badge">
            <span className="pulse-dot dot-online"></span>
            <span>Local Cluster Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}