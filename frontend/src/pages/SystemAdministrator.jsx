import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { 
  DatabaseIcon, 
  LayersIcon, 
  SearchIcon, 
  CatalogIcon 
} from '../components/Icons';

export default function SystemAdministrator() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Core Data
  const [inventoryList, setInventoryList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'products' | 'insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'healthy' | 'low' | 'out'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // In-line Stock Edits state: { [variant_id]: current_input_value }
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockId, setSavingStockId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals: 'none' | 'createProduct' | 'editProduct' | 'createVariant' | 'editVariant'
  const [modalType, setModalType] = useState('none');
  const [activeItem, setActiveItem] = useState(null); // Product or Variant being edited

  // Form Fields State
  const [productForm, setProductForm] = useState({
    title: '',
    category_id: '',
    description: '',
    base_price: '',
    is_active: true,
  });

  const [variantForm, setVariantForm] = useState({
    product_id: '',
    sku: '',
    attribute_name: 'Specification',
    attribute_value: '',
    price_override: '',
    stock_quantity: 50,
    low_stock_threshold: 10,
  });

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
    }
  }, [navigate]);

  // Load all administrative data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [invRes, prodRes, catRes] = await Promise.all([
        api.get('/catalog/admin/inventory'),
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
      ]);

      setInventoryList(invRes.data || []);
      setProductsList(prodRes.data || []);
      setCategories(catRes.data || []);

      // Initialize stock drafts
      const drafts = {};
      (invRes.data || []).forEach((item) => {
        drafts[item.variant_id] = item.stock_quantity;
      });
      setStockDrafts(drafts);
    } catch (err) {
      showNotice('Failed to load administrative inventory data.', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // ---------------------------------------------------------
  // KPI Metrics Calculation
  // ---------------------------------------------------------
  const metrics = useMemo(() => {
    const totalProducts = productsList.length;
    const activeProducts = productsList.filter((p) => p.is_active).length;
    const totalVariants = inventoryList.length;

    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    inventoryList.forEach((item) => {
      const qty = Number(item.stock_quantity) || 0;
      const threshold = Number(item.low_stock_threshold) || 10;
      const price = Number(item.effective_price) || 0;

      totalStock += qty;
      totalStockValue += qty * price;

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= threshold) {
        lowStockCount++;
      }
    });

    return {
      totalProducts,
      activeProducts,
      totalVariants,
      totalStock,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
    };
  }, [productsList, inventoryList]);

  // ---------------------------------------------------------
  // Filtered Inventory / SKU List
  // ---------------------------------------------------------
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.attribute_value && item.attribute_value.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'all' || String(item.category_id) === String(categoryFilter);

      const qty = Number(item.stock_quantity) || 0;
      const threshold = Number(item.low_stock_threshold) || 10;

      let matchesStock = true;
      if (stockStatusFilter === 'healthy') matchesStock = qty > threshold;
      if (stockStatusFilter === 'low') matchesStock = qty > 0 && qty <= threshold;
      if (stockStatusFilter === 'out') matchesStock = qty === 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventoryList, searchQuery, categoryFilter, stockStatusFilter]);

  // ---------------------------------------------------------
  // In-line Stock Updates
  // ---------------------------------------------------------
  const handleStockDraftChange = (variantId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setStockDrafts((prev) => ({ ...prev, [variantId]: num }));
  };

  const handleStepStock = (variantId, delta) => {
    setStockDrafts((prev) => {
      const current = prev[variantId] !== undefined ? prev[variantId] : 0;
      return { ...prev, [variantId]: Math.max(0, current + delta) };
    });
  };

  const handleSaveStock = async (item) => {
    const newQty = stockDrafts[item.variant_id];
    try {
      setSavingStockId(item.variant_id);
      await api.put(`/catalog/inventory/${item.variant_id}`, {
        stock_quantity: newQty,
        low_stock_threshold: item.low_stock_threshold,
      });

      // Update local state smoothly
      setInventoryList((prev) =>
        prev.map((it) => (it.variant_id === item.variant_id ? { ...it, stock_quantity: newQty } : it))
      );

      showNotice(`Stock updated for SKU ${item.sku}: ${newQty} units on hand.`, 'success');
    } catch (err) {
      showNotice(err.response?.data?.message || 'Failed to update stock quantity.', 'danger');
    } finally {
      setSavingStockId(null);
    }
  };

  // ---------------------------------------------------------
  // Product Operations (Create / Edit)
  // ---------------------------------------------------------
  const openCreateProduct = () => {
    setProductForm({
      title: '',
      category_id: categories[0]?.category_id || '',
      description: '',
      base_price: '',
      is_active: true,
    });
    setModalType('createProduct');
  };

  const openEditProduct = (prod) => {
    setActiveItem(prod);
    setProductForm({
      title: prod.name || prod.title,
      category_id: prod.category_id || '',
      description: prod.description || '',
      base_price: prod.base_price,
      is_active: Boolean(prod.is_active),
    });
    setModalType('editProduct');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title || !productForm.category_id || productForm.base_price === '') {
      alert('Please fill out all required product fields.');
      return;
    }

    try {
      if (modalType === 'createProduct') {
        const res = await api.post('/catalog/products', productForm);
        showNotice(`Product "${productForm.title}" created successfully!`);
        // If user wants, they can immediately configure variants
      } else if (modalType === 'editProduct') {
        await api.put(`/catalog/products/${activeItem.product_id}`, productForm);
        showNotice(`Product "${productForm.title}" metadata updated.`);
      }

      setModalType('none');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product configuration.');
    }
  };

  // ---------------------------------------------------------
  // Variant / SKU Operations (Create / Edit)
  // ---------------------------------------------------------
  const openCreateVariant = (preselectedProductId = null) => {
    setVariantForm({
      product_id: preselectedProductId || productsList[0]?.product_id || '',
      sku: '',
      attribute_name: 'Specification',
      attribute_value: '',
      price_override: '',
      stock_quantity: 50,
      low_stock_threshold: 10,
    });
    setModalType('createVariant');
  };

  const openEditVariant = (variantItem) => {
    setActiveItem(variantItem);
    setVariantForm({
      product_id: variantItem.product_id,
      sku: variantItem.sku,
      attribute_name: variantItem.attribute_name || 'Specification',
      attribute_value: variantItem.attribute_value || '',
      price_override: variantItem.price_override || '',
      stock_quantity: variantItem.stock_quantity,
      low_stock_threshold: variantItem.low_stock_threshold || 10,
    });
    setModalType('editVariant');
  };

  const handleSaveVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.sku || !variantForm.product_id) {
      alert('Product and SKU are required.');
      return;
    }

    try {
      if (modalType === 'createVariant') {
        await api.post('/catalog/variants', variantForm);
        showNotice(`New SKU listing "${variantForm.sku}" created with ${variantForm.stock_quantity} initial stock.`);
      } else if (modalType === 'editVariant') {
        await api.put(`/catalog/variants/${activeItem.variant_id}`, {
          sku: variantForm.sku,
          attribute_name: variantForm.attribute_name,
          attribute_value: variantForm.attribute_value,
          price_override: variantForm.price_override === '' ? null : variantForm.price_override,
        });

        // Also update threshold/stock if changed
        await api.put(`/catalog/inventory/${activeItem.variant_id}`, {
          low_stock_threshold: variantForm.low_stock_threshold,
        });

        showNotice(`SKU "${variantForm.sku}" listing updated.`);
      }

      setModalType('none');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save variant configuration.');
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: notification.type === 'danger' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Banner / Command Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--primary)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              Role ID: {user.role_id} · Warehouse Administrator
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Connected to TiDB Cluster
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, margin: 0 }}>
            Warehouse Inventory &amp; Catalog Management
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Manage product metadata, configure variant SKU listings, and maintain live stock quantities.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {refreshing ? 'Syncing...' : '↻ Refresh Data'}
          </button>

          <button
            type="button"
            onClick={() => openCreateVariant()}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--primary-border)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            + Add SKU / Variant
          </button>

          <button
            type="button"
            onClick={openCreateProduct}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Configure New Product
          </button>
        </div>
      </div>

      {/* KPI Inventory Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Warehouse SKUs</span>
            <LayersIcon style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {metrics.totalVariants}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Mapped across {metrics.totalProducts} base products
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Stock Units</span>
            <DatabaseIcon style={{ width: '18px', height: '18px', color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
            {metrics.totalStock.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Est. Valuation: ${metrics.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '18px', borderLeft: metrics.lowStockCount > 0 ? '3px solid #f59e0b' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Warnings</span>
            <span
              style={{
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Alerts
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
            {metrics.lowStockCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            SKUs at or below threshold limit
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '18px', borderLeft: metrics.outOfStockCount > 0 ? '3px solid #ef4444' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Out of Stock</span>
            <span
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Zero Units
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>
            {metrics.outOfStockCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Require urgent inventory replenishment
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'inventory' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          📦 Warehouse SKU Listings &amp; Stock Controls ({inventoryList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'products' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          ⚙️ Product Configurations &amp; Metadata ({productsList.length})
        </button>
      </div>

      {/* -------------------------------------------------------------
          TAB 1: WAREHOUSE SKU LISTINGS & LIVE STOCK CONTROL
      -------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar: Search & Filter Chips */}
          <div
            className="card"
            style={{
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <SearchIcon style={{ width: '16px', height: '16px' }} />
              </div>
              <input
                type="text"
                placeholder="Search by SKU code, product title, or variant attribute..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Filter by Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Status Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: 'All Stock' },
                { id: 'healthy', label: 'Healthy' },
                { id: 'low', label: 'Low Stock' },
                { id: 'out', label: 'Out of Stock' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStockStatusFilter(pill.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: stockStatusFilter === pill.id ? 'var(--primary)' : 'var(--border-color)',
                    background: stockStatusFilter === pill.id ? 'var(--primary-light)' : 'transparent',
                    color: stockStatusFilter === pill.id ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading warehouse listings...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No SKU inventory records found matching your filters.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU Code</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product &amp; Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Variant Spec</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Stock Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, minWidth: '220px' }}>In-Line Stock Adjustment</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const qty = Number(item.stock_quantity) || 0;
                    const threshold = Number(item.low_stock_threshold) || 10;
                    const isSaving = savingStockId === item.variant_id;
                    const currentDraft = stockDrafts[item.variant_id] !== undefined ? stockDrafts[item.variant_id] : qty;
                    const hasChanged = currentDraft !== qty;

                    let statusBadge = (
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        In Stock ({qty})
                      </span>
                    );

                    if (qty === 0) {
                      statusBadge = (
                        <span
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          Out of Stock
                        </span>
                      );
                    } else if (qty <= threshold) {
                      statusBadge = (
                        <span
                          style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          Low Stock (≤{threshold})
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={item.variant_id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          background: hasChanged ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {/* SKU */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--primary)',
                              background: 'var(--bg-subtle)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {item.sku}
                          </span>
                        </td>

                        {/* Product Title */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.category_name}
                          </div>
                        </td>

                        {/* Variant Specification */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{item.attribute_name}: </span>
                            <strong>{item.attribute_value}</strong>
                          </div>
                        </td>

                        {/* Effective Price */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>${Number(item.effective_price).toFixed(2)}</div>
                          {item.price_override && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              (Base: ${Number(item.base_price).toFixed(2)})
                            </span>
                          )}
                        </td>

                        {/* Stock Status */}
                        <td style={{ padding: '12px 16px' }}>{statusBadge}</td>

                        {/* In-Line Stock Controls */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleStepStock(item.variant_id, -10)}
                              title="-10 units"
                              style={{
                                padding: '4px 6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-subtle)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepStock(item.variant_id, -1)}
                              title="-1 unit"
                              style={{
                                padding: '4px 6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-subtle)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              -1
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={currentDraft}
                              onChange={(e) => handleStockDraftChange(item.variant_id, e.target.value)}
                              style={{
                                width: '65px',
                                textAlign: 'center',
                                padding: '5px',
                                borderRadius: '4px',
                                border: hasChanged ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleStepStock(item.variant_id, 1)}
                              title="+1 unit"
                              style={{
                                padding: '4px 6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-subtle)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepStock(item.variant_id, 10)}
                              title="+10 units"
                              style={{
                                padding: '4px 6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-subtle)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              +10
                            </button>

                            {hasChanged && (
                              <button
                                type="button"
                                onClick={() => handleSaveStock(item)}
                                disabled={isSaving}
                                className="btn-primary"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  marginLeft: '4px',
                                }}
                              >
                                {isSaving ? '...' : 'Save'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => openEditVariant(item)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                            }}
                          >
                            Edit Spec
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: PRODUCT CONFIGURATIONS & CATALOG METADATA
      -------------------------------------------------------------- */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="card"
            style={{
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Active Product Catalog</h3>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Modify base prices, categorization, descriptions, and activation status.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateProduct}
              className="btn-primary"
              style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              + Create Product
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {productsList.map((prod) => {
              const prodVariants = inventoryList.filter((v) => v.product_id === prod.product_id);
              const totalProdStock = prodVariants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);

              return (
                <div
                  key={prod.product_id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderTop: prod.is_active ? '3px solid var(--primary)' : '3px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                        }}
                      >
                        {prod.category_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: prod.is_active ? '#ecfdf5' : '#fee2e2',
                          color: prod.is_active ? '#047857' : '#b91c1c',
                        }}
                      >
                        {prod.is_active ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 600 }}>
                      {prod.name || prod.title}
                    </h4>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 12px 0', minHeight: '38px' }}>
                      {prod.description || 'No catalog description provided.'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Base Price:</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                        ${Number(prod.base_price).toFixed(2)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Configured SKUs:</span>
                      <strong>{prodVariants.length} variants ({totalProdStock} units in stock)</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                    <button
                      type="button"
                      onClick={() => openEditProduct(prod)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Metadata
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateVariant(prod.product_id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--primary-border)',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add SKU
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: CREATE / EDIT PRODUCT
      -------------------------------------------------------------- */}
      {(modalType === 'createProduct' || modalType === 'editProduct') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '28px',
              background: 'var(--bg-card)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 16px 0' }}>
              {modalType === 'createProduct' ? 'Configure New Product' : `Edit Product: ${activeItem?.title || activeItem?.name}`}
            </h3>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="e.g. Apex UltraBook 16"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.base_price}
                    onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                    placeholder="1299.99"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Catalog Description
                </label>
                <textarea
                  rows="3"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                  }}
                  placeholder="Enter detailed hardware and product specs..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Product is Active &amp; Discoverable in Storefront
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' }}>
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: CREATE / EDIT VARIANT & SKU
      -------------------------------------------------------------- */}
      {(modalType === 'createVariant' || modalType === 'editVariant') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              background: 'var(--bg-card)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 16px 0' }}>
              {modalType === 'createVariant' ? 'Add New Warehouse SKU & Variant' : `Edit Variant SKU: ${activeItem?.sku}`}
            </h3>

            <form onSubmit={handleSaveVariant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalType === 'createVariant' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Assign to Base Product *
                  </label>
                  <select
                    required
                    value={variantForm.product_id}
                    onChange={(e) => setVariantForm({ ...variantForm, product_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {productsList.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name || p.title} (${Number(p.base_price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Warehouse SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontFamily: 'monospace',
                    }}
                    placeholder="e.g. VB-16-512-SLV"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Price Override ($) (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variantForm.price_override}
                    onChange={(e) => setVariantForm({ ...variantForm, price_override: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                    placeholder="Leave empty for base price"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Attribute Name
                  </label>
                  <input
                    type="text"
                    value={variantForm.attribute_name}
                    onChange={(e) => setVariantForm({ ...variantForm, attribute_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                    placeholder="e.g. Color, Storage, Size"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Attribute Value
                  </label>
                  <input
                    type="text"
                    value={variantForm.attribute_value}
                    onChange={(e) => setVariantForm({ ...variantForm, attribute_value: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                    placeholder="e.g. Space Gray, 1TB, Large"
                  />
                </div>
              </div>

              {/* Inventory initial quantities (shown on create or edit) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {modalType === 'createVariant' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      Initial Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={variantForm.stock_quantity}
                      onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={variantForm.low_stock_threshold}
                    onChange={(e) => setVariantForm({ ...variantForm, low_stock_threshold: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' }}>
                  Save SKU Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
