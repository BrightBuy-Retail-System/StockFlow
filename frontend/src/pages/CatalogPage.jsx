import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

// ─── category metadata & thumbnail images ────────────────────────────────────
const CATEGORY_THUMBNAILS = {
  'smartphones-tablets': {
    name: 'Smartphones & Tablets',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=90&auto=format&fit=crop&q=80',
    icon: '📱',
  },
  'laptops-computers': {
    name: 'Laptops & Computers',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=90&auto=format&fit=crop&q=80',
    icon: '💻',
  },
  'smart-audio-headphones': {
    name: 'Smart Audio & Headphones',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=90&auto=format&fit=crop&q=80',
    icon: '🎧',
  },
  'wearables-smartwatches': {
    name: 'Wearables & Smartwatches',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=90&auto=format&fit=crop&q=80',
    icon: '⌚',
  },
  'gaming-consoles-gear': {
    name: 'Gaming Consoles & Gear',
    img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=90&auto=format&fit=crop&q=80',
    icon: '🎮',
  },
  'cameras-drones': {
    name: 'Cameras & Drones',
    img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=90&auto=format&fit=crop&q=80',
    icon: '📷',
  },
  'smart-home-iot': {
    name: 'Smart Home & IoT',
    img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=90&auto=format&fit=crop&q=80',
    icon: '🏠',
  },
  'electronic-toys-stem': {
    name: 'Electronic Toys & STEM',
    img: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=90&auto=format&fit=crop&q=80',
    icon: '🤖',
  },
  'power-banks-chargers': {
    name: 'Power Banks & Chargers',
    img: 'https://images.unsplash.com/photo-1609592424364-16cf9b71ee3f?w=90&auto=format&fit=crop&q=80',
    icon: '🔋',
  },
  'accessories': {
    name: 'Computer Accessories',
    img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=90&auto=format&fit=crop&q=80',
    icon: '⌨️',
  },
  'storage-networking': {
    name: 'Storage & Networking',
    img: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=90&auto=format&fit=crop&q=80',
    icon: '💾',
  },
  'car-electronics': {
    name: 'Car Electronics & Mounts',
    img: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=90&auto=format&fit=crop&q=80',
    icon: '🚗',
  },
};

// ─── product image & gallery resolvers ─────────────────────────────────────────
const DEFAULT_PRODUCT_IMG = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80';

function getProductPhoto(product) {
  return product?.image_url || DEFAULT_PRODUCT_IMG;
}

function getProductGallery(product) {
  const photo = getProductPhoto(product);
  return [
    photo,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&auto=format&fit=crop&q=80',
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
  const [addingToCart, setAddingToCart] = useState(false);
  const [cardAdding, setCardAdding] = useState({});
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
      const currentUid = currentUser?.id || currentUser?.user_id;
      const userCartKey = currentUid ? `cart_${currentUid}` : 'cart';
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
  }, [productDetail, currentUser?.id, currentUser?.user_id, cartVersion]);

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

  // Sync authenticated user cart from backend on mount so in-cart badges are 100% accurate
  useEffect(() => {
    if (isLoggedIn) {
      api.get('/auth_cart/cart')
        .then((res) => {
          const items = res.data?.items || [];
          const currentUid = currentUser?.id || currentUser?.user_id;
          const formatted = items.map((it) => ({
            product_id: it.product_id,
            name: it.product_name || it.name,
            variant_id: it.variant_id,
            sku: it.sku,
            quantity: it.quantity,
            price: it.unit_price,
          }));
          if (currentUid) {
            localStorage.setItem(`cart_${currentUid}`, JSON.stringify(formatted));
          }
          setCartVersion((v) => v + 1);
        })
        .catch(() => null);
    }
  }, [isLoggedIn, currentUser?.id, currentUser?.user_id]);

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

  const adjustStock = (variantId, customVal = null) => {
    const raw = customVal !== null ? String(customVal) : stockInputs[variantId];
    if (raw === undefined || raw === null || !String(raw).trim()) return;

    const trimmed = String(raw).trim();
    let payload = {};

    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      const delta = parseInt(trimmed, 10);
      if (isNaN(delta) || delta === 0) return;
      payload = { adjust: delta };
    } else {
      const exact = parseInt(trimmed, 10);
      if (isNaN(exact) || exact < 0) {
        alert('Please enter a valid non-negative number');
        return;
      }
      payload = { stock_quantity: exact };
    }

    setStockSaving((s) => ({ ...s, [variantId]: true }));
    api.patch(`/catalog/inventory/${variantId}`, payload)
      .then(() => {
        setStockInputs((s) => ({ ...s, [variantId]: '' }));
        refreshDetail();
        refreshProducts();
      })
      .catch((err) => alert(`Failed to update stock: ${err.response?.data?.error || err.message}`))
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
    if (addingToCart) return;

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

    setAddingToCart(true);

    try {
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

      const photo = getProductPhoto(productDetail);
      const cartItem = {
        product_id: productDetail.product_id,
        name: productDetail.name || productDetail.title,
        product_name: productDetail.name || productDetail.title,
        variant_id: selectedVariant?.variant_id || null,
        sku: selectedVariant?.sku || 'STD',
        attribute_name: selectedVariant?.attribute_name || null,
        attribute_value: selectedVariant?.attribute_value || 'Default',
        price: itemPrice,
        unit_price: itemPrice,
        quantity: qtyToAdd,
        available_stock: availableStock - qtyToAdd,
        image: photo,
        image_url: photo,
      };

      const currentUid = currentUser?.id || currentUser?.user_id;
      const userCartKey = currentUid ? `cart_${currentUid}` : 'cart';
      const raw = localStorage.getItem(userCartKey) || localStorage.getItem('cart');
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      const matchIndex = list.findIndex(
        (i) => i.product_id === cartItem.product_id && (cartItem.variant_id ? i.variant_id === cartItem.variant_id : true)
      );

      if (matchIndex > -1) {
        list[matchIndex].quantity = (Number(list[matchIndex].quantity) || 0) + qtyToAdd;
      } else {
        list.push(cartItem);
      }
      localStorage.setItem(userCartKey, JSON.stringify(list));
      if (!isLoggedIn) {
        localStorage.setItem('cart', JSON.stringify(list));
      } else {
        localStorage.removeItem('cart');
      }
      window.dispatchEvent(new Event('cartUpdated'));
      setCartVersion((v) => v + 1);
      setQuantity(1);

      // 2. Persist reservation to database catalog (only if authenticated user)
      if (isLoggedIn) {
        try {
          if (selectedVariant?.variant_id) {
            await api.post('/catalog/cart/reserve', {
              variant_id: selectedVariant.variant_id,
              quantity: qtyToAdd,
            });
            // 3. Save item to database cart (carts + cart_items tables)
            await api.post('/catalog/cart/add', {
              variant_id: selectedVariant.variant_id,
              quantity: qtyToAdd,
            });
          }
          refreshDetail(true);
          refreshProducts();
        } catch (err) {
          console.warn('Backend cart note:', err);
        }
      }

      setToastMessage(`✓ Added ${qtyToAdd}x ${productDetail.name || productDetail.title} to cart!`);
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddProductToCart = async (p, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!p || p.is_active === 0) return;
    if (cardAdding[p.product_id]) return;

    setCardAdding((prev) => ({ ...prev, [p.product_id]: true }));

    try {
      const photo = getProductPhoto(p);
      const itemPrice = Number(p.base_price) || 0;
      const currentUid = currentUser?.id || currentUser?.user_id;
      const userCartKey = currentUid ? `cart_${currentUid}` : 'cart';
      const raw = localStorage.getItem(userCartKey) || localStorage.getItem('cart');
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      const matchIndex = list.findIndex((i) => i.product_id === p.product_id);

      let resolvedVariantId = null;

      if (matchIndex > -1) {
        list[matchIndex].quantity = (Number(list[matchIndex].quantity) || 0) + 1;
        resolvedVariantId = list[matchIndex].variant_id || null;
      } else {
        const cartItem = {
          product_id: p.product_id,
          name: p.name || p.title,
          product_name: p.name || p.title,
          variant_id: null,
          sku: `SKU-${p.product_id}`,
          attribute_name: null,
          attribute_value: 'Default',
          price: itemPrice,
          unit_price: itemPrice,
          quantity: 1,
          available_stock: 99,
          image: photo,
          image_url: photo,
        };
        list.push(cartItem);
      }

      localStorage.setItem(userCartKey, JSON.stringify(list));
      if (!isLoggedIn) {
        localStorage.setItem('cart', JSON.stringify(list));
      } else {
        localStorage.removeItem('cart');
      }

      window.dispatchEvent(new Event('cartUpdated'));
      setCartVersion((v) => v + 1);

      // If user is authenticated, sync with backend database cart
      if (isLoggedIn) {
        try {
          const res = await api.post('/auth_cart/cart/add', {
            product_id: p.product_id,
            quantity: 1,
          });
          if (res.data?.variant_id) {
            resolvedVariantId = res.data.variant_id;
            const updatedList = list.map((item) =>
              item.product_id === p.product_id && !item.variant_id
                ? { ...item, variant_id: resolvedVariantId }
                : item
            );
            localStorage.setItem(userCartKey, JSON.stringify(updatedList));
            // Reserve stock
            await api.post('/catalog/cart/reserve', {
              variant_id: resolvedVariantId,
              quantity: 1,
            }).catch(() => null);
          }
          refreshProducts();
        } catch (err) {
          console.warn('Backend cart add note:', err);
        }
      }

      setToastMessage(`✓ Added 1x ${p.name || p.title} to cart!`);
      setTimeout(() => setToastMessage(null), 3200);
    } catch (err) {
      console.error('Error adding to cart:', err);
      setToastMessage('❌ Could not add item to cart. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setCardAdding((prev) => ({ ...prev, [p.product_id]: false }));
    }
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
      <div style={{ borderBottom: '1px solid #ede6dc', padding: '12px 0' }}>
        <button
          type="button"
          className="catalog-accordion-btn"
          onClick={() => toggleAccordion('availability')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            fontSize: '0.94rem',
            fontWeight: 700,
            color: '#3b2f2f',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          <span>Availability</span>
          <span style={{ fontSize: '0.72rem', color: '#2a9d8f', transform: openAccordions.availability ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▲
          </span>
        </button>
        {openAccordions.availability && (
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                color: availabilityFilter.inStock ? '#2a9d8f' : '#3b2f2f',
                cursor: 'pointer',
                fontWeight: availabilityFilter.inStock ? 700 : 500,
                padding: '3px 0',
              }}
            >
              <input
                type="checkbox"
                checked={availabilityFilter.inStock}
                onChange={(e) => setAvailabilityFilter((p) => ({ ...p, inStock: e.target.checked }))}
                style={{ accentColor: '#2a9d8f', width: '17px', height: '17px', cursor: 'pointer' }}
              />
              <span>In stock</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                color: availabilityFilter.outOfStock ? '#2a9d8f' : '#3b2f2f',
                cursor: 'pointer',
                fontWeight: availabilityFilter.outOfStock ? 700 : 500,
                padding: '3px 0',
              }}
            >
              <input
                type="checkbox"
                checked={availabilityFilter.outOfStock}
                onChange={(e) => setAvailabilityFilter((p) => ({ ...p, outOfStock: e.target.checked }))}
                style={{ accentColor: '#2a9d8f', width: '17px', height: '17px', cursor: 'pointer' }}
              />
              <span>Out of stock</span>
            </label>
          </div>
        )}
      </div>

      {/* Price Accordion */}
      <div style={{ borderBottom: '1px solid #ede6dc', padding: '12px 0' }}>
        <button
          type="button"
          className="catalog-accordion-btn"
          onClick={() => toggleAccordion('price')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            fontSize: '0.94rem',
            fontWeight: 700,
            color: '#3b2f2f',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          <span>Price</span>
          <span style={{ fontSize: '0.72rem', color: '#2a9d8f', transform: openAccordions.price ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▲
          </span>
        </button>
        {openAccordions.price && (
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  border: '1px solid #e7d7c1',
                  borderRadius: '2px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  color: '#3b2f2f',
                }}
              />
              <span style={{ color: '#826e6e' }}>–</span>
              <input
                type="number"
                placeholder="Rs Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#ffffff',
                  border: '1px solid #e7d7c1',
                  borderRadius: '2px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  color: '#3b2f2f',
                }}
              />
            </div>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2a9d8f',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '2px 0',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Reset price
              </button>
            )}
          </div>
        )}
      </div>

      {/* Color Accordion */}
      <div style={{ borderBottom: '1px solid #ede6dc', padding: '12px 0' }}>
        <button
          type="button"
          className="catalog-accordion-btn"
          onClick={() => toggleAccordion('color')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            fontSize: '0.94rem',
            fontWeight: 700,
            color: '#3b2f2f',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          <span>Color</span>
          <span style={{ fontSize: '0.72rem', color: '#2a9d8f', transform: openAccordions.color ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▲
          </span>
        </button>
        {openAccordions.color && (
          <div style={{ paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                  type="button"
                  className={`catalog-option-pill ${isSel ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedColors((prev) =>
                      isSel ? prev.filter((c) => c !== label) : [...prev, label]
                    );
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '2px',
                    border: isSel ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                    backgroundColor: isSel ? '#2a9d8f' : '#ffffff',
                    color: isSel ? '#ffffff' : '#3b2f2f',
                    boxShadow: isSel ? '0 2px 8px rgba(42, 157, 143, 0.25)' : 'none',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: isSel ? 700 : 500,
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: isSel ? '1.5px solid #ffffff' : (hex === '#f5f5f4' ? '1px solid #d6d3d1' : 'none'),
                    }}
                  />
                  <span>{label}</span>
                  {isSel && <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage Accordion */}
      <div style={{ padding: '12px 0' }}>
        <button
          type="button"
          className="catalog-accordion-btn"
          onClick={() => toggleAccordion('storage')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            fontSize: '0.94rem',
            fontWeight: 700,
            color: '#3b2f2f',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          <span>Storage</span>
          <span style={{ fontSize: '0.72rem', color: '#2a9d8f', transform: openAccordions.storage ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▲
          </span>
        </button>
        {openAccordions.storage && (
          <div style={{ paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['64GB', '128GB', '256GB', '512GB', '1TB'].map((cap) => {
              const isSel = selectedStorage.includes(cap);
              return (
                <button
                  key={cap}
                  type="button"
                  className={`catalog-option-pill ${isSel ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedStorage((prev) =>
                      isSel ? prev.filter((s) => s !== cap) : [...prev, cap]
                    );
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '2px',
                    border: isSel ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                    backgroundColor: isSel ? '#2a9d8f' : '#ffffff',
                    color: isSel ? '#ffffff' : '#3b2f2f',
                    boxShadow: isSel ? '0 2px 8px rgba(42, 157, 143, 0.25)' : 'none',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: isSel ? 700 : 500,
                  }}
                >
                  <span>{cap}</span>
                  {isSel && <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>✓</span>}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', maxWidth: '1280px', margin: '0 auto', animation: 'fadeInUp 0.3s ease' }}>
          {/* Top Breadcrumb & Loading Indicator Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '12px 18px', background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <button
              onClick={() => setSelectedProductId(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '9999px',
                padding: '8px 16px',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <span>←</span>
              <span>Back to Products</span>
            </button>

            {/* Dynamic Animated Motion Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b5bcf 0%, #6366f1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  animation: 'pulseRing 1.8s infinite',
                }}
              >
                <div style={{ animation: 'spinSlow 2.5s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ⚡
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                  Loading product details
                  <span style={{ animation: 'dotBounce 1.4s infinite ease-in-out', display: 'inline-block', marginLeft: '3px' }}>.</span>
                  <span style={{ animation: 'dotBounce 1.4s infinite ease-in-out 0.2s', display: 'inline-block' }}>.</span>
                  <span style={{ animation: 'dotBounce 1.4s infinite ease-in-out 0.4s', display: 'inline-block' }}>.</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Syncing live inventory &amp; product variants
                </span>
              </div>
            </div>
          </div>

          {/* Shimmer Skeleton Cards Layout */}
          <div className="product-top-grid" style={{ width: '100%' }}>
            {/* Left Column Skeleton (Gallery) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                className="skeleton-shimmer"
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '24px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                    animation: 'floatOrb 3s ease-in-out infinite',
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>📦</span>
                </div>
              </div>

              {/* Thumbnail skeletons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="skeleton-shimmer"
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '14px',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right Column Skeleton (Details & Actions) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid rgba(0,0,0,0.06)' }}>
              {/* Category pill skeleton */}
              <div className="skeleton-shimmer" style={{ width: '110px', height: '24px', borderRadius: '9999px' }} />

              {/* Title skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton-shimmer" style={{ width: '85%', height: '34px', borderRadius: '8px' }} />
                <div className="skeleton-shimmer" style={{ width: '50%', height: '24px', borderRadius: '6px' }} />
              </div>

              {/* Price skeleton */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '6px' }}>
                <div className="skeleton-shimmer" style={{ width: '160px', height: '42px', borderRadius: '10px' }} />
                <div className="skeleton-shimmer" style={{ width: '90px', height: '20px', borderRadius: '6px' }} />
              </div>

              {/* Installment banner skeleton */}
              <div className="skeleton-shimmer" style={{ width: '100%', height: '54px', borderRadius: '14px' }} />

              {/* Variant options skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div className="skeleton-shimmer" style={{ width: '140px', height: '18px', borderRadius: '6px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="skeleton-shimmer" style={{ width: '90px', height: '38px', borderRadius: '9999px' }} />
                  <div className="skeleton-shimmer" style={{ width: '90px', height: '38px', borderRadius: '9999px' }} />
                  <div className="skeleton-shimmer" style={{ width: '90px', height: '38px', borderRadius: '9999px' }} />
                </div>
              </div>

              {/* Button skeleton */}
              <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
                <div className="skeleton-shimmer" style={{ width: '120px', height: '48px', borderRadius: '10px' }} />
                <div className="skeleton-shimmer" style={{ flex: 1, height: '48px', borderRadius: '9999px' }} />
              </div>
            </div>
          </div>
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
            <div className="product-gallery-layout">
              {/* Thumbnail Strip */}
              <div className="product-thumbnails-strip">
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
              <div className="product-main-photo-card">
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
            <h1 className="product-detail-title">
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
                          borderRadius: '2px',
                          border: isSelected ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                          background: isSelected ? 'rgba(42, 157, 143, 0.12)' : '#ffffff',
                          color: '#3b2f2f',
                          fontSize: '0.84rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: 'none',
                        }}
                      >
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            backgroundColor:
                              (v.attribute_value || '').toLowerCase().includes('black') ? '#1c1917'
                                : (v.attribute_value || '').toLowerCase().includes('blue') ? '#3b82f6'
                                  : (v.attribute_value || '').toLowerCase().includes('pink') ? '#ec4899'
                                    : (v.attribute_value || '').toLowerCase().includes('green') ? '#10b981'
                                      : '#94a3b8',
                          }}
                        />
                        <span>{v.attribute_value || v.sku}</span>
                        <span style={{ fontSize: '0.74rem', color: vStock > 0 ? '#2a9d8f' : '#dc2626', fontWeight: 600 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid #e7d7c1',
                    borderRadius: '2px',
                    padding: '4px 8px',
                    background: '#ffffff',
                    height: '46px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={addingToCart || quantity <= 1}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '2px',
                      background: 'none',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: (addingToCart || quantity <= 1) ? 'not-allowed' : 'pointer',
                      color: (addingToCart || quantity <= 1) ? '#e7d7c1' : '#3b2f2f',
                      fontWeight: 600,
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      minWidth: '32px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#3b2f2f',
                    }}
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={addingToCart || availableStock <= 0 || quantity >= availableStock}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '2px',
                      background: 'none',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: (addingToCart || availableStock <= 0 || quantity >= availableStock) ? 'not-allowed' : 'pointer',
                      color: (addingToCart || availableStock <= 0 || quantity >= availableStock) ? '#e7d7c1' : '#3b2f2f',
                      fontWeight: 600,
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddToCart}
                  disabled={addingToCart || !inStock}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '2px',
                    border: 'none',
                    background: inStock
                      ? (addingToCart ? '#22867a' : '#2a9d8f')
                      : '#826e6e',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: (addingToCart || !inStock) ? 'not-allowed' : 'pointer',
                    opacity: addingToCart ? 0.85 : 1,
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {addingToCart ? (
                    <>
                      <span>⏳</span>
                      <span>Adding to cart...</span>
                    </>
                  ) : inStock ? (
                    'Add to cart'
                  ) : (
                    'Out of Stock'
                  )}
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
                    <th style={{ padding: '12px 10px', fontWeight: 700, fontSize: '0.92rem' }}>Update / Adjust Stock</th>
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => adjustStock(v.variant_id, -5)}
                            disabled={stockSaving[v.variant_id]}
                            title="Decrease stock by 5"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: stockSaving[v.variant_id] ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                            }}
                          >
                            −5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStock(v.variant_id, 5)}
                            disabled={stockSaving[v.variant_id]}
                            title="Increase stock by 5"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(16,185,129,0.3)',
                              background: '#ecfdf5',
                              color: '#059669',
                              cursor: stockSaving[v.variant_id] ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                            }}
                          >
                            +5
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="Set Quantity"
                              value={stockInputs[v.variant_id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStockInputs((s) => ({ ...s, [v.variant_id]: val }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  adjustStock(v.variant_id);
                                }
                              }}
                              disabled={stockSaving[v.variant_id]}
                              style={{
                                width: '120px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid rgba(0,0,0,0.18)',
                                fontSize: '0.86rem',
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => adjustStock(v.variant_id)}
                              disabled={stockSaving[v.variant_id] || !stockInputs[v.variant_id]}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: stockSaving[v.variant_id] || !stockInputs[v.variant_id] ? '#cbd5e1' : '#3b5bcf',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                cursor: stockSaving[v.variant_id] || !stockInputs[v.variant_id] ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              {stockSaving[v.variant_id] ? '...' : 'Set'}
                            </button>
                          </div>
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
                const isInStock = p.is_active !== 0;
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
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1a1917', marginTop: 'auto', marginBottom: '10px' }}>
                      {formatRs(price)}
                    </div>
                    <button
                      type="button"
                      disabled={!isInStock || cardAdding[p.product_id]}
                      onClick={(e) => handleAddProductToCart(p, e)}
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '9px',
                        border: 'none',
                        background: isInStock
                          ? (cardAdding[p.product_id] ? '#1d4ed8' : '#2563eb')
                          : '#f1f5f9',
                        color: isInStock ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: isInStock && !cardAdding[p.product_id] ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.18s ease',
                        boxShadow: isInStock ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (isInStock && !cardAdding[p.product_id]) {
                          e.currentTarget.style.background = '#1d4ed8';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(37,99,235,0.3)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isInStock && !cardAdding[p.product_id]) {
                          e.currentTarget.style.background = '#2563eb';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(37,99,235,0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {cardAdding[p.product_id] ? (
                        <span>Adding...</span>
                      ) : isInStock ? (
                        <>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                          <span>Add to cart</span>
                        </>
                      ) : (
                        <span>Out of stock</span>
                      )}
                    </button>
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
        .product-gallery-layout {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          width: 100%;
        }
        .product-thumbnails-strip {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: none;
        }
        .product-main-photo-card {
          flex: 1;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.08);
          padding: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 420px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.02);
        }
        .product-detail-title {
          font-size: 2rem;
          font-weight: 800;
          color: #1a1917;
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.02em;
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
          .product-gallery-layout {
            flex-direction: column-reverse;
            gap: 12px;
          }
          .product-thumbnails-strip {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: visible;
            max-height: none;
            width: 100%;
            padding-bottom: 6px;
            -webkit-overflow-scrolling: touch;
          }
          .product-main-photo-card {
            padding: 16px;
            min-height: 260px;
            border-radius: 16px;
          }
          .product-detail-title {
            font-size: 1.45rem;
          }
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 40%, #f1f5f9 65%);
          background-size: 300% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 91, 207, 0.45); }
          70% { transform: scale(1); box-shadow: 0 0 0 12px rgba(59, 91, 207, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 91, 207, 0); }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>

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
                fontWeight: 800,
                letterSpacing: '-0.025em',
                margin: '0 0 16px 0',
                color: '#3b2f2f',
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
                type="button"
                className={`catalog-category-pill ${(selectedCategory === '' && searchQuery === '') ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: (selectedCategory === '' && searchQuery === '') ? '#2a9d8f' : '#ffffff',
                  color: (selectedCategory === '' && searchQuery === '') ? '#ffffff' : '#3b2f2f',
                  border: (selectedCategory === '' && searchQuery === '') ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                  borderRadius: '2px',
                  padding: '8px 16px 8px 12px',
                  fontSize: '0.86rem',
                  fontWeight: (selectedCategory === '' && searchQuery === '') ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: (selectedCategory === '' && searchQuery === '') ? '0 3px 10px rgba(42, 157, 143, 0.3)' : '0 1px 3px rgba(59, 47, 47, 0.04)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '2px',
                    background: (selectedCategory === '' && searchQuery === '') ? 'rgba(255, 255, 255, 0.22)' : '#f6f3ee',
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
                    type="button"
                    className={`catalog-category-pill ${isSelected ? 'active' : ''}`}
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
                      backgroundColor: isSelected ? '#2a9d8f' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#3b2f2f',
                      border: isSelected ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                      borderRadius: '2px',
                      padding: '8px 16px 8px 10px',
                      fontSize: '0.86rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 3px 10px rgba(42, 157, 143, 0.3)' : '0 1px 3px rgba(59, 47, 47, 0.04)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        background: isSelected ? 'rgba(255, 255, 255, 0.22)' : '#f6f3ee',
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
                        borderRadius: '2px',
                        background: '#ffffff',
                        border: '1px solid #e7d7c1',
                        fontSize: '0.86rem',
                        color: '#3b2f2f',
                        outline: 'none',
                        boxShadow: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#826e6e',
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
                      borderRadius: '2px',
                      border: mobileFiltersOpen ? '1.5px solid #2a9d8f' : '1px solid #e7d7c1',
                      background: mobileFiltersOpen ? 'rgba(42, 157, 143, 0.12)' : '#ffffff',
                      color: mobileFiltersOpen ? '#2a9d8f' : '#3b2f2f',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                    }}
                  >
                    <span>⚙️ Filters</span>
                    <span style={{ fontSize: '0.7rem' }}>{mobileFiltersOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Manager Buttons if authorized */}
                  {isManager && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={openCreateCategory}
                        title="Add New Category"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '2px',
                          border: '1px solid #e7d7c1',
                          background: '#ffffff',
                          color: '#3b2f2f',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                          boxShadow: 'none',
                        }}
                      >
                        + Category
                      </button>
                      {categories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openEditCategory()}
                          title="Edit or Delete Categories"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '2px',
                            border: '1px solid #e7d7c1',
                            background: '#ffffff',
                            color: '#3b2f2f',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            whiteSpace: 'nowrap',
                            boxShadow: 'none',
                          }}
                        >
                          ✎ Edit Category
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={openCreateProduct}
                        title="Add Product"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '2px',
                          border: 'none',
                          background: '#2a9d8f',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                          boxShadow: 'none',
                        }}
                      >
                        + Product
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowLowStock((v) => !v); if (!showLowStock) fetchLowStock(threshold); }}
                        title="Low Stock Alerts"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '2px',
                          border: '1px solid #c08457',
                          background: showLowStock ? '#c08457' : 'rgba(192, 132, 87, 0.1)',
                          color: showLowStock ? '#ffffff' : '#c08457',
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
                        border: '1px solid #e7d7c1',
                        borderRadius: '2px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#3b2f2f',
                        cursor: 'pointer',
                        padding: '0 32px 0 16px',
                        height: '38px',
                        lineHeight: '38px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        boxShadow: 'none',
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
                        color: '#826e6e',
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

              {/* ── Active Filters Summary Bar ── */}
              {(availabilityFilter.inStock || availabilityFilter.outOfStock || minPrice || maxPrice || selectedColors.length > 0 || selectedStorage.length > 0 || (selectedCategory && selectedCategory !== '')) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #e7d7c1',
                    borderRadius: '2px',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b2f2f' }}>Active Filters:</span>
                  {selectedCategory && (
                    <span
                      onClick={() => setSelectedCategory('')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {currentCategoryName} <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  )}
                  {availabilityFilter.inStock && (
                    <span
                      onClick={() => setAvailabilityFilter((p) => ({ ...p, inStock: false }))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      In stock <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  )}
                  {availabilityFilter.outOfStock && (
                    <span
                      onClick={() => setAvailabilityFilter((p) => ({ ...p, outOfStock: false }))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Out of stock <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span
                      onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Price: {minPrice ? `Rs ${minPrice}` : '0'} – {maxPrice ? `Rs ${maxPrice}` : '∞'} <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  )}
                  {selectedColors.map((color) => (
                    <span
                      key={color}
                      onClick={() => setSelectedColors((prev) => prev.filter((c) => c !== color))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Color: {color} <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  ))}
                  {selectedStorage.map((cap) => (
                    <span
                      key={cap}
                      onClick={() => setSelectedStorage((prev) => prev.filter((s) => s !== cap))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#e6f6f4', color: '#2a9d8f', border: '1px solid #2a9d8f', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Storage: {cap} <span style={{ fontWeight: 800 }}>×</span>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('');
                      setSearchQuery('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSelectedColors([]);
                      setSelectedStorage([]);
                      setAvailabilityFilter({ inStock: false, outOfStock: false });
                    }}
                    style={{ background: 'none', border: 'none', color: '#c08457', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: '2px 6px', textDecoration: 'underline', marginLeft: 'auto' }}
                  >
                    Clear all
                  </button>
                </div>
              )}

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
                    background: '#faf7f2',
                    border: '1px solid #e7d7c1',
                    borderRadius: '2px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>Low Stock Variants Alert</h4>
                      <span style={{ fontSize: '0.86rem', color: '#6b7280' }}>Variants with inventory count below threshold</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 500, color: '#6b7280' }}>Threshold:</span>
                      <input
                        type="number"
                        min="1"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        style={{ width: '70px', padding: '6px 10px', borderRadius: '2px', border: '1px solid #e7d7c1', textAlign: 'center', fontSize: '0.9rem', fontWeight: 500, background: '#fff' }}
                      />
                      <button
                        onClick={() => fetchLowStock(threshold)}
                        style={{ padding: '7px 18px', borderRadius: '2px', border: 'none', background: '#2a9d8f', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem', boxShadow: 'none' }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {lowStockLoading && <p style={{ fontSize: '0.92rem', color: '#6b7280', margin: 0 }}>Loading inventory…</p>}
                  {lowStockError && <p style={{ fontSize: '0.92rem', color: '#dc2626', margin: 0, fontWeight: 500 }}>Error: {lowStockError}</p>}
                  {!lowStockLoading && !lowStockError && lowStock.length === 0 && (
                    <p style={{ fontSize: '0.92rem', color: '#2a9d8f', margin: 0, fontWeight: 500 }}>✓ All product variants have healthy stock levels above threshold.</p>
                  )}
                  {!lowStockLoading && lowStock.length > 0 && (
                    <div style={{ maxHeight: '240px', overflowY: 'auto', background: '#ffffff', borderRadius: '2px', border: '1px solid #e7d7c1', padding: '6px 14px' }}>
                      <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e7d7c1', color: '#6b7280' }}>
                            <th style={{ padding: '10px 8px', fontWeight: 500, fontSize: '0.86rem' }}>Product</th>
                            <th style={{ padding: '10px 8px', fontWeight: 500, fontSize: '0.86rem' }}>SKU</th>
                            <th style={{ padding: '10px 8px', fontWeight: 500, fontSize: '0.86rem' }}>Attribute</th>
                            <th style={{ padding: '10px 8px', fontWeight: 500, fontSize: '0.86rem' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStock.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f4ede4' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 500, color: '#1f2937', fontSize: '0.9rem' }}>{row.product_name}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <code style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '2px', fontSize: '0.84rem', color: '#1f2937', fontWeight: 500, border: '1px solid #e7d7c1' }}>
                                  {row.sku}
                                </code>
                              </td>
                              <td style={{ padding: '10px 8px', color: '#4b5563', fontSize: '0.86rem' }}>
                                {row.attribute_name ? `${row.attribute_name}: ${row.attribute_value}` : 'Standard'}
                              </td>
                              <td style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.9rem', color: row.stock === 0 ? '#ef4444' : '#c08457' }}>
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
                            borderRadius: '2px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            border: '1px solid #e7d7c1',
                            boxShadow: '0 2px 8px rgba(59, 47, 47, 0.04)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = '#2a9d8f';
                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(59, 47, 47, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#e7d7c1';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 47, 47, 0.04)';
                          }}
                        >
                          {/* Top Status Badge (Real DB Status Only) */}
                          {p.is_active === 0 && (
                            <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
                              <span style={{ background: 'rgba(239,68,68,0.14)', color: '#b91c1c', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '2px' }}>
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
                              borderRadius: '2px',
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
                            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#c08457', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                              {p.category_name}
                            </div>
                          )}

                          {/* Title */}
                          <h3
                            style={{
                              fontSize: '0.94rem',
                              fontWeight: 700,
                              color: '#3b2f2f',
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
                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3b2f2f' }}>
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
                                backgroundColor: isInStock ? '#2a9d8f' : '#ef4444',
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ color: isInStock ? '#2a9d8f' : '#dc2626' }}>
                              {isInStock ? 'In stock' : 'Out of stock'}
                            </span>
                          </div>

                          {/* Direct Add to Cart Button */}
                          <button
                            type="button"
                            className="st-card-add-btn"
                            disabled={!isInStock || cardAdding[p.product_id]}
                            onClick={(e) => handleAddProductToCart(p, e)}
                            style={{
                              marginTop: '12px',
                              width: '100%',
                              height: '38px',
                              borderRadius: '2px',
                              border: 'none',
                              background: isInStock
                                ? (cardAdding[p.product_id] ? '#22867a' : '#2a9d8f')
                                : '#f6f3ee',
                              color: isInStock ? '#ffffff' : '#826e6e',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              cursor: isInStock && !cardAdding[p.product_id] ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '7px',
                              transition: 'all 0.18s ease',
                              boxShadow: 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (isInStock && !cardAdding[p.product_id]) {
                                e.currentTarget.style.background = '#22867a';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isInStock && !cardAdding[p.product_id]) {
                                e.currentTarget.style.background = '#2a9d8f';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {cardAdding[p.product_id] ? (
                              <span>Adding...</span>
                            ) : isInStock ? (
                              <>
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                  <line x1="3" y1="6" x2="21" y2="6" />
                                  <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                                <span>Add to cart</span>
                              </>
                            ) : (
                              <span>Out of stock</span>
                            )}
                          </button>

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
                                  borderRadius: '2px',
                                  border: '1px solid #e7d7c1',
                                  background: '#ffffff',
                                  color: '#1f2937',
                                  cursor: 'pointer',
                                  fontSize: '0.74rem',
                                  fontWeight: 500,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => softDeleteProduct(p, e)}
                                style={{
                                  flex: 1,
                                  padding: '5px',
                                  borderRadius: '2px',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: '0.74rem',
                                  fontWeight: 500,
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
              borderRadius: '2px',
              border: '1px solid #e7d7c1',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 10px 25px rgba(59, 47, 47, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Description">
              <textarea
                placeholder="Product specifications & details"
                value={productForm.description}
                rows={4}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Base Price (Rs) *">
              <input
                type="number"
                placeholder="4999.00"
                value={productForm.base_price}
                onChange={(e) => setProductForm((f) => ({ ...f, base_price: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Category *">
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
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
                        padding: '7px 16px',
                        borderRadius: '2px',
                        border: productForm.is_active === val ? '1px solid #2a9d8f' : '1px solid #e7d7c1',
                        background: productForm.is_active === val ? '#2a9d8f' : '#fff',
                        color: productForm.is_active === val ? '#fff' : '#1f2937',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {productFormError && <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>{productFormError}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                style={{ padding: '8px 18px', borderRadius: '2px', border: '1px solid #e7d7c1', background: '#fff', color: '#1f2937', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProduct}
                disabled={productFormSaving}
                style={{ padding: '8px 22px', borderRadius: '2px', border: 'none', background: '#2a9d8f', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem', boxShadow: 'none' }}
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
              borderRadius: '2px',
              border: '1px solid #e7d7c1',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 10px 25px rgba(59, 47, 47, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
                {editVariant ? 'Edit Variant' : 'Add Variant'}
              </h3>
              <button
                onClick={() => setShowVariantForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Attribute Name">
                <input
                  type="text"
                  placeholder="e.g. Color"
                  value={variantForm.attribute_name}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </Field>
              <Field label="Attribute Value">
                <input
                  type="text"
                  placeholder="e.g. Black"
                  value={variantForm.attribute_value}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_value: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </Field>
            </div>

            <Field label="Price Override (optional)">
              <input
                type="number"
                placeholder="Leave blank for base price"
                value={variantForm.price_override}
                onChange={(e) => setVariantForm((f) => ({ ...f, price_override: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            {variantFormError && <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>{variantFormError}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowVariantForm(false)}
                style={{ padding: '8px 18px', borderRadius: '2px', border: '1px solid #e7d7c1', background: '#fff', color: '#1f2937', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVariant}
                disabled={variantFormSaving}
                style={{ padding: '8px 22px', borderRadius: '2px', border: 'none', background: '#2a9d8f', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem', boxShadow: 'none' }}
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
              borderRadius: '2px',
              border: '1px solid #e7d7c1',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 10px 25px rgba(59, 47, 47, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1f2937' }}>
                {editCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setShowCatForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
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
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', background: '#fff' }}
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            <Field label="Slug * (URL-safe)">
              <input
                type="text"
                placeholder="e.g. wireless-audio"
                value={catForm.slug}
                onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '2px', border: '1px solid #e7d7c1', fontSize: '0.94rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </Field>

            {catFormError && (
              <div style={{ background: '#fef2f2', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '2px', padding: '10px 14px' }}>
                <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>{catFormError}</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
              {editCategory ? (
                <button
                  type="button"
                  onClick={deleteCategory}
                  disabled={catFormDeleting || catFormSaving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '2px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: (catFormDeleting || catFormSaving) ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                  }}
                >
                  {catFormDeleting ? 'Deleting…' : '🗑 Delete Category'}
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  style={{ padding: '8px 18px', borderRadius: '2px', border: '1px solid #e7d7c1', background: '#fff', color: '#1f2937', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCategory}
                  disabled={catFormSaving || catFormDeleting}
                  style={{ padding: '8px 22px', borderRadius: '2px', border: 'none', background: '#2a9d8f', color: '#fff', cursor: (catFormSaving || catFormDeleting) ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.88rem', boxShadow: 'none' }}
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
