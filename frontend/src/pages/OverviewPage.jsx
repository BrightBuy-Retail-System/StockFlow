import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import './OverviewPage.css';

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
  CreditCardIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  SearchIcon,
  XIcon,
} from '../components/Icons';

/* -------------------------------------------------------------------------
   Data
   ------------------------------------------------------------------------- */

// Shown only until the backend catalogue loads (or if it is empty / offline).
const PRESET_PRODUCTS = [
  {
    product_id: 101,
    name: 'Apple MacBook Pro 16" (M3 Max)',
    image: macbookImg,
    category: 'Laptops',
    base_price: 1499,
    mrp: 1749,
    rating: 5.0,
    reviews_count: 78,
    badge: 'Best seller',
    description: 'Pro performance with a 16-core CPU, 40-core GPU and up to 22 hours of battery life.',
    details: ['Apple M3 Max, 36GB memory', '1TB SSD', '16.2-inch Liquid Retina XDR display', '1-year warranty'],
    colors: ['Space Black', 'Silver'],
  },
  {
    product_id: 102,
    name: 'Sony WH-1000XM5 Headphones',
    image: headsetImg,
    category: 'Audio',
    base_price: 349,
    mrp: 419,
    rating: 4.9,
    reviews_count: 142,
    badge: 'Best seller',
    description: 'Wireless noise-cancelling headphones with 30 hours of battery and clear call quality.',
    details: ['Auto noise-cancelling optimizer', 'Up to 30 hours playback', 'Multipoint Bluetooth pairing', '1-year warranty'],
    colors: ['Midnight Black', 'Platinum Silver', 'Smoky Navy'],
  },
  {
    product_id: 103,
    name: 'Samsung Galaxy Watch Ultra 47mm',
    image: smartwatchImg,
    category: 'Wearables',
    base_price: 599,
    mrp: 679,
    rating: 4.8,
    reviews_count: 53,
    badge: 'New',
    description: 'Titanium smartwatch with dual-frequency GPS and multi-day battery life.',
    details: ['Grade-4 titanium frame', 'Dual-frequency GPS', '100m water resistance', '1-year warranty'],
    colors: ['Titanium Orange', 'Titanium Gray', 'Titanium White'],
  },
  {
    product_id: 104,
    name: 'Anker Prime 240W GaN Charger',
    image: chargerImg,
    category: 'Accessories',
    base_price: 139,
    mrp: 169,
    rating: 4.9,
    reviews_count: 96,
    description: 'Charge two laptops and two phones at once from a single compact desktop charger.',
    details: ['240W total output', '3 USB-C + 1 USB-A ports', 'Real-time thermal protection', '18-month warranty'],
    colors: ['Space Gray'],
  },
  {
    product_id: 105,
    name: 'Keychron Q1 Pro Mechanical Keyboard',
    image: keyboardImg,
    category: 'Accessories',
    base_price: 199,
    mrp: 239,
    rating: 4.9,
    reviews_count: 64,
    description: 'A wireless 75% aluminium keyboard with hot-swappable switches and a gasket-mounted design.',
    details: ['CNC aluminium body', 'Hot-swappable switches', 'Bluetooth 5.1 and USB-C', 'Mac and Windows layouts'],
    colors: ['Carbon Black', 'Retro Gray', 'Silver Navy'],
  },
  {
    product_id: 106,
    name: 'DJI Osmo Pocket 3 Creator Combo',
    image: cameraImg,
    category: 'Cameras',
    base_price: 669,
    mrp: 749,
    rating: 5.0,
    reviews_count: 112,
    badge: 'Best seller',
    description: 'A pocket gimbal camera with a 1-inch sensor, 4K/120fps video and a rotatable touchscreen.',
    details: ['1-inch CMOS sensor', '4K at 120fps', '2-inch rotatable screen', 'Includes mic and tripod handle'],
    colors: ['Matte Black'],
  },
  {
    product_id: 107,
    name: 'Apple AirPods Pro (2nd gen, USB-C)',
    image: airpodsImg,
    category: 'Audio',
    base_price: 229,
    mrp: 269,
    rating: 4.9,
    reviews_count: 230,
    badge: 'Popular',
    description: 'Active noise cancellation, adaptive audio and spatial sound in a MagSafe charging case.',
    details: ['Apple H2 chip', 'Adaptive and transparency modes', 'IP54 dust and water resistant', 'MagSafe case with speaker'],
    colors: ['White'],
  },
  {
    product_id: 108,
    name: 'Xiaomi Smart Air Purifier 4 Pro',
    image: chargerImg,
    category: 'Smart home',
    base_price: 249,
    mrp: 299,
    rating: 4.8,
    reviews_count: 45,
    badge: 'New',
    description: 'True HEPA filtration with an OLED air-quality display and app control.',
    details: ['500 m³/h clean air delivery', '3-in-1 True HEPA filter', 'OLED air-quality display', 'App and voice control'],
    colors: ['White'],
  },
];

// The hero only features a few products. Price and image come from the product itself.
const HERO_SLIDES = [
  { productId: 101, title: 'MacBook Pro 16" with M3 Max', text: 'Built for editing, coding and 3D work. Up to 22 hours of battery.' },
  { productId: 102, title: 'Sony WH-1000XM5', text: 'Industry-leading noise cancellation with 30 hours of playback.' },
  { productId: 103, title: 'Samsung Galaxy Watch Ultra', text: 'A titanium smartwatch with dual-frequency GPS and 100m water resistance.' },
  { productId: 106, title: 'DJI Osmo Pocket 3', text: 'Smooth 4K/120fps video from a camera that fits in your pocket.' },
];

const PAGE_SIZE = 8;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });


/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */
const discountPct = (p) => (p.mrp > p.base_price ? Math.round(((p.mrp - p.base_price) / p.mrp) * 100) : 0);

const FALLBACK_IMAGES = [macbookImg, headsetImg, smartwatchImg, chargerImg, keyboardImg, airpodsImg];

// Map a row from /catalog/products to the shape this page renders.
const mapBackendProduct = (p, idx) => ({
  product_id: p.product_id,
  name: p.name || p.title || 'Product',
  image: p.image_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length],
  category: p.category_name || 'Electronics',
  base_price: Number(p.base_price) || 0,
  priceFrom: true, // the final price depends on the chosen variant
  description: p.description || 'Genuine product sold by BrightBuy.',
  details: ['Verified brand authenticity', 'Delivery in 5 to 7 days', 'Pay by card or cash on delivery'],
  colors: [],
});

const HOME_FAQS = [
  {
    q: 'What is BrightBuy and how do I place an order?',
    a: 'BrightBuy is an enterprise tech and retail store offering genuine products with live inventory tracking. You can browse categories, select item variants, and add them directly to your cart for fast and secure checkout.',
  },
  {
    q: 'Can I browse and add products to my cart as a guest?',
    a: 'Yes, absolutely! You can explore the entire catalog and add items to your cart without creating an account first. When you are ready to complete your purchase, you can sign in or quickly register during checkout.',
  },
  {
    q: 'How long does islandwide delivery take and what are the fees?',
    a: 'Standard islandwide delivery takes 2 to 4 business days. Priority express delivery is available in major metro areas within 24 hours. Delivery rates are calculated accurately based on your shipping address during checkout.',
  },
  {
    q: 'What payment options are supported?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard) with secure encrypted processing, direct bank transfers, as well as Cash on Delivery (COD) for eligible delivery locations.',
  },
  {
    q: 'What warranty and return policies apply to my purchase?',
    a: 'All hardware products come with official manufacturer hardware warranties (up to 1 year). In addition, we offer a 7-day hassle-free return and exchange guarantee on all unopened original packaged items.',
  },
  {
    q: 'How can I track my orders and delivery status?',
    a: 'Once your order is confirmed, you can track real-time packaging, courier dispatch, and fulfillment progress directly from your Customer Dashboard under the "My Orders" tab.',
  },
];

/* -------------------------------------------------------------------------
   Component
   ------------------------------------------------------------------------- */
export default function OverviewPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(PRESET_PRODUCTS);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [wishlist, setWishlist] = useState({});
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [quickView, setQuickView] = useState(null);
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [faqOpen, setFaqOpen] = useState({});

  /* ---- data ---- */
  useEffect(() => {
    api
      .get('/catalog/products')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data.map(mapBackendProduct));
        }
      })
      .catch(() => setProducts(PRESET_PRODUCTS));
  }, []);

  /* ---- hero auto-advance (6s, paused on hover/focus, off for reduced motion) ---- */
  useEffect(() => {
    if (paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [paused, slide]);

  /* ---- close quick view with Escape ---- */
  useEffect(() => {
    if (!quickView) return undefined;
    const onKey = (e) => e.key === 'Escape' && setQuickView(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickView]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---- derived ---- */
  const categories = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => (category === 'All' ? true : p.category === category))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.base_price - b.base_price;
        if (sortBy === 'price-high') return b.base_price - a.base_price;
        if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        return 0;
      });
  }, [products, category, search, sortBy]);

  const shown = filtered.slice(0, visible);

  const heroProduct = (slideDef) => PRESET_PRODUCTS.find((p) => p.product_id === slideDef.productId);
  const current = HERO_SLIDES[slide];
  const hero = heroProduct(current);

  /* ---- actions ---- */
  const showToast = (title, message, type = 'success', link = null) => {
    clearTimeout(toastTimer.current);
    setToast({ title, message, type, link });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const openQuickView = (p) => {
    setQuickView(p);
    setColor(p.colors?.[0] || '');
    setQty(1);
  };

  const toggleWishlist = (e, p) => {
    e.stopPropagation();
    const nowSaved = !wishlist[p.product_id];
    setWishlist((prev) => ({ ...prev, [p.product_id]: nowSaved }));
    showToast(nowSaved ? 'Saved to wishlist' : 'Removed from wishlist', p.name, nowSaved ? 'success' : 'info');
  };
  const addToCart = async (p, quantity = 1) => {
    const token = localStorage.getItem('token');
    const targetProductId = p.product_id;
    const targetVariantId = p.variant_id || null;

    if (token) {
      // Authenticated: save directly to database cart
      try {
        setAddingId(p.product_id);
        const payload = {
          product_id: targetProductId,
          quantity,
        };
        if (targetVariantId) {
          payload.variant_id = targetVariantId;
        }
        await api.post('/auth_cart/cart/add', payload);
      } catch (err) {
        console.warn('Backend cart sync note:', err);
      } finally {
        setAddingId(null);
      }
      localStorage.removeItem('cart');
    } else {
      // Guest: save to local cart
      const raw = localStorage.getItem('cart');
      const list = raw ? JSON.parse(raw) : [];
      const matchIndex = list.findIndex((i) => i.product_id === p.product_id);
      if (matchIndex > -1) {
        list[matchIndex].quantity = (Number(list[matchIndex].quantity) || 0) + quantity;
      } else {
        list.push({
          product_id: p.product_id,
          name: p.name,
          price: Number(p.base_price) || 0,
          quantity: quantity,
          image: p.image,
          sku: `SKU-${p.product_id}`,
        });
      }
      localStorage.setItem('cart', JSON.stringify(list));
    }

    showToast('Added to cart', `${p.name} (x${quantity})`, 'success', '/auth-cart');
    setQuickView(null);
  };

  const changeCategory = (c) => {
    setCategory(c);
    setVisible(PAGE_SIZE);
  };

  const resetFilters = () => {
    setCategory('All');
    setSearch('');
    setVisible(PAGE_SIZE);
  };

  const goToSlide = (i) => setSlide((i + HERO_SLIDES.length) % HERO_SLIDES.length);

  /* ---- render ---- */
  return (
    <div className="ov-page">

      {/* 1. Hero */}
      <section
        className="ov-hero"
        aria-roledescription="carousel"
        aria-label="Featured products"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {hero && (
          <div className="ov-slide" key={current.productId}>
            <div>
              <h1 className="ov-hero-title">{current.title}</h1>
              <p className="ov-hero-text">{current.text}</p>
              <div className="ov-hero-price">
                <strong>{money.format(hero.base_price)}</strong>
                {hero.mrp > hero.base_price && <s>{money.format(hero.mrp)}</s>}
              </div>
              <div className="ov-hero-actions">
                <button type="button" className="st-btn-pill-primary" onClick={() => openQuickView(hero)}>
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span>Shop now</span>
                </button>
                <Link to="/catalog" className="st-btn-pill-secondary">
                  <span>Browse catalog</span>
                </Link>
              </div>
            </div>
            <div className="ov-hero-visual" onClick={() => openQuickView(hero)}>
              <img src={hero.image} alt={current.title} />
            </div>
          </div>
        )}

        <div className="ov-hero-nav">
          <button type="button" className="ov-arrow" onClick={() => goToSlide(slide - 1)} aria-label="Previous slide">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button type="button" className="ov-arrow" onClick={() => goToSlide(slide + 1)} aria-label="Next slide">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="ov-dots">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.productId}
                type="button"
                className={`ov-dot ${i === slide ? 'active' : ''}`}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Trust strip: one row, three facts that match how BrightBuy actually works */}
      <section className="ov-trust" aria-label="Delivery and payment">
        <div className="ov-trust-item">
          <div className="ov-trust-icon"><TruckIcon className="w-5 h-5" /></div>
          <div>
            <div className="ov-trust-title">Delivery across Texas</div>
            <div className="ov-trust-desc">5 days to main cities, 7 days elsewhere. Store pickup available.</div>
          </div>
        </div>
        <div className="ov-trust-item">
          <div className="ov-trust-icon"><CreditCardIcon className="w-5 h-5" /></div>
          <div>
            <div className="ov-trust-title">Pay your way</div>
            <div className="ov-trust-desc">Card payment or cash on delivery.</div>
          </div>
        </div>
        <div className="ov-trust-item">
          <div className="ov-trust-icon"><ShieldCheckIcon className="w-5 h-5" /></div>
          <div>
            <div className="ov-trust-title">Genuine products</div>
            <div className="ov-trust-desc">Stock checked at checkout, so what you order is what we ship.</div>
          </div>
        </div>
      </section>

      {/* 3. Catalogue: category chips, search, sort and the product grid in one place */}
      <section aria-label="Products">
        <div className="ov-head">
          <h2>Shop products</h2>
          <div className="ov-tools">
            <div className="ov-search">
              <SearchIcon className="w-4 h-4" />
              <input
                type="text"
                className="ov-input"
                placeholder="Search products"
                aria-label="Search products"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
              />
              {search && (
                <button type="button" className="ov-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
            <select className="ov-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort products">
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>

        <div className="ov-chips" role="tablist" aria-label="Categories">
          <button type="button" role="tab" aria-selected={category === 'All'} className={`ov-chip ${category === 'All' ? 'active' : ''}`} onClick={() => changeCategory('All')}>
            All<span>{products.length}</span>
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={category === name}
              className={`ov-chip ${category === name ? 'active' : ''}`}
              onClick={() => changeCategory(name)}
            >
              {name}<span>{count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="ov-empty">
            <div>No products match your search.</div>
            <button type="button" className="st-btn-pill-secondary" onClick={resetFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="ov-grid">
            {shown.map((p) => {
              const pct = discountPct(p);
              const tag = pct > 0 ? `-${pct}%` : p.badge;
              return (
                <article
                  key={p.product_id}
                  className="ov-card"
                  tabIndex={0}
                  onClick={() => openQuickView(p)}
                  onKeyDown={(e) => e.key === 'Enter' && openQuickView(p)}
                >
                  {tag && <span className={`ov-badge ${pct > 0 ? 'sale' : ''}`}>{tag}</span>}
                  <div className="ov-card-img">
                    <img src={p.image} alt={p.name} loading="lazy" />
                  </div>
                  <div className="ov-card-cat">{p.category}</div>
                  <h3 className="ov-card-title" title={p.name}>{p.name}</h3>
                  {p.rating && (
                    <div className="ov-card-rating">
                      <StarIcon className="w-3.5 h-3.5" />
                      <span>{Number(p.rating).toFixed(1)}</span>
                      <em>({p.reviews_count})</em>
                    </div>
                  )}
                  <div className="ov-card-price">
                    {p.priceFrom && <small>From</small>}
                    <strong>{money.format(p.base_price)}</strong>
                    {pct > 0 && <s>{money.format(p.mrp)}</s>}
                  </div>
                  <button
                    type="button"
                    className="st-card-add-btn"
                    disabled={addingId === p.product_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(p);
                    }}
                  >
                    <ShoppingBagIcon className="w-4 h-4" />
                    <span>{addingId === p.product_id ? 'Adding...' : 'Add to cart'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div className="ov-more">
          {filtered.length > visible && (
            <button type="button" className="st-btn-pill-secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} left)
            </button>
          )}
          <Link to="/catalog" className="st-view-all-link">
            <span>View full catalog</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderRadius: '20px',
          padding: '36px 32px',
          color: '#ffffff',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          alignItems: 'flex-start',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.15)',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Help &amp; Support
          </span>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6 }}>
            Everything you need to know about shopping on BrightBuy, guest cart ordering, islandwide delivery, and product warranties.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {HOME_FAQS.map((item, idx) => {
            const isOpen = !!faqOpen[idx];
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  transition: 'background 0.2s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                  }}
                >
                  <span>{item.q}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      marginLeft: '12px',
                      flexShrink: 0,
                    }}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div style={{ paddingTop: '10px', fontSize: '0.86rem', color: 'rgba(255,255,255,0.92)', lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick view */}
      {quickView && (
        <div className="st-modal-overlay" onClick={() => setQuickView(null)}>
          <div className="st-modal-dialog" role="dialog" aria-modal="true" aria-label={quickView.name} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-modal-close" onClick={() => setQuickView(null)} aria-label="Close">
              <XIcon className="w-4 h-4" />
            </button>

            <div className="st-modal-img-wrap">
              <img src={quickView.image} alt={quickView.name} />
            </div>

            <div className="st-modal-details">
              <span className="st-modal-cat">{quickView.category}</span>
              <h2 className="st-modal-title">{quickView.name}</h2>

              {quickView.rating && (
                <div className="st-card-rating" style={{ marginBottom: 12 }}>
                  <StarIcon className="w-4 h-4" />
                  <span>{Number(quickView.rating).toFixed(1)}</span>
                  <span className="st-card-rating-count">({quickView.reviews_count} reviews)</span>
                </div>
              )}

              <p className="st-modal-desc">{quickView.description}</p>

              {quickView.details && (
                <div className="st-modal-specs-box">
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {quickView.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {quickView.colors?.length > 1 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                    Colour: <span style={{ color: '#0f172a' }}>{color}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {quickView.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: color === c ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: color === c ? '#eff6ff' : '#fff',
                          color: color === c ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="st-modal-price-row">
                <div className="st-modal-price">
                  {quickView.priceFrom && <small style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginRight: 6 }}>From</small>}
                  {money.format(quickView.base_price)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 800 }}>-</button>
                  <span style={{ fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(10, q + 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 800 }}>+</button>
                </div>
              </div>

              <div className="st-modal-actions">
                <button
                  type="button"
                  className="st-btn-pill-primary"
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                  onClick={() => addToCart(quickView, qty)}
                  disabled={addingId === quickView.product_id}
                >
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span>{addingId === quickView.product_id ? 'Adding...' : 'Add to cart'}</span>
                </button>
                <button
                  type="button"
                  className="st-card-wish-btn"
                  style={{ position: 'static', width: 46, height: 46 }}
                  onClick={(e) => toggleWishlist(e, quickView)}
                  aria-label="Toggle wishlist"
                >
                  <HeartIcon className="w-5 h-5" fill={wishlist[quickView.product_id] ? '#ef4444' : 'none'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="st-toast-container" role="status">
          <div className="st-toast">
            <div className="st-toast-icon"><CheckCircleIcon className="w-4 h-4" /></div>
            <div className="st-toast-content">
              <div className="st-toast-title">{toast.title}</div>
              <div className="st-toast-msg">{toast.message}</div>
              {toast.link && (
                <div style={{ marginTop: 4 }}>
                  <span className="st-toast-link" onClick={() => navigate(toast.link)}>
                    {toast.link === '/login' ? 'Go to sign in' : 'View cart'} &rarr;
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
