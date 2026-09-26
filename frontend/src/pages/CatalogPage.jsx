import { useEffect, useState } from 'react';
import api from '../api/client';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories
  useEffect(() => {
    api.get('/catalog/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.message));
  }, []);

  // Fetch products (all or filtered by category)
  useEffect(() => {
    setLoading(true);
    const endpoint = selectedCategory
      ? `/catalog/products?category_id=${selectedCategory}`
      : '/catalog/products';

    api.get(endpoint)
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Product Catalog</h2>
        <p style={{ color: 'var(--text-muted)' }}>Browse products and filter by category</p>
      </div>

      {/* Category Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          onClick={() => setSelectedCategory('')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: selectedCategory === '' ? 'var(--primary)' : 'var(--bg-card)',
            color: selectedCategory === '' ? '#fff' : 'var(--text-main)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => setSelectedCategory(cat.category_id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: selectedCategory === cat.category_id ? 'var(--primary)' : 'var(--bg-card)',
              color: selectedCategory === cat.category_id ? '#fff' : 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem'
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {products.map((p) => (
              <div key={p.product_id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                    }}
                  >
                    {p.category_name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: p.is_active ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{p.name}</h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexGrow: 1 }}>
                  {p.description || 'No description'}
                </p>

                <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ${Number(p.base_price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
