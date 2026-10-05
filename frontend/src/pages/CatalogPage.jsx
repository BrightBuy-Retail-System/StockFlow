import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';

// ─── shared input style ───────────────────────────────────────────────────────
const INPUT = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1.5px solid rgba(128,128,128,0.2)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: '4px',
};

const BTN_GHOST = (color = 'rgba(128,128,128,0.2)') => ({
  padding: '9px 18px',
  borderRadius: '999px',
  border: `1.5px solid ${color}`,
  background: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.82rem',
});

const BTN_PRIMARY = {
  padding: '9px 20px',
  borderRadius: '999px',
  border: 'none',
  background: 'var(--primary)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.82rem',
};

const MODAL_BACKDROP = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.48)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

// ─── tiny reusable field row ──────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

// ─── stock badge ──────────────────────────────────────────────────────────────
function StockBadge({ stock }) {
  const color = stock === 0 ? 'var(--danger)' : stock <= 10 ? '#f59e0b' : 'var(--success)';
  return (
    <span style={{ fontWeight: 600, color }}>
      {stock === 0 ? 'Out of stock' : `${stock} in stock`}
    </span>
  );
}

// ─── active/inactive badge ────────────────────────────────────────────────────
function ActiveBadge({ isActive }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
      color: isActive ? 'var(--success)' : 'var(--danger)',
    }}>
      {isActive ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function CatalogPage() {
  // ── catalog state ──
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── product detail modal ──
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // ── low-stock panel ──
  const [threshold, setThreshold] = useState(10);
  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState(null);
  const [showLowStock, setShowLowStock] = useState(false);

  // ── create/edit product modal ──
  const EMPTY_PRODUCT = { title: '', description: '', base_price: '', category_id: '', is_active: 1 };
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productFormSaving, setProductFormSaving] = useState(false);
  const [productFormError, setProductFormError] = useState(null);

  // ── variant modal ──
  const EMPTY_VARIANT = { sku: '', attribute_name: '', attribute_value: '', price_override: '' };
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editVariant, setEditVariant] = useState(null); // null = create
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT);
  const [variantFormSaving, setVariantFormSaving] = useState(false);
  const [variantFormError, setVariantFormError] = useState(null);

  // ── stock adjustment (inline per row) ──
  // { [variant_id]: adjust_delta_string }
  const [stockInputs, setStockInputs] = useState({});
  const [stockSaving, setStockSaving] = useState({}); // { [variant_id]: bool }

  // ── category creation modal ──
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
    api.get(`/catalog/products${qs ? '?' + qs : ''}`).then((res) => setProducts(res.data));
  }, [selectedCategory, debouncedSearch]);

  const refreshDetail = useCallback(() => {
    if (!selectedProductId) return;
    setDetailLoading(true);
    setDetailError(null);
    api.get(`/catalog/products/${selectedProductId}`)
      .then((res) => { setProductDetail(res.data); setStockInputs({}); })
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

  // initial load
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // products grid
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

  // product detail
  useEffect(() => {
    if (!selectedProductId) { setProductDetail(null); return; }
    refreshDetail();
  }, [selectedProductId, refreshDetail]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openCreateProduct = () => {
    setEditProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setProductFormError(null);
    setShowProductForm(true);
  };

  const openEditProduct = (p) => {
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
      .then(() => { setShowProductForm(false); refreshProducts(); })
      .catch((err) => setProductFormError(err.response?.data?.error || err.message))
      .finally(() => setProductFormSaving(false));
  };

  const softDeleteProduct = (p) => {
    if (!window.confirm(`Soft-delete "${p.name}"? It will be hidden from the catalog.`)) return;
    api.delete(`/catalog/products/${p.product_id}`).then(refreshProducts);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT CRUD
  // ═══════════════════════════════════════════════════════════════════════════

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
    if (!variantForm.sku.trim()) { setVariantFormError('SKU is required.'); return; }
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
      .then(() => { setShowVariantForm(false); refreshDetail(); })
      .catch((err) => setVariantFormError(err.response?.data?.error || err.message))
      .finally(() => setVariantFormSaving(false));
  };

  const deleteVariant = (v) => {
    if (!window.confirm(`Delete variant "${v.sku}"? This cannot be undone.`)) return;
    api.delete(`/catalog/variants/${v.variant_id}`).then(refreshDetail);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY / STOCK ADJUSTMENT
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const saveCategory = () => {
    if (!catForm.name.trim() || !catForm.slug.trim()) {
      setCatFormError('Name and slug are required.');
      return;
    }
    setCatFormSaving(true);
    setCatFormError(null);
    api.post('/catalog/categories', catForm)
      .then(() => { setShowCatForm(false); setCatForm(EMPTY_CAT); fetchCategories(); })
      .catch((err) => setCatFormError(err.response?.data?.error || err.message))
      .finally(() => setCatFormSaving(false));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Browse products, filter by category, and manage variants &amp; inventory
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Low stock toggle */}
          <button
            onClick={() => { setShowLowStock((v) => !v); if (!showLowStock) fetchLowStock(threshold); }}
            style={{
              padding: '9px 18px', borderRadius: '999px',
              border: '1.5px solid #f59e0b',
              background: showLowStock ? '#f59e0b' : 'rgba(245,158,11,0.08)',
              color: showLowStock ? '#fff' : '#f59e0b',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              letterSpacing: '0.02em', transition: 'all 0.2s',
            }}
          >
            ⚠ Low Stock
          </button>
          {/* Add Category */}
          <button
            onClick={() => { setCatForm(EMPTY_CAT); setCatFormError(null); setShowCatForm(true); }}
            style={{
              padding: '9px 18px', borderRadius: '999px',
              border: '1.5px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.07)',
              color: 'var(--primary)', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.02em',
            }}
          >
            + Category
          </button>
          {/* Add Product */}
          <button
            onClick={openCreateProduct}
            style={{ ...BTN_PRIMARY, letterSpacing: '0.02em', transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* ── Low Stock Panel ─────────────────────────────────────────────────── */}
      {showLowStock && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(239,68,68,0.05) 100%)',
          border: '1.5px solid rgba(245,158,11,0.3)',
          borderRadius: '16px', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309', margin: 0 }}>Low Stock Alerts</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Variants at or below the threshold
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Threshold:</label>
              <input
                type="number" min="1" value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ width: '64px', padding: '5px 8px', borderRadius: '8px', border: '1.5px solid rgba(245,158,11,0.4)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}
              />
              <button
                onClick={() => fetchLowStock(threshold)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
              >Apply</button>
            </div>
          </div>
          {lowStockLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</p>}
          {lowStockError && <p style={{ color: 'red', fontSize: '0.85rem' }}>Error: {lowStockError}</p>}
          {!lowStockLoading && !lowStockError && lowStock.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>✓ All variants are above the threshold.</p>
          )}
          {!lowStockLoading && lowStock.length > 0 && (
            <div className="table-container">
              <table className="enterprise-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Attribute</th><th>Stock</th><th>Threshold</th></tr></thead>
                <tbody>
                  {lowStock.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.product_name}</td>
                      <td><code>{row.sku}</code></td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {row.attribute_name ? `${row.attribute_name}: ${row.attribute_value}` : 'Standard'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: row.stock === 0 ? 'var(--danger)' : '#f59e0b' }}>
                          {row.stock === 0 ? 'Out of stock' : row.stock}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{row.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', maxWidth: '460px' }}>
        <input
          type="text" placeholder="Search products…"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...INPUT, padding: '9px 36px 9px 16px', borderRadius: '999px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(128,128,128,0.2)'; e.target.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>×</button>
        )}
      </div>

      {/* ── Category Filters ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {[{ category_id: '', name: 'All' }, ...categories].map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => setSelectedCategory(cat.category_id)}
            style={{
              padding: '6px 16px', borderRadius: '999px', border: 'none',
              background: selectedCategory === cat.category_id ? 'var(--primary)' : 'rgba(128,128,128,0.1)',
              color: selectedCategory === cat.category_id ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
              transition: 'background 0.2s, color 0.2s', letterSpacing: '0.01em',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ── States ─────────────────────────────────────────────────────────── */}
      {loading && <div className="card"><p>Loading products…</p></div>}
      {error && <div className="card"><p style={{ color: 'red' }}>Error: {error}</p></div>}

      {/* ── Products Grid ──────────────────────────────────────────────────── */}
      {!loading && !error && (
        products.length === 0 ? (
          <div className="card"><p style={{ color: 'var(--text-muted)' }}>No products found.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {products.map((p) => (
              <div
                key={p.product_id}
                style={{
                  background: 'var(--bg-card)', borderRadius: '20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  opacity: p.is_active === 0 ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'; }}
              >
                {/* Visual area */}
                <div style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '16px' }}>
                  {/* Active/Inactive badge */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <ActiveBadge isActive={p.is_active !== 0} />
                  </div>
                  {/* Initial badge */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#fff', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '5.5rem', fontWeight: 900, color: 'rgba(99,102,241,0.1)', lineHeight: 1, userSelect: 'none', letterSpacing: '-4px' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{p.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
                    {p.description || 'No description available'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 2px 0', fontWeight: 500 }}>Price</p>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ${Number(p.base_price).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => openEditProduct(p)}
                        title="Edit product"
                        style={{ padding: '7px 10px', borderRadius: '10px', border: '1.5px solid rgba(99,102,241,0.3)', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >Edit</button>
                      <button
                        onClick={() => softDeleteProduct(p)}
                        title="Soft-delete product"
                        style={{ padding: '7px 10px', borderRadius: '10px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >Del</button>
                      <button
                        onClick={() => setSelectedProductId(p.product_id)}
                        style={{ padding: '8px 14px', borderRadius: '999px', border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.02em', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1f2937'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
                      >View</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCT DETAIL MODAL  (variants + stock adjustment)
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedProductId && (
        <div style={MODAL_BACKDROP} onClick={() => setSelectedProductId(null)}>
          <div
            className="card"
            style={{ maxWidth: '700px', width: '100%', maxHeight: '88vh', overflowY: 'auto', margin: 0, padding: '24px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {productDetail ? productDetail.name : 'Loading…'}
                </h3>
                {productDetail && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Category: <strong>{productDetail.category_name}</strong>
                    {' '}| Base Price: <strong>${Number(productDetail.base_price).toFixed(2)}</strong>
                    {' '}| <ActiveBadge isActive={productDetail.is_active !== 0} />
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProductId(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
              >&times;</button>
            </div>

            {detailLoading && <p style={{ color: 'var(--text-muted)' }}>Loading variants &amp; inventory…</p>}
            {detailError && <p style={{ color: 'red' }}>Error: {detailError}</p>}

            {productDetail && !detailLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Description */}
                {productDetail.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    {productDetail.description}
                  </p>
                )}

                {/* Variants section header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                    Variants &amp; Live Stock
                    <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      ({productDetail.variants?.length ?? 0} total)
                    </span>
                  </h4>
                  <button
                    onClick={openCreateVariant}
                    style={{ padding: '7px 16px', borderRadius: '999px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                  >+ Add Variant</button>
                </div>

                {/* Variants table */}
                {productDetail.variants && productDetail.variants.length > 0 ? (
                  <div className="table-container">
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Attribute</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th style={{ minWidth: '160px' }}>Adjust Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productDetail.variants.map((v) => (
                          <tr key={v.variant_id}>
                            <td><code>{v.sku}</code></td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {v.attribute_name ? `${v.attribute_name}: ${v.attribute_value}` : <span style={{ color: 'var(--text-muted)' }}>Standard</span>}
                            </td>
                            <td><strong>${Number(v.price).toFixed(2)}</strong></td>
                            <td><StockBadge stock={v.stock} /></td>

                            {/* Stock adjuster */}
                            <td>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {/* Quick –5 / +5 */}
                                <button
                                  title="−5"
                                  onClick={() => { api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: -5 }).then(refreshDetail); }}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                                >−5</button>
                                <input
                                  type="number"
                                  placeholder="±"
                                  value={stockInputs[v.variant_id] ?? ''}
                                  onChange={(e) => setStockInputs((s) => ({ ...s, [v.variant_id]: e.target.value }))}
                                  style={{ width: '52px', padding: '4px 6px', borderRadius: '7px', border: '1.5px solid rgba(128,128,128,0.2)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'center', outline: 'none' }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') adjustStock(v.variant_id); }}
                                />
                                <button
                                  title="+5"
                                  onClick={() => { api.patch(`/catalog/inventory/${v.variant_id}`, { adjust: 5 }).then(refreshDetail); }}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.07)', color: 'var(--success)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                                >+5</button>
                                <button
                                  onClick={() => adjustStock(v.variant_id)}
                                  disabled={stockSaving[v.variant_id]}
                                  title="Apply custom delta"
                                  style={{ padding: '4px 9px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', opacity: stockSaving[v.variant_id] ? 0.6 : 1 }}
                                >✓</button>
                              </div>
                            </td>

                            {/* Edit / Delete variant */}
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => openEditVariant(v)}
                                  style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid rgba(99,102,241,0.3)', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                                >Edit</button>
                                <button
                                  onClick={() => deleteVariant(v)}
                                  style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                                >Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '20px', borderRadius: '12px', border: '1.5px dashed rgba(128,128,128,0.2)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      No variants yet.{' '}
                      <button onClick={openCreateVariant} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                        Add the first variant →
                      </button>
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
        <div style={MODAL_BACKDROP} onClick={() => setShowProductForm(false)}>
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowProductForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>

            {[
              { label: 'Title *', key: 'title', type: 'text', placeholder: 'Product title' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Short description' },
              { label: 'Base Price *', key: 'base_price', type: 'number', placeholder: '0.00' },
            ].map(({ label, key, type, placeholder }) => (
              <Field key={key} label={label}>
                <input
                  type={type} placeholder={placeholder}
                  value={productForm[key]}
                  onChange={(e) => setProductForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={INPUT}
                />
              </Field>
            ))}

            <Field label="Category *">
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{ ...INPUT }}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {/* Active toggle (only shown in edit mode) */}
            {editProduct && (
              <Field label="Status">
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[{ label: 'Active', val: 1 }, { label: 'Inactive', val: 0 }].map(({ label, val }) => (
                    <button
                      key={val}
                      onClick={() => setProductForm((f) => ({ ...f, is_active: val }))}
                      style={{
                        padding: '7px 18px', borderRadius: '999px',
                        border: `1.5px solid ${val === 1 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)'}`,
                        background: productForm.is_active === val
                          ? (val === 1 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)')
                          : 'none',
                        color: val === 1 ? 'var(--success)' : 'var(--danger)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                        transition: 'background 0.15s',
                      }}
                    >{label}</button>
                  ))}
                </div>
              </Field>
            )}

            {productFormError && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{productFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowProductForm(false)} style={BTN_GHOST()}>Cancel</button>
              <button onClick={saveProduct} disabled={productFormSaving} style={{ ...BTN_PRIMARY, opacity: productFormSaving ? 0.7 : 1 }}>
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
        <div style={MODAL_BACKDROP} onClick={() => setShowVariantForm(false)}>
          <div
            className="card"
            style={{ maxWidth: '440px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {editVariant ? 'Edit Variant' : 'Add Variant'}
              </h3>
              <button onClick={() => setShowVariantForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>

            <Field label="SKU *">
              <input
                type="text" placeholder="e.g. PROD-RED-M"
                value={variantForm.sku}
                onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                style={INPUT}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="Attribute Name">
                <input
                  type="text" placeholder="e.g. Color"
                  value={variantForm.attribute_name}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_name: e.target.value }))}
                  style={INPUT}
                />
              </Field>
              <Field label="Attribute Value">
                <input
                  type="text" placeholder="e.g. Red"
                  value={variantForm.attribute_value}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attribute_value: e.target.value }))}
                  style={INPUT}
                />
              </Field>
            </div>

            <Field label="Price Override (optional — leave blank to use base price)">
              <input
                type="number" placeholder="0.00"
                value={variantForm.price_override}
                onChange={(e) => setVariantForm((f) => ({ ...f, price_override: e.target.value }))}
                style={INPUT}
              />
            </Field>

            {variantFormError && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{variantFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVariantForm(false)} style={BTN_GHOST()}>Cancel</button>
              <button onClick={saveVariant} disabled={variantFormSaving} style={{ ...BTN_PRIMARY, opacity: variantFormSaving ? 0.7 : 1 }}>
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
        <div style={MODAL_BACKDROP} onClick={() => setShowCatForm(false)}>
          <div
            className="card"
            style={{ maxWidth: '400px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>New Category</h3>
              <button onClick={() => setShowCatForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>

            <Field label="Name *">
              <input
                type="text" placeholder="e.g. Electronics"
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                style={INPUT}
              />
            </Field>
            <Field label="Slug * (URL-safe, lowercase)">
              <input
                type="text" placeholder="e.g. electronics"
                value={catForm.slug}
                onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                style={INPUT}
              />
            </Field>

            {catFormError && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{catFormError}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCatForm(false)} style={BTN_GHOST()}>Cancel</button>
              <button onClick={saveCategory} disabled={catFormSaving} style={{ ...BTN_PRIMARY, opacity: catFormSaving ? 0.7 : 1 }}>
                {catFormSaving ? 'Saving…' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
