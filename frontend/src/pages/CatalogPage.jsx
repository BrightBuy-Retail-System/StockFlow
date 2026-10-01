import { useEffect, useState } from 'react';
import api from '../api/client';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for single product detail (variants & stock)
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // State for low-stock alerts
  const [threshold, setThreshold] = useState(10);
  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState(null);
  const [showLowStock, setShowLowStock] = useState(false);

  // State for create/edit form
  const EMPTY_FORM = { title: '', description: '', base_price: '', category_id: '' };
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fetch low-stock variants
  const fetchLowStock = (t) => {
    setLowStockLoading(true);
    setLowStockError(null);
    api.get(`/catalog/inventory/low-stock?threshold=${t}`)
      .then((res) => setLowStock(res.data))
      .catch((err) => setLowStockError(err.message))
      .finally(() => setLowStockLoading(false));
  };

  // Re-fetch products grid after a mutation
  const refreshProducts = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category_id', selectedCategory);
    if (debouncedSearch) params.set('q', debouncedSearch);
    const qs = params.toString();
    api.get(`/catalog/products${qs ? '?' + qs : ''}`).then((res) => setProducts(res.data));
  };

  const openCreate = () => { setEditProduct(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true); };
  const openEdit = (p) => { setEditProduct(p); setForm({ title: p.name, description: p.description || '', base_price: p.base_price, category_id: p.category_id || '' }); setFormError(null); setShowForm(true); };

  const saveForm = () => {
    if (!form.title || !form.base_price || !form.category_id) { setFormError('Title, price and category are required.'); return; }
    setFormSaving(true);
    setFormError(null);
    const req = editProduct
      ? api.patch(`/catalog/products/${editProduct.product_id}`, form)
      : api.post('/catalog/products', form);
    req
      .then(() => { setShowForm(false); refreshProducts(); })
      .catch((err) => setFormError(err.response?.data?.error || err.message))
      .finally(() => setFormSaving(false));
  };

  const deleteProduct = (p) => {
    if (!window.confirm(`Soft-delete "${p.name}"? It will be hidden from the catalog.`)) return;
    api.delete(`/catalog/products/${p.product_id}`).then(refreshProducts);
  };

  // Fetch categories
  useEffect(() => {
    api.get('/catalog/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.message));
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch products (filtered by category and/or search)
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

  // Fetch product detail with variants and stock when a product is selected
  useEffect(() => {
    if (!selectedProductId) {
      setProductDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    api.get(`/catalog/products/${selectedProductId}`)
      .then((res) => setProductDetail(res.data))
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedProductId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-muted)' }}>Browse products, filter by category, and view variants &amp; inventory</p>
        </div>
        <button
          onClick={() => { setShowLowStock((v) => !v); if (!showLowStock) fetchLowStock(threshold); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '999px',
            border: '1.5px solid #f59e0b',
            background: showLowStock ? '#f59e0b' : 'rgba(245,158,11,0.08)',
            color: showLowStock ? '#fff' : '#f59e0b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.82rem',
            letterSpacing: '0.02em',
            transition: 'all 0.2s',
          }}
        >
          Low Stock Alerts
        </button>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px',
            borderRadius: '999px',
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.82rem',
            letterSpacing: '0.02em',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          + Add Product
        </button>
      </div>

      {/* Low Stock Panel */}
      {showLowStock && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(239,68,68,0.05) 100%)',
          border: '1.5px solid rgba(245,158,11,0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309', margin: 0 }}> Low Stock Alerts</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Variants at or below the threshold
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Threshold:</label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{
                  width: '64px',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(245,158,11,0.4)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={() => fetchLowStock(threshold)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                Apply
              </button>
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
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Attribute</th>
                    <th>Stock</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.product_name}</td>
                      <td><code>{row.sku}</code></td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {row.attribute_name ? `${row.attribute_name}: ${row.attribute_value}` : 'Standard'}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: row.stock === 0 ? 'var(--danger)' : '#f59e0b',
                        }}>
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

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '460px' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 36px 9px 16px',
            borderRadius: '999px',
            border: '1.5px solid rgba(128,128,128,0.2)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(128,128,128,0.2)'; e.target.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>×</button>
        )}
      </div>

      {/* Category Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          onClick={() => setSelectedCategory('')}
          style={{
            padding: '6px 16px',
            borderRadius: '999px',
            border: 'none',
            background: selectedCategory === '' ? 'var(--primary)' : 'rgba(128,128,128,0.1)',
            color: selectedCategory === '' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.82rem',
            transition: 'background 0.2s, color 0.2s',
            letterSpacing: '0.01em'
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => setSelectedCategory(cat.category_id)}
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              border: 'none',
              background: selectedCategory === cat.category_id ? 'var(--primary)' : 'rgba(128,128,128,0.1)',
              color: selectedCategory === cat.category_id ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              transition: 'background 0.2s, color 0.2s',
              letterSpacing: '0.01em'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <div className="card"><p>Loading products...</p></div>}
      {error && <div className="card"><p style={{ color: 'red' }}>Error: {error}</p></div>}

      {/* Products Grid */}
      {!loading && !error && (
        products.length === 0 ? (
          <div className="card"><p style={{ color: 'var(--text-muted)' }}>No products found.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {products.map((p) => (
              <div
                key={p.product_id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
                }}
              >
                {/* Image / Visual Area */}
                <div style={{
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
                  height: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '16px',
                }}>
                  {/* Brand initial badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#fff',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: 'var(--primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Product name initial as large graphic */}
                  <span style={{
                    fontSize: '6rem',
                    fontWeight: 900,
                    color: 'rgba(99,102,241,0.12)',
                    lineHeight: 1,
                    userSelect: 'none',
                    letterSpacing: '-4px',
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                  {/* Product Name */}
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{p.name}</h3>

                  {/* Description */}
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
                    {p.description || 'No description available'}
                  </p>

                  {/* Price + CTA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 2px 0', fontWeight: 500 }}>Price</p>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ${Number(p.base_price).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit product"
                        style={{ padding: '7px 10px', borderRadius: '10px', border: '1.5px solid rgba(99,102,241,0.3)', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >Edit</button>
                      <button
                        onClick={() => deleteProduct(p)}
                        title="Delete product"
                        style={{ padding: '7px 10px', borderRadius: '10px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >Del</button>
                      <button
                        onClick={() => setSelectedProductId(p.product_id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '999px',
                          border: 'none',
                          background: '#111827',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          letterSpacing: '0.02em',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                        onMouseLeave={e => e.currentTarget.style.background = '#111827'}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Product Detail Modal */}
      {selectedProductId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={() => setSelectedProductId(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '620px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              margin: 0,
              padding: '24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {productDetail ? productDetail.name : 'Loading Details...'}
                </h3>
                {productDetail && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Category: <strong>{productDetail.category_name}</strong> | Base Price: <strong>${Number(productDetail.base_price).toFixed(2)}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedProductId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {detailLoading && <p>Loading variants & inventory...</p>}
            {detailError && <p style={{ color: 'red' }}>Error: {detailError}</p>}

            {productDetail && !detailLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {productDetail.description || 'No description available'}
                </p>

                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>Variants & Live Stock</h4>
                  {productDetail.variants && productDetail.variants.length > 0 ? (
                    <div className="table-container">
                      <table className="enterprise-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Attribute</th>
                            <th>Price</th>
                            <th>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productDetail.variants.map((v) => (
                            <tr key={v.variant_id}>
                              <td><code>{v.sku}</code></td>
                              <td>{v.attribute_name ? `${v.attribute_name}: ${v.attribute_value}` : 'Standard'}</td>
                              <td><strong>${Number(v.price).toFixed(2)}</strong></td>
                              <td>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: v.stock > 0 ? 'var(--success)' : 'var(--danger)'
                                  }}
                                >
                                  {v.stock > 0 ? `${v.stock} in stock` : 'Out of stock'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No variants found for this product.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {editProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>

            {/* Fields */}
            {[
              { label: 'Title *', key: 'title', type: 'text', placeholder: 'Product title' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Short description' },
              { label: 'Base Price *', key: 'base_price', type: 'number', placeholder: '0.00' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid rgba(128,128,128,0.2)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {/* Category dropdown */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid rgba(128,128,128,0.2)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </div>

            {formError && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{formError}</p>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: '999px', border: '1.5px solid rgba(128,128,128,0.2)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Cancel</button>
              <button
                onClick={saveForm}
                disabled={formSaving}
                style={{ padding: '9px 20px', borderRadius: '999px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', opacity: formSaving ? 0.7 : 1 }}
              >
                {formSaving ? 'Saving...' : (editProduct ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
