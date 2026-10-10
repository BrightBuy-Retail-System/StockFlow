import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
  OverviewIcon,
  AnalyticsIcon,
  OrdersIcon,
  LogisticsIcon,
  CatalogIcon,
  BoxIcon,
  UserIcon,
  ShieldCheckIcon,
  SearchIcon,
  RefreshCwIcon,
  TruckIcon
} from '../components/Icons';

export default function SystemAdministrator() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Active Main Navigation Tab
  // 'overview' | 'reports' | 'inventory' | 'staff'
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-tab for BrightBuy Management Reports (The 5 Mandatory Reports)
  // 'quarterly' | 'topProducts' | 'categories' | 'delivery' | 'customers'
  const [activeReportTab, setActiveReportTab] = useState('quarterly');

  // Loading & Sync States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [notification, setNotification] = useState(null);

  // 1. Executive Overview & Pipeline Data
  const [executiveOverview, setExecutiveOverview] = useState(null);
  const [fulfillmentPipeline, setFulfillmentPipeline] = useState([]);
  const [pipelineFilter, setPipelineFilter] = useState('ALL');
  const [pipelineSearch, setPipelineSearch] = useState('');

  // 2. The 5 Mandatory Reports Data
  const [quarterlySales, setQuarterlySales] = useState([]);
  const [quarterlyYearFilter, setQuarterlyYearFilter] = useState('ALL');
  const [topProducts, setTopProducts] = useState([]);
  const [categoryOrders, setCategoryOrders] = useState([]);
  const [deliveryEstimates, setDeliveryEstimates] = useState([]);
  const [deliveryCityFilter, setDeliveryCityFilter] = useState('ALL');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [customerSummary, setCustomerSummary] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // 3. Warehouse Inventory & Catalog Control
  const [inventoryList, setInventoryList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState('ALL');
  const [invStockFilter, setInvStockFilter] = useState('ALL'); // 'ALL' | 'HEALTHY' | 'LOW' | 'OUT'
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStockId, setSavingStockId] = useState(null);

  // 4. Staff Directory & Access Control
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: '',
    role_id: 2 // 2: Manager, 3: System Administrator
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Modals for Products and Variants
  const [modalType, setModalType] = useState('none'); // 'none' | 'createProduct' | 'editProduct' | 'createVariant' | 'editVariant'
  const [activeItem, setActiveItem] = useState(null);
  const [productForm, setProductForm] = useState({
    title: '',
    category_id: '',
    description: '',
    base_price: '',
    image_url: '',
    is_active: true
  });
  const [variantForm, setVariantForm] = useState({
    product_id: '',
    sku: '',
    attribute_name: 'Storage / Color',
    attribute_value: '',
    price_override: '',
    stock_quantity: 50,
    low_stock_threshold: 10
  });

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      const role = Number(parsed.role_id);
      if (role !== 3 && role !== 4) {
        navigate(role === 2 ? '/manager-dashboard' : '/customer-dashboard');
      }
    }
  }, [navigate]);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // --------------------------------------------------------------------------
  // Core Data Fetching from Live Backend Endpoints
  // --------------------------------------------------------------------------
  const fetchAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [
        overviewRes,
        pipelineRes,
        quarterlyRes,
        topProdRes,
        catOrdersRes,
        deliveryRes,
        customerRes,
        invRes,
        prodRes,
        catRes,
        staffRes
      ] = await Promise.allSettled([
        api.get('/analytics/overview'),
        api.get('/analytics/fulfillment-pipeline'),
        api.get('/analytics/reports/quarterly-sales'),
        api.get('/analytics/reports/top-selling'),
        api.get('/analytics/reports/category-orders'),
        api.get('/analytics/reports/delivery-estimates'),
        api.get('/analytics/reports/customer-summary'),
        api.get('/catalog/admin/inventory'),
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
        api.get('/auth_cart/staff')
      ]);

      if (overviewRes.status === 'fulfilled') {
        setExecutiveOverview(overviewRes.value.data?.executive_summary || null);
      }
      if (pipelineRes.status === 'fulfilled') {
        setFulfillmentPipeline(pipelineRes.value.data?.pipeline || []);
      }
      if (quarterlyRes.status === 'fulfilled') {
        setQuarterlySales(quarterlyRes.value.data?.data || []);
      }
      if (topProdRes.status === 'fulfilled') {
        setTopProducts(topProdRes.value.data?.data || []);
      }
      if (catOrdersRes.status === 'fulfilled') {
        setCategoryOrders(catOrdersRes.value.data?.data || []);
      }
      if (deliveryRes.status === 'fulfilled') {
        setDeliveryEstimates(deliveryRes.value.data?.data || []);
      }
      if (customerRes.status === 'fulfilled') {
        setCustomerSummary(customerRes.value.data?.data || []);
      }
      if (invRes.status === 'fulfilled') {
        const inv = invRes.value.data || [];
        setInventoryList(inv);
        // Initialize stock drafts
        const drafts = {};
        inv.forEach((item) => {
          drafts[item.variant_id] = item.stock_quantity;
        });
        setStockDrafts(drafts);
      }
      if (prodRes.status === 'fulfilled') {
        setProductsList(prodRes.value.data || []);
      }
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.data || []);
      }
      if (staffRes.status === 'fulfilled') {
        setStaffList(staffRes.value.data?.staff || []);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Data sync error:', err);
      showNotice('Partial error syncing administrative data.', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --------------------------------------------------------------------------
  // CSV Export Utility
  // --------------------------------------------------------------------------
  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      showNotice('No data available to export.', 'danger');
      return;
    }
    try {
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((field) => {
              const val = row[field] === null || row[field] === undefined ? '' : row[field];
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        )
      ];
      const csvString = csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotice(`Report exported to ${filename}.csv`, 'success');
    } catch (err) {
      showNotice('Failed to generate CSV export.', 'danger');
    }
  };

  // --------------------------------------------------------------------------
  // Stock Editing Handlers
  // --------------------------------------------------------------------------
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
        low_stock_threshold: item.low_stock_threshold || 10
      });

      setInventoryList((prev) =>
        prev.map((it) => (it.variant_id === item.variant_id ? { ...it, stock_quantity: newQty } : it))
      );
      showNotice(`Stock updated: SKU ${item.sku} now has ${newQty} units.`, 'success');
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to update stock quantity.', 'danger');
    } finally {
      setSavingStockId(null);
    }
  };

  // --------------------------------------------------------------------------
  // Product Operations (Create / Edit)
  // --------------------------------------------------------------------------
  const openCreateProduct = () => {
    setProductForm({
      title: '',
      category_id: categories[0]?.category_id || '',
      description: '',
      base_price: '',
      image_url: '',
      is_active: true
    });
    setModalType('createProduct');
  };

  const openEditProduct = (prod) => {
    setActiveItem(prod);
    setProductForm({
      title: prod.title || prod.name || '',
      category_id: prod.category_id || '',
      description: prod.description || '',
      base_price: prod.base_price || '',
      image_url: prod.image_url || '',
      is_active: Boolean(prod.is_active)
    });
    setModalType('editProduct');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title || !productForm.category_id || productForm.base_price === '') {
      showNotice('Product Title, Category, and Base Price are required.', 'danger');
      return;
    }

    try {
      if (modalType === 'createProduct') {
        await api.post('/catalog/products', productForm);
        showNotice(`Product "${productForm.title}" added to catalog.`);
      } else if (modalType === 'editProduct') {
        await api.put(`/catalog/products/${activeItem.product_id}`, productForm);
        showNotice(`Product "${productForm.title}" metadata updated.`);
      }
      setModalType('none');
      fetchAllData();
    } catch (err) {
      showNotice(err.response?.data?.message || err.response?.data?.error || 'Error saving product.', 'danger');
    }
  };

  // --------------------------------------------------------------------------
  // Variant Operations (Create / Edit)
  // --------------------------------------------------------------------------
  const openCreateVariant = (preselectedProductId = null) => {
    setVariantForm({
      product_id: preselectedProductId || productsList[0]?.product_id || '',
      sku: '',
      attribute_name: 'Storage / Color',
      attribute_value: '',
      price_override: '',
      stock_quantity: 50,
      low_stock_threshold: 10
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
      low_stock_threshold: variantItem.low_stock_threshold || 10
    });
    setModalType('editVariant');
  };

  const handleSaveVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.sku || !variantForm.product_id) {
      showNotice('Product assignment and SKU code are required.', 'danger');
      return;
    }

    try {
      if (modalType === 'createVariant') {
        await api.post('/catalog/variants', variantForm);
        showNotice(`New SKU variant "${variantForm.sku}" created successfully.`);
      } else if (modalType === 'editVariant') {
        await api.put(`/catalog/variants/${activeItem.variant_id}`, {
          sku: variantForm.sku,
          attribute_name: variantForm.attribute_name,
          attribute_value: variantForm.attribute_value,
          price_override: variantForm.price_override === '' ? null : variantForm.price_override
        });

        await api.put(`/catalog/inventory/${activeItem.variant_id}`, {
          low_stock_threshold: variantForm.low_stock_threshold
        });

        showNotice(`SKU "${variantForm.sku}" details updated.`);
      }
      setModalType('none');
      fetchAllData();
    } catch (err) {
      showNotice(err.response?.data?.error || err.response?.data?.message || 'Error saving variant.', 'danger');
    }
  };

  // --------------------------------------------------------------------------
  // Staff Onboarding Form
  // --------------------------------------------------------------------------
  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setStaffSubmitting(true);
    setStaffError('');
    try {
      await api.post('/auth_cart/staff/register', staffForm);
      showNotice(`Successfully onboarded ${staffForm.username} as an internal corporate staff member.`);
      setIsStaffModalOpen(false);
      setStaffForm({
        username: '',
        email: '',
        password: '',
        role_id: 2
      });
      // Refresh staff list
      const res = await api.get('/auth_cart/staff');
      setStaffList(res.data?.staff || []);
    } catch (err) {
      setStaffError(err.response?.data?.message || 'Failed to register staff account.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Filtered Data Sets
  // --------------------------------------------------------------------------
  const filteredPipeline = useMemo(() => {
    return fulfillmentPipeline.filter((order) => {
      const matchesStage =
        pipelineFilter === 'ALL' ||
        (order.order_status && order.order_status.toUpperCase() === pipelineFilter);

      const q = pipelineSearch.toLowerCase();
      const matchesSearch =
        !pipelineSearch ||
        String(order.order_id).includes(q) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(q)) ||
        (order.destination_city && order.destination_city.toLowerCase().includes(q)) ||
        (order.tracking_number && order.tracking_number.toLowerCase().includes(q));

      return matchesStage && matchesSearch;
    });
  }, [fulfillmentPipeline, pipelineFilter, pipelineSearch]);

  const filteredQuarterly = useMemo(() => {
    if (quarterlyYearFilter === 'ALL') return quarterlySales;
    return quarterlySales.filter((r) => String(r.sales_year) === quarterlyYearFilter);
  }, [quarterlySales, quarterlyYearFilter]);

  const filteredDelivery = useMemo(() => {
    return deliveryEstimates.filter((d) => {
      const matchesCity =
        deliveryCityFilter === 'ALL' ||
        (d.city_name && d.city_name.toLowerCase() === deliveryCityFilter.toLowerCase());

      const q = deliverySearch.toLowerCase();
      const matchesSearch =
        !deliverySearch ||
        String(d.order_id).includes(q) ||
        (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
        (d.tracking_number && d.tracking_number.toLowerCase().includes(q)) ||
        (d.hub_name && d.hub_name.toLowerCase().includes(q));

      return matchesCity && matchesSearch;
    });
  }, [deliveryEstimates, deliveryCityFilter, deliverySearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customerSummary;
    const q = customerSearch.toLowerCase();
    return customerSummary.filter(
      (c) =>
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.primary_city && c.primary_city.toLowerCase().includes(q))
    );
  }, [customerSummary, customerSearch]);

  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const q = invSearchQuery.toLowerCase();
      const matchesSearch =
        !invSearchQuery ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.product_name && item.product_name.toLowerCase().includes(q)) ||
        (item.attribute_value && item.attribute_value.toLowerCase().includes(q));

      const matchesCat =
        invCategoryFilter === 'ALL' || String(item.category_id) === String(invCategoryFilter);

      const qty = Number(item.stock_quantity) || 0;
      const threshold = Number(item.low_stock_threshold) || 10;
      let matchesStock = true;
      if (invStockFilter === 'HEALTHY') matchesStock = qty > threshold;
      if (invStockFilter === 'LOW') matchesStock = qty > 0 && qty <= threshold;
      if (invStockFilter === 'OUT') matchesStock = qty === 0;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [inventoryList, invSearchQuery, invCategoryFilter, invStockFilter]);

  // Inventory KPI metrics
  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    let valuation = 0;
    let lowCount = 0;
    let outCount = 0;
    inventoryList.forEach((it) => {
      const qty = Number(it.stock_quantity) || 0;
      const price = Number(it.effective_price || it.base_price) || 0;
      const th = Number(it.low_stock_threshold) || 10;
      totalUnits += qty;
      valuation += qty * price;
      if (qty === 0) outCount++;
      else if (qty <= th) lowCount++;
    });
    return {
      totalSkus: inventoryList.length,
      totalUnits,
      valuation,
      lowCount,
      outCount
    };
  }, [inventoryList]);

  if (loading && !executiveOverview) {
    return (
      <div className="st-admin-container" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="st-admin-card" style={{ padding: '48px 36px', maxWidth: '440px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <RefreshCwIcon style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1.2s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            Loading System Dashboard...
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
            Fetching executive analytics, live fulfillment dispatches, and warehouse catalog records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="st-admin-container">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '10px 18px',
            borderRadius: '8px',
            background: notification.type === 'danger' ? '#991b1b' : '#065f46',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            fontWeight: 500,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. CLEAN EXECUTIVE HEADER                                            */}
      {/* ==================================================================== */}
      <div className="st-admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="st-badge-admin-role">
              System Administrator
            </span>
            <span className="st-badge-cluster-status">
              <span className="st-pulse-dot" />
              TiDB Cluster Operational
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Signed in as <strong>{user?.email || 'admin@brightbuy.com'}</strong>
            </span>
          </div>

          <h1 className="st-admin-title">Store Administration</h1>
          <p className="st-admin-subtitle">
            Overview financial performance, active fulfillment pipelines, management reports, and catalog operations.
          </p>
        </div>

        {/* Quick Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchAllData}
            disabled={refreshing}
            className="st-btn-header-sync"
          >
            <RefreshCwIcon style={{ width: '0.875rem', height: '0.875rem', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link to="/manager-dashboard" className="st-btn-header-manager">
            <span>Manager Console &rarr;</span>
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BALANCED 4-COLUMN KPI METRIC CARDS                                 */}
      {/* ==================================================================== */}
      <div className="st-admin-kpi-grid">
        
        {/* KPI 1: Gross Revenue */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Gross Revenue</span>
            <div className="st-admin-kpi-iconbox">
              <AnalyticsIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(executiveOverview?.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            Net settled: <strong style={{ color: '#0f172a' }}>${Number(executiveOverview?.settled_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Total Orders</span>
            <div className="st-admin-kpi-iconbox">
              <OrdersIcon style={{ width: '1rem', height: '1rem', color: '#059669' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {executiveOverview?.total_orders || 0}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#0f172a' }}>{executiveOverview?.active_customers || 0}</strong> active registered customers
          </div>
        </div>

        {/* KPI 3: Warehouse Valuation */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Warehouse Inventory</span>
            <div className="st-admin-kpi-iconbox">
              <BoxIcon style={{ width: '1rem', height: '1rem', color: '#4f46e5' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            ${Number(inventoryMetrics.valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="st-admin-kpi-foot">
            <strong style={{ color: '#0f172a' }}>{inventoryMetrics.totalUnits}</strong> units across <strong style={{ color: '#0f172a' }}>{inventoryMetrics.totalSkus}</strong> SKUs
          </div>
        </div>

        {/* KPI 4: Fulfillment Pipeline */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Active Orders</span>
            <div className="st-admin-kpi-iconbox">
              <TruckIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {(executiveOverview?.order_breakdown?.pending || 0) + (executiveOverview?.order_breakdown?.confirmed || 0)}
          </div>
          <div className="st-admin-kpi-foot">
            {executiveOverview?.order_breakdown?.pending || 0} pending processing · {executiveOverview?.order_breakdown?.shipped || 0} in transit
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. CLEAN NAVIGATION TABS                                             */}
      {/* ==================================================================== */}
      <div className="st-admin-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`st-admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <OverviewIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Overview &amp; Orders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`st-admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <AnalyticsIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Management Reports</span>
          <span className="st-pill-badge-blue">5 Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`st-admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
        >
          <CatalogIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Warehouse Inventory</span>
          {inventoryMetrics.lowCount > 0 && (
            <span className="st-pill-badge-warning">{inventoryMetrics.lowCount} Low</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`st-admin-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
        >
          <UserIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Staff Directory</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB CONTENT 1: OVERVIEW & FULFILLMENT PIPELINE                       */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Order Stages Filter Segment */}
          <div className="st-pipeline-segment">
            {[
              { id: 'ALL', label: 'All Orders', count: fulfillmentPipeline.length },
              { id: 'PENDING', label: 'Pending Processing', count: executiveOverview?.order_breakdown?.pending || 0 },
              { id: 'CONFIRMED', label: 'Confirmed & Packed', count: executiveOverview?.order_breakdown?.confirmed || 0 },
              { id: 'SHIPPED', label: 'In Transit', count: executiveOverview?.order_breakdown?.shipped || 0 },
              { id: 'CANCELLED', label: 'Cancelled', count: executiveOverview?.order_breakdown?.cancelled || 0 }
            ].map((stg) => (
              <div
                key={stg.id}
                onClick={() => setPipelineFilter(stg.id)}
                className={`st-pipeline-chip ${pipelineFilter === stg.id ? 'active' : ''}`}
              >
                <div className="st-pipeline-chip-label">{stg.label}</div>
                <div className="st-pipeline-chip-val">{stg.count}</div>
              </div>
            ))}
          </div>

          {/* Search & Export Toolbar */}
          <div className="st-admin-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="st-admin-search-wrap">
              <span className="st-admin-search-icon">
                <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              </span>
              <input
                type="text"
                placeholder="Search orders by customer, Order ID, city, or tracking number..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="st-admin-search-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.835rem', color: '#64748b' }}>
                Showing <strong>{filteredPipeline.length}</strong> orders
              </span>
              <button
                type="button"
                onClick={() => exportToCSV(filteredPipeline, 'orders_pipeline_export')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Destination Hub</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipeline.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                        No orders match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPipeline.map((ord) => {
                      const isPaid = (ord.payment_status || '').toLowerCase() === 'paid' || (ord.payment_status || '').toLowerCase() === 'success';
                      return (
                        <tr key={ord.order_id}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>#{ord.order_id}</span>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {ord.placed_at ? new Date(ord.placed_at).toLocaleDateString() : 'Recent'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{ord.customer_name || 'Retail Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ord.customer_email || '—'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, color: '#334155' }}>{ord.destination_city || 'Texas Central'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ord.fulfillment_hub || 'Direct Dispatch'}</div>
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>
                            ${Number(ord.total_amount || 0).toFixed(2)}
                          </td>
                          <td>
                            <span className={isPaid ? 'st-chip-paid' : 'st-chip-pending'}>
                              {isPaid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                ord.order_status === 'CONFIRMED'
                                  ? 'st-chip-confirmed'
                                  : ord.order_status === 'SHIPPED'
                                  ? 'st-chip-shipped'
                                  : ord.order_status === 'CANCELLED'
                                  ? 'st-chip-danger'
                                  : 'st-chip-pending'
                              }
                            >
                              {ord.order_status || 'PENDING'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                              {ord.tracking_number || 'Pending'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {ord.estimated_arrival ? `Est: ${ord.estimated_arrival}` : 'Calculating'}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB CONTENT 2: MANAGEMENT REPORTS (THE 5 MANDATORY REPORTS)          */}
      {/* ==================================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-tabs for the 5 Reports */}
          <div className="st-admin-subtabs-wrap">
            {[
              { id: 'quarterly', label: '1. Quarterly Sales' },
              { id: 'topProducts', label: '2. Top-Selling Products' },
              { id: 'categories', label: '3. Category Orders (Rollup)' },
              { id: 'delivery', label: '4. Texas Delivery Lead' },
              { id: 'customers', label: '5. Customer Settlements' }
            ].map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReportTab(rep.id)}
                className={`st-admin-subtab-btn ${activeReportTab === rep.id ? 'active' : ''}`}
              >
                {rep.label}
              </button>
            ))}
          </div>

          {/* REPORT 1: QUARTERLY SALES REPORT */}
          {activeReportTab === 'quarterly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 className="st-admin-card-title">Quarterly Sales Report</h3>
                  <p className="st-admin-card-subtitle">
                    Financial sales figures with windowed 2-quarter moving averages via view <code>v_quarterly_sales_report</code>.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={quarterlyYearFilter}
                    onChange={(e) => setQuarterlyYearFilter(e.target.value)}
                    className="st-admin-select"
                  >
                    <option value="ALL">All Calendar Years</option>
                    <option value="2026">2026 Financial Year</option>
                    <option value="2025">2025 Financial Year</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => exportToCSV(filteredQuarterly, 'quarterly_sales_report')}
                    className="st-btn-pill-export"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="st-admin-card">
                <div className="st-admin-table-wrap">
                  <table className="st-admin-table">
                    <thead>
                      <tr>
                        <th>Sales Period</th>
                        <th>Orders Placed</th>
                        <th>Units Sold</th>
                        <th>Gross Revenue</th>
                        <th>Collected Net</th>
                        <th>2-Quarter Moving Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuarterly.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No quarterly sales records found.
                          </td>
                        </tr>
                      ) : (
                        filteredQuarterly.map((q, idx) => (
                          <tr key={idx}>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>Q{q.sales_quarter}</span>
                              <span style={{ color: '#64748b', marginLeft: '6px' }}>{q.sales_year}</span>
                            </td>
                            <td>{q.total_orders} orders</td>
                            <td>{q.total_units_sold} units</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>
                              ${Number(q.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>
                              ${Number(q.net_collected_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ color: '#475569', fontWeight: 500 }}>
                              ${Number(q.moving_avg_quarterly_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 2: TOP SELLING PRODUCTS */}
          {activeReportTab === 'topProducts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 className="st-admin-card-title">Top-Selling Products Leaderboard</h3>
                  <p className="st-admin-card-subtitle">
                    Products ranked by gross revenue via analytical window function <code>DENSE_RANK()</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => exportToCSV(topProducts, 'top_selling_products_report')}
                  className="st-btn-pill-export"
                >
                  Export CSV
                </button>
              </div>

              <div className="st-admin-card">
                <div className="st-admin-table-wrap">
                  <table className="st-admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Units Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No sales records available.
                          </td>
                        </tr>
                      ) : (
                        topProducts.map((p, idx) => {
                          const rank = p.revenue_rank || idx + 1;
                          return (
                            <tr key={idx}>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#eff6ff' : '#ffffff',
                                  color: rank === 1 ? '#92400e' : rank === 2 ? '#334155' : rank === 3 ? '#1d4ed8' : '#64748b',
                                  border: '1px solid #e2e8f0',
                                  textAlign: 'center',
                                  lineHeight: '22px',
                                  fontWeight: 700,
                                  fontSize: '0.78rem'
                                }}>
                                  {rank}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.product_name}</div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>SKU #{p.product_id}</div>
                              </td>
                              <td>
                                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#475569' }}>
                                  {p.category_name}
                                </span>
                              </td>
                              <td style={{ fontWeight: 500 }}>
                                {Number(p.total_units_sold || 0).toLocaleString()} units
                              </td>
                              <td style={{ fontWeight: 600, color: '#059669' }}>
                                ${Number(p.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 3: CATEGORY ORDERS WITH ROLLUP */}
          {activeReportTab === 'categories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 className="st-admin-card-title">Category Orders &amp; Revenue Rollup</h3>
                  <p className="st-admin-card-subtitle">
                    Aggregated category order totals with SQL <code>WITH ROLLUP</code> grand total summary.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => exportToCSV(categoryOrders, 'category_order_totals_report')}
                  className="st-btn-pill-export"
                >
                  Export CSV
                </button>
              </div>

              <div className="st-admin-card">
                <div className="st-admin-table-wrap">
                  <table className="st-admin-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Total Orders</th>
                        <th>Units Sold</th>
                        <th>Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No category order records available.
                          </td>
                        </tr>
                      ) : (
                        categoryOrders.map((cat, idx) => {
                          const isRollup = cat.category_name && cat.category_name.includes('GRAND TOTAL');
                          return (
                            <tr
                              key={idx}
                              style={{
                                background: isRollup ? '#f8fafc' : '#ffffff',
                                borderTop: isRollup ? '2px solid #cbd5e1' : undefined,
                                fontWeight: isRollup ? 700 : 400
                              }}
                            >
                              <td>
                                {isRollup ? (
                                  <span style={{ color: '#0f172a', fontWeight: 700 }}>Total Rollup</span>
                                ) : (
                                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{cat.category_name}</span>
                                )}
                              </td>
                              <td>{cat.total_orders} orders</td>
                              <td>{cat.total_units_sold} units</td>
                              <td style={{ fontWeight: 600, color: isRollup ? '#0f172a' : '#059669' }}>
                                ${Number(cat.total_category_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 4: TEXAS DELIVERY ESTIMATES */}
          {activeReportTab === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 className="st-admin-card-title">Delivery Lead Time Estimates</h3>
                  <p className="st-admin-card-subtitle">
                    Hub routing: Main Texas cities = 5 days lead | Other hubs = 7 days lead | +3 days stock penalty.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => exportToCSV(filteredDelivery, 'delivery_lead_time_report')}
                  className="st-btn-pill-export"
                >
                  Export CSV
                </button>
              </div>

              {/* City Filter & Search Bar */}
              <div className="st-admin-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="st-admin-search-wrap">
                  <span className="st-admin-search-icon">
                    <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by customer, Order ID, or hub..."
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                    className="st-admin-search-input"
                  />
                </div>

                <select
                  value={deliveryCityFilter}
                  onChange={(e) => setDeliveryCityFilter(e.target.value)}
                  className="st-admin-select"
                >
                  <option value="ALL">All Destination Hubs</option>
                  <option value="Dallas">Dallas (5 days base)</option>
                  <option value="Fort Worth">Fort Worth (5 days base)</option>
                  <option value="Austin">Austin (5 days base)</option>
                  <option value="Houston">Houston (5 days base)</option>
                  <option value="San Antonio">San Antonio (5 days base)</option>
                </select>
              </div>

              <div className="st-admin-card">
                <div className="st-admin-table-wrap">
                  <table className="st-admin-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Destination Hub</th>
                        <th>Calculated Lead</th>
                        <th>Estimated Arrival</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDelivery.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No upcoming delivery estimates found.
                          </td>
                        </tr>
                      ) : (
                        filteredDelivery.map((d) => (
                          <tr key={d.order_id}>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>#{d.order_id}</span>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>${Number(d.total_amount || 0).toFixed(2)}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.customer_name || 'Retail Guest'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.customer_email || '—'}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: '#334155' }}>{d.city_name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{d.hub_name}</div>
                            </td>
                            <td>
                              <span style={{
                                background: d.stock_penalty_days > 0 ? '#fffbeb' : '#f8fafc',
                                color: d.stock_penalty_days > 0 ? '#92400e' : '#334155',
                                border: '1px solid #e2e8f0',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.76rem',
                                fontWeight: 600
                              }}>
                                {d.total_lead_days} days
                              </span>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                {d.delivery_formula}
                              </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleDateString() : 'Pending'}
                            </td>
                            <td>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                {d.tracking_number || 'Pending'}
                              </div>
                              <span style={{ fontSize: '0.74rem', color: d.shipping_status === 'DISPATCHED' ? '#059669' : '#d97706', fontWeight: 500 }}>
                                {d.shipping_status || 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 5: CUSTOMER ORDER SUMMARY */}
          {activeReportTab === 'customers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h3 className="st-admin-card-title">Customer Order Summary &amp; Settlement</h3>
                  <p className="st-admin-card-subtitle">
                    Customer lifetime spend and payment reconciliation via <code>v_customer_order_summary</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => exportToCSV(filteredCustomers, 'customer_summary_report')}
                  className="st-btn-pill-export"
                >
                  Export CSV
                </button>
              </div>

              <div className="st-admin-card" style={{ padding: '12px 18px' }}>
                <div className="st-admin-search-wrap">
                  <span className="st-admin-search-icon">
                    <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or city..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="st-admin-search-input"
                  />
                </div>
              </div>

              <div className="st-admin-card">
                <div className="st-admin-table-wrap">
                  <table className="st-admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>City Hub</th>
                        <th>Total Orders</th>
                        <th>Lifetime Spend</th>
                        <th>Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No customer records found.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <tr key={cust.customer_id}>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{cust.customer_name}</span>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ID #{cust.customer_id}</div>
                            </td>
                            <td style={{ color: '#475569' }}>{cust.email}</td>
                            <td>
                              <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#334155' }}>
                                {cust.primary_city || 'Regional'}
                              </span>
                            </td>
                            <td>{cust.total_orders} orders</td>
                            <td style={{ fontWeight: 600, color: '#059669' }}>
                              ${Number(cust.lifetime_spending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className="st-chip-paid">
                                  {cust.paid_orders || 0} Paid (${Number(cust.paid_order_value || 0).toFixed(2)})
                                </span>
                                <span className="st-chip-pending">
                                  {cust.pending_orders || 0} Pending
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB CONTENT 3: WAREHOUSE INVENTORY                                   */}
      {/* ==================================================================== */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="st-admin-card-title">Warehouse Inventory Control</h3>
              <p className="st-admin-card-subtitle">
                <strong>{inventoryMetrics.totalSkus}</strong> SKUs in catalog with <strong>{inventoryMetrics.totalUnits}</strong> physical units in stock (Valuation: ${inventoryMetrics.valuation.toFixed(2)}).
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openCreateVariant()}
                className="st-btn-secondary"
              >
                + Add SKU Variant
              </button>

              <button
                type="button"
                onClick={openCreateProduct}
                className="st-btn-primary"
              >
                + Create Product
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="st-admin-card" style={{ padding: '12px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="st-admin-search-wrap">
              <span className="st-admin-search-icon">
                <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              </span>
              <input
                type="text"
                placeholder="Search by SKU, product name, or specification..."
                value={invSearchQuery}
                onChange={(e) => setInvSearchQuery(e.target.value)}
                className="st-admin-search-input"
              />
            </div>

            <select
              value={invCategoryFilter}
              onChange={(e) => setInvCategoryFilter(e.target.value)}
              className="st-admin-select"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={invStockFilter}
              onChange={(e) => setInvStockFilter(e.target.value)}
              className="st-admin-select"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="HEALTHY">In Stock</option>
              <option value="LOW">Low Stock (&le;10)</option>
              <option value="OUT">Out of Stock</option>
            </select>

            <button
              type="button"
              onClick={() => exportToCSV(filteredInventory, 'warehouse_inventory_export')}
              className="st-btn-pill-export"
            >
              Export CSV
            </button>
          </div>

          {/* Inventory Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Title</th>
                    <th>Category</th>
                    <th>Specification</th>
                    <th>Effective Price</th>
                    <th>Stock Units</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No warehouse SKUs match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const draft = stockDrafts[item.variant_id] !== undefined ? stockDrafts[item.variant_id] : item.stock_quantity;
                      const hasChanged = draft !== item.stock_quantity;
                      const isLow = draft > 0 && draft <= (item.low_stock_threshold || 10);
                      const isOut = draft === 0;

                      return (
                        <tr key={item.variant_id}>
                          <td>
                            <code style={{ fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>
                              {item.sku}
                            </code>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ID #{item.product_id}</div>
                          </td>
                          <td>
                            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem', color: '#475569' }}>
                              {item.category_name || 'Electronics'}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontSize: '0.825rem' }}>
                            {item.attribute_value || 'Standard'}
                          </td>
                          <td style={{ fontWeight: 600, color: '#059669' }}>
                            ${Number(item.effective_price || item.base_price || 0).toFixed(2)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleStepStock(item.variant_id, -5)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  color: '#334155'
                                }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={draft}
                                onChange={(e) => handleStockDraftChange(item.variant_id, e.target.value)}
                                style={{
                                  width: '52px',
                                  padding: '3px 4px',
                                  textAlign: 'center',
                                  borderRadius: '4px',
                                  border: isOut ? '1px solid #ef4444' : isLow ? '1px solid #d97706' : '1px solid #cbd5e1',
                                  fontWeight: 600,
                                  fontSize: '0.86rem',
                                  color: '#0f172a'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleStepStock(item.variant_id, 5)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  color: '#334155'
                                }}
                              >
                                +
                              </button>
                              {hasChanged && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveStock(item)}
                                  disabled={savingStockId === item.variant_id}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginLeft: '4px'
                                  }}
                                >
                                  {savingStockId === item.variant_id ? '...' : 'Save'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            {isOut ? (
                              <span className="st-chip-danger">Out of Stock</span>
                            ) : isLow ? (
                              <span className="st-chip-pending">Low Stock ({draft})</span>
                            ) : (
                              <span className="st-chip-paid">In Stock</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => openEditVariant(item)}
                              className="st-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              Edit SKU
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB CONTENT 4: STAFF DIRECTORY & SECURITY                            */}
      {/* ==================================================================== */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="st-admin-card-header" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <h3 className="st-admin-card-title">Corporate Staff Accounts</h3>
              <p className="st-admin-card-subtitle">
                Manage internal credentials, store managers, and administrators with role-based access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="st-btn-primary"
            >
              + Onboard Staff Member
            </button>
          </div>

          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Identity</th>
                    <th>Corporate Email</th>
                    <th>Role</th>
                    <th>Privilege Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No staff accounts found.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((st) => {
                      const isAdmin = Number(st.role_id) === 3 || Number(st.role_id) === 4;
                      const initials = (st.full_name || 'Staff')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={st.user_id}>
                          <td>#{st.user_id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: isAdmin ? '#eff6ff' : '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: isAdmin ? '#1e40af' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {initials}
                              </div>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{st.full_name}</span>
                            </div>
                          </td>
                          <td style={{ color: '#475569' }}>{st.email}</td>
                          <td>
                            <span className={isAdmin ? 'st-chip-role-admin' : 'st-chip-role-mgr'}>
                              {isAdmin ? 'System Administrator' : 'Store Manager'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {isAdmin
                              ? 'Full administration, catalog edits, staff onboarding, report exports'
                              : 'Order fulfillment dispatch, warehouse inventory monitoring'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ONBOARD STAFF MEMBER                                          */}
      {/* ==================================================================== */}
      {isStaffModalOpen && (
        <div className="st-admin-modal-backdrop">
          <div className="st-admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Onboard Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {staffError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.825rem', marginBottom: '14px' }}>
                {staffError}
              </div>
            )}

            <form onSubmit={handleRegisterStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jennifer Taylor"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., jennifer.t@brightbuy.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Assigned Role *
                </label>
                <select
                  value={staffForm.role_id}
                  onChange={(e) => setStaffForm({ ...staffForm, role_id: Number(e.target.value) })}
                  className="st-modal-form-input"
                >
                  <option value={2}>Store Executive &amp; Manager (Role 2)</option>
                  <option value={3}>System Administrator (Role 3)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="st-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="st-btn-primary"
                >
                  {staffSubmitting ? 'Registering...' : 'Confirm Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CREATE / EDIT PRODUCT                                         */}
      {/* ==================================================================== */}
      {(modalType === 'createProduct' || modalType === 'editProduct') && (
        <div className="st-admin-modal-backdrop">
          <div className="st-admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {modalType === 'createProduct' ? 'Create Catalog Product' : 'Edit Product Details'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType('none')}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Wireless Pro ANC Headphones"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="st-modal-form-input"
                  >
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g., 89.99"
                    value={productForm.base_price}
                    onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                    className="st-modal-form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Product Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="st-modal-form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Product specifications and features..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="st-modal-form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  className="st-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-btn-primary"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CREATE / EDIT VARIANT                                         */}
      {/* ==================================================================== */}
      {(modalType === 'createVariant' || modalType === 'editVariant') && (
        <div className="st-admin-modal-backdrop">
          <div className="st-admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {modalType === 'createVariant' ? 'Add SKU Variant' : 'Edit SKU Variant'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType('none')}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveVariant} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modalType === 'createVariant' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Assign to Product *
                  </label>
                  <select
                    value={variantForm.product_id}
                    onChange={(e) => setVariantForm({ ...variantForm, product_id: e.target.value })}
                    className="st-modal-form-input"
                  >
                    {productsList.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.title || p.name} (ID #{p.product_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AUD-ANC-BLK"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    className="st-modal-form-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Price Override ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Default base price"
                    value={variantForm.price_override}
                    onChange={(e) => setVariantForm({ ...variantForm, price_override: e.target.value })}
                    className="st-modal-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Attribute Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Color / Storage"
                    value={variantForm.attribute_name}
                    onChange={(e) => setVariantForm({ ...variantForm, attribute_name: e.target.value })}
                    className="st-modal-form-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Attribute Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Space Gray / 256GB"
                    value={variantForm.attribute_value}
                    onChange={(e) => setVariantForm({ ...variantForm, attribute_value: e.target.value })}
                    className="st-modal-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variantForm.stock_quantity}
                    onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: Number(e.target.value) })}
                    className="st-modal-form-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={variantForm.low_stock_threshold}
                    onChange={(e) => setVariantForm({ ...variantForm, low_stock_threshold: Number(e.target.value) })}
                    className="st-modal-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType('none')}
                  className="st-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-btn-primary"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

