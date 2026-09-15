import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  BoxIcon,
  ArrowRightIcon,
} from '../components/Icons';

export default function OverviewPage() {
  const features = [
    {
      id: 'fulfillment',
      icon: <TruckIcon className="w-6 h-6" />,
      tag: 'Texas Regional Logistics',
      title: 'Instant Fulfillment & Lead Times',
      desc: 'Dynamic routing across 5 core Texas metropolitan fulfillment hubs (Houston, Dallas, Austin, San Antonio, El Paso) with automated SLA estimations.',
      badge: '24h - 48h Texas Delivery',
      linkText: 'Explore Logistics',
      linkTo: '/logistics',
    },
    {
      id: 'inventory',
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      tag: 'ACID Relational Engine',
      title: 'Real-Time Inventory Sync',
      desc: 'Atomic stock locking with MySQL InnoDB REPEATABLE READ isolation to eliminate phantom reads, race conditions, and overselling across all SKUs.',
      badge: '100% Stock Accuracy',
      linkText: 'View Relational DB',
      linkTo: '/analytics',
    },
    {
      id: 'catalog',
      icon: <BoxIcon className="w-6 h-6" />,
      tag: 'Dynamic SKU Matrix',
      title: 'Multi-Variant Smart Catalog',
      desc: 'Instant attribute switching across hardware specifications, live inventory checks, category hierarchies, and synchronized shopping carts.',
      badge: 'Sub-50ms SKU Lookup',
      linkText: 'Browse Products',
      linkTo: '/catalog',
    },
  ];

  return (
    <div>
      {/* ==========================================================================
          Hero Section
          ========================================================================== */}
      <section className="hero-wrapper">
        <div className="hero-grid">
          {/* Left Column: Copy & CTAs */}
          <div className="hero-content">
            {/* Tag Pill */}
            <div className="tag-pill">
              <SparklesIcon className="w-4 h-4" />
              <span>✨ Smart Retail & Booking Platform</span>
            </div>

            {/* Hero Heading */}
            <h1 className="hero-heading">
              Empower Your Shopping with <span className="gradient-text">Bright Buy</span>
            </h1>

            {/* Value Proposition Copy */}
            <p className="hero-description">
              Experience next-generation retail built for speed and reliability. Enjoy fast browsing across multi-variant catalogs, real-time distributed inventory synchronization, and guaranteed Texas regional delivery tracking.
            </p>

            {/* Dual Action CTAs */}
            <div className="hero-cta-group">
              <Link to="/catalog" className="btn-hero-primary">
                <span>Get Started 🚀</span>
              </Link>
              <Link to="/auth-cart" className="btn-hero-secondary">
                <span>Sign In 👤</span>
              </Link>
            </div>

            {/* Micro Metrics Row */}
            <div className="hero-metrics-row">
              <div className="metric-item">
                <span className="metric-val">1,400+</span>
                <span className="metric-lbl">Active SKUs</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">5 Hubs</span>
                <span className="metric-lbl">Texas Fulfillment</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">99.98%</span>
                <span className="metric-lbl">Uptime SLA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Modern Isometric Floating Card Visual */}
          <div className="hero-isometric-wrap">
            <div className="hero-glow-backdrop"></div>
            <div className="isometric-stage">
              {/* Base Main Product Card */}
              <div className="isometric-card card-main">
                <div className="iso-card-badge">
                  <span className="iso-status-dot"></span>
                  <span>In Stock · Houston Hub</span>
                </div>

                {/* Visual Graphic Representation */}
                <div className="iso-product-visual">
                  <div className="iso-graphic-box">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.75">
                      <rect width="18" height="18" x="3" y="3" rx="3" />
                      <circle cx="12" cy="12" r="4" />
                      <line x1="12" y1="2" x2="12" y2="4" />
                      <line x1="12" y1="20" x2="12" y2="22" />
                    </svg>
                  </div>
                </div>

                <div className="iso-card-info">
                  <div className="iso-card-category">ENTERPRISE HARDWARE</div>
                  <div className="iso-card-title">Apex Pro Terminal Ultra</div>
                  <div className="iso-card-specs">
                    <span className="spec-tag active">Space Gray</span>
                    <span className="spec-tag">1TB PCIe</span>
                    <span className="spec-tag">Wi-Fi 6E</span>
                  </div>
                  <div className="iso-card-footer">
                    <div className="iso-price">
                      <span className="iso-price-currency">$</span>1,299<span className="iso-price-cents">.00</span>
                    </div>
                    <span className="iso-cart-indicator" title="Ready for Instant Checkout">
                      <ShoppingBagIcon className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Layer 1: Top-Right Order Status */}
              <div className="isometric-card card-floating-top">
                <div className="float-icon-check">
                  <CheckCircleIcon className="w-5 h-5" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="float-card-title">Order Confirmed</div>
                  <div className="float-card-sub">Tx Express · 24h SLA</div>
                </div>
                <span className="float-card-badge">#BB-9204</span>
              </div>

              {/* Floating Layer 2: Bottom-Left Stock Sync */}
              <div className="isometric-card card-floating-bottom">
                <div className="float-pulse-beacon">
                  <span className="pulse-ring"></span>
                  <span className="pulse-core"></span>
                </div>
                <div>
                  <div className="float-card-title">Real-Time Stock Sync</div>
                  <div className="float-card-sub">Zero Overselling · 100% ACID</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          Feature Showcase: "Why Choose Bright Buy?"
          ========================================================================== */}
      <section className="feature-showcase-section">
        <div className="section-header">
          <span className="section-tag">Platform Capabilities</span>
          <h2 className="section-title">Why Choose Bright Buy?</h2>
          <p className="section-subtitle">
            Engineered with enterprise-grade relational architecture to deliver unmatched retail reliability, instant responsiveness, and guaranteed transactional precision.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((item) => (
            <div key={item.id} className="feature-card">
              <div className="feature-icon-wrap">{item.icon}</div>
              <span className="feature-card-tag">{item.tag}</span>
              <h3 className="feature-card-title">{item.title}</h3>
              <p className="feature-card-desc">{item.desc}</p>
              <div className="feature-card-footer">
                <span className="feature-badge-pill">{item.badge}</span>
                <Link to={item.linkTo} style={{ textDecoration: 'none', color: 'var(--primary)', fontSize: '0.825rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>{item.linkText}</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}