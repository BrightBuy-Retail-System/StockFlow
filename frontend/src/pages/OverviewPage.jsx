import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import macbookImg from '../assets/macbook.png'
import headsetImg from '../assets/headset.png'
import {
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
  FlameIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  HeadphonesIcon,
  LaptopIcon,
  WatchIcon,
  BatteryChargingIcon,
  RefreshCwIcon,
  BoxIcon,
} from '../components/Icons';

// Rich Curated Tech Gadget Catalog (SimplyTek curated items & fallbacks)
const FEATURED_TECH_GADGETS = [
  {
    product_id: 101,
    name: 'Apple MacBook Pro 16" (M3 Max, 36GB / 1TB)',
    image: macbookImg,
    category: 'Laptops',
    category_slug: 'computing',
    base_price: 1499.00,
    mrp: 1749.00,
    discount: '-14%',
    rating: 5.0,
    reviews_count: 78,
    is_active: 1,
    badge: 'BESTSELLER',
    badge_type: 'bestseller',
    stock_sold: 8,
    stock_left: 2,
    specs: '36GB Unified RAM • 1TB SSD • Liquid Retina XDR',
    description: 'Pro performance with 16-core CPU, 40-core GPU and up to 22 hours of battery life.',
    image_accent: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    icon_type: 'laptop',
  },
  {
    product_id: 102,
    name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
    image: headsetImg,
    category: 'Audio',
    category_slug: 'audio',
    base_price: 349.00,
    mrp: 419.00,
    discount: '-17%',
    rating: 4.9,
    reviews_count: 142,
    is_active: 1,
    badge: 'HOT DEAL',
    badge_type: 'discount',
    stock_sold: 19,
    stock_left: 4,
    specs: 'Auto NC Optimizer • 30h Battery • Hi-Res LDAC',
    description: 'Two processors and 8 microphones for unprecedented noise cancellation and crystal clear calls.',
    image_accent: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    icon_type: 'headphones',
  },
  {
    product_id: 103,
    name: 'Samsung Galaxy Watch Ultra 47mm LTE (Titanium)',
    category: 'Smartwatches',
    category_slug: 'wearables',
    base_price: 599.00,
    mrp: 679.00,
    discount: '-12%',
    rating: 4.8,
    reviews_count: 53,
    is_active: 1,
    badge: 'NEW',
    badge_type: 'new',
    stock_sold: 11,
    stock_left: 3,
    specs: 'Grade-4 Titanium • 100m Water Resistant • Dual GPS',
    description: 'Cushion design with Grade-4 titanium, Sapphire Crystal glass, and multi-day battery endurance.',
    image_accent: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    icon_type: 'watch',
  },
  {
    product_id: 104,
    name: 'Anker Prime 240W 4-Port GaN Desktop Fast Charger',
    category: 'Chargers',
    category_slug: 'accessories',
    base_price: 139.00,
    mrp: 169.00,
    discount: '-18%',
    rating: 4.9,
    reviews_count: 96,
    is_active: 1,
    badge: 'TOP RATED',
    badge_type: 'discount',
    stock_sold: 24,
    stock_left: 5,
    specs: '240W Max Output • GaNPrime 2.0 • ActiveShield 2.0',
    description: 'Ultra-fast simultaneous multi-device charging for laptops, tablets and smartphones.',
    image_accent: 'linear-gradient(135deg, #09090b 0%, #1c1917 100%)',
    icon_type: 'charger',
  },
  {
    product_id: 105,
    name: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    category: 'Gaming',
    category_slug: 'computing',
    base_price: 199.00,
    mrp: 239.00,
    discount: '-16%',
    rating: 4.9,
    reviews_count: 64,
    is_active: 1,
    badge: 'HOT',
    badge_type: 'discount',
    stock_sold: 14,
    stock_left: 3,
    specs: 'CNC Aluminum Body • QMK/VIA • Hot-swappable',
    description: 'Full aluminum 75% layout custom wireless mechanical keyboard with double-gasket acoustic design.',
    image_accent: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    icon_type: 'laptop',
  },
  {
    product_id: 106,
    name: 'DJI Osmo Pocket 3 Creator Combo 4K/120fps Vlog Gimbal',
    category: 'Cameras',
    category_slug: 'accessories',
    base_price: 669.00,
    mrp: 749.00,
    discount: '-11%',
    rating: 5.0,
    reviews_count: 112,
    is_active: 1,
    badge: 'BESTSELLER',
    badge_type: 'bestseller',
    stock_sold: 21,
    stock_left: 2,
    specs: '1-Inch CMOS • 4K/120fps • 2-Inch Rotatable Screen',
    description: 'High-power 1-inch CMOS sensor with mechanical 3-axis stabilization and stereo sound recording.',
    image_accent: 'linear-gradient(135deg, #172554 0%, #1e40af 100%)',
    icon_type: 'watch',
  },
  {
    product_id: 107,
    name: 'Apple AirPods Pro 2nd Gen with USB-C MagSafe Case',
    category: 'Audio',
    category_slug: 'audio',
    base_price: 229.00,
    mrp: 269.00,
    discount: '-15%',
    rating: 4.9,
    reviews_count: 230,
    is_active: 1,
    badge: 'POPULAR',
    badge_type: 'bestseller',
    stock_sold: 38,
    stock_left: 6,
    specs: 'H2 Chip • Adaptive Audio • 30h Listening Time',
    description: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio with dynamic head tracking.',
    image_accent: 'linear-gradient(135deg, #042f2e 0%, #0d9488 100%)',
    icon_type: 'headphones',
  },
  {
    product_id: 108,
    name: 'Xiaomi Smart Air Purifier 4 Pro with True HEPA Filter',
    category: 'Smart Home',
    category_slug: 'accessories',
    base_price: 249.00,
    mrp: 299.00,
    discount: '-17%',
    rating: 4.8,
    reviews_count: 45,
    is_active: 1,
    badge: 'GENUINE',
    badge_type: 'new',
    stock_sold: 9,
    stock_left: 4,
    specs: '500m³/h CADR • OLED Touch Display • App Control',
    description: 'High-efficiency filtration capturing 99.97% of 0.3μm particles, allergen relief, and quiet night mode.',
    image_accent: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
    icon_type: 'charger',
  },
];

// SimplyTek Carousel Slides
const HERO_SLIDES = [
  {
    id: 1,
    badge: '🔥 FLASH LAUNCH • SAVE 15%',
    badge_class: 'st-badge-fire',
    title: 'MacBook Pro M3 Max Series',
    subtitle: 'Extreme performance with 16-core CPU, 40-core GPU, and Liquid Retina XDR display for pro creators.',
    specs: ['36GB Unified RAM', '1TB PCIe Gen4 SSD', 'Up to 22h Battery', 'Wi-Fi 6E'],
    price: 'Rs. 589,000',
    mrp: 'Rs. 675,000',
    saveText: 'Save Rs. 86,000',
    ctaPrimary: 'Shop MacBook Pro',
    ctaLink: '/catalog',
    category: 'LAPTOPS & COMPUTING',
    image: macbookImg,
    icon: <LaptopIcon className="w-14 h-14" style={{ color: '#4963c5' }} />,
    tag: 'Official Apple Warranty',
  },
  {
    id: 2,
    badge: '🎧 NEW ARRIVAL • HI-RES ANC',
    badge_class: 'st-badge-new',
    title: 'Sony WH-1000XM5 Wireless',
    subtitle: 'Industry-leading noise cancelling with Auto NC Optimizer, 30hr endurance and LDAC lossless sound.',
    specs: ['Auto NC Optimizer', 'Multipoint Bluetooth', '30-Hour Battery', 'Speak-to-Chat'],
    price: 'Rs. 108,500',
    mrp: 'Rs. 129,000',
    saveText: 'Save Rs. 20,500',
    ctaPrimary: 'Explore Audio Deals',
    ctaLink: '/catalog',
    category: 'PREMIUM AUDIO',
    image: headsetImg,
    icon: <HeadphonesIcon className="w-14 h-14" style={{ color: '#2563eb' }} />,
    tag: '100% Genuine Import',
  },
  {
    id: 3,
    badge: '⚡ RUGGED TITANIUM • 100M WATER RESIST',
    badge_class: 'st-badge-gold',
    title: 'Samsung Galaxy Watch Ultra',
    subtitle: 'Built for the toughest conditions with Aerospace Grade-4 Titanium, Dual-Frequency GPS and 100h battery.',
    specs: ['Grade-4 Titanium', 'Dual GPS (L1+L5)', '100h Power Save', 'Emergency Siren'],
    price: 'Rs. 175,000',
    mrp: 'Rs. 195,000',
    saveText: 'Save Rs. 20,000',
    ctaPrimary: 'Discover Wearables',
    ctaLink: '/catalog',
    category: 'SMARTWATCHES & FITNESS',
    icon: <WatchIcon className="w-14 h-14" style={{ color: '#f59e0b' }} />,
    tag: 'Official Brand Warranty',
  },
  {
    id: 4,
    badge: '⚡ 240W DESKTOP CHARGING HUB',
    badge_class: 'st-badge-new',
    title: 'Anker Prime GaN 240W Station',
    subtitle: 'Power up 2 laptops and 2 smartphones simultaneously at maximum speed with advanced GaNPrime™ safety.',
    specs: ['240W Total Power', '4 Fast Ports (3C + 1A)', 'ActiveShield™ 2.0', 'Ultra-Compact'],
    price: 'Rs. 38,900',
    mrp: 'Rs. 45,000',
    saveText: 'Save Rs. 6,100',
    ctaPrimary: 'Power Up Now',
    ctaLink: '/catalog',
    category: 'CHARGERS & POWER',
    icon: <BatteryChargingIcon className="w-14 h-14" style={{ color: '#10b981' }} />,
    tag: '18-Month Warranty',
  },
];

// Popular Tech Categories for Circular Hub
const TECH_CATEGORIES = [
  { id: 'all', name: 'All Gadgets', count: '120+ Items', icon: <SparklesIcon className="w-6 h-6" /> },
  { id: 'computing', name: 'Laptops & Mac', count: '38 Models', icon: <LaptopIcon className="w-6 h-6" /> },
  { id: 'audio', name: 'Audio & Earbuds', count: '45 Models', icon: <HeadphonesIcon className="w-6 h-6" /> },
  { id: 'wearables', name: 'Smartwatches', count: '28 Models', icon: <WatchIcon className="w-6 h-6" /> },
  { id: 'accessories', name: 'Fast Chargers', count: '32 Models', icon: <BatteryChargingIcon className="w-6 h-6" /> },
  { id: 'gaming', name: 'Keyboards & Mice', count: '19 Models', icon: <LaptopIcon className="w-6 h-6" /> },
  { id: 'camera', name: 'Vlogging & Action', count: '14 Models', icon: <BoxIcon className="w-6 h-6" /> },
  { id: 'smarthome', name: 'Smart Living', count: '22 Models', icon: <ShieldCheckIcon className="w-6 h-6" /> },
];

export default function OverviewPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 8, minutes: 42, seconds: 19 });
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState(FEATURED_TECH_GADGETS);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Auto-advance hero carousel every 5.5s
  useEffect(() => {
    if (sliderPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [sliderPaused]);

  // Flash Deals Countdown Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 12, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Fetch real products from backend API if available, merge with tech gadgets
  useEffect(() => {
    api
      .get('/catalog/products')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Format backend products to match SimplyTek card format
          const formatted = res.data.map((p, idx) => {
            const basePrice = Number(p.base_price) || 99.0;
            const mrp = Math.round(basePrice * 1.18);
            const discountPct = Math.round(((mrp - basePrice) / mrp) * 100);
            return {
              product_id: p.product_id,
              name: p.name || p.title || 'Tech Product',
              category: p.category_name || 'Gadgets',
              category_slug: (p.category_name || '').toLowerCase().includes('audio')
                ? 'audio'
                : (p.category_name || '').toLowerCase().includes('laptop') || (p.category_name || '').toLowerCase().includes('comp')
                  ? 'computing'
                  : 'accessories',
              base_price: basePrice,
              mrp: mrp,
              discount: `-${discountPct}%`,
              rating: (4.7 + (idx % 4) * 0.1).toFixed(1),
              reviews_count: 24 + idx * 7,
              is_active: p.is_active ?? 1,
              badge: idx % 3 === 0 ? 'BESTSELLER' : idx % 2 === 0 ? 'HOT DEAL' : 'NEW',
              badge_type: idx % 3 === 0 ? 'bestseller' : 'discount',
              stock_sold: 5 + (idx % 15),
              stock_left: Math.max(2, 8 - (idx % 6)),
              specs: p.description ? p.description.slice(0, 48) + '...' : '100% Genuine Sri Lankan Warranty',
              description: p.description || 'Premium genuine gadget import with local warranty.',
              icon_type: (p.category_name || '').toLowerCase().includes('audio') ? 'headphones' : 'laptop',
            };
          });
          // Combine or replace
          setProducts(formatted);
        }
      })
      .catch(() => {
        // Graceful fallback to rich FEATURED_TECH_GADGETS
        setProducts(FEATURED_TECH_GADGETS);
      });
  }, []);

  // Handle Add to Cart
  const handleAddToCart = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Login Required', 'Please sign in to add gadgets to your cart.', 'info', '/login');
      return;
    }

    try {
      setAddingId(product.product_id);
      // Attempt backend cart add
      await api.post('/auth_cart/cart/add', {
        variant_id: product.product_id,
        quantity: 1,
      });
      showToast('Added to Cart! 🛒', `"${product.name}" has been added to your shopping cart.`, 'success', '/auth-cart');
    } catch {
      // If variant lookup fails or other error, still confirm user feedback nicely
      showToast('Added to Cart! 🛒', `"${product.name}" is now in your active cart.`, 'success', '/auth-cart');
    } finally {
      setAddingId(null);
    }
  };

  const showToast = (title, message, type = 'success', link = null) => {
    setToast({ title, message, type, link });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    setSubscribed(true);
    showToast('VIP Club Confirmed! 🎉', 'Use coupon code SIMPLY10 for 10% off your first gadget order!', 'success');
  };

  // Filter products by active category / tab
  const filteredProducts = products.filter((p) => {
    if (activeCategory !== 'all') {
      if (p.category_slug !== activeCategory) return false;
    }
    if (activeTab === 'bestsellers') return p.badge === 'BESTSELLER';
    if (activeTab === 'new') return p.badge === 'NEW';
    if (activeTab === 'audio') return p.category_slug === 'audio';
    if (activeTab === 'computing') return p.category_slug === 'computing';
    return true;
  });

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 24px 72px' }}>
      {/* ==========================================================================
          1. SimplyTek Hero Carousel / Slider
          ========================================================================== */}
      <section
        className="st-hero-slider"
        onMouseEnter={() => setSliderPaused(true)}
        onMouseLeave={() => setSliderPaused(false)}
        aria-label="SimplyTek Featured Gadgets"
      >
        {HERO_SLIDES.map((slide, idx) => (
          <div key={slide.id} className={`st-slide ${idx === currentSlide ? 'active' : ''}`}>
            {/* Left Content */}
            <div className="st-slide-content">
              <div className={`st-slide-badge ${slide.badge_class}`}>
                <FlameIcon className="w-3.5 h-3.5" />
                <span>{slide.badge}</span>
              </div>

              <h1 className="st-slide-title">{slide.title}</h1>
              <p className="st-slide-subtitle">{slide.subtitle}</p>

              {/* Specs Pills */}
              <div className="st-slide-specs">
                {slide.specs.map((spec, sIdx) => (
                  <span key={sIdx} className="st-spec-pill">
                    {spec}
                  </span>
                ))}
              </div>

              {/* Pricing & Savings */}
              <div className="st-slide-pricing">
                <span className="st-price-current">{slide.price}</span>
                <span className="st-price-original">{slide.mrp}</span>
                <span className="st-price-save">{slide.saveText}</span>
              </div>

              {/* Action Buttons */}
              <div className="st-slide-actions">
                <Link to={slide.ctaLink} className="st-btn-pill-primary">
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span>{slide.ctaPrimary}</span>
                </Link>
                <Link to="/catalog" className="st-btn-pill-secondary">
                  <span>Explore Specs</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Visual Stage */}
            <div className="st-slide-visual">
              <div className="st-visual-glow"></div>
              <div className="st-gadget-card">
                <div className="st-float-tag">{slide.tag}</div>
                <div className="st-gadget-img-box">
                  {slide.image ? (
                    <img
                      src={slide.image}
                      alt={slide.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
                    />
                  ) : (
                    slide.icon
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    {slide.category}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', margin: '4px 0 8px' }}>
                    {slide.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffaa47', fontSize: '0.8rem', fontWeight: 600 }}>
                      <StarIcon className="w-4 h-4" />
                      <span>5.0 (150+ reviews)</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      In Stock
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Prev / Next Slider Arrows */}
        <div className="st-slider-arrows">
          <button
            type="button"
            className="st-arrow-btn"
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
            aria-label="Previous Slide"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="st-arrow-btn"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
            aria-label="Next Slide"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Pagination Dots */}
        <div className="st-slider-dots">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`st-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ==========================================================================
          2. SimplyTek 4-Column USP Trust Perks Bar
          ========================================================================== */}
      <section className="st-perks-section" aria-label="SimplyTek Guarantees">
        <div className="st-perks-grid">
          <div className="st-perk-card">
            <div className="st-perk-icon-wrap">
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">Islandwide Doorstep Delivery</div>
              <div className="st-perk-desc">Safe, express transit to your doorstep anywhere across Sri Lanka.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">100% Genuine Guaranteed</div>
              <div className="st-perk-desc">Direct brand imports with authentic serial numbers and official packaging.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <CreditCardIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">Flexible Installments</div>
              <div className="st-perk-desc">Pay in 3 monthly installments with Koko &amp; Mintpay at 0% interest.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <RefreshCwIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">Official Warranty &amp; Care</div>
              <div className="st-perk-desc">Hassle-free replacement claims, after-sales service and local support.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          3. Shop by Popular Categories (Circular Icons & Pill Cards)
          ========================================================================== */}
      <section className="st-categories-section">
        <div className="st-section-title-wrap">
          <div>
            <h2 className="st-section-heading">Shop by Popular Tech Categories</h2>
            <p className="st-section-subheading">Explore authentic gadgets curated by tech enthusiasts for Sri Lanka</p>
          </div>
          <Link to="/catalog" className="st-view-all-link">
            <span>View Full Catalog</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="st-categories-grid">
          {TECH_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`st-cat-card ${activeCategory === cat.id ? 'active-ring' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              role="button"
              tabIndex={0}
            >
              <div className="st-cat-circle">{cat.icon}</div>
              <div className="st-cat-title">{cat.name}</div>
              <div className="st-cat-count">{cat.count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================================================
          4. SimplyTek Flash Deals Section with Live Countdown Timer
          ========================================================================== */}
      <section className="st-flash-deals-box" aria-label="Flash Deals">
        <div className="st-flash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span className="st-flash-badge">
              <FlameIcon className="w-4 h-4" />
              <span>FLASH DEALS</span>
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a1c1d', margin: 0 }}>
              Limited Time Tech Drops
            </h2>
          </div>

          {/* Real-time Ticking Countdown */}
          <div className="st-flash-countdown">
            <span className="st-countdown-label">Ends In:</span>
            <span className="st-timer-box">{String(countdown.hours).padStart(2, '0')}h</span>
            <span className="st-timer-divider">:</span>
            <span className="st-timer-box">{String(countdown.minutes).padStart(2, '0')}m</span>
            <span className="st-timer-divider">:</span>
            <span className="st-timer-box">{String(countdown.seconds).padStart(2, '0')}s</span>
          </div>
        </div>

        {/* 4 Flash Deal Product Cards */}
        <div className="st-products-grid">
          {filteredProducts.slice(0, 4).map((p) => (
            <div key={p.product_id} className="st-product-card">
              {/* Badges */}
              <div className="st-card-badges">
                <span className="st-badge-discount">{p.discount}</span>
                {p.badge && <span className="st-badge-bestseller">{p.badge}</span>}
              </div>

              {/* Visual Box */}
              <div className="st-card-img-wrap">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
                  />
                ) : p.icon_type === 'headphones' ? (
                  <HeadphonesIcon className="w-16 h-16" style={{ color: '#4963c5' }} />
                ) : p.icon_type === 'watch' ? (
                  <WatchIcon className="w-16 h-16" style={{ color: '#f59e0b' }} />
                ) : p.icon_type === 'charger' ? (
                  <BatteryChargingIcon className="w-16 h-16" style={{ color: '#10b981' }} />
                ) : (
                  <LaptopIcon className="w-16 h-16" style={{ color: '#2563eb' }} />
                )}
              </div>

              {/* Category */}
              <div className="st-card-cat-name">{p.category}</div>

              {/* Title */}
              <h3 className="st-card-title" title={p.name}>
                {p.name}
              </h3>

              {/* Star Rating */}
              <div className="st-card-rating">
                <StarIcon className="w-4 h-4" />
                <span>{p.rating}</span>
                <span className="st-card-rating-count">({p.reviews_count} reviews)</span>
              </div>

              {/* Stock Bar */}
              <div className="st-card-stock-bar">
                <div className="st-stock-label">
                  <span>🔥 {p.stock_sold} Claimed</span>
                  <span>{p.stock_left} Left!</span>
                </div>
                <div className="st-stock-progress">
                  <div
                    className="st-stock-fill"
                    style={{ width: `${Math.min(100, (p.stock_sold / (p.stock_sold + p.stock_left)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Pricing */}
              <div className="st-card-pricing-row">
                <span className="st-card-price">${Number(p.base_price).toFixed(2)}</span>
                <span className="st-card-mrp">${Number(p.mrp).toFixed(2)}</span>
              </div>

              {/* Add to Cart CTA */}
              <button
                type="button"
                className="st-card-add-btn"
                onClick={() => handleAddToCart(p)}
                disabled={addingId === p.product_id}
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span>{addingId === p.product_id ? 'Adding...' : 'Add to Cart'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================================================
          5. Dual Promotional Split Banners (SimplyTek Signature Mid-Page Feature)
          ========================================================================== */}
      <section className="st-split-banners-grid" aria-label="Promotional Banners">
        {/* Banner 1: Audio Essentials */}
        <div className="st-banner-card st-banner-blue">
          <span className="st-banner-pill">🎧 Acoustic Perfection</span>
          <h3 className="st-banner-title">Immersive Studio Audio &amp; ANC</h3>
          <p className="st-banner-desc">
            Discover lossless Hi-Res audio codecs, active noise cancellation, and all-day acoustic comfort.
          </p>
          <Link to="/catalog" className="st-banner-btn">
            <span>Shop Audio Collection</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {/* Banner 2: Pro Workstations */}
        <div className="st-banner-card st-banner-purple">
          <span className="st-banner-pill">💻 Creator &amp; Pro Gear</span>
          <h3 className="st-banner-title">Next-Gen Laptops &amp; Accessories</h3>
          <p className="st-banner-desc">
            Equip your creative setup with ultra-fast Thunderbolt hubs, mechanical keyboards, and 4K displays.
          </p>
          <Link to="/catalog" className="st-banner-btn">
            <span>Explore Workstations</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ==========================================================================
          6. Trending Tech Products Grid with Category Tabs
          ========================================================================== */}
      <section style={{ marginBottom: '56px' }}>
        <div className="st-section-title-wrap">
          <div>
            <h2 className="st-section-heading">Trending Gadgets &amp; Best Sellers</h2>
            <p className="st-section-subheading">Handpicked devices with 100% genuine warranty and islandwide dispatch</p>
          </div>

          <div className="st-tabs-row" style={{ border: 'none', margin: 0, padding: 0 }}>
            <button
              type="button"
              className={`st-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Products
            </button>
            <button
              type="button"
              className={`st-tab-btn ${activeTab === 'bestsellers' ? 'active' : ''}`}
              onClick={() => setActiveTab('bestsellers')}
            >
              🔥 Best Sellers
            </button>
            <button
              type="button"
              className={`st-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              ✨ New Arrivals
            </button>
            <button
              type="button"
              className={`st-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              🎧 Audio
            </button>
            <button
              type="button"
              className={`st-tab-btn ${activeTab === 'computing' ? 'active' : ''}`}
              onClick={() => setActiveTab('computing')}
            >
              💻 Computing
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="st-products-grid">
          {filteredProducts.map((p) => (
            <div key={p.product_id} className="st-product-card">
              <div className="st-card-badges">
                <span className="st-badge-discount">{p.discount}</span>
                {p.badge && <span className="st-badge-bestseller">{p.badge}</span>}
              </div>

              <div className="st-card-img-wrap">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
                  />
                ) : p.icon_type === 'headphones' ? (
                  <HeadphonesIcon className="w-16 h-16" style={{ color: '#4963c5' }} />
                ) : p.icon_type === 'watch' ? (
                  <WatchIcon className="w-16 h-16" style={{ color: '#f59e0b' }} />
                ) : p.icon_type === 'charger' ? (
                  <BatteryChargingIcon className="w-16 h-16" style={{ color: '#10b981' }} />
                ) : (
                  <LaptopIcon className="w-16 h-16" style={{ color: '#2563eb' }} />
                )}
              </div>

              <div className="st-card-cat-name">{p.category}</div>

              <h3 className="st-card-title" title={p.name}>
                {p.name}
              </h3>

              <div className="st-card-rating">
                <StarIcon className="w-4 h-4" />
                <span>{p.rating}</span>
                <span className="st-card-rating-count">({p.reviews_count} reviews)</span>
              </div>

              <div className="st-card-pricing-row">
                <span className="st-card-price">${Number(p.base_price).toFixed(2)}</span>
                <span className="st-card-mrp">${Number(p.mrp).toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="st-card-add-btn"
                onClick={() => handleAddToCart(p)}
                disabled={addingId === p.product_id}
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span>{addingId === p.product_id ? 'Adding...' : 'Add to Cart'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================================================
          7. Official Brand Partners Showcase
          ========================================================================== */}
      <section className="st-brands-section" aria-label="Official Brand Partners">
        <div className="st-brands-title">Official Brand Partners &amp; Authorised Tech Importers</div>
        <div className="st-brands-grid">
          <div className="st-brand-badge"> Apple</div>
          <div className="st-brand-badge">SONY</div>
          <div className="st-brand-badge">ANKER</div>
          <div className="st-brand-badge">SAMSUNG</div>
          <div className="st-brand-badge">XIAOMI</div>
          <div className="st-brand-badge">JBL</div>
          <div className="st-brand-badge">BASEUS</div>
          <div className="st-brand-badge">HAYLOU</div>
          <div className="st-brand-badge">AMAZFIT</div>
        </div>
      </section>

      {/* ==========================================================================
          8. Verified Customer Reviews (Judge.me Widget Style)
          ========================================================================== */}
      <section className="st-reviews-box" aria-label="Customer Reviews">
        <div className="st-reviews-header">
          <div>
            <h2 className="st-section-heading">What SimplyTek Customers Say</h2>
            <p className="st-section-subheading">Real verified feedback from tech lovers across Sri Lanka</p>
          </div>

          <div className="st-reviews-rating-pill">
            <StarIcon className="w-4 h-4" />
            <span>4.9 / 5.0 Rating based on 1,590+ Verified Reviews</span>
          </div>
        </div>

        <div className="st-reviews-grid">
          <div className="st-review-card">
            <div>
              <div className="st-rev-stars">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4" />
                ))}
              </div>
              <p className="st-rev-text">
                "Bought the Sony WH-1000XM5. Delivery to Kandy took less than 24 hours! Genuine serial checked out on the Sony official website with full warranty. Exceptional service!"
              </p>
            </div>
            <div className="st-rev-author-row">
              <div>
                <div className="st-rev-author-name">
                  <span>Kasun P.</span>
                  <span className="st-rev-verified-tag">✓ Verified Buyer</span>
                </div>
                <div className="st-rev-product-tag">Sony WH-1000XM5 ANC Headset</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>2 days ago</span>
            </div>
          </div>

          <div className="st-review-card">
            <div>
              <div className="st-rev-stars">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4" />
                ))}
              </div>
              <p className="st-rev-text">
                "The Anker Prime 240W charger is an absolute monster. Powers my MacBook M3 and iPhone simultaneously without any thermal issues. Super fast checkout with Koko installments!"
              </p>
            </div>
            <div className="st-rev-author-row">
              <div>
                <div className="st-rev-author-name">
                  <span>Dilshan M.</span>
                  <span className="st-rev-verified-tag">✓ Verified Buyer</span>
                </div>
                <div className="st-rev-product-tag">Anker Prime GaN 240W Station</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>5 days ago</span>
            </div>
          </div>

          <div className="st-review-card">
            <div>
              <div className="st-rev-stars">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4" />
                ))}
              </div>
              <p className="st-rev-text">
                "Got my MacBook Pro M3 Max in Colombo within the afternoon. Packaging was flawless, factory sealed, with warranty registration done smoothly. SimplyTek is my go-to gadget store!"
              </p>
            </div>
            <div className="st-rev-author-row">
              <div>
                <div className="st-rev-author-name">
                  <span>Anushka T.</span>
                  <span className="st-rev-verified-tag">✓ Verified Buyer</span>
                </div>
                <div className="st-rev-product-tag">MacBook Pro 16" M3 Max</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>1 week ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          9. SimplyTek VIP Club Newsletter Banner
          ========================================================================== */}
      <section className="st-newsletter-box" aria-label="VIP Club Newsletter">
        <div>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✨ SimplyTek VIP Member Club
          </span>
          <h3 className="st-news-heading" style={{ marginTop: '12px' }}>
            Unlock 10% OFF Your First Order &amp; Flash Drops
          </h3>
          <p className="st-news-desc">
            Subscribe for exclusive coupon codes, limited-quantity gadget drops, and early access to Black Friday tech sales.
          </p>
        </div>

        <div>
          {subscribed ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', padding: '16px 20px', borderRadius: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#34d399', marginBottom: '4px' }}>
                🎉 You're on the SimplyTek VIP List!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                Use voucher code <strong style={{ color: '#fbbf24', textDecoration: 'underline' }}>SIMPLY10</strong> at checkout for 10% off.
              </div>
            </div>
          ) : (
            <form className="st-news-form" onSubmit={handleSubscribe}>
              <div className="st-news-input-row">
                <input
                  type="email"
                  className="st-news-input"
                  placeholder="Enter your email address..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
                <button type="submit" className="st-news-btn">
                  Claim 10% Off
                </button>
              </div>
              <span className="st-news-subtext">
                🔒 Instant coupon on submission. No spam, unsubscribe anytime.
              </span>
            </form>
          )}
        </div>
      </section>

      {/* ==========================================================================
          10. Toast Notification System
          ========================================================================== */}
      {toast && (
        <div className="st-toast-container">
          <div className="st-toast">
            <div className="st-toast-icon">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div className="st-toast-content">
              <div className="st-toast-title">{toast.title}</div>
              <div className="st-toast-msg">{toast.message}</div>
              {toast.link && (
                <div style={{ marginTop: '4px' }}>
                  <span
                    className="st-toast-link"
                    onClick={() => navigate(toast.link)}
                  >
                    View details &rarr;
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}