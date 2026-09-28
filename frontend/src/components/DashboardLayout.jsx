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
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  }

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (user.role_id === 2) return '/manager-dashboard';
    if (user.role_id === 3) return '/system-administrator';
    return '/customer-dashboard';
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role_id === 2) return 'Manager / Warehouse Admin';
    if (user.role_id === 3) return 'System Administrator';
    return 'Customer Account';
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
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
            <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              About US
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Contact
            </NavLink>
            {/*<NavLink to="/logistics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Logistics
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Analytics
            </NavLink>*/}
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
                      minWidth: '200px',
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

                    <Link
                      to={getDashboardRoute()}
                      className="btn-ghost"
                      style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <UserIcon className="btn-icon" />
                      My Dashboard
                    </Link>

                    <Link
                      to="/orders"
                      className="btn-ghost"
                      style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px' }}
                      onClick={() => setDropdownOpen(false)}
                    >
                      {/*<PackageIcon className="btn-icon" />*/}
                      My Orders
                    </Link>

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
              <Link to="/login">Cart & User Accounts</Link>
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