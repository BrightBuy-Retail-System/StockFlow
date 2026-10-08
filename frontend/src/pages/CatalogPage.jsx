import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const name = (product?.name || product?.title || '').toLowerCase();
  if (name.includes('soundcore r50i nc') || (name.includes('soundcore') && name.includes('nc'))) {
    return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('soundcore') || name.includes('earbuds') || name.includes('airpods') || name.includes('headphone') || name.includes('tws')) {
    return 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('apple') || name.includes('adapter') || name.includes('charger') || name.includes('20w')) {
    return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('aspor') || name.includes('power bank') || name.includes('battery') || name.includes('mah')) {
    return 'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('speaker') || name.includes('jbl') || name.includes('audio') || name.includes('sound')) {
    return 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('projector') || name.includes('cinema') || name.includes('display')) {
    return 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('car') || name.includes('mount') || name.includes('holder')) {
    return 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('phone') || name.includes('iphone') || name.includes('samsung') || name.includes('galaxy') || name.includes('pixel')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('watch') || name.includes('smartwatch')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80';
  }
  if (name.includes('cable') || name.includes('type-c') || name.includes('lightning')) {
    return 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=700&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80';
}

function getProductGallery(product) {
  const name = (product?.name || product?.title || '').toLowerCase();
  if (name.includes('soundcore') || name.includes('earbuds') || name.includes('airpods') || name.includes('headphone')) {
    return [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=900&auto=format&fit=crop&q=80',
    ];
  }
  if (name.includes('power bank') || name.includes('battery') || name.includes('aspor')) {
    return [
      'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80',
    ];
  }
  if (name.includes('speaker') || name.includes('jbl') || name.includes('audio')) {
    return [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543512214-318c7553f230?w=900&auto=format&fit=crop&q=80',
    ];
  }
  if (name.includes('phone') || name.includes('iphone') || name.includes('samsung')) {
    return [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900&auto=format&fit=crop&q=80',
    ];
  }
  return [
    getProductPhoto(product),
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&auto=format&fit=crop&q=80',
  ];
}

function getDeliveryDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() + 2);
  const end = new Date(now);
  end.setDate(now.getDate() + 8);
  const opt = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opt)} to ${end.toLocaleDateString('en-US', opt)}`;
}

function safeStars(rating) {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function safeAverageRating(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

function safeStarCount(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return '☆☆☆☆☆';
  const sum = reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0);
  const avg = Math.max(0, Math.min(5, Math.round(sum / reviews.length)));
  return '★'.repeat(avg) + '☆'.repeat(5 - avg);
}

// ─── format Sri Lankan Rupee ──────────────────────────────────────────────────
function formatRs(amount) {
  const val = Number(amount) || 0;
  return `Rs ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── reusable field row for forms ─────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>{label}</label>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  const navigate = useNavigate();

  // ── Auth Context safely parsed ──
  let currentUser = null;
  try {
    const savedUser = localStorage.getItem('user');
    currentUser = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    currentUser = null;
  }
  const isLoggedIn = !!currentUser;
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

  // ── Accordion expanded state in Sidebar ──
  const [openAccordions, setOpenAccordions] = useState({
    availability: true,
    price: true,
    color: true,
    storage: false,
    more: false,
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const toggleAccordion = (key) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Product Detail View State (Synced with URL for Browser Back/Forward navigation) ──
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProductId = searchParams.get('product') || null;

  const setSelectedProductId = useCallback((id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set('product', String(id));
      } else {
        next.delete('product');
      }
      return next;
    });
  }, [setSearchParams]);

  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // ── Interactive Detail Page Controls ──
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartVersion, setCartVersion] = useState(0);
  const [shortDescOpen, setShortDescOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [toastMessage, setToastMessage] = useState(null);
  const [faqOpen, setFaqOpen] = useState({ 0: false, 1: false, 2: false });
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, name: '', title: '', comment: '' });
  const [userReviews, setUserReviews] = useState([]);

  // In-cart quantity helper for any variant (supports both guest and authenticated users)
  const getVariantInCart = useCallback((vId) => {
    if (!productDetail) return 0;
    try {
      const userCartKey = currentUser?.user_id ? `cart_${currentUser.user_id}` : 'cart';
      const raw = localStorage.getItem(userCartKey) || localStorage.getItem('cart');
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return 0;
      const found = list.find(
        (i) => i.product_id === productDetail.product_id && (vId ? i.variant_id === vId : true)
      );
      return found ? Number(found.quantity) || 0 : 0;
    } catch {
      return 0;
    }
  }, [productDetail, currentUser?.user_id, cartVersion]);

  // In-cart quantity for current variant
  const inCartQuantity = useMemo(() => {
    return getVariantInCart(selectedVariantId);
  }, [selectedVariantId, getVariantInCart]);

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

  // ── Category creation & edit modal ──
  const EMPTY_CAT = { name: '', slug: '' };
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [catFormSaving, setCatFormSaving] = useState(false);
  const [catFormDeleting, setCatFormDeleting] = useState(false);
  const [catFormError, setCatFormError] = useState(null);

  const openCreateCategory = () => {
    setEditCategory(null);
    setCatForm(EMPTY_CAT);
    setCatFormError(null);
    setShowCatForm(true);
  };

  const openEditCategory = (cat = null) => {
    const target = cat || categories.find((c) => String(c.category_id) === String(selectedCategory)) || categories[0] || null;
    if (!target) return;
    setEditCategory(target);
    setCatForm({ name: target.name, slug: target.slug || '' });
    setCatFormError(null);
    setShowCatForm(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchCategories = useCallback(() => {
    api.get('/catalog/categories')
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message));
  }, []);

  const refreshProducts = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category_id', selectedCategory);
    if (debouncedSearch) params.set('q', debouncedSearch);
    const qs = params.toString();
    api.get(`/catalog/products${qs ? '?' + qs : ''}`)
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message));
  }, [selectedCategory, debouncedSearch]);

  const refreshDetail = useCallback((silent = false) => {
    if (!selectedProductId) return;
    if (!silent) setDetailLoading(true);
    setDetailError(null);
    try {
      const stored = localStorage.getItem(`reviews_${selectedProductId}`);
      setUserReviews(stored ? JSON.parse(stored) : []);
    } catch {
      setUserReviews([]);
    }
    api.get(`/catalog/products/${selectedProductId}`)
      .then((res) => {
        setProductDetail(res.data);
        setStockInputs({});
        if (res.data?.variants && Array.isArray(res.data.variants) && res.data.variants.length > 0) {
          setSelectedVariantId((prevId) => {
            const exists = res.data.variants.some((v) => v.variant_id === prevId);
            return exists ? prevId : res.data.variants[0].variant_id;
          });
        } else {
          setSelectedVariantId(null);
        }
      })
      .catch((err) => setDetailError(err.message))
      .finally(() => {
        if (!silent) setDetailLoading(false);
      });
  }, [selectedProductId]);

  const fetchLowStock = (t) => {
    setLowStockLoading(true);
    setLowStockError(null);
    api.get(`/catalog/inventory/low-stock?threshold=${t}`)
      .then((res) => setLowStock(Array.isArray(res.data) ? res.data : []))
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
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    if (!selectedProductId) {
      setProductDetail(null);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshDetail();
  }, [selectedProductId, refreshDetail]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT & VARIANT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openCreateProduct = () => {
    setEditProduct(null);
    setProductForm({
      title: '',
      description: '',
      base_price: '',
      category_id: selectedCategory || (categories[0]?.category_id ?? ''),
      is_active: 1,
    });
    setProductFormError(null);
    setShowProductForm(true);
  };

  const openEditProduct = (p, e) => {
    if (e) e.stopPropagation();
    setEditProduct(p);
    setProductForm({
      title: p.name || p.title || '',
      description: p.description || '',
      base_price: p.base_price || '',
      category_id: p.category_id || categories.find((c) => c.name === p.category_name)?.category_id || '',
      is_active: p.is_active ?? 1,
    });
    setProductFormError(null);
    setShowProductForm(true);
  };

  const saveProduct = () => {
    if (!productForm.title.trim()) {
      setProductFormError('Title is required');
      return;
    }
    if (!productForm.base_price || Number(productForm.base_price) <= 0) {
      setProductFormError('Base price must be positive');
      return;
    }
    if (!productForm.category_id) {
      setProductFormError('Please select a category');
      return;
    }

    setProductFormSaving(true);
    setProductFormError(null);

    const call = editProduct
      ? api.patch(`/catalog/products/${editProduct.product_id}`, productForm)
      : api.post('/catalog/products', productForm);

    call
      .then(() => {
        setShowProductForm(false);
        refreshProducts();
        if (selectedProductId) refreshDetail();
      })
      .catch((err) => setProductFormError(err.response?.data?.error || err.message))
      .finally(() => setProductFormSaving(false));
  };

  const softDeleteProduct = (p, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Soft-delete "${p.name}"? It will be hidden from the customer catalog.`)) return;
    api.delete(`/catalog/products/${p.product_id}`).then(() => {
      refreshProducts();
      if (selectedProductId === p.product_id) setSelectedProductId(null);
    });
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
      sku: v.sku || '',
      attribute_name: v.attribute_name || '',
      attribute_value: v.attribute_value || '',
      price_override: v.price !== undefined && v.price !== null ? v.price : '',
    });
    setVariantFormError(null);
    setShowVariantForm(true);
  };

  const saveVariant = () => {
    if (!variantForm.sku.trim()) {
      setVariantFormError('SKU is required');
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

    const call = editVariant
      ? api.patch(`/catalog/variants/${editVariant.variant_id}`, payload)
      : api.post(`/catalog/products/${selectedProductId}/variants`, payload);

    call
      .then(() => {
        setShowVariantForm(false);
        refreshDetail();
      })
      .catch((err) => setVariantFormError(err.response?.data?.error || err.message))
      .finally(() => setVariantFormSaving(false));
  };

  const deleteVariant = (v) => {
    if (!window.confirm(`Delete variant SKU "${v.sku}"?`)) return;
    api.delete(`/catalog/variants/${v.variant_id}`).then(refreshDetail);
  };

  const adjustStock = (variantId) => {
    const raw = stockInputs[variantId];
    const delta = parseInt(raw, 10);
    if (isNaN(delta) || delta === 0) return;

    setStockSaving((s) => ({ ...s, [variantId]: true }));
    api.patch(`/catalog/inventory/${variantId}`, { adjust: delta })
      .then(() => {
        setStockInputs((s) => ({ ...s, [variantId]: '' }));
        refreshDetail();
      })
      .catch((err) => alert(`Failed to adjust stock: ${err.message}`))
      .finally(() => setStockSaving((s) => ({ ...s, [variantId]: false })));
  };

  const saveCategory = () => {
    if (!catForm.name.trim()) {
      setCatFormError('Category name is required');
      return;
    }
    if (!catForm.slug.trim()) {
      setCatFormError('Category slug is required');
      return;
    }
    setCatFormSaving(true);
    setCatFormError(null);

    const promise = editCategory
      ? api.patch(`/catalog/categories/${editCategory.category_id}`, catForm)
      : api.post('/catalog/categories', catForm);

    promise
      .then(() => {
        setShowCatForm(false);
        fetchCategories();
        refreshProducts();
      })
      .catch((err) => setCatFormError(err.response?.data?.error || err.message))
      .finally(() => setCatFormSaving(false));
  };

  const deleteCategory = () => {
    if (!editCategory) return;
    if (!window.confirm(`Are you sure you want to delete category "${editCategory.name}"?`)) return;

    setCatFormDeleting(true);
    setCatFormError(null);
    api.delete(`/catalog/categories/${editCategory.category_id}`)
      .then(() => {
        if (String(selectedCategory) === String(editCategory.category_id)) {
          setSelectedCategory('');
        }
        setShowCatForm(false);
        fetchCategories();
        refreshProducts();
      })
      .catch((err) => setCatFormError(err.response?.data?.error || err.message))
      .finally(() => setCatFormDeleting(false));
  };

  // ── Cart & Add-to-cart Toast ──
  const handleAddToCart = async () => {
    if (!productDetail) return;
    const variants = Array.isArray(productDetail.variants) ? productDetail.variants : [];
    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId) || variants[0];
    const availableStock = selectedVariant && selectedVariant.stock !== undefined ? Number(selectedVariant.stock) : 0;

    if (availableStock <= 0 || productDetail.is_active === 0) {
      setToastMessage('❌ Item is currently out of stock.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const qtyToAdd = Math.min(quantity, availableStock);
    if (qtyToAdd <= 0) {
      setToastMessage('❌ Please select at least 1 unit.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // 1. Optimistically deduct stock on the frontend state immediately
    setProductDetail((prev) => {
      if (!prev) return prev;
      const updatedVariants = (prev.variants || []).map((v) =>
        v.variant_id === selectedVariant.variant_id
          ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) - qtyToAdd) }
          : v
      );
      return { ...prev, variants: updatedVariants };
    });

    const itemPrice = selectedVariant && selectedVariant.price !== undefined && selectedVariant.price !== null
      ? Number(selectedVariant.price)
      : Number(productDetail.base_price) || 0;

    const cartItem = {
      product_id: productDetail.product_id,
      name: productDetail.name || productDetail.title,
      variant_id: selectedVariant?.variant_id || null,
      sku: selectedVariant?.sku || 'STD',
      attribute_name: selectedVariant?.attribute_name || null,
      attribute_value: selectedVariant?.attribute_value || 'Default',
      price: itemPrice,
      quantity: qtyToAdd,
      available_stock: availableStock - qtyToAdd,
      image: getProductPhoto(productDetail),
    };

    const userCartKey = currentUser?.user_id ? `cart_${currentUser.user_id}` : 'cart';
    const raw = localStorage.getItem(userCartKey) || localStorage.getItem('cart');
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const matchIndex = list.findIndex(
      (i) => i.product_id === cartItem.product_id && i.variant_id === cartItem.variant_id
    );

    if (matchIndex > -1) {
      list[matchIndex].quantity = (Number(list[matchIndex].quantity) || 0) + qtyToAdd;
    } else {
      list.push(cartItem);
    }
    localStorage.setItem(userCartKey, JSON.stringify(list));
    localStorage.setItem('cart', JSON.stringify(list));
    setCartVersion((v) => v + 1);
    setQuantity(1);

    // 2. Persist to database shopping cart & reserve stock if logged in
    if (isLoggedIn && selectedVariant?.variant_id) {
      try {
        // Sync item to database cart table for AuthCartPage & CustomerDashboard
        await api.post('/auth_cart/cart/add', {
          variant_id: selectedVariant.variant_id,
          quantity: qtyToAdd,
        });

        await api.post('/catalog/cart/reserve', {
          variant_id: selectedVariant.variant_id,
          quantity: qtyToAdd,
        });
        refreshDetail(true);
        refreshProducts();
      } catch (err) {
        console.warn('Backend cart sync note:', err);
      }
    }

    setToastMessage(`✓ Added ${qtyToAdd}x ${productDetail.name} to cart!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) {
      alert('Please provide your name and review details.');
      return;
    }
    const rev = {
      id: Date.now(),
      rating: Math.max(1, Math.min(5, Number(newReview.rating) || 5)),
      name: newReview.name.trim(),
      title: newReview.title.trim() || 'Great purchase!',
      comment: newReview.comment.trim(),
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      verified: true,
    };
    try {
      const raw = localStorage.getItem(`reviews_${selectedProductId}`);
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      const updated = [rev, ...list];
      localStorage.setItem(`reviews_${selectedProductId}`, JSON.stringify(updated));
      setUserReviews(updated);
    } catch (err) {
      console.error(err);
      setUserReviews((prev) => [rev, ...prev]);
    }
    setNewReview({ rating: 5, name: '', title: '', comment: '' });
    setShowWriteReview(false);
    setToastMessage('✓ Thank you for your review!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES LIST PREPARATION (Strictly from database)
  // ═══════════════════════════════════════════════════════════════════════════
  const displayCategories = useMemo(() => {
    const catList = Array.isArray(categories) ? categories : [];
    return catList.map((c) => {
      if (!c) return null;
      const slug = (c.slug || c.name || '').toLowerCase().trim();
      const thumb =
        CATEGORY_THUMBNAILS[slug] ||
        Object.entries(CATEGORY_THUMBNAILS).find(
          ([k, v]) =>
            v.name.toLowerCase() === (c.name || '').toLowerCase().trim() ||
            slug.includes(k)
        )?.[1];
      return {
        category_id: c.category_id,
        slug: c.slug || slug,
        name: c.name || 'Category',
        img: thumb?.img || null,
        icon: thumb?.icon || '📦',
      };
    }).filter(Boolean);
  }, [categories]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERING & SORTING
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? [...products] : [];

    if (!availabilityFilter.inStock && availabilityFilter.outOfStock) {
      list = list.filter((p) => p.is_active === 0);
    } else if (availabilityFilter.inStock && !availabilityFilter.outOfStock) {
      list = list.filter((p) => p.is_active !== 0);
    } else if (!availabilityFilter.inStock && !availabilityFilter.outOfStock) {
      list = [];
    }

    if (minPrice !== '') {
      const min = Number(minPrice);
      if (!isNaN(min)) list = list.filter((p) => Number(p.base_price) >= min);
    }
    if (maxPrice !== '') {
      const max = Number(maxPrice);
      if (!isNaN(max)) list = list.filter((p) => Number(p.base_price) <= max);
    }

    if (selectedColors.length > 0) {
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return selectedColors.some((c) => name.includes(c.toLowerCase()));
      });
    }

    if (selectedStorage.length > 0) {
      list = list.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return selectedStorage.some((s) => name.includes(s.toLowerCase()));
      });
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => Number(a.base_price) - Number(b.base_price));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => Number(b.base_price) - Number(a.base_price));
    } else if (sortBy === 'alpha-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'alpha-desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return list;
  }, [products, availabilityFilter, minPrice, maxPrice, selectedColors, selectedStorage, sortBy]);

  const currentCategoryName = useMemo(() => {
    if (!selectedCategory) return 'All Products';
    const catList = Array.isArray(categories) ? categories : [];
    const found = catList.find((c) => String(c?.category_id) === String(selectedCategory));
    return found ? found.name : 'Products';
  }, [selectedCategory, categories]);

  const productCountDisplay = `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER ACCORDIONS COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderFilterAccordions = () => (
    <>
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
            {[
              { label: 'Black', hex: '#1c1917' },
              { label: 'White', hex: '#f5f5f4' },
              { label: 'Blue', hex: '#3b82f6' },
              { label: 'Pink', hex: '#ec4899' },
              { label: 'Green', hex: '#10b981' },
            ].map(({ label, hex }) => {
              const isSel = selectedColors.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => {
                    setSelectedColors((prev) =>
                      isSel ? prev.filter((c) => c !== label) : [...prev, label]
                    );
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '9999px',
                    border: isSel ? '1.5px solid #1a1917' : '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: isSel ? '#1a1917' : '#ffffff',
                    color: isSel ? '#ffffff' : '#1c1917',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: hex === '#f5f5f4' ? '1px solid #d6d3d1' : 'none',
                    }}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage Accordion */}
      <div style={{ padding: '16px 0' }}>
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
          <span>Storage</span>
          <span style={{ fontSize: '0.75rem', transform: openAccordions.storage ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>
        {openAccordions.storage && (
          <div style={{ paddingTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['64GB', '128GB', '256GB', '512GB', '1TB'].map((cap) => {
              const isSel = selectedStorage.includes(cap);
              return (
                <button
                  key={cap}
                  onClick={() => {
                    setSelectedStorage((prev) =>
                      isSel ? prev.filter((s) => s !== cap) : [...prev, cap]
                    );
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: isSel ? '1.5px solid #1a1917' : '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: isSel ? '#1a1917' : '#ffffff',
                    color: isSel ? '#ffffff' : '#1c1917',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {cap}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL PRODUCT DETAIL PAGE VIEW (Matching Reference Screenshots 1-5)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderProductDetailPage = () => {
    if (detailLoading) {
      return (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#78716c' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>⏳</div>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading product details from database…</p>
        </div>
      );
    }

    if (detailError || !productDetail) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: '1rem', marginBottom: '16px' }}>Error: {detailError || 'Product not found'}</p>
          <button
            onClick={() => setSelectedProductId(null)}
            style={{ padding: '8px 18px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            ← Back to Products
          </button>
        </div>
      );
    }

    const gallery = getProductGallery(productDetail);
    const variants = Array.isArray(productDetail.variants) ? productDetail.variants : [];
    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId) || variants[0] || null;
    const currentPrice = selectedVariant && selectedVariant.price !== undefined && selectedVariant.price !== null
      ? Number(selectedVariant.price)
      : Number(productDetail.base_price) || 0;

    const installment = (currentPrice / 3).toFixed(2);
    const serviceFee = (currentPrice * 0.03).toFixed(2);
    const priceWithFee = (currentPrice * 1.03).toFixed(2);
    const deliveryRange = getDeliveryDateRange();

    // Live available stock directly from database
    const availableStock = selectedVariant && selectedVariant.stock !== undefined ? Number(selectedVariant.stock) : 0;
    const inStock = availableStock > 0 && productDetail.is_active !== 0;

    // Related products (from same category or catalog)
    const relatedProducts = (Array.isArray(products) ? products : [])
      .filter((p) => p && p.product_id !== productDetail.product_id)
      .slice(0, 4);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '1680px', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Floating Add to Cart Toast with Dynamic State-Based Colors */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '28px',
              right: '28px',
              zIndex: 9999,
              background: toastMessage.startsWith('⚠️')
                ? '#d97706'
                : toastMessage.startsWith('❌')
                  ? '#dc2626'
                  : toastMessage.startsWith('🔒')
                    ? '#1e293b'
                    : '#10b981',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.92rem',
              boxShadow: toastMessage.startsWith('⚠️')
                ? '0 10px 30px rgba(217, 119, 6, 0.4)'
                : toastMessage.startsWith('❌')
                  ? '0 10px 30px rgba(220, 38, 38, 0.4)'
                  : toastMessage.startsWith('🔒')
                    ? '0 10px 30px rgba(30, 41, 59, 0.4)'
                    : '0 10px 30px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── Breadcrumb & Navigation Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => setSelectedProductId(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: '9999px',
              padding: '8px 18px',
              fontSize: '0.86rem',
              fontWeight: 600,
              color: '#1a1917',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span>← Back to Products</span>
          </button>


        </div>

        {/* ── TOP SECTION: 2-COLUMN MAIN PRODUCT VIEW (Screenshots 1 & 2) ── */}
        <div className="product-top-grid">
          {/* LEFT: GALLERY & PROMO BADGES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {/* Vertical Thumbnail Strip */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '520px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                  scrollbarWidth: 'none',
                }}
              >
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '10px',
                      border: activePhotoIndex === idx ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.12)',
                      background: '#ffffff',
                      padding: '3px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      boxShadow: activePhotoIndex === idx ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                    }}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>

              {/* Large Main Photo */}
              <div
                style={{
                  flex: 1,
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  minHeight: '420px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                }}
              >
                <img
                  src={gallery[activePhotoIndex] || getProductPhoto(productDetail)}
                  alt={productDetail.name}
                  style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', transition: 'transform 0.3s ease' }}
                />
                <button
                  title="Expand"
                  onClick={() => window.open(gallery[activePhotoIndex] || getProductPhoto(productDetail), '_blank')}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.12)',
                    borderRadius: '8px',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#57534e',
                  }}
                >
                  ⛶
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: DETAILS, PRICING, VARIANTS, ACTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title */}
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#1a1917',
                lineHeight: 1.2,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {productDetail.name}
            </h1>

            {/* Price Display */}
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a1917' }}>
                {formatRs(currentPrice)}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '4px' }}>
                Product Price: <strong>Rs {priceWithFee}</strong> with Service Fee (Rs {serviceFee})
              </div>

              <div style={{ fontSize: '0.8rem', color: '#a8a29e', marginTop: '3px' }}>
                Shipping calculated at checkout.
              </div>
            </div>

            {/* Ratings Row (Real reviews only) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {userReviews.length > 0 ? (
                <>
                  <span style={{ color: '#f59e0b', fontSize: '0.95rem', letterSpacing: '2px' }}>
                    {safeStarCount(userReviews)}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1917' }}>
                    {safeAverageRating(userReviews)}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#78716c' }}>
                    ({userReviews.length} {userReviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#cbd5e1', fontSize: '0.95rem', letterSpacing: '2px' }}>
                    ☆☆☆☆☆
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#78716c' }}>
                    No reviews yet
                  </span>
                </>
              )}
            </div>

            {/* Short Description Accordion */}
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                background: '#ffffff',
              }}
            >
              <button
                onClick={() => setShortDescOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#1a1917',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>Description</span>
                <span style={{ fontSize: '0.75rem', transform: shortDescOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>
              {shortDescOpen && (
                <div style={{ paddingTop: '12px', fontSize: '0.88rem', color: '#44403c', lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>
                    {productDetail.description || 'No description provided for this product.'}
                  </p>
                </div>
              )}
            </div>

            {/* Variant Selector (Database-driven with Real-Time In-Stock Deduction) */}
            {variants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1a1917' }}>
                  {variants[0]?.attribute_name || 'Option'}:{' '}
                  <span style={{ fontWeight: 400, color: '#57534e' }}>
                    {selectedVariant?.attribute_value || 'Default'} {selectedVariant?.sku ? `(SKU: ${selectedVariant.sku})` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {variants.map((v, i) => {
                    const isSelected = v.variant_id === selectedVariantId;
                    const vStock = Number(v.stock) || 0;
                    return (
                      <button
                        key={v.variant_id}
                        onClick={() => {
                          setSelectedVariantId(v.variant_id);
                          setActivePhotoIndex(i % gallery.length);
                          setQuantity(1);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 14px',
                          borderRadius: '9999px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.14)',
                          background: isSelected ? 'rgba(37,99,235,0.05)' : '#ffffff',
                          color: '#1a1917',
                          fontSize: '0.84rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor:
                              (v.attribute_value || '').toLowerCase().includes('black') ? '#1c1917'
                                : (v.attribute_value || '').toLowerCase().includes('blue') ? '#3b82f6'
                                  : (v.attribute_value || '').toLowerCase().includes('pink') ? '#ec4899'
                                    : (v.attribute_value || '').toLowerCase().includes('green') ? '#10b981'
                                      : '#94a3b8',
                          }}
                        />
                        <span>{v.attribute_value || v.sku}</span>
                        <span style={{ fontSize: '0.74rem', color: vStock > 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                          {vStock > 0 ? `(${vStock} in stock)` : '(Out of stock)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Add to Cart Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '10px',
                    background: '#ffffff',
                    height: '46px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || availableStock <= 0}
                    style={{
                      width: '38px',
                      height: '100%',
                      background: 'none',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: (quantity <= 1 || availableStock <= 0) ? 'not-allowed' : 'pointer',
                      color: (quantity <= 1 || availableStock <= 0) ? '#cbd5e1' : '#44403c',
                      fontWeight: 600,
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '0.92rem', fontWeight: 700, color: '#1c1917' }}>
                    {availableStock <= 0 ? 0 : Math.min(quantity, availableStock)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity((q) => Math.min(availableStock, q + 1));
                    }}
                    disabled={availableStock <= 0 || quantity >= availableStock}
                    style={{
                      width: '38px',
                      height: '100%',
                      background: 'none',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: (availableStock <= 0 || quantity >= availableStock) ? 'not-allowed' : 'pointer',
                      color: (availableStock <= 0 || quantity >= availableStock) ? '#cbd5e1' : '#44403c',
                      fontWeight: 600,
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: inStock ? '#3b5bcf' : '#a8a29e',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: !inStock ? 'not-allowed' : 'pointer',
                    boxShadow: inStock ? '0 4px 14px rgba(59,91,207,0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {inStock ? 'Add to cart' : 'Out of Stock'}
                </button>
              </div>

              {inCartQuantity > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-2px' }}>
                  <span>🛒</span>
                  <span>
                    You currently have <strong>{inCartQuantity}</strong> in your cart.
                  </span>
                </div>
              )}
            </div>


            {/* Estimated Standard Delivery Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <span>🚚</span>
              <span>Estimated Standard Delivery By <strong>{deliveryRange}</strong></span>
            </div>

          </div>
        </div>

        {/* ── MANAGER OPERATIONS CONSOLE (When user has role 2 or 3) - Full Width Section ── */}
        {isManager && (
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px dashed rgba(37,99,235,0.4)',
              borderRadius: '20px',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              width: '100%',
              boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(37,99,235,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>⚙️</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e40af', margin: 0 }}>
                    Manager Inventory Controls
                  </h3>
                  <span style={{ fontSize: '0.86rem', color: '#64748b' }}>
                    Live variant stock management &amp; instant adjustments
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => openEditProduct(productDetail)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    background: '#ffffff',
                    color: '#1a1917',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <span>✎</span> Edit Product
                </button>
                <button
                  onClick={openCreateVariant}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1e40af',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(30,64,175,0.25)',
                  }}
                >
                  <span>+</span> Add Variant
                </button>
              </div>
            </div>

            {/* Stock table */}
            <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '8px 16px' }}>
              <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1.5px solid rgba(0,0,0,0.08)', color: '#475569' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>SKU</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>Attribute</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>Live Stock</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>Adjust ±5</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.variant_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                          {v.sku}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#334155' }}>
                        {v.attribute_value || 'Standard'}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, fontSize: '1rem', color: (v.stock || 0) > 0 ? '#059669' : '#dc2626' }}>
                        {v.stock || 0} units
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: -5 }).then(refreshDetail)}
                            title="Decrease stock by 5"
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.92rem',
                            }}
                          >
                            −5
                          </button>
                          <button
                            onClick={() => api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: 5 }).then(refreshDetail)}
                            title="Increase stock by 5"
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(16,185,129,0.3)',
                              background: '#ecfdf5',
                              color: '#059669',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.92rem',
                            }}
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditVariant(v)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,0,0,0.12)',
                              background: '#ffffff',
                              color: '#1a1917',
                              cursor: 'pointer',
                              fontSize: '0.86rem',
                              fontWeight: 600,
                            }}
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => deleteVariant(v)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.25)',
                              background: '#ffffff',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '0.86rem',
                              fontWeight: 600,
                            }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SECTION 3: PRODUCT DETAILS / SPECIFICATIONS (Direct from Database) ── */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)', padding: '28px', marginTop: '12px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1917', margin: '0 0 16px 0' }}>
            Product details
          </h2>

          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '24px', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('description')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'description' ? '2px solid #1a1917' : '2px solid transparent',
                padding: '0 0 10px 0',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: activeTab === 'description' ? '#1a1917' : '#78716c',
                cursor: 'pointer',
              }}
            >
              Overview &amp; Specifications
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '0.9rem', color: '#44403c', lineHeight: 1.7 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1917', margin: '0 0 6px 0' }}>
                Description
              </h3>
              <p style={{ margin: 0 }}>
                {productDetail.description || 'No description provided for this product in the catalog.'}
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1917', margin: '10px 0 10px 0' }}>
                Specifications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Category</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{productDetail.category_name || 'General'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Base Price</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{formatRs(productDetail.base_price)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Status</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: productDetail.is_active ? '#059669' : '#dc2626', marginTop: '2px' }}>
                    {productDetail.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Available Variants</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{variants.length} variant{variants.length === 1 ? '' : 's'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: CUSTOMER REVIEWS ── */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.08)', padding: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1917', margin: '0 0 20px 0', textAlign: 'center' }}>
            Customer Reviews
          </h2>

          {/* Rating Summary Header & Write Review Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px',
              paddingBottom: '24px',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div>
              <div style={{ color: userReviews.length > 0 ? '#f59e0b' : '#cbd5e1', fontSize: '1.2rem', letterSpacing: '3px' }}>
                {safeStarCount(userReviews)}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1917', marginTop: '4px' }}>
                {userReviews.length > 0 ? `${safeAverageRating(userReviews)} out of 5` : 'No reviews yet'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#78716c' }}>
                {userReviews.length > 0 ? `Based on ${userReviews.length} ${userReviews.length === 1 ? 'review' : 'reviews'}` : 'Be the first to review this product'}
              </div>
            </div>

            <button
              onClick={() => setShowWriteReview((v) => !v)}
              style={{
                padding: '10px 24px',
                borderRadius: '9999px',
                border: 'none',
                background: '#3b5bcf',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59,91,207,0.3)',
              }}
            >
              {showWriteReview ? 'Close Form' : 'Write a review'}
            </button>
          </div>

          {/* Write a review interactive form */}
          {showWriteReview && (
            <form
              onSubmit={handleAddReview}
              style={{
                background: '#f8fafc',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                padding: '20px',
                margin: '20px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1a1917' }}>Write a Customer Review</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Field label="Your Name *">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dineth T."
                    value={newReview.name}
                    onChange={(e) => setNewReview((r) => ({ ...r, name: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.86rem' }}
                  />
                </Field>
                <Field label="Rating">
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview((r) => ({ ...r, rating: Number(e.target.value) }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.86rem', background: '#fff' }}
                  >
                    <option value={5}>★★★★★ 5 Stars</option>
                    <option value={4}>★★★★☆ 4 Stars</option>
                    <option value={3}>★★★☆☆ 3 Stars</option>
                    <option value={2}>★★☆☆☆ 2 Stars</option>
                    <option value={1}>★☆☆☆☆ 1 Star</option>
                  </select>
                </Field>
              </div>

              <Field label="Review Title">
                <input
                  type="text"
                  placeholder="e.g. Excellent sound quality & fast shipping!"
                  value={newReview.title}
                  onChange={(e) => setNewReview((r) => ({ ...r, title: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.86rem' }}
                />
              </Field>

              <Field label="Review Comments *">
                <textarea
                  required
                  rows={3}
                  placeholder="Share details of your experience with this item..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview((r) => ({ ...r, comment: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.86rem', fontFamily: 'inherit' }}
                />
              </Field>

              <button
                type="submit"
                style={{
                  alignSelf: 'flex-end',
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: '#1a1917',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Submit Review
              </button>
            </form>
          )}

          {/* Customer Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {userReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#78716c' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem' }}>No reviews yet for this product.</p>
                <button
                  type="button"
                  onClick={() => setShowWriteReview(true)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: '#fff',
                    color: '#1c1917',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Write the first review
                </button>
              </div>
            ) : (
              userReviews.map((rev) => (
                <div key={rev.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '16px' }}>
                  <div style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '4px' }}>
                    {safeStars(rev.rating)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, color: '#1a1917' }}>
                    <span>{rev.name}</span>
                    <span style={{ fontSize: '0.74rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px' }}>Verified</span>
                    <span style={{ fontSize: '0.78rem', color: '#a8a29e', fontWeight: 400, marginLeft: 'auto' }}>{rev.date}</span>
                  </div>
                  {rev.title && (
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1c1917', marginTop: '6px' }}>{rev.title}</div>
                  )}
                  <p style={{ fontSize: '0.86rem', color: '#44403c', margin: '4px 0 0 0', lineHeight: 1.5 }}>{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── SECTION 5: FREQUENTLY ASKED QUESTIONS (Screenshot 5) ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            borderRadius: '20px',
            padding: '32px',
            color: '#ffffff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '28px',
            alignItems: 'flex-start',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
              Find quick answers regarding delivery timelines, warranty support, and order processing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                q: 'How long does it take for the delivery and what are the charges?',
                a: 'Standard islandwide delivery takes 2 to 4 business days. Colombo 1–12 express delivery is delivered within 24 hours. Delivery fee is calculated at checkout based on location.',
              },
              {
                q: 'What is the return and refund policy?',
                a: 'We provide a 7-day hassle-free exchange or return guarantee on all unopened original packaged items. In the rare case of manufacturer defects, full warranty replacement applies.',
              },
              {
                q: 'What is the warranty period for electronics?',
                a: 'All our products come with a minimum 1-Year Official Hardware Warranty and 6-Month Battery/Accessory warranty backed directly by authorized service centers.',
              },
            ].map((item, idx) => {
              const isOpen = faqOpen[idx];
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                >
                  <button
                    onClick={() => setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ fontSize: '0.75rem', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '8px' }}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ paddingTop: '10px', fontSize: '0.84rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 6: YOU MAY ALSO LIKE ── */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1917', margin: '0 0 4px 0' }}>
              You may also like
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#78716c', margin: '0 0 20px 0' }}>
              Combine your style with these products
            </p>

            <div className="catalog-product-grid">
              {relatedProducts.map((p) => {
                const photo = getProductPhoto(p);
                const price = Number(p.base_price) || 0;
                return (
                  <div
                    key={p.product_id}
                    onClick={() => {
                      setSelectedProductId(p.product_id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '18px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', marginBottom: '12px' }}>
                      <img src={photo} alt={p.name} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1917', margin: '0 0 6px 0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.name}
                    </h3>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1a1917', marginTop: 'auto' }}>
                      {formatRs(price)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RETURN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="catalog-fluid-container">
      <style>{`
        .catalog-fluid-container {
          width: 100%;
          box-sizing: border-box;
          color: #1c1917;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        .catalog-fluid-container select,
        .catalog-fluid-container input,
        .catalog-fluid-container button,
        .catalog-fluid-container textarea {
          font-family: inherit;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .catalog-layout-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 36px;
          align-items: flex-start;
          width: 100%;
        }
        .product-top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
          align-items: flex-start;
        }
        .catalog-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
          width: 100%;
        }
        @media (max-width: 960px) {
          .catalog-layout-grid {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .catalog-sidebar-desktop {
            display: none;
          }
          .product-top-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .mobile-filters-drawer {
            display: flex;
            flex-direction: column;
            padding: 16px 18px;
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid rgba(0,0,0,0.1);
            box-shadow: 0 4px 18px rgba(0,0,0,0.06);
            margin-bottom: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .mobile-filters-btn {
            display: inline-flex !important;
          }
        }
        .mobile-filters-btn {
          display: none;
        }
        @media (max-width: 640px) {
          .catalog-product-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .catalog-page-title {
            font-size: 1.85rem !important;
            margin-bottom: 12px !important;
          }
        }
        @media (max-width: 360px) {
          .catalog-product-grid {
            grid-template-columns: 1fr;
          }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── CONDITIONAL RENDER: PRODUCT DETAILS PAGE vs CATALOG BROWSE GRID ── */}
      {selectedProductId ? (
        renderProductDetailPage()
      ) : (
        <>
          {/* ── TOP HEADING: "All Products" ── */}
          <div style={{ marginBottom: '20px', width: '100%' }}>
            <h1
              className="catalog-page-title"
              style={{
                fontSize: '2.6rem',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                margin: '0 0 16px 0',
                color: '#1a1917',
                lineHeight: 1.1,
              }}
            >
              {currentCategoryName}
            </h1>

            {/* ── CATEGORY PILLS BAR ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%',
              }}
            >
              {/* "All" category pill */}
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: (selectedCategory === '' && searchQuery === '') ? '#1a1917' : '#ffffff',
                  color: (selectedCategory === '' && searchQuery === '') ? '#ffffff' : '#1c1917',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '9999px',
                  padding: '7px 16px 7px 12px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: (selectedCategory === '' && searchQuery === '') ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '8px',
                    background: (selectedCategory === '' && searchQuery === '') ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  🏷️
                </span>
                <span>All Categories</span>
              </button>

              {/* Dynamic / Metadata Category Pills */}
              {displayCategories.map((cat) => {
                const isSelected = cat.category_id
                  ? String(selectedCategory) === String(cat.category_id)
                  : searchQuery.toLowerCase() === cat.name.toLowerCase();

                return (
                  <button
                    key={cat.slug || cat.category_id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategory('');
                        setSearchQuery('');
                      } else if (cat.category_id) {
                        setSelectedCategory(cat.category_id);
                        setSearchQuery('');
                      } else {
                        setSelectedCategory('');
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
                      padding: '7px 16px 7px 10px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
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
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'block';
                            }
                          }}
                        />
                      ) : null}
                      <span style={{ display: cat.img ? 'none' : 'block', fontSize: '0.9rem' }}>{cat.icon || '📦'}</span>
                    </div>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TWO-COLUMN MAIN LAYOUT ── */}
          <div className="catalog-layout-grid">
            {/* ── LEFT COLUMN: DESKTOP FILTER ACCORDIONS ── */}
            <div className="catalog-sidebar-desktop">
              {renderFilterAccordions()}
            </div>

            {/* ── RIGHT COLUMN: PRODUCTS TOOLBAR & GRID ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
              {/* Top toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  width: '100%',
                }}
              >
                {/* Search Input & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flex: '1 1 auto', minWidth: '220px' }}>
                  <div style={{ position: 'relative', width: '210px', maxWidth: '220px' }}>
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
                        boxSizing: 'border-box',
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

                  {/* Mobile Filters Toggle Button */}
                  <button
                    className="mobile-filters-btn"
                    type="button"
                    onClick={() => setMobileFiltersOpen((v) => !v)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(0,0,0,0.14)',
                      background: mobileFiltersOpen ? '#1a1917' : '#ffffff',
                      color: mobileFiltersOpen ? '#ffffff' : '#1a1917',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>⚙️ Filters</span>
                    <span style={{ fontSize: '0.7rem' }}>{mobileFiltersOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Manager Buttons if authorized */}
                  {isManager && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        onClick={openCreateCategory}
                        title="Add New Category"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(0,0,0,0.14)',
                          background: '#ffffff',
                          color: '#1c1917',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        + Category
                      </button>
                      {categories.length > 0 && (
                        <button
                          onClick={() => openEditCategory()}
                          title="Edit or Delete Categories"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(0,0,0,0.14)',
                            background: '#ffffff',
                            color: '#1c1917',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          ✎ Edit Category
                        </button>
                      )}
                      <button
                        onClick={openCreateProduct}
                        title="Add Product"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '9999px',
                          border: 'none',
                          background: '#1a1917',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        + Product
                      </button>
                      <button
                        onClick={() => { setShowLowStock((v) => !v); if (!showLowStock) fetchLowStock(threshold); }}
                        title="Low Stock Alerts"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '9999px',
                          border: '1px solid #f59e0b',
                          background: showLowStock ? '#f59e0b' : 'rgba(245,158,11,0.08)',
                          color: showLowStock ? '#ffffff' : '#b45309',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚠ Low Stock
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Sort Dropdown & Products Count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: '9999px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#1c1917',
                        cursor: 'pointer',
                        padding: '0 32px 0 16px',
                        height: '38px',
                        lineHeight: '38px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'inline-block',
                        verticalAlign: 'middle',
                      }}
                    >
                      <option value="best-selling">Best selling</option>
                      <option value="price-low">Price: low to high</option>
                      <option value="price-high">Price: high to low</option>
                      <option value="alpha-asc">Alphabetically: A-Z</option>
                      <option value="alpha-desc">Alphabetically: Z-A</option>
                    </select>
                    <span
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        fontSize: '0.65rem',
                        color: '#78716c',
                        lineHeight: 1,
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  <span style={{ fontSize: '0.9rem', color: '#78716c', fontWeight: 500, whiteSpace: 'nowrap', paddingLeft: '4px' }}>
                    {productCountDisplay}
                  </span>
                </div>
              </div>

              {/* ── Mobile Filters Expandable Drawer ── */}
              {mobileFiltersOpen && (
                <div className="mobile-filters-drawer">
                  {renderFilterAccordions()}
                </div>
              )}

              {/* Low Stock Drawer if open */}
              {showLowStock && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid rgba(245,158,11,0.35)',
                    borderRadius: '18px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>Low Stock Variants Alert</h4>
                      <span style={{ fontSize: '0.9rem', color: '#78716c' }}>Variants with inventory count below threshold</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#78716c' }}>Threshold:</span>
                      <input
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        style={{ width: '70px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.5)', textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, background: '#fff' }}
                      />
                      <button
                        onClick={() => fetchLowStock(threshold)}
                        style={{ padding: '7px 18px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {lowStockLoading && <p style={{ fontSize: '0.92rem', color: '#78716c', margin: 0 }}>Loading inventory…</p>}
                  {lowStockError && <p style={{ fontSize: '0.92rem', color: '#dc2626', margin: 0, fontWeight: 600 }}>Error: {lowStockError}</p>}
                  {!lowStockLoading && !lowStockError && lowStock.length === 0 && (
                    <p style={{ fontSize: '0.92rem', color: '#059669', margin: 0, fontWeight: 600 }}>✓ All product variants have healthy stock levels above threshold.</p>
                  )}
                  {!lowStockLoading && lowStock.length > 0 && (
                    <div style={{ maxHeight: '240px', overflowY: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', padding: '6px 14px' }}>
                      <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1.5px solid rgba(0,0,0,0.08)', color: '#475569' }}>
                            <th style={{ padding: '10px 8px', fontWeight: 700, fontSize: '0.92rem' }}>Product</th>
                            <th style={{ padding: '10px 8px', fontWeight: 700, fontSize: '0.92rem' }}>SKU</th>
                            <th style={{ padding: '10px 8px', fontWeight: 700, fontSize: '0.92rem' }}>Attribute</th>
                            <th style={{ padding: '10px 8px', fontWeight: 700, fontSize: '0.92rem' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStock.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 700, color: '#1a1917', fontSize: '0.95rem' }}>{row.product_name}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                                  {row.sku}
                                </code>
                              </td>
                              <td style={{ padding: '10px 8px', color: '#334155', fontSize: '0.92rem' }}>
                                {row.attribute_name ? `${row.attribute_name}: ${row.attribute_value}` : 'Standard'}
                              </td>
                              <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '1rem', color: row.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                                {row.stock === 0 ? '0 (Out of stock)' : `${row.stock} units`}
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

              {/* ── 4-COLUMN PRODUCTS GRID ── */}
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
                  <div className="catalog-product-grid">
                    {filteredProducts.map((p) => {
                      const photoUrl = getProductPhoto(p);
                      const basePrice = Number(p.base_price) || 0;
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
                          {/* Top Status Badge (Real DB Status Only) */}
                          {p.is_active === 0 && (
                            <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
                              <span style={{ background: 'rgba(239,68,68,0.14)', color: '#b91c1c', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '9999px' }}>
                                INACTIVE
                              </span>
                            </div>
                          )}

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

                          {/* Category Subtitle */}
                          {p.category_name && (
                            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                              {p.category_name}
                            </div>
                          )}

                          {/* Title */}
                          <h3
                            style={{
                              fontSize: '0.94rem',
                              fontWeight: 700,
                              color: '#1a1917',
                              lineHeight: 1.35,
                              margin: '0 0 8px 0',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: '2.6em',
                            }}
                          >
                            {p.name}
                          </h3>

                          {/* Price */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1c1917' }}>
                              {formatRs(basePrice)}
                            </span>
                          </div>

                          {/* Stock Status Indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, marginTop: 'auto' }}>
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
        </>
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
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '620px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
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
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.98rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Description">
              <textarea
                placeholder="Product specifications & details"
                value={productForm.description}
                rows={4}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.98rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Base Price (Rs) *">
              <input
                type="number"
                placeholder="4999.00"
                value={productForm.base_price}
                onChange={(e) => setProductForm((f) => ({ ...f, base_price: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.98rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Category *">
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.98rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">Select Category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {editProduct && (
              <Field label="Status">
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[{ label: 'Active', val: 1 }, { label: 'Inactive', val: 0 }].map(({ label, val }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProductForm((f) => ({ ...f, is_active: val }))}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: productForm.is_active === val ? '2px solid #0f172a' : '1px solid rgba(0,0,0,0.16)',
                        background: productForm.is_active === val ? '#0f172a' : '#fff',
                        color: productForm.is_active === val ? '#fff' : '#0f172a',
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {productFormError && <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>{productFormError}</p>}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                style={{ padding: '10px 22px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.15)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProduct}
                disabled={productFormSaving}
                style={{ padding: '10px 26px', borderRadius: '9999px', border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(15,23,42,0.25)' }}
              >
                {productFormSaving ? 'Saving…' : (editProduct ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE / EDIT VARIANT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showVariantForm && (
        <div
          onClick={() => setShowVariantForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '30px 34px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {editVariant ? 'Edit Variant' : 'Add Variant'}
              </h3>
              <button
                onClick={() => setShowVariantForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
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
                style={{ width: '100%', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Attribute Name">
                <input
                  type="text"
                  placeholder="e.g. Color"
                  value={variantForm.attribute_name}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_name: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </Field>
              <Field label="Attribute Value">
                <input
                  type="text"
                  placeholder="e.g. Black"
                  value={variantForm.attribute_value}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_value: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </Field>
            </div>

            <Field label="Price Override (optional)">
              <input
                type="number"
                placeholder="Leave blank for base price"
                value={variantForm.price_override}
                onChange={(e) => setVariantForm((f) => ({ ...f, price_override: e.target.value }))}
                style={{ width: '100%', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            {variantFormError && <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>{variantFormError}</p>}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowVariantForm(false)}
                style={{ padding: '10px 22px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.15)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVariant}
                disabled={variantFormSaving}
                style={{ padding: '10px 26px', borderRadius: '9999px', border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(15,23,42,0.25)' }}
              >
                {variantFormSaving ? 'Saving…' : (editVariant ? 'Save Changes' : 'Add Variant')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE / EDIT CATEGORY MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showCatForm && (
        <div
          onClick={() => setShowCatForm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '30px 34px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {editCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setShowCatForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Select category dropdown when in edit mode */}
            {editCategory && (
              <Field label="Select Category to Edit">
                <select
                  value={editCategory.category_id}
                  onChange={(e) => {
                    const sel = categories.find((c) => String(c.category_id) === String(e.target.value));
                    if (sel) {
                      setEditCategory(sel);
                      setCatForm({ name: sel.name, slug: sel.slug || '' });
                      setCatFormError(null);
                    }
                  }}
                  style={{ width: '100%', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', background: '#fff' }}
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Category Name *">
              <input
                type="text"
                placeholder="e.g. Wireless Audio"
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Slug * (URL-safe)">
              <input
                type="text"
                placeholder="e.g. wireless-audio"
                value={catForm.slug}
                onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                style={{ width: '100%', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.16)', fontSize: '0.96rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            {catFormError && (
              <div style={{ background: '#fef2f2', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>{catFormError}</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
              {editCategory ? (
                <button
                  type="button"
                  onClick={deleteCategory}
                  disabled={catFormDeleting || catFormSaving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: (catFormDeleting || catFormSaving) ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {catFormDeleting ? 'Deleting…' : '🗑 Delete Category'}
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  style={{ padding: '10px 22px', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.15)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCategory}
                  disabled={catFormSaving || catFormDeleting}
                  style={{ padding: '10px 26px', borderRadius: '9999px', border: 'none', background: '#0f172a', color: '#fff', cursor: (catFormSaving || catFormDeleting) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(15,23,42,0.25)' }}
                >
                  {catFormSaving ? 'Saving…' : editCategory ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
