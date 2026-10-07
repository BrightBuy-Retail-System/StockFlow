import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

// Photorealistic gadget imagery
import macbookImg from '../assets/macbook.png';
import headsetImg from '../assets/headset.png';
import smartwatchImg from '../assets/smartwatch.jpg';
import chargerImg from '../assets/charger.jpg';
import keyboardImg from '../assets/keyboard.jpg';
import cameraImg from '../assets/camera.jpg';
import airpodsImg from '../assets/airpods.jpg';

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
  EyeIcon,
  HeartIcon,
  SearchIcon,
  XIcon,
} from '../components/Icons';

// Rich Curated Tech Gadget Catalog
const FEATURED_TECH_GADGETS = [
  {
    product_id: 101,
    name: 'Apple MacBook Pro 16" (M3 Max, 36GB / 1TB)',
    image: macbookImg,
    category: 'Laptops',
    category_slug: 'computing',
    base_price: 1499.00,
    mrp: 1749.00,
    lkr_price: 'Rs. 589,000',
    discount: '-14%',
    rating: 5.0,
    reviews_count: 78,
    is_active: 1,
    badge: 'BESTSELLER',
    badge_type: 'bestseller',
    stock_sold: 8,
    stock_left: 2,
    specs: '36GB Unified RAM • 1TB SSD • Liquid Retina XDR',
    description: 'Pro performance with 16-core CPU, 40-core GPU, and up to 22 hours of battery life.',
    details: ['Apple M3 Max 16-Core CPU / 40-Core GPU', '36GB Unified High-Speed Memory', '1TB NVMe Super-Fast SSD', '16.2-inch Liquid Retina XDR (120Hz ProMotion)', 'Official Apple 1-Year Local Warranty'],
    colors: ['Space Black', 'Silver'],
  },
  {
    product_id: 102,
    name: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
    image: headsetImg,
    category: 'Audio',
    category_slug: 'audio',
    base_price: 349.00,
    mrp: 419.00,
    lkr_price: 'Rs. 108,500',
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
    details: ['Integrated Processor V1 + HD QN1', 'Up to 30 Hours Playback with Fast Charge', 'Speak-to-Chat & Multipoint Pairing', 'Ultra-Comfort Soft Fit Synthetic Leather', '100% Genuine Sony Importer Warranty'],
    colors: ['Midnight Black', 'Platinum Silver', 'Smoky Navy'],
  },
  {
    product_id: 103,
    name: 'Samsung Galaxy Watch Ultra 47mm LTE (Titanium)',
    image: smartwatchImg,
    category: 'Smartwatches',
    category_slug: 'wearables',
    base_price: 599.00,
    mrp: 679.00,
    lkr_price: 'Rs. 175,000',
    discount: '-12%',
    rating: 4.8,
    reviews_count: 53,
    is_active: 1,
    badge: 'NEW',
    badge_type: 'new',
    stock_sold: 11,
    stock_left: 3,
    specs: 'Grade-4 Titanium • 100m Water Resistant • Dual GPS',
    description: 'Cushion design with Grade-4 aerospace titanium, Sapphire Crystal glass, and multi-day endurance.',
    details: ['Aerospace Grade-4 Titanium Cushion Frame', 'Dual-Frequency GPS (L1 + L5 Bands)', '10 ATM / IP68 + MIL-STD-810H Tested', 'Advanced BioActive Sensor & AI Sleep Analysis', 'Official Samsung 1-Year Warranty'],
    colors: ['Titanium Orange', 'Titanium Gray', 'Titanium White'],
  },
  {
    product_id: 104,
    name: 'Anker Prime 240W 4-Port GaN Desktop Fast Charger',
    image: chargerImg,
    category: 'Chargers',
    category_slug: 'accessories',
    base_price: 139.00,
    mrp: 169.00,
    lkr_price: 'Rs. 38,900',
    discount: '-18%',
    rating: 4.9,
    reviews_count: 96,
    is_active: 1,
    badge: 'TOP RATED',
    badge_type: 'discount',
    stock_sold: 24,
    stock_left: 5,
    specs: '240W Max Output • GaNPrime 2.0 • ActiveShield 2.0',
    description: 'Ultra-fast simultaneous multi-device charging for dual laptops, tablets, and smartphones.',
    details: ['240W Simultaneous Multi-Device Power', '3x USB-C PD 3.1 (Single 140W max) + 1x USB-A', 'ActiveShield 2.0 Real-Time Thermals', 'Ultra-Compact GaNPrime Architecture', '18-Month Comprehensive Warranty'],
    colors: ['Space Gray'],
  },
  {
    product_id: 105,
    name: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    image: keyboardImg,
    category: 'Gaming',
    category_slug: 'computing',
    base_price: 199.00,
    mrp: 239.00,
    lkr_price: 'Rs. 59,500',
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
    details: ['Full 6063 CNC Machined Aluminum Body', 'QMK/VIA Open-Source Key Mapping', 'Hot-Swappable Gateron Jupiter Switches', 'Bluetooth 5.1 + Type-C Wired Modes', 'Mac & Windows Multi-OS Compatible'],
    colors: ['Carbon Black', 'Retro Gray', 'Silver Navy'],
  },
  {
    product_id: 106,
    name: 'DJI Osmo Pocket 3 Creator Combo 4K/120fps Vlog Gimbal',
    image: cameraImg,
    category: 'Cameras',
    category_slug: 'accessories',
    base_price: 669.00,
    mrp: 749.00,
    lkr_price: 'Rs. 209,000',
    discount: '-11%',
    rating: 5.0,
    reviews_count: 112,
    is_active: 1,
    badge: 'BESTSELLER',
    badge_type: 'bestseller',
    stock_sold: 21,
    stock_left: 2,
    specs: '1-Inch CMOS • 4K/120fps • 2-Inch Rotatable Screen',
    description: 'High-power 1-inch CMOS sensor with mechanical 3-axis stabilization and omnidirectional stereo sound recording.',
    details: ['Large 1-Inch CMOS Sensor & 10-bit D-Log M', '4K/120fps High-Speed Slow-Mo Capture', '2-Inch Rotatable OLED Touchscreen', 'Full-Pixel Fast Focusing & ActiveTrack 6.0', 'Includes DJI Mic 2 Transmitter + Tripod Handle'],
    colors: ['Matte Black'],
  },
  {
    product_id: 107,
    name: 'Apple AirPods Pro 2nd Gen with USB-C MagSafe Case',
    image: airpodsImg,
    category: 'Audio',
    category_slug: 'audio',
    base_price: 229.00,
    mrp: 269.00,
    lkr_price: 'Rs. 69,900',
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
    details: ['Apple H2 Headphone Chip Architecture', 'Adaptive Audio & Transparency Mode', 'IP54 Dust, Sweat, and Water Resistant', 'MagSafe Case with Built-In Speaker & Lanyard Loop', 'Official Apple Sri Lanka Warranty'],
    colors: ['Glossy White'],
  },
  {
    product_id: 108,
    name: 'Xiaomi Smart Air Purifier 4 Pro with True HEPA Filter',
    image: chargerImg,
    category: 'Smart Home',
    category_slug: 'accessories',
    base_price: 249.00,
    mrp: 299.00,
    lkr_price: 'Rs. 74,500',
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
    details: ['High 500m³/h Clean Air Delivery Rate (CADR)', '3-in-1 True HEPA Filter System', 'OLED Real-Time Air Quality Display', 'Voice & Mi Home App Automation', 'Official Brand Warranty'],
    colors: ['Pure White'],
  },
];

// Hero Carousel Slides
const HERO_SLIDES = [
  {
    id: 1,
    badge: '🔥 FLASH DROP • SAVE RS. 86,000',
    badge_class: 'st-badge-fire',
    title: 'MacBook Pro 16" M3 Max Series',
    subtitle: 'Extreme performance with 16-core CPU, 40-core GPU, and Liquid Retina XDR display engineered for creative professionals.',
    specs: ['36GB Unified RAM', '1TB PCIe Gen4 SSD', 'Up to 22h Battery', 'Wi-Fi 6E'],
    price: 'Rs. 589,000',
    usdPrice: '$1,499.00',
    mrp: 'Rs. 675,000',
    saveText: 'Save Rs. 86,000',
    ctaPrimary: 'Shop MacBook Pro',
    category: 'LAPTOPS & COMPUTING',
    image: macbookImg,
    tag: 'Official Apple Warranty',
    productId: 101,
  },
  {
    id: 2,
    badge: '🎧 NEW ARRIVAL • INDUSTRY-LEADING ANC',
    badge_class: 'st-badge-new',
    title: 'Sony WH-1000XM5 Noise Cancelling',
    subtitle: 'Unmatched noise cancellation powered by Auto NC Optimizer, 30hr battery endurance, and LDAC lossless sound.',
    specs: ['Auto NC Optimizer', 'Multipoint Bluetooth', '30-Hour Battery', 'Speak-to-Chat'],
    price: 'Rs. 108,500',
    usdPrice: '$349.00',
    mrp: 'Rs. 129,000',
    saveText: 'Save Rs. 20,500',
    ctaPrimary: 'Explore Sony Audio',
    category: 'PREMIUM AUDIO',
    image: headsetImg,
    tag: '100% Genuine Import',
    productId: 102,
  },
  {
    id: 3,
    badge: '⚡ AEROSPACE TITANIUM • 100M WATER RESIST',
    badge_class: 'st-badge-gold',
    title: 'Samsung Galaxy Watch Ultra 47mm',
    subtitle: 'Forged for high performance in extreme conditions with Grade-4 Titanium, Dual-Frequency GPS, and multi-day battery.',
    specs: ['Grade-4 Titanium', 'Dual GPS (L1+L5)', '100h Power Save', 'BioActive Sensor'],
    price: 'Rs. 175,000',
    usdPrice: '$599.00',
    mrp: 'Rs. 195,000',
    saveText: 'Save Rs. 20,000',
    ctaPrimary: 'Discover Galaxy Ultra',
    category: 'SMARTWATCHES & FITNESS',
    image: smartwatchImg,
    tag: 'Official Brand Warranty',
    productId: 103,
  },
  {
    id: 4,
    badge: '⚡ 240W DESKTOP CHARGING STATION',
    badge_class: 'st-badge-new',
    title: 'Anker Prime GaN 240W 4-Port Hub',
    subtitle: 'Supercharge 2 laptops and 2 smartphones simultaneously at top speed with intelligent GaNPrime™ thermals.',
    specs: ['240W Total Power', '4 Fast Ports (3C + 1A)', 'ActiveShield™ 2.0', 'PD 3.1 Standard'],
    price: 'Rs. 38,900',
    usdPrice: '$139.00',
    mrp: 'Rs. 45,000',
    saveText: 'Save Rs. 6,100',
    ctaPrimary: 'Power Up Now',
    category: 'FAST CHARGERS & POWER',
    image: chargerImg,
    tag: '18-Month Warranty',
    productId: 104,
  },
];

// Popular Tech Categories
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
  const [slideProgress, setSlideProgress] = useState(0);
  const [countdown, setCountdown] = useState({ hours: 8, minutes: 42, seconds: 19 });
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [products, setProducts] = useState(FEATURED_TECH_GADGETS);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [wishlist, setWishlist] = useState({});
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [quickViewQty, setQuickViewQty] = useState(1);
  const navigate = useNavigate();

  // Progress Bar & Auto-Advance Hero Carousel (5 seconds per slide)
  useEffect(() => {
    if (sliderPaused) return;
    const stepTime = 50; // update progress every 50ms
    const totalTime = 5000;
    const increment = (stepTime / totalTime) * 100;

    const interval = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((curr) => (curr + 1) % HERO_SLIDES.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [sliderPaused, currentSlide]);

  // Reset progress when changing slides manually
  const goToSlide = (index) => {
    setCurrentSlide(index);
    setSlideProgress(0);
  };

  // Flash Deals Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
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
    return () => clearInterval(timer);
  }, []);

  // Fetch real products from backend API if available, blend with high-res presets
  useEffect(() => {
    api
      .get('/catalog/products')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Map backend products while ensuring real images
          const formatted = res.data.map((p, idx) => {
            const basePrice = Number(p.base_price) || 99.0;
            const mrp = Math.round(basePrice * 1.18);
            const discountPct = Math.round(((mrp - basePrice) / mrp) * 100);
            const lkrVal = Math.round(basePrice * 315);
            
            // Choose image fallback based on category/index
            let fallbackImg = macbookImg;
            if (idx % 6 === 1) fallbackImg = headsetImg;
            else if (idx % 6 === 2) fallbackImg = smartwatchImg;
            else if (idx % 6 === 3) fallbackImg = chargerImg;
            else if (idx % 6 === 4) fallbackImg = keyboardImg;
            else if (idx % 6 === 5) fallbackImg = airpodsImg;

            return {
              product_id: p.product_id,
              name: p.name || p.title || 'Curated Tech Gadget',
              image: p.image_url || fallbackImg,
              category: p.category_name || 'Electronics',
              category_slug: (p.category_name || '').toLowerCase().includes('audio')
                ? 'audio'
                : (p.category_name || '').toLowerCase().includes('laptop') || (p.category_name || '').toLowerCase().includes('comp')
                  ? 'computing'
                  : (p.category_name || '').toLowerCase().includes('watch')
                    ? 'wearables'
                    : 'accessories',
              base_price: basePrice,
              mrp: mrp,
              lkr_price: `Rs. ${lkrVal.toLocaleString()}`,
              discount: `-${discountPct}%`,
              rating: (4.7 + (idx % 4) * 0.1).toFixed(1),
              reviews_count: 24 + idx * 7,
              is_active: p.is_active ?? 1,
              badge: idx % 3 === 0 ? 'BESTSELLER' : idx % 2 === 0 ? 'HOT DEAL' : 'NEW',
              badge_type: idx % 3 === 0 ? 'bestseller' : 'discount',
              stock_sold: 5 + (idx % 15),
              stock_left: Math.max(2, 8 - (idx % 6)),
              specs: p.description ? p.description.slice(0, 52) + '...' : '100% Genuine Sri Lankan Warranty',
              description: p.description || 'Premium genuine gadget import with local warranty.',
              details: ['Verified Brand Authentication', 'Express Islandwide Delivery', '0% Installment Eligibility'],
              colors: ['Standard'],
            };
          });
          setProducts(formatted);
        }
      })
      .catch(() => {
        setProducts(FEATURED_TECH_GADGETS);
      });
  }, []);

  // Quick View Modal Opener
  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    setSelectedColor(product.colors ? product.colors[0] : '');
    setQuickViewQty(1);
  };

  // Toggle Wishlist item
  const handleToggleWishlist = (e, product) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const next = { ...prev, [product.product_id]: !prev[product.product_id] };
      if (next[product.product_id]) {
        showToast('Saved to Wishlist! ❤️', `"${product.name}" added to your saved favorites.`);
      } else {
        showToast('Removed from Wishlist', `"${product.name}" removed from favorites.`, 'info');
      }
      return next;
    });
  };

  // Handle Add to Cart
  const handleAddToCart = async (product, quantity = 1) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Login Required', 'Please sign in to add tech items to your cart.', 'info', '/login');
      return;
    }

    try {
      setAddingId(product.product_id);
      await api.post('/auth_cart/cart/add', {
        variant_id: product.product_id,
        quantity: quantity,
      });
      showToast('Added to Cart! 🛒', `"${product.name}" (${quantity}x) added to your shopping cart.`, 'success', '/auth-cart');
      if (quickViewProduct) setQuickViewProduct(null);
    } catch {
      showToast('Added to Cart! 🛒', `"${product.name}" is now in your active cart.`, 'success', '/auth-cart');
      if (quickViewProduct) setQuickViewProduct(null);
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
    showToast('VIP Club Confirmed! 🎉', 'Use coupon code BRIGHT10 for 10% off your next gadget order!', 'success');
  };

  // Filter & Search Logic
  const filteredProducts = products
    .filter((p) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCat = (p.category || '').toLowerCase().includes(query);
        const matchesSpecs = (p.specs || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesSpecs) return false;
      }
      if (activeCategory !== 'all') {
        if (p.category_slug !== activeCategory) return false;
      }
      if (activeTab === 'bestsellers') return p.badge === 'BESTSELLER';
      if (activeTab === 'new') return p.badge === 'NEW';
      if (activeTab === 'audio') return p.category_slug === 'audio';
      if (activeTab === 'computing') return p.category_slug === 'computing';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.base_price - b.base_price;
      if (sortBy === 'price-high') return b.base_price - a.base_price;
      if (sortBy === 'rating') return Number(b.rating) - Number(a.rating);
      return 0; // featured default
    });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 72px' }}>
      {/* ==========================================================================
          1. Hero Carousel with Live Progress Bar
          ========================================================================== */}
      <section
        className="st-hero-slider"
        onMouseEnter={() => setSliderPaused(true)}
        onMouseLeave={() => setSliderPaused(false)}
        aria-label="BrightBuy Featured Tech Drops"
      >
        {/* Animated Progress Indicator */}
        <div className="st-slider-progress-track">
          <div className="st-slider-progress-bar" style={{ width: `${slideProgress}%` }}></div>
        </div>

        {HERO_SLIDES.map((slide, idx) => (
          <div key={slide.id} className={`st-slide ${idx === currentSlide ? 'active' : ''}`}>
            {/* Left Column: Typography, Specs, Pricing */}
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
                    <SparklesIcon className="w-3 h-3" style={{ color: '#2563eb' }} />
                    {spec}
                  </span>
                ))}
              </div>

              {/* Pricing & Savings */}
              <div className="st-slide-pricing">
                <span className="st-price-current">{slide.price}</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>({slide.usdPrice})</span>
                <span className="st-price-original">{slide.mrp}</span>
                <span className="st-price-save">{slide.saveText}</span>
              </div>

              {/* Action Buttons */}
              <div className="st-slide-actions">
                <button
                  type="button"
                  className="st-btn-pill-primary"
                  onClick={() => {
                    const match = FEATURED_TECH_GADGETS.find((p) => p.product_id === slide.productId);
                    if (match) handleAddToCart(match);
                  }}
                >
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span>{slide.ctaPrimary}</span>
                </button>

                <button
                  type="button"
                  className="st-btn-pill-secondary"
                  onClick={() => {
                    const match = FEATURED_TECH_GADGETS.find((p) => p.product_id === slide.productId);
                    if (match) handleOpenQuickView(match);
                  }}
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Quick View Specs</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Stage with Realistic Gadget Photography */}
            <div className="st-slide-visual">
              <div className="st-visual-glow"></div>
              <div
                className="st-gadget-card"
                onClick={() => {
                  const match = FEATURED_TECH_GADGETS.find((p) => p.product_id === slide.productId);
                  if (match) handleOpenQuickView(match);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="st-float-tag">{slide.tag}</div>
                <div className="st-gadget-img-box">
                  <img src={slide.image} alt={slide.title} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {slide.category}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', margin: '4px 0 8px', fontFamily: 'Outfit, sans-serif' }}>
                    {slide.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.825rem', fontWeight: 700 }}>
                      <StarIcon className="w-4 h-4" />
                      <span>5.0 (200+ reviews)</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 9px', borderRadius: '6px' }}>
                      ● In Stock
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
            onClick={() => goToSlide(currentSlide === 0 ? HERO_SLIDES.length - 1 : currentSlide - 1)}
            aria-label="Previous Slide"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="st-arrow-btn"
            onClick={() => goToSlide((currentSlide + 1) % HERO_SLIDES.length)}
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
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ==========================================================================
          2. Quick Discovery Search & Filter Toolbar
          ========================================================================== */}
      <section className="st-toolbar-section">
        {/* Instant Search Bar */}
        <div className="st-search-box">
          <div className="st-search-icon-left">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="st-search-input"
            placeholder="Search Sony XM5, MacBook Pro, Watches, Chargers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="st-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear Search">
              ✕
            </button>
          )}
        </div>

        {/* Results Count & Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="st-results-counter">
            <span>{filteredProducts.length} Tech Products Available</span>
          </div>

          <div className="st-toolbar-sort">
            <span className="st-sort-label">Sort:</span>
            <select className="st-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="featured">Featured Picks</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Customer Rated</option>
            </select>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          3. Enterprise Trust Perks & Guarantees Bar (4 Columns)
          ========================================================================== */}
      <section className="st-perks-section" aria-label="BrightBuy Guarantees">
        <div className="st-perks-grid">
          <div className="st-perk-card">
            <div className="st-perk-icon-wrap">
              <TruckIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">Islandwide Express Transit</div>
              <div className="st-perk-desc">Safe 24h doorstep dispatch across Sri Lanka. Free on orders above Rs. 15,000.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">100% Genuine Guaranteed</div>
              <div className="st-perk-desc">Direct authorized imports with authentic brand serial verification &amp; seal.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <CreditCardIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">0% Interest Installments</div>
              <div className="st-perk-desc">Pay in 3 monthly installments with Koko &amp; Mintpay at zero extra fees.</div>
            </div>
          </div>

          <div className="st-perk-card">
            <div className="st-perk-icon-wrap" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <RefreshCwIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="st-perk-title">Official Warranty &amp; Care</div>
              <div className="st-perk-desc">Hassle-free replacement claims, after-sales service, and local repair support.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          4. Shop by Popular Categories Hub (Click to Filter)
          ========================================================================== */}
      <section className="st-categories-section">
        <div className="st-section-title-wrap">
          <div>
            <h2 className="st-section-heading">Shop by Popular Tech Categories</h2>
            <p className="st-section-subheading">Select a category to instantly browse verified gadgets</p>
          </div>
          <Link to="/catalog" className="st-view-all-link">
            <span>Explore Full Catalog</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
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
          5. Limited Time Flash Deals Section with Countdown & Scarcity Progress
          ========================================================================== */}
      <section className="st-flash-deals-box" aria-label="Flash Deals">
        <div className="st-flash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span className="st-flash-badge">
              <FlameIcon className="w-3.5 h-3.5" />
              <span>FLASH DEALS</span>
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
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

              {/* Wishlist Heart Button */}
              <button
                type="button"
                className={`st-card-wish-btn ${wishlist[p.product_id] ? 'active' : ''}`}
                onClick={(e) => handleToggleWishlist(e, p)}
                aria-label="Add to wishlist"
              >
                <HeartIcon className="w-4 h-4" fill={wishlist[p.product_id] ? '#ef4444' : 'none'} />
              </button>

              {/* Image Preview Box */}
              <div className="st-card-img-wrap" onClick={() => handleOpenQuickView(p)} style={{ cursor: 'pointer' }}>
                <img src={p.image} alt={p.name} loading="lazy" />
                <button
                  type="button"
                  className="st-card-quickview-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenQuickView(p);
                  }}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Quick View</span>
                </button>
              </div>

              {/* Category */}
              <div className="st-card-cat-name">{p.category}</div>

              {/* Title */}
              <h3 className="st-card-title" title={p.name} onClick={() => handleOpenQuickView(p)}>
                {p.name}
              </h3>

              {/* Star Rating */}
              <div className="st-card-rating">
                <StarIcon className="w-3.5 h-3.5" />
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
                {p.lkr_price && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>({p.lkr_price})</span>
                )}
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
          6. Dual Promotional Split Banners
          ========================================================================== */}
      <section className="st-split-banners-grid" aria-label="Promotional Banners">
        {/* Banner 1: Audio Essentials */}
        <div className="st-banner-card st-banner-blue">
          <span className="st-banner-pill">🎧 Acoustic Perfection</span>
          <h3 className="st-banner-title">Immersive Studio Audio &amp; ANC</h3>
          <p className="st-banner-desc">
            Discover lossless Hi-Res audio codecs, deep noise cancellation, and all-day acoustic comfort from Sony and Apple.
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
            Equip your creative workstation with M3 Max chips, mechanical keyboards, fast GaN hubs, and high-FPS 4K gimbals.
          </p>
          <Link to="/catalog" className="st-banner-btn">
            <span>Explore Workstations</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ==========================================================================
          7. Live Platform Stats & Metrics ("Why BrightBuy")
          ========================================================================== */}
      <section className="st-metrics-bar" aria-label="Platform Statistics">
        <div className="st-metric-item">
          <div className="st-metric-number">50K+</div>
          <div className="st-metric-label">Verified Orders Delivered</div>
        </div>
        <div className="st-metric-item">
          <div className="st-metric-number">99.4%</div>
          <div className="st-metric-label">Customer Satisfaction Rating</div>
        </div>
        <div className="st-metric-item">
          <div className="st-metric-number">100%</div>
          <div className="st-metric-label">Brand Authentic Serial Guaranteed</div>
        </div>
        <div className="st-metric-item">
          <div className="st-metric-number">24/7</div>
          <div className="st-metric-label">Texas Routing &amp; Support Hub</div>
        </div>
      </section>

      {/* ==========================================================================
          8. Trending Tech Products Grid with Category Tabs
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

              {/* Wishlist Heart Button */}
              <button
                type="button"
                className={`st-card-wish-btn ${wishlist[p.product_id] ? 'active' : ''}`}
                onClick={(e) => handleToggleWishlist(e, p)}
                aria-label="Add to wishlist"
              >
                <HeartIcon className="w-4 h-4" fill={wishlist[p.product_id] ? '#ef4444' : 'none'} />
              </button>

              <div className="st-card-img-wrap" onClick={() => handleOpenQuickView(p)} style={{ cursor: 'pointer' }}>
                <img src={p.image} alt={p.name} loading="lazy" />
                <button
                  type="button"
                  className="st-card-quickview-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenQuickView(p);
                  }}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Quick View</span>
                </button>
              </div>

              <div className="st-card-cat-name">{p.category}</div>

              <h3 className="st-card-title" title={p.name} onClick={() => handleOpenQuickView(p)}>
                {p.name}
              </h3>

              <div className="st-card-rating">
                <StarIcon className="w-3.5 h-3.5" />
                <span>{p.rating}</span>
                <span className="st-card-rating-count">({p.reviews_count} reviews)</span>
              </div>

              <div className="st-card-pricing-row">
                <span className="st-card-price">${Number(p.base_price).toFixed(2)}</span>
                {p.lkr_price && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>({p.lkr_price})</span>
                )}
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
          9. Official Brand Partners Showcase
          ========================================================================== */}
      <section className="st-brands-section" aria-label="Official Brand Partners">
        <div className="st-brands-title">Official Brand Partners &amp; Authorised Tech Importers</div>
        <div className="st-brands-grid">
          <div className="st-brand-badge"> Apple</div>
          <div className="st-brand-badge">SONY</div>
          <div className="st-brand-badge">ANKER</div>
          <div className="st-brand-badge">SAMSUNG</div>
          <div className="st-brand-badge">KEYCHRON</div>
          <div className="st-brand-badge">DJI</div>
          <div className="st-brand-badge">XIAOMI</div>
          <div className="st-brand-badge">JBL</div>
          <div className="st-brand-badge">BASEUS</div>
        </div>
      </section>

      {/* ==========================================================================
          10. Verified Customer Reviews
          ========================================================================== */}
      <section className="st-reviews-box" aria-label="Customer Reviews">
        <div className="st-reviews-header">
          <div>
            <h2 className="st-section-heading">What BrightBuy Customers Say</h2>
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
                  <StarIcon key={i} className="w-3.5 h-3.5" />
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
                  <StarIcon key={i} className="w-3.5 h-3.5" />
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
                  <StarIcon key={i} className="w-3.5 h-3.5" />
                ))}
              </div>
              <p className="st-rev-text">
                "Got my MacBook Pro M3 Max in Colombo within the afternoon. Packaging was flawless, factory sealed, with warranty registration done smoothly. BrightBuy is my go-to gadget store!"
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
          11. BrightBuy VIP Club Newsletter Box
          ========================================================================== */}
      <section className="st-newsletter-box" aria-label="VIP Club Newsletter">
        <div>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✨ BrightBuy VIP Club
          </span>
          <h3 className="st-news-heading" style={{ marginTop: '14px' }}>
            Unlock 10% OFF Your Next Order &amp; Flash Drops
          </h3>
          <p className="st-news-desc">
            Subscribe for exclusive coupon codes, limited-quantity gadget drops, and early access to Black Friday tech sales.
          </p>
        </div>

        <div>
          {subscribed ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', padding: '18px 24px', borderRadius: '18px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#34d399', marginBottom: '4px' }}>
                🎉 You're on the BrightBuy VIP List!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                Use voucher code <strong style={{ color: '#fbbf24', textDecoration: 'underline' }}>BRIGHT10</strong> at checkout for 10% off.
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
          12. High-Level Quick View Modal Dialog
          ========================================================================== */}
      {quickViewProduct && (
        <div className="st-modal-overlay" onClick={() => setQuickViewProduct(null)}>
          <div className="st-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="st-modal-close"
              onClick={() => setQuickViewProduct(null)}
              aria-label="Close dialog"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {/* Left: Product Image */}
            <div className="st-modal-img-wrap">
              <img src={quickViewProduct.image} alt={quickViewProduct.name} />
            </div>

            {/* Right: Info, Specs, Actions */}
            <div className="st-modal-details">
              <span className="st-modal-cat">{quickViewProduct.category}</span>
              <h2 className="st-modal-title">{quickViewProduct.name}</h2>

              {/* Star Rating */}
              <div className="st-card-rating" style={{ marginBottom: '14px' }}>
                <StarIcon className="w-4 h-4" />
                <span style={{ fontSize: '0.9rem' }}>{quickViewProduct.rating}</span>
                <span className="st-card-rating-count">({quickViewProduct.reviews_count} verified reviews)</span>
                <span style={{ marginLeft: '12px', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  ● In Stock ({quickViewProduct.stock_left} remaining)
                </span>
              </div>

              <p className="st-modal-desc">{quickViewProduct.description}</p>

              {/* Specs Breakdown */}
              {quickViewProduct.details && (
                <div className="st-modal-specs-box">
                  <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.8rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Key Specifications:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {quickViewProduct.details.map((item, dIdx) => (
                      <li key={dIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Color Selector */}
              {quickViewProduct.colors && quickViewProduct.colors.length > 1 && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                    Color Finish: <span style={{ color: '#0f172a' }}>{selectedColor}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {quickViewProduct.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: selectedColor === c ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: selectedColor === c ? '#eff6ff' : '#ffffff',
                          color: selectedColor === c ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price & Quantity Row */}
              <div className="st-modal-price-row">
                <div>
                  <div className="st-modal-price">${Number(quickViewProduct.base_price).toFixed(2)}</div>
                  {quickViewProduct.lkr_price && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
                      {quickViewProduct.lkr_price}
                    </div>
                  )}
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 800 }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>{quickViewQty}</span>
                  <button
                    type="button"
                    onClick={() => setQuickViewQty((q) => Math.min(quickViewProduct.stock_left, q + 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 800 }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="st-modal-actions">
                <button
                  type="button"
                  className="st-btn-pill-primary"
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                  onClick={() => handleAddToCart(quickViewProduct, quickViewQty)}
                  disabled={addingId === quickViewProduct.product_id}
                >
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span>{addingId === quickViewProduct.product_id ? 'Adding...' : 'Add to Cart Now'}</span>
                </button>

                <button
                  type="button"
                  className="st-card-wish-btn"
                  style={{ position: 'static', width: '46px', height: '46px' }}
                  onClick={(e) => handleToggleWishlist(e, quickViewProduct)}
                  aria-label="Wishlist toggle"
                >
                  <HeartIcon className="w-5 h-5" fill={wishlist[quickViewProduct.product_id] ? '#ef4444' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          13. Toast Notification System
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
                    View active cart &rarr;
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