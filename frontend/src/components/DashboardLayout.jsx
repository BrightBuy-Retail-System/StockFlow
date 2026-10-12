import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ShoppingBagIcon, UserIcon, AuthCartIcon } from './Icons';

export default function DashboardLayout() {
  const [isOnline, setIsOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Update cart count from local storage
  const updateCartCount = () => {
    try {
      const savedUser = localStorage.getItem('user');
      const u = savedUser ? JSON.parse(savedUser) : null;
      const uid = u?.id || u?.user_id;
      const raw = (uid ? localStorage.getItem(`cart_${uid}`) : null) || localStorage.getItem('cart');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
          setCartCount(total);
          return;
        }
      }
      setCartCount(0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, [location.pathname]);

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    setUser(savedUser ? JSON.parse(savedUser) : null);

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
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  }

  const roleId = Number(user?.role_id) || 0;

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (roleId === 2) return '/manager-dashboard';
    if (roleId === 3) return '/system-administrator';
    return '/customer-dashboard';
  };

  const getDashboardName = () => {
    if (!user) return 'My Dashboard';
    if (user.role_id === 2) return 'Manager Operations Hub';
    if (user.role_id === 3) return 'Administrator Console';
    return 'Customer Dashboard';
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (roleId === 2) return 'Store Executive & Manager';
    if (roleId === 3) return 'System Administrator';
    return 'Customer Account';
  };

  // Role-specific navigation links
  const getNavLinks = () => {
    // 1. Guest (Not Logged In)
    if (!user) {
      return [
        { label: 'Home', to: '/', end: true },
        { label: 'Products', to: '/catalog' },
      ];
    }

    // 2. Customer (Role 1)
    if (roleId === 1) {
      return [
        { label: 'Home', to: '/', end: true },
        { label: 'Products', to: '/catalog' },
        { label: 'My Orders', to: '/orders' },
        { label: 'Logistics', to: '/logistics' },
        { label: 'Dashboard', to: '/customer-dashboard' },
      ];
    }

    // 3. Store Manager (Role 2)
    if (roleId === 2) {
      return [
        { label: 'Dashboard', to: '/manager-dashboard' },
        { label: 'Orders & Fulfillment', to: '/orders' },
        { label: 'Inventory Stock', to: '/catalog' },
        { label: 'Logistics Hubs', to: '/logistics' },
        { label: 'Analytics', to: '/analytics' },
        { label: 'Storefront', to: '/', end: true },
      ];
    }

    // 4. System Administrator (Roles 3 & 4)
    if (roleId === 3 || roleId === 4) {
      return [
        { label: 'Admin Console', to: '/system-administrator' },
        { label: 'Orders & Fulfillment', to: '/orders' },
        { label: 'Manager Pipeline', to: '/manager-dashboard' },
        { label: 'Inventory Stock', to: '/catalog' },
        { label: 'Logistics', to: '/logistics' },
        { label: 'Analytics', to: '/analytics' },
        { label: 'Storefront', to: '/', end: true },
      ];
    }

    return [
      { label: 'Home', to: '/', end: true },
      { label: 'Products', to: '/catalog' },
    ];
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  return (
    <div className="storefront-app">
      {/* Dynamic Announcement Bar */}
      {roleId === 2 ? (
        <div className="simplytek-announcement-bar" style={{ background: '#78350f', color: '#fef3c7' }}>
          <div className="announcement-inner">
            <span className="announcement-pill" style={{ background: '#f59e0b', color: '#78350f' }}>👔 Store Management</span>
            <span className="announcement-text">
              Store Executive &amp; Manager Console — Orders Fulfillment Pipeline, Inventory, and Texas Logistics
            </span>
            <Link to="/manager-dashboard" className="announcement-link">
              Management Dashboard &rarr;
            </Link>
          </div>
        </div>
      ) : roleId === 3 ? (
        <div className="simplytek-announcement-bar" style={{ background: '#14532d', color: '#dcfce7' }}>
          <div className="announcement-inner">
            <span className="announcement-pill" style={{ background: '#22c55e', color: '#14532d' }}>⚡ System Administrator</span>
            <span className="announcement-text">
              System Admin Console — Database Inventory, Security Grants, and Analytics Operations
            </span>
            <Link to="/system-administrator" className="announcement-link">
              Admin Console &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="simplytek-announcement-bar">
          <div className="announcement-inner">
            <span className="announcement-pill">🚚 Islandwide Delivery</span>
            <span className="announcement-text">
              Free Delivery on orders over Rs. 15,000 | 100% Genuine Guaranteed | Pay in 3 with Koko &amp; Mintpay 0% Interest
            </span>
            <Link to="/catalog" className="announcement-link">
              Shop Tech Deals &rarr;
            </Link>
          </div>
        </div>
      )}

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

          {/* Center: Dynamic Role-Based Navigation Links (Desktop) */}
          <nav className="navbar-nav desktop-nav">
            {getNavLinks().map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Actions & Connectivity Status */}
          <div className="navbar-actions">
            {/* Discrete Connectivity Badge (Desktop) */}
            <div
              className={`connection-badge desktop-only ${isOnline ? 'online' : 'offline'}`}
              title={isOnline ? 'Backend Connected (Port 5000)' : 'Backend Offline'}
              style={{
                height: '38px',
                minHeight: '38px',
                maxHeight: '38px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 14px',
                border: '1.5px solid #e7d7c1',
                borderRadius: 'var(--radius-btn, 2px)',
                background: '#ffffff',
                color: '#3b2f2f',
                fontSize: '0.8125rem',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  minWidth: '8px',
                  minHeight: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#16a34a' : '#dc2626',
                  display: 'inline-block',
                  flexShrink: 0,
                  boxShadow: 'none',
                  animation: 'none',
                }}
              />
              <span className="badge-text" style={{ lineHeight: 1 }}>{isOnline ? 'Backend Connected' : 'Backend Disconnected'}</span>
            </div>

            {/* Shopping Cart Button with Real-time Count Badge (Always Available) */}
            <Link
              to="/auth-cart"
              className="navbar-cart-btn"
              title="Shopping Cart"
              aria-label={`Shopping Cart with ${cartCount} items`}
              style={{
                width: '38px',
                height: '38px',
                minHeight: '38px',
                maxHeight: '38px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e7d7c1',
                borderRadius: 'var(--radius-btn, 2px)',
                background: '#ffffff',
                color: '#3b2f2f',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <AuthCartIcon className="navbar-cart-icon" style={{ width: '18px', height: '18px' }} />
              {cartCount > 0 && <span className="navbar-cart-badge">{cartCount}</span>}
            </Link>

            {/* Retail Action Buttons */}
            {user ? (
              <div ref={dropdownRef} className="desktop-only" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: dropdownOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}
                >
                  <UserIcon className="btn-icon" />
                  <span>{user.username || user.full_name}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '2px',
                    background: user.role_id === 1 ? 'var(--primary-light)' : user.role_id === 2 ? 'var(--accent-light)' : 'var(--success-bg)',
                    color: user.role_id === 1 ? 'var(--primary)' : user.role_id === 2 ? 'var(--accent)' : 'var(--success-text)'
                  }}>
                    {user.role_id === 1 ? 'Customer' : user.role_id === 2 ? 'Manager' : 'Admin'}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{dropdownOpen ? '▲' : '▼'}</span>
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      minWidth: '220px',
                      background: 'var(--bg-card, #1e222d)',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      borderRadius: '2px',
                      padding: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username || user.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getRoleLabel()}</div>
                    </div>

                    {/* Role-specific Dropdown Links */}
                    {roleId === 1 && (
                      <>
                        <Link
                          to="/customer-dashboard"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserIcon className="btn-icon" />
                          <span>My Dashboard</span>
                        </Link>
                        <Link
                          to="/orders"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>My Orders</span>
                        </Link>
                        <Link
                          to="/analytics"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Analytics</span>
                        </Link>
                        <Link
                          to="/auth-cart"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Active Cart</span>
                        </Link>
                      </>
                    )}

                    {roleId === 2 && (
                      <>
                        <Link
                          to="/manager-dashboard"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserIcon className="btn-icon" />
                          <span>Manager Dashboard</span>
                        </Link>
                        <Link
                          to="/orders"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Orders &amp; Fulfillment</span>
                        </Link>
                        <Link
                          to="/catalog"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Inventory Stock</span>
                        </Link>
                        <Link
                          to="/logistics"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Logistics Hubs</span>
                        </Link>
                        <Link
                          to="/analytics"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Executive Analytics</span>
                        </Link>
                      </>
                    )}

                    {(roleId === 3 || roleId === 4) && (
                      <>
                        <Link
                          to="/system-administrator"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserIcon className="btn-icon" />
                          <span>System Administration</span>
                        </Link>
                        <Link
                          to="/orders"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Orders &amp; Fulfillment</span>
                        </Link>
                        <Link
                          to="/manager-dashboard"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Manager Pipeline</span>
                        </Link>
                        <Link
                          to="/catalog"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Product Catalog</span>
                        </Link>
                        <Link
                          to="/analytics"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Analytics &amp; BI</span>
                        </Link>
                        <Link
                          to="/logistics"
                          className="btn-ghost"
                          style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <span>Texas Logistics</span>
                        </Link>
                      </>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="btn-ghost"
                      style={{
                        justifyContent: 'flex-start',
                        padding: '8px 12px',
                        width: '100%',
                        borderRadius: '6px',
                        color: 'crimson',
                        cursor: 'pointer',
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/login" className="btn-ghost">
                  <UserIcon className="btn-icon" />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn-register">
                  <span>Register</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Modern Slide-In Mobile Navigation Drawer */}
      <div
        className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-logo-badge">
              <ShoppingBagIcon className="brand-logo-icon" />
            </div>
            <span className="brand-text">
              Bright<span className="brand-text-accent">Buy</span>
            </span>
          </Link>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        {/* User Account / Guest Card in Drawer */}
        <div className="mobile-drawer-account">
          {user ? (
            <div className="mobile-user-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="mobile-user-avatar">
                  <UserIcon style={{ width: '18px', height: '18px' }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user.username || user.full_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {getRoleLabel()}
                  </div>
                </div>
              </div>
              <Link
                to={getDashboardRoute()}
                className="mobile-dashboard-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Dashboard &rarr;
              </Link>
            </div>
          ) : (
            <div className="mobile-guest-card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Welcome to BrightBuy
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Link
                  to="/login"
                  className="mobile-auth-btn mobile-auth-login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="mobile-auth-btn mobile-auth-register"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links in Drawer */}
        <nav className="mobile-drawer-nav">
          <div className="mobile-nav-group-label">Navigation</div>
          {getNavLinks().map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{link.label}</span>
              {link.to === '/auth-cart' && cartCount > 0 && (
                <span className="mobile-nav-cart-pill">{cartCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer / System status in Drawer */}
        <div className="mobile-drawer-footer">
          <div className="mobile-cluster-indicator">
            <span className={`pulse-dot ${isOnline ? 'dot-online' : 'dot-offline'}`}></span>
            <span>{isOnline ? 'Backend Connected' : 'Backend Disconnected'}</span>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="mobile-logout-btn"
            >
              Log Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Outlet Container */}
      <main className="storefront-main">
        <Outlet />
      </main>

      {/* Modern Clean Consumer Footer */}
      <footer className="storefront-footer">
        <div className="footer-inner">
          <div className="footer-col-brand">
            <div className="footer-brand-title">
              <ShoppingBagIcon style={{ width: '22px', height: '22px', minWidth: '22px', color: 'var(--primary)', flexShrink: 0 }} />
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
              <Link to="/analytics">Analytics</Link>
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