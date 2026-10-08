import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ShoppingBagIcon, UserIcon } from './Icons';

export default function DashboardLayout() {
  const [isOnline, setIsOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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
        { label: 'Cart', to: '/auth-cart' },
        { label: 'Track Order', to: '/orders' },
      ];
    }

    // 2. Customer (Role 1)
    if (roleId === 1) {
      return [
        { label: 'Home', to: '/', end: true },
        { label: 'Products', to: '/catalog' },
        { label: 'Cart', to: '/auth-cart' },
        { label: 'My Orders', to: '/orders' },
        { label: 'Dashboard', to: '/customer-dashboard' },
      ];
    }

    // 3. Store Manager (Role 2)
    if (roleId === 2) {
      return [
        { label: 'Dashboard', to: '/manager-dashboard' },
        { label: 'Inventory Stock', to: '/catalog' },
        { label: 'Logistics Hubs', to: '/logistics' },
        { label: 'Analytics & BI', to: '/analytics' },
        { label: 'Storefront', to: '/', end: true },
      ];
    }

    // 4. System Administrator (Role 3)
    if (roleId === 3) {
      return [
        { label: 'Admin Console', to: '/system-administrator' },
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

          {/* Center: Dynamic Role-Based Navigation Links */}
          <nav className={`navbar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
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
            {/* Discrete Connectivity Badge */}
            <div
              className={`connection-badge ${isOnline ? 'online' : 'offline'}`}
              title={isOnline ? 'Backend Connected (Port 5000)' : 'Backend Offline'}
            >
              <span className={`pulse-dot ${isOnline ? 'dot-online' : 'dot-offline'}`}></span>
              <span className="badge-text">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Retail Action Buttons */}
            {user ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: dropdownOpen ? 'rgba(255, 255, 255, 0.08)' : 'transparent', }}>
                  <UserIcon className="btn-icon" />
                  <span>{user.username || user.full_name}</span>
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
                      borderRadius: '10px',
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

                    {roleId === 3 && (
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
                      {/*<LogoutIcon className="btn-icon" />*/}
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  <UserIcon className="btn-icon" />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn-register">
                  <span>Register</span>
                </Link>
              </>
            )}

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