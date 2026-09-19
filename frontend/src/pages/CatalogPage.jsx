import { useEffect, useState } from 'react';
import api from '../api/client';

export default function CatalogPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/catalog/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p>Loading categories...</p></div>;
  if (error) return <div className="card"><p style={{ color: 'red' }}>Error: {error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Product Categories</h2>
        <p style={{ color: 'var(--text-muted)' }}>Browse all active categories</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {categories.map((cat) => (
          <div key={cat.category_id} className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{cat.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
              Slug: <code>{cat.slug}</code>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
