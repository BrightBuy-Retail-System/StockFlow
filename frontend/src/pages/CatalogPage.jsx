import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/client';

// ─── category metadata & thumbnail images ────────────────────────────────────
const CATEGORY_THUMBNAILS = {
  'mobile-phones': {
    name: 'Mobile Phones',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=90&auto=format&fit=crop&q=80',
    icon: '📱',
  },
  'mobile-phone-accessories': {
    name: 'Mobile Phone Accessories',
    img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=90&auto=format&fit=crop&q=80',
    icon: '🎧',
  },
  'power-banks': {
    name: 'Power Banks',
    img: 'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=90&auto=format&fit=crop&q=80',
    icon: '🔋',
  },
  'speakers': {
    name: 'Speakers',
    img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=90&auto=format&fit=crop&q=80',
    icon: '🔊',
  },
  'projectors': {
    name: 'Projectors',
    img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=90&auto=format&fit=crop&q=80',
    icon: '📽️',
  },
  'car-accessories': {
    name: 'Car Accessories',
    img: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=90&auto=format&fit=crop&q=80',
    icon: '🚗',
  },
  'electronics': {
    name: 'Electronics',
    img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=90&auto=format&fit=crop&q=80',
    icon: '⚡',
  },
};

// ─── smart product image resolver ─────────────────────────────────────────────
function getProductPhoto(product) {
  const name = (product.name || product.title || '').toLowerCase();
  if (name.includes('soundcore r50i nc') || (name.includes('soundcore') && name.includes('nc'))) {
    return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('soundcore') || name.includes('earbuds') || name.includes('airpods') || name.includes('headphone') || name.includes('tws')) {
    return 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('apple') || name.includes('adapter') || name.includes('charger') || name.includes('20w')) {
    return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('aspor') || name.includes('power bank') || name.includes('battery') || name.includes('mah')) {
    return 'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('speaker') || name.includes('jbl') || name.includes('audio') || name.includes('sound')) {
    return 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('projector') || name.includes('cinema') || name.includes('display')) {
    return 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('car') || name.includes('mount') || name.includes('holder')) {
    return 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('phone') || name.includes('iphone') || name.includes('samsung') || name.includes('galaxy') || name.includes('pixel')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('watch') || name.includes('smartwatch')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80';
  }
  if (name.includes('cable') || name.includes('type-c') || name.includes('lightning')) {
    return 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=500&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80';
}

function getRating(productId) {
  const hash = ((Number(productId) || 1) * 9301 + 49297) % 233280;
  return (4.72 + (hash % 26) / 100).toFixed(2);
}

function getColorsCount(product) {
  const hash = ((Number(product.product_id) || 1) * 17) % 5;
  return [2, 3, 4, 5, 2][hash];
}

// ─── format Sri Lankan Rupee ──────────────────────────────────────────────────
function formatRs(amount) {
  const val = Number(amount) || 0;
  return `Rs ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── reusable mini field row for forms ────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#44403c' }}>{label}</label>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  // ── Auth Context ──
  const savedUser = localStorage.getItem('user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const isManager = currentUser?.role_id === 2 || currentUser?.role_id === 3;

  // ── Catalog State ──
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Sorting ──
  const [sortBy, setSortBy] = useState('best-selling');

  // ── Filters State ──
  const [availabilityFilter, setAvailabilityFilter] = useState({ inStock: true, outOfStock: true });
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedStorage, setSelectedStorage] = useState([]);
  const [minRating, setMinRating] = useState(0);

  // ── Accordion expanded state ──
  const [openAccordions, setOpenAccordions] = useState({
    availability: true,
    price: true,
    color: true,
    storage: false,
    more: false,
  });

  const toggleAccordion = (key) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Product detail modal ──
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // ── Low stock drawer ──
  const [threshold, setThreshold] = useState(10);
  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState(null);
  const [showLowStock, setShowLowStock] = useState(false);

  // ── Create/Edit Product modal ──
  const EMPTY_PRODUCT = { title: '', description: '', base_price: '', category_id: '', is_active: 1 };
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productFormSaving, setProductFormSaving] = useState(false);
  const [productFormError, setProductFormError] = useState(null);

  // ── Variant modal ──
  const EMPTY_VARIANT = { sku: '', attribute_name: '', attribute_value: '', price_override: '' };
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editVariant, setEditVariant] = useState(null);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [variantFormSaving, setVariantFormSaving] = useState(false);
  const [variantFormError, setVariantFormError] = useState(null);

  // ── Stock adjustment inputs ──
  const [stockInputs, setStockInputs] = useState({});
  const [stockSaving, setStockSaving] = useState({});

  // ── Category creation modal ──
  const EMPTY_CAT = { name: '', slug: '' };
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [catFormSaving, setCatFormSaving] = useState(false);
  const [catFormError, setCatFormError] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchCategories = useCallback(() => {
    api.get('/catalog/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const refreshProducts = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category_id', selectedCategory);
    if (debouncedSearch) params.set('q', debouncedSearch);
    const qs = params.toString();
    api.get(`/catalog/products${qs ? '?' + qs : ''}`)
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.message));
  }, [selectedCategory, debouncedSearch]);

  const refreshDetail = useCallback(() => {
    if (!selectedProductId) return;
    setDetailLoading(true);
    setDetailError(null);
    api.get(`/catalog/products/${selectedProductId}`)
      .then((res) => {
        setProductDetail(res.data);
        setStockInputs({});
      })
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedProductId]);

  const fetchLowStock = (t) => {
    setLowStockLoading(true);
    setLowStockError(null);
    api.get(`/catalog/inventory/low-stock?threshold=${t}`)
      .then((res) => setLowStock(res.data))
      .catch((err) => setLowStockError(err.message))
      .finally(() => setLowStockLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category_id', selectedCategory);
    if (debouncedSearch) params.set('q', debouncedSearch);
    const qs = params.toString();
    api.get(`/catalog/products${qs ? '?' + qs : ''}`)
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    if (!selectedProductId) {
      setProductDetail(null);
      return;
    }
    refreshDetail();
  }, [selectedProductId, refreshDetail]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT & VARIANT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openCreateProduct = () => {
    setEditProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setProductFormError(null);
    setShowProductForm(true);
  };

  const openEditProduct = (p, e) => {
    if (e) e.stopPropagation();
    setEditProduct(p);
    setProductForm({
      title: p.name,
      description: p.description || '',
      base_price: p.base_price,
      category_id: p.category_id || '',
      is_active: p.is_active ?? 1,
    });
    setProductFormError(null);
    setShowProductForm(true);
  };

  const saveProduct = () => {
    if (!productForm.title || !productForm.base_price || !productForm.category_id) {
      setProductFormError('Title, price and category are required.');
      return;
    }
    setProductFormSaving(true);
    setProductFormError(null);
    const req = editProduct
      ? api.patch(`/catalog/products/${editProduct.product_id}`, productForm)
      : api.post('/catalog/products', productForm);
    req
      .then(() => {
        setShowProductForm(false);
        refreshProducts();
      })
      .catch((err) => setProductFormError(err.response?.data?.error || err.message))
      .finally(() => setProductFormSaving(false));
  };

  const softDeleteProduct = (p, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Soft-delete "${p.name}"? It will be hidden from the customer catalog.`)) return;
    api.delete(`/catalog/products/${p.product_id}`).then(refreshProducts);
  };

  const openCreateVariant = () => {
    setEditVariant(null);
    setVariantForm(EMPTY_VARIANT);
    setVariantFormError(null);
    setShowVariantForm(true);
  };

  const openEditVariant = (v) => {
    setEditVariant(v);
    setVariantForm({
      sku: v.sku,
      attribute_name: v.attribute_name || '',
      attribute_value: v.attribute_value || '',
      price_override: v.price_override != null ? v.price_override : '',
    });
    setVariantFormError(null);
    setShowVariantForm(true);
  };

  const saveVariant = () => {
    if (!variantForm.sku.trim()) {
      setVariantFormError('SKU is required.');
      return;
    }
    setVariantFormSaving(true);
    setVariantFormError(null);

    const payload = {
      sku: variantForm.sku.trim(),
      attribute_name: variantForm.attribute_name.trim() || null,
      attribute_value: variantForm.attribute_value.trim() || null,
      price_override: variantForm.price_override !== '' ? Number(variantForm.price_override) : null,
    };

    const req = editVariant
      ? api.patch(`/catalog/variants/${editVariant.variant_id}`, payload)
      : api.post(`/catalog/products/${selectedProductId}/variants`, payload);

    req
      .then(() => {
        setShowVariantForm(false);
        refreshDetail();
      })
      .catch((err) => setVariantFormError(err.response?.data?.error || err.message))
      .finally(() => setVariantFormSaving(false));
  };

  const deleteVariant = (v) => {
    if (!window.confirm(`Delete variant "${v.sku}"?`)) return;
    api.delete(`/catalog/variants/${v.variant_id}`).then(refreshDetail);
  };

  const adjustStock = (variantId) => {
    const delta = parseInt(stockInputs[variantId] || '0', 10);
    if (isNaN(delta) || delta === 0) return;
    setStockSaving((s) => ({ ...s, [variantId]: true }));
    api.patch(`/catalog/inventory/${variantId}`, { adjust: delta })
      .then(() => {
        setStockInputs((s) => ({ ...s, [variantId]: '' }));
        refreshDetail();
      })
      .finally(() => setStockSaving((s) => ({ ...s, [variantId]: false })));
  };

  const saveCategory = () => {
    if (!catForm.name.trim() || !catForm.slug.trim()) {
      setCatFormError('Name and slug are required.');
      return;
    }
    setCatFormSaving(true);
    setCatFormError(null);
    api.post('/catalog/categories', catForm)
      .then(() => {
        setShowCatForm(false);
        setCatForm(EMPTY_CAT);
        fetchCategories();
      })
      .catch((err) => setCatFormError(err.response?.data?.error || err.message))
      .finally(() => setCatFormSaving(false));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES FOR THE TOP PILL CAROUSEL
  // ═══════════════════════════════════════════════════════════════════════════
  // Combine database categories with default catalog badges from screenshot
  const displayCategories = useMemo(() => {
    const existingSlugs = new Set(categories.map((c) => c.slug || c.name?.toLowerCase().replace(/\s+/g, '-')));
    const staticPills = Object.entries(CATEGORY_THUMBNAILS).map(([slug, meta]) => ({
      slug,
      name: meta.name,
      img: meta.img,
      icon: meta.icon,
      isStatic: true,
    }));

    const dbPills = categories.map((c) => {
      const slug = c.slug || c.name?.toLowerCase().replace(/\s+/g, '-');
      const meta = CATEGORY_THUMBNAILS[slug] || {};
      return {
        category_id: c.category_id,
        slug,
        name: c.name,
        img: meta.img || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=90&auto=format&fit=crop&q=80',
        icon: meta.icon || '📦',
        isStatic: false,
      };
    });

    // If categories in DB match the screenshot, use them; otherwise ensure screenshot categories are visible
    if (dbPills.length > 0) {
      return dbPills;
    }
    return staticPills;
  }, [categories]);

  // Selected category title
  const currentCategoryName = useMemo(() => {
    if (!selectedCategory) return 'All';
    const found = categories.find((c) => String(c.category_id) === String(selectedCategory));
    return found ? found.name : 'All';
  }, [selectedCategory, categories]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERING & SORTING LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Price range
    if (minPrice !== '') {
      result = result.filter((p) => Number(p.base_price) >= Number(minPrice));
    }
    if (maxPrice !== '') {
      result = result.filter((p) => Number(p.base_price) <= Number(maxPrice));
    }

    // Availability filter
    if (!availabilityFilter.inStock && availabilityFilter.outOfStock) {
      result = result.filter((p) => p.is_active === 0);
    } else if (availabilityFilter.inStock && !availabilityFilter.outOfStock) {
      result = result.filter((p) => p.is_active !== 0);
    } else if (!availabilityFilter.inStock && !availabilityFilter.outOfStock) {
      return [];
    }

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.base_price) - Number(b.base_price));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.base_price) - Number(a.base_price));
    } else if (sortBy === 'alpha-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'alpha-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return result;
  }, [products, minPrice, maxPrice, availabilityFilter, sortBy]);

  // Total products count to show (matching "1310 products" aesthetic or dynamic)
  const productCountDisplay = filteredProducts.length > 0 ? `${filteredProducts.length} products` : '0 products';

  return (
    <div
      style={{
        backgroundColor: '#ffffffff',
        minHeight: '100vh',
        margin: '-36px -28px -64px -28px',
        padding: '36px 44px 80px 44px',
        color: '#1c1917',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* ── TOP HEADING: "All" ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '22px' }}>
        <h1
          style={{
            fontSize: '2.8rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            margin: '0 0 18px 0',
            color: '#1a1917',
            lineHeight: 1.1,
          }}
        >
          {currentCategoryName}
        </h1>

        {/* ── CATEGORY PILLS BAR ───────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollbarWidth: 'none',
          }}
        >
          {/* "All" category pill */}
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: selectedCategory === '' ? '#1a1917' : '#ffffff',
              color: selectedCategory === '' ? '#ffffff' : '#1c1917',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '9999px',
              padding: '7px 18px 7px 12px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedCategory === '' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                background: selectedCategory === '' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              🏷️
            </span>
            <span>All Categories</span>
          </button>

          {/* Dynamic / Metadata Category Pills */}
          {displayCategories.map((cat) => {
            const isSelected = String(selectedCategory) === String(cat.category_id);
            return (
              <button
                key={cat.slug || cat.category_id}
                onClick={() => {
                  if (cat.category_id) {
                    setSelectedCategory(isSelected ? '' : cat.category_id);
                  } else {
                    // Filter by title / category name if matching static pill
                    setSearchQuery(cat.name);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: isSelected ? '#1a1917' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1c1917',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '9999px',
                  padding: '7px 18px 7px 10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {cat.img ? (
                    <img
                      src={cat.img}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span style={{ display: cat.img ? 'none' : 'block', fontSize: '1rem' }}>{cat.icon || '📦'}</span>
                </div>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN LAYOUT ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: '40px',
          alignItems: 'flex-start',
        }}
      >
        {/* ── LEFT COLUMN: FILTER ACCORDIONS ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Availability Accordion */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 0' }}>
            <button
              onClick={() => toggleAccordion('availability')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#1a1917',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Availability</span>
              <span style={{ fontSize: '0.75rem', transform: openAccordions.availability ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
            {openAccordions.availability && (
              <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.86rem', color: '#57534e', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={availabilityFilter.inStock}
                    onChange={(e) => setAvailabilityFilter((p) => ({ ...p, inStock: e.target.checked }))}
                    style={{ accentColor: '#1a1917', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>In stock</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.86rem', color: '#57534e', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={availabilityFilter.outOfStock}
                    onChange={(e) => setAvailabilityFilter((p) => ({ ...p, outOfStock: e.target.checked }))}
                    style={{ accentColor: '#1a1917', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Out of stock</span>
                </label>
              </div>
            )}
          </div>

          {/* Price Accordion */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 0' }}>
            <button
              onClick={() => toggleAccordion('price')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#1a1917',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Price</span>
              <span style={{ fontSize: '0.75rem', transform: openAccordions.price ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
            {openAccordions.price && (
              <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Rs Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                  <span style={{ color: '#a8a29e' }}>–</span>
                  <input
                    type="number"
                    placeholder="Rs Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
                {(minPrice || maxPrice) && (
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1a1917',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Reset price
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Color Accordion */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 0' }}>
            <button
              onClick={() => toggleAccordion('color')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#1a1917',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Color</span>
              <span style={{ fontSize: '0.75rem', transform: openAccordions.color ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
            {openAccordions.color && (
              <div style={{ paddingTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Black', 'White', 'Blue', 'Green', 'Red', 'Silver'].map((c) => {
                  const isSel = selectedColors.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() =>
                        setSelectedColors((prev) =>
                          isSel ? prev.filter((x) => x !== c) : [...prev, c]
                        )
                      }
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor: isSel ? '#1a1917' : '#ffffff',
                        color: isSel ? '#ffffff' : '#1c1917',
                        border: '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Storage Capacity Accordion */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 0' }}>
            <button
              onClick={() => toggleAccordion('storage')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#1a1917',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>Storage Capacity</span>
              <span style={{ fontSize: '0.75rem', transform: openAccordions.storage ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
            {openAccordions.storage && (
              <div style={{ paddingTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['64GB', '128GB', '256GB', '512GB', '1TB'].map((s) => {
                  const isSel = selectedStorage.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        setSelectedStorage((prev) =>
                          isSel ? prev.filter((x) => x !== s) : [...prev, s]
                        )
                      }
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: isSel ? '#1a1917' : '#ffffff',
                        color: isSel ? '#ffffff' : '#1c1917',
                        border: '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* More filters Accordion */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 0' }}>
            <button
              onClick={() => toggleAccordion('more')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#1a1917',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>More filters</span>
              <span style={{ fontSize: '0.75rem', transform: openAccordions.more ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
            {openAccordions.more && (
              <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '0.86rem', color: '#57534e', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={minRating >= 4.5}
                    onChange={(e) => setMinRating(e.target.checked ? 4.5 : 0)}
                    style={{ accentColor: '#1a1917' }}
                  />
                  <span>Rating 4.5★ &amp; above</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: PRODUCTS TOOLBAR & GRID ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Top toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Search Input & Manager Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', maxWidth: '440px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Search products…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 34px 8px 14px',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.12)',
                    fontSize: '0.86rem',
                    color: '#1c1917',
                    outline: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#a8a29e',
                      fontSize: '1rem',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Manager Buttons if authorized */}
              {isManager && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => { setCatForm(EMPTY_CAT); setCatFormError(null); setShowCatForm(true); }}
                    title="Add Category"
                    style={{
                      padding: '7px 12px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#ffffff',
                      color: '#1c1917',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Cat
                  </button>
                  <button
                    onClick={openCreateProduct}
                    title="Add Product"
                    style={{
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: '#1a1917',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    + Product
                  </button>
                  <button
                    onClick={() => { setShowLowStock((v) => !v); if (!showLowStock) fetchLowStock(threshold); }}
                    title="Low Stock Alerts"
                    style={{
                      padding: '7px 12px',
                      borderRadius: '9999px',
                      border: '1px solid #f59e0b',
                      background: showLowStock ? '#f59e0b' : 'rgba(245,158,11,0.08)',
                      color: showLowStock ? '#ffffff' : '#b45309',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚠ Stock
                  </button>
                </div>
              )}
            </div>

            {/* Right: Sort Dropdown & Products Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: '#1c1917',
                    cursor: 'pointer',
                    paddingRight: '18px',
                    outline: 'none',
                  }}
                >
                  <option value="best-selling">Best selling</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="alpha-asc">Alphabetically: A-Z</option>
                  <option value="alpha-desc">Alphabetically: Z-A</option>
                </select>
                <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', fontSize: '0.68rem', color: '#1c1917' }}>
                  ▼
                </span>
              </div>

              <span style={{ fontSize: '0.88rem', color: '#57534e', fontWeight: 400, whiteSpace: 'nowrap' }}>
                {productCountDisplay}
              </span>
            </div>
          </div>

          {/* Low Stock Drawer if open */}
          {showLowStock && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>Low Stock Variants Alert</h4>
                  <span style={{ fontSize: '0.78rem', color: '#78716c' }}>Variants below threshold</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    style={{ width: '56px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.4)', textAlign: 'center', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={() => fetchLowStock(threshold)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
              {lowStockLoading && <p style={{ fontSize: '0.82rem', color: '#78716c' }}>Loading…</p>}
              {lowStockError && <p style={{ fontSize: '0.82rem', color: 'red' }}>Error: {lowStockError}</p>}
              {!lowStockLoading && !lowStockError && lowStock.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: '#059669', margin: 0 }}>✓ All variants have healthy stock levels.</p>
              )}
              {!lowStockLoading && lowStock.length > 0 && (
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#78716c' }}>
                        <th style={{ padding: '6px' }}>Product</th>
                        <th style={{ padding: '6px' }}>SKU</th>
                        <th style={{ padding: '6px' }}>Attribute</th>
                        <th style={{ padding: '6px' }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '6px', fontWeight: 600 }}>{row.product_name}</td>
                          <td style={{ padding: '6px' }}><code>{row.sku}</code></td>
                          <td style={{ padding: '6px' }}>{row.attribute_name ? `${row.attribute_name}: ${row.attribute_value}` : 'Standard'}</td>
                          <td style={{ padding: '6px', fontWeight: 700, color: row.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                            {row.stock === 0 ? 'Out of stock' : row.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Loading / Error States */}
          {loading && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#78716c' }}>
              <p>Loading products…</p>
            </div>
          )}
          {error && (
            <div style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '12px', color: '#b91c1c' }}>
              <p>Error: {error}</p>
            </div>
          )}

          {/* ── 4-COLUMN PRODUCTS GRID ───────────────────────────────────── */}
          {!loading && !error && (
            filteredProducts.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px dashed rgba(0,0,0,0.12)',
                }}
              >
                <p style={{ color: '#78716c', margin: '0 0 12px 0', fontSize: '0.95rem' }}>No products found matching your selection.</p>
                <button
                  onClick={() => { setSelectedCategory(''); setSearchQuery(''); setMinPrice(''); setMaxPrice(''); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                  }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '20px',
                }}
              >
                {filteredProducts.map((p) => {
                  const photoUrl = getProductPhoto(p);
                  const basePrice = Number(p.base_price) || 0;
                  const installment = (basePrice / 3).toFixed(2);
                  const rating = getRating(p.product_id);
                  const colorsCount = getColorsCount(p);
                  const isInStock = p.is_active !== 0;

                  return (
                    <div
                      key={p.product_id}
                      onClick={() => setSelectedProductId(p.product_id)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '18px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.16)';
                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.02)';
                      }}
                    >
                      {/* Top Badges (e.g. Save, Hi-Res, Inactive) */}
                      <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {p.is_active === 0 ? (
                          <span
                            style={{
                              background: 'rgba(239,68,68,0.14)',
                              color: '#b91c1c',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '9999px',
                            }}
                          >
                            INACTIVE
                          </span>
                        ) : basePrice > 7000 ? (
                          <span
                            style={{
                              background: '#c59b27',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Hi-Res
                          </span>
                        ) : basePrice < 4000 ? (
                          <span
                            style={{
                              background: '#dc2626',
                              color: '#ffffff',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '9999px',
                            }}
                          >
                            Save 14%
                          </span>
                        ) : null}
                      </div>

                      {/* Product Studio Image Container */}
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '14px',
                          overflow: 'hidden',
                          borderRadius: '12px',
                        }}
                      >
                        <img
                          src={photoUrl}
                          alt={p.name}
                          style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            transition: 'transform 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Title: 2 lines clamp */}
                      <h3
                        style={{
                          fontSize: '0.94rem',
                          fontWeight: 700,
                          color: '#1a1917',
                          lineHeight: 1.35,
                          margin: '0 0 6px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '2.6em',
                        }}
                      >
                        {p.name}
                      </h3>

                      {/* Price display: e.g. "From Rs 7,249.00" or "Rs 4,999.00" */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                        {basePrice > 6000 && (
                          <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#1c1917' }}>From</span>
                        )}
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1c1917' }}>
                          {formatRs(basePrice)}
                        </span>
                      </div>

                      {/* Installment BNPL Banner matching screenshot */}
                      <div style={{ fontSize: '0.71rem', color: '#57534e', lineHeight: 1.4, marginBottom: '4px' }}>
                        Pay in 3 x <strong style={{ color: '#1a1917' }}>{formatRs(installment)}</strong> &amp; get up to <strong style={{ color: '#1a1917' }}>1% Cashback</strong> with{' '}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#0a1926',
                            color: '#10b981',
                            fontWeight: 800,
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            margin: '0 2px',
                          }}
                        >
                          mintpay
                        </span>{' '}
                        or{' '}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            margin: '0 2px',
                          }}
                        >
                          koko
                        </span>
                        <span style={{ display: 'block', fontSize: '0.64rem', color: '#a8a29e' }}>*T&amp;C Apply</span>
                      </div>

                      {/* Variants Summary */}
                      <div style={{ fontSize: '0.76rem', color: '#78716c', marginBottom: '4px' }}>
                        Available in {colorsCount} colors
                      </div>

                      {/* Rating Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', letterSpacing: '1px' }}>★★★★★</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1c1917' }}>{rating}</span>
                      </div>

                      {/* Stock Status Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: isInStock ? '#10b981' : '#ef4444',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ color: isInStock ? '#059669' : '#dc2626' }}>
                          {isInStock ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>

                      {/* Manager Hover Controls */}
                      {isManager && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px dashed rgba(0,0,0,0.08)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => openEditProduct(p, e)}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,0,0,0.12)',
                              background: '#ffffff',
                              color: '#1a1917',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => softDeleteProduct(p, e)}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.2)',
                              background: '#ffffff',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            Del
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCT DETAIL MODAL (Variants & Live Stock Adjustment)
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedProductId && (
        <div
          onClick={() => setSelectedProductId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>
                  {productDetail ? productDetail.name : 'Loading…'}
                </h3>
                {productDetail && (
                  <p style={{ color: '#78716c', fontSize: '0.86rem', marginTop: '4px' }}>
                    Category: <strong>{productDetail.category_name}</strong> | Base Price: <strong>{formatRs(productDetail.base_price)}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProductId(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', color: '#78716c', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {detailLoading && <p style={{ color: '#78716c', fontSize: '0.88rem' }}>Loading variants &amp; inventory…</p>}
            {detailError && <p style={{ color: '#dc2626', fontSize: '0.88rem' }}>Error: {detailError}</p>}

            {productDetail && !detailLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {productDetail.description && (
                  <p style={{ color: '#57534e', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    {productDetail.description}
                  </p>
                )}

                {/* Variants section header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>
                    Variants &amp; Inventory ({productDetail.variants?.length ?? 0} total)
                  </h4>
                  {isManager && (
                    <button
                      onClick={openCreateVariant}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: '#1a1917',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                      }}
                    >
                      + Add Variant
                    </button>
                  )}
                </div>

                {/* Variants table */}
                {productDetail.variants && productDetail.variants.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1.5px solid rgba(0,0,0,0.08)', color: '#78716c' }}>
                          <th style={{ padding: '8px' }}>SKU</th>
                          <th style={{ padding: '8px' }}>Attribute</th>
                          <th style={{ padding: '8px' }}>Price</th>
                          <th style={{ padding: '8px' }}>Stock</th>
                          {isManager && <th style={{ padding: '8px', minWidth: '150px' }}>Adjust Stock</th>}
                          {isManager && <th style={{ padding: '8px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {productDetail.variants.map((v) => (
                          <tr key={v.variant_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={{ padding: '8px' }}><code>{v.sku}</code></td>
                            <td style={{ padding: '8px' }}>
                              {v.attribute_name ? `${v.attribute_name}: ${v.attribute_value}` : <span style={{ color: '#a8a29e' }}>Standard</span>}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{formatRs(v.price)}</td>
                            <td style={{ padding: '8px', fontWeight: 600, color: v.stock === 0 ? '#ef4444' : '#059669' }}>
                              {v.stock === 0 ? 'Out of stock' : `${v.stock} in stock`}
                            </td>

                            {isManager && (
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: -5 }).then(refreshDetail)}
                                    style={{ padding: '3px 7px', borderRadius: '5px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    −5
                                  </button>
                                  <input
                                    type="number"
                                    placeholder="±"
                                    value={stockInputs[v.variant_id] ?? ''}
                                    onChange={(e) => setStockInputs((s) => ({ ...s, [v.variant_id]: e.target.value }))}
                                    style={{ width: '48px', padding: '3px 5px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', textAlign: 'center', fontSize: '0.8rem' }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') adjustStock(v.variant_id); }}
                                  />
                                  <button
                                    onClick={() => api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: 5 }).then(refreshDetail)}
                                    style={{ padding: '3px 7px', borderRadius: '5px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', color: '#059669', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    +5
                                  </button>
                                  <button
                                    onClick={() => adjustStock(v.variant_id)}
                                    disabled={stockSaving[v.variant_id]}
                                    style={{ padding: '3px 8px', borderRadius: '5px', border: 'none', background: '#1a1917', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                                  >
                                    ✓
                                  </button>
                                </div>
                              </td>
                            )}

                            {isManager && (
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => openEditVariant(v)}
                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', background: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteVariant(v)}
                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.25)', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    Del
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '24px', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.12)', textAlign: 'center' }}>
                    <p style={{ color: '#78716c', margin: 0, fontSize: '0.85rem' }}>
                      No variants registered yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE / EDIT PRODUCT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showProductForm && (
        <div
          onClick={() => setShowProductForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#78716c', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <Field label="Product Title *">
              <input
                type="text"
                placeholder="e.g. Anker Soundcore R50i NC Earbuds"
                value={productForm.title}
                onChange={(e) => setProductForm((f) => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            <Field label="Description">
              <textarea
                placeholder="Product specifications & details"
                value={productForm.description}
                rows={3}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </Field>

            <Field label="Base Price (Rs) *">
              <input
                type="number"
                placeholder="4999.00"
                value={productForm.base_price}
                onChange={(e) => setProductForm((f) => ({ ...f, base_price: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            <Field label="Category *">
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none', background: '#fff' }}
              >
                <option value="">Select Category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {editProduct && (
              <Field label="Status">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ label: 'Active', val: 1 }, { label: 'Inactive', val: 0 }].map(({ label, val }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProductForm((f) => ({ ...f, is_active: val }))}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        border: `1.5px solid ${val === 1 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)'}`,
                        background: productForm.is_active === val ? (val === 1 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)') : 'none',
                        color: val === 1 ? '#059669' : '#dc2626',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {productFormError && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{productFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                style={{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.12)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProduct}
                disabled={productFormSaving}
                style={{ padding: '8px 20px', borderRadius: '9999px', border: 'none', background: '#1a1917', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                {productFormSaving ? 'Saving…' : (editProduct ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADD / EDIT VARIANT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showVariantForm && (
        <div
          onClick={() => setShowVariantForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>
                {editVariant ? 'Edit Variant' : 'Add Variant'}
              </h3>
              <button
                onClick={() => setShowVariantForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#78716c', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <Field label="SKU *">
              <input
                type="text"
                placeholder="e.g. ANKER-R50I-BLK"
                value={variantForm.sku}
                onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="Attribute Name">
                <input
                  type="text"
                  placeholder="e.g. Color"
                  value={variantForm.attribute_name}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
                />
              </Field>
              <Field label="Attribute Value">
                <input
                  type="text"
                  placeholder="e.g. Black"
                  value={variantForm.attribute_value}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_value: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
                />
              </Field>
            </div>

            <Field label="Price Override (optional)">
              <input
                type="number"
                placeholder="Leave blank for base price"
                value={variantForm.price_override}
                onChange={(e) => setVariantForm((f) => ({ ...f, price_override: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            {variantFormError && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{variantFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowVariantForm(false)}
                style={{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.12)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVariant}
                disabled={variantFormSaving}
                style={{ padding: '8px 18px', borderRadius: '9999px', border: 'none', background: '#1a1917', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                {variantFormSaving ? 'Saving…' : (editVariant ? 'Save Changes' : 'Add Variant')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE CATEGORY MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showCatForm && (
        <div
          onClick={() => setShowCatForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '380px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>New Category</h3>
              <button
                onClick={() => setShowCatForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#78716c', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <Field label="Category Name *">
              <input
                type="text"
                placeholder="e.g. Wireless Audio"
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            <Field label="Slug * (URL-safe)">
              <input
                type="text"
                placeholder="e.g. wireless-audio"
                value={catForm.slug}
                onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', outline: 'none' }}
              />
            </Field>

            {catFormError && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{catFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowCatForm(false)}
                style={{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.12)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCategory}
                disabled={catFormSaving}
                style={{ padding: '8px 18px', borderRadius: '9999px', border: 'none', background: '#1a1917', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                {catFormSaving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
