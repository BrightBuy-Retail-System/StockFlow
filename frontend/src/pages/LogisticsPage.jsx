import { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import {
  LogisticsIcon,
  TruckIcon,
  SearchIcon,
  DatabaseIcon,
  ServerIcon,
  ZapIcon,
} from '../components/Icons';

const STATUS_CHIP = {
  PENDING: 'chip-slate',
  DISPATCHED: 'chip-amber',
  IN_TRANSIT: 'chip-blue',
  DELIVERED: 'chip-emerald',
};

// Formats ISO date or datetime strings cleanly (e.g. "Oct 11, 2026")
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Formats timestamp with time (e.g. "Oct 11, 2026, 02:30 PM")
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeStr;
  }
}

export default function LogisticsPage() {
  // Navigation Tabs: 'hubs' | 'estimator' | 'tracker' | 'pipeline'
  const [activeTab, setActiveTab] = useState('hubs');

  // Network & KPI State
  const [cities, setCities] = useState([]);
  const [stats, setStats] = useState(null);
  const [sampleVariants, setSampleVariants] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery Estimator State
  const [cityId, setCityId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [customVariantMode, setCustomVariantMode] = useState(false);
  const [customVariantId, setCustomVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState('');
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Shipment Tracker State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [loadingTrack, setLoadingTrack] = useState(false);

  // Dispatches Pipeline State
  const [shipmentsList, setShipmentsList] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('ALL');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [statusUpdateMessage, setStatusUpdateMessage] = useState(null);
  const [updatingShipmentId, setUpdatingShipmentId] = useState(null);

  // Sample quick-click tracking numbers
  const sampleTrackingNumbers = [
    { code: 'TX-TRK-9081241', city: 'Austin Hub', status: 'DELIVERED' },
    { code: 'TX-BRIGHT-20260107', city: 'Plano Annex', status: 'IN_TRANSIT' },
    { code: 'TX-BRIGHT-20260106', city: 'Arlington Station', status: 'DISPATCHED' },
    { code: 'TX-202610101300-C95F90', city: 'Dallas DFW Hub', status: 'PENDING' },
  ];

  // Load initial cities, KPIs, sample variants, and shipments
  const loadInitialData = async () => {
    try {
      const [citiesRes, statsRes, variantsRes] = await Promise.all([
        api.get('/logistics/cities'),
        api.get('/logistics/stats'),
        api.get('/logistics/sample-variants'),
      ]);
      setCities(citiesRes.data || []);
      setStats(statsRes.data || null);
      setSampleVariants(variantsRes.data || []);
      if (citiesRes.data && citiesRes.data.length > 0 && !cityId) {
        setCityId(citiesRes.data[0].city_id);
      }
      if (variantsRes.data && variantsRes.data.length > 0 && !selectedVariantId) {
        setSelectedVariantId(variantsRes.data[0].variant_id);
      }
    } catch (err) {
      console.error('Failed to load logistics metadata:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Fetch full shipments list for Pipeline tab
  const fetchShipmentsList = async (status = pipelineStatusFilter, search = pipelineSearch) => {
    setLoadingShipments(true);
    try {
      const params = {};
      if (status && status !== 'ALL') params.status = status;
      if (search.trim()) params.q = search.trim();
      const res = await api.get('/logistics/shipments', { params });
      setShipmentsList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setShipmentsList([]);
    } finally {
      setLoadingShipments(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'pipeline' && !isManagerOrAdmin) {
      setActiveTab('tracker');
      return;
    }
    if (activeTab === 'pipeline') {
      fetchShipmentsList(pipelineStatusFilter, pipelineSearch);
    }
  }, [activeTab, pipelineStatusFilter]);

  // Refresh all logistics data
  const handleRefresh = async () => {
    setRefreshing(true);
    setStatusUpdateMessage(null);
    await Promise.all([
      loadInitialData(),
      activeTab === 'pipeline' ? fetchShipmentsList(pipelineStatusFilter, pipelineSearch) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // Execute delivery calculation
  const handleEstimate = async (e) => {
    e.preventDefault();
    setEstimateError('');
    setEstimate(null);

    const activeVid = customVariantMode ? Number(customVariantId) : Number(selectedVariantId);

    if (!cityId) {
      setEstimateError('Please select a destination Texas city.');
      return;
    }
    if (!activeVid || isNaN(activeVid) || activeVid <= 0) {
      setEstimateError('Please select or enter a valid Product Variant ID.');
      return;
    }

    setLoadingEstimate(true);
    try {
      const res = await api.post('/logistics/calculate-delivery', {
        city_id: Number(cityId),
        items: [{ variant_id: activeVid, quantity: Math.max(1, Number(quantity) || 1) }],
      });
      setEstimate(res.data);
    } catch (err) {
      setEstimateError(err.response?.data?.error || 'Could not calculate delivery lead time.');
    } finally {
      setLoadingEstimate(false);
    }
  };

  // Execute shipment tracking lookup
  const handleTrack = async (targetCode) => {
    const queryCode = (targetCode || trackingNumber).trim();
    setTrackError('');
    setShipment(null);

    if (!queryCode) {
      setTrackError('Please enter or select a valid tracking number.');
      return;
    }

    setLoadingTrack(true);
    try {
      const res = await api.get(`/logistics/shipments/${encodeURIComponent(queryCode)}`);
      setShipment(res.data);
      setTrackingNumber(queryCode);
    } catch (err) {
      setTrackError(err.response?.data?.error || 'No shipment found with that tracking number.');
    } finally {
      setLoadingTrack(false);
    }
  };

  // Quick track helper for sample pills
  const handleQuickTrack = (code) => {
    setTrackingNumber(code);
    setActiveTab('tracker');
    handleTrack(code);
  };

  // Advance shipment status
  const handleUpdateStatus = async (shipmentId, newStatus) => {
    setUpdatingShipmentId(shipmentId);
    setStatusUpdateMessage(null);
    try {
      const res = await api.patch(`/logistics/shipments/${shipmentId}/status`, {
        status: newStatus,
      });
      setStatusUpdateMessage({
        type: 'success',
        text: res.data?.message || `Shipment #${shipmentId} updated to ${newStatus}.`,
      });
      // Refresh pipeline list and KPIs
      fetchShipmentsList(pipelineStatusFilter, pipelineSearch);
      api.get('/logistics/stats').then((r) => setStats(r.data)).catch(() => {});
    } catch (err) {
      setStatusUpdateMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed to update shipment status.`,
      });
    } finally {
      setUpdatingShipmentId(null);
    }
  };

  // Pre-fill estimator when clicking a hub card
  const handleRouteToHub = (hubCityId) => {
    setCityId(hubCityId);
    setActiveTab('estimator');
  };

  // Determine active step index for visual shipment tracking stepper
  const getStepperIndex = (status) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'DISPATCHED':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 1;
    }
  };

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const currentUserRole = Number(storedUser?.role_id ?? 1);
  const isManagerOrAdmin = [2, 3, 4].includes(currentUserRole);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-main)', marginBottom: '6px' }}>
            Logistics &amp; Fulfillment Network
          </h1>
          <p className="page-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '720px' }}>
            Regional distribution routing, delivery lead-time calculation with live inventory shortages, Texas hub throughput, and end-to-end parcel tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-ghost"
          style={{
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ZapIcon className="btn-icon" />
          <span>{refreshing ? 'Syncing...' : 'Sync Live Network'}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Regional Hubs</span>
            <span className="chip chip-blue" style={{ fontSize: '0.7rem' }}>Texas Network</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats ? stats.total_hubs : cities.length || 8}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            DFW, Austin, Houston, San Antonio &amp; West TX
          </div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Pipeline</span>
            <span className="chip chip-amber" style={{ fontSize: '0.7rem' }}>Pending + Transit</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning-text)' }}>
            {stats ? stats.active_pipeline : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats ? `${stats.pending} pending dispatches` : 'Live shipment queue'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Transit / Dispatched</span>
            <span className="chip chip-blue" style={{ fontSize: '0.7rem' }}>En Route</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)' }}>
            {stats ? (stats.dispatched + stats.in_transit) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats ? `${stats.in_transit} in-transit across Texas` : 'Moving between hubs'}
          </div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Base Lead Time</span>
            <span className="chip chip-emerald" style={{ fontSize: '0.7rem' }}>SLA Target</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success-text)' }}>
            {stats ? `${stats.avg_lead_time_days} Days` : '1.6 Days'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            +3 days penalty on out-of-stock items
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '8px', overflowX: 'auto' }}>
        {(
          isManagerOrAdmin
            ? [
              { id: 'hubs', label: 'Texas Regional Hubs', badge: `${cities.length || 8} Hubs` },
              { id: 'estimator', label: 'Delivery Lead-Time Estimator', badge: 'SRS Feature 5' },
              { id: 'tracker', label: 'Live Parcel Tracker', badge: 'Visual Stepper' },
              { id: 'pipeline', label: 'Dispatches & Pipeline Management', badge: 'Manager Action' },
            ]
            : [
              { id: 'hubs', label: 'Texas Regional Hubs', badge: `${cities.length || 8} Hubs` },
              { id: 'estimator', label: 'Delivery Lead-Time Estimator', badge: 'SRS Feature 5' },
              { id: 'tracker', label: 'Live Parcel Tracker', badge: 'Visual Stepper' },
            ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: activeTab === tab.id ? 'var(--primary-light)' : 'var(--bg-subtle)',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* =======================================================================
          TAB 1: Texas Regional Distribution Hubs Grid
          ======================================================================= */}
      {activeTab === 'hubs' && (
        <div>
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">Texas Regional Distribution Warehouses</div>
              <div className="card-subtitle">
                BrightBuy logistics network routing centers, municipal coverage, base delivery lead times, and standard regional transit fees.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {cities.map((city) => (
              <div
                key={city.city_id}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {city.city_name}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                        {city.hub_name}
                      </div>
                    </div>
                    <span className="chip chip-blue" style={{ fontSize: '0.7rem' }}>
                      City #{city.city_id}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', padding: '12px', borderRadius: '8px', background: 'var(--bg-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Base Lead Time</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {city.base_lead_time_days} {city.base_lead_time_days === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Standard Shipping</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${Number(city.shipping_fee || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRouteToHub(city.city_id)}
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <TruckIcon className="btn-icon" />
                  <span>Estimate Route to {city.city_name} &rarr;</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 2: Delivery Lead-Time Estimator (SRS Feature 5)
          ======================================================================= */}
      {activeTab === 'estimator' && (
        <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <div className="card-title">Delivery Lead-Time &amp; Penalty Calculator</div>
              <div className="card-subtitle">
                Computes arrival dates based on destination hub routing. In accordance with <strong>SRS Feature 5</strong>, items with insufficient or zero stock automatically add a <strong>+3 Day Out-of-Stock Penalty</strong>.
              </div>
            </div>
          </div>

          <form onSubmit={handleEstimate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', alignItems: 'flex-end' }}>
            {/* Destination Hub */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Destination Texas City &amp; Hub
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c.city_id} value={c.city_id}>
                    {c.city_name} — {c.hub_name} ({c.base_lead_time_days}d lead, ${Number(c.shipping_fee).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Variant Picker */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Product Variant
                </label>
                <button
                  type="button"
                  onClick={() => setCustomVariantMode(!customVariantMode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.725rem',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {customVariantMode ? '← Pick from Catalog' : 'Enter Custom ID'}
                </button>
              </div>

              {customVariantMode ? (
                <input
                  type="number"
                  min="1"
                  placeholder="Enter Variant ID (e.g. 1)"
                  value={customVariantId}
                  onChange={(e) => setCustomVariantId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                  }}
                />
              ) : (
                <select
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                  }}
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                >
                  {sampleVariants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      #{v.variant_id}: {v.title} ({v.sku}) — {v.stock_quantity > 0 ? `${v.stock_quantity} in stock` : 'OUT OF STOCK'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Calculate Button */}
            <div>
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingEstimate}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <ZapIcon className="btn-icon" />
                <span>{loadingEstimate ? 'Calculating Route...' : 'Calculate Delivery'}</span>
              </button>
            </div>
          </form>

          {estimateError && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
              <strong>Error:</strong> {estimateError}
            </div>
          )}

          {/* Estimate Result Display */}
          {estimate && (
            <div style={{
              marginTop: '24px',
              padding: '22px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Route Computation Successful
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                    Destination: {estimate.city_name} &middot; {estimate.hub_name}
                  </h3>
                </div>

                {estimate.out_of_stock_penalty_days > 0 ? (
                  <span className="chip chip-amber" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                    ⚠️ +{estimate.out_of_stock_penalty_days} Days Backorder Penalty Applied
                  </span>
                ) : (
                  <span className="chip chip-emerald" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                    ✓ 100% In-Stock Priority Route
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Lead Time</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {estimate.total_lead_time_days} {estimate.total_lead_time_days === 1 ? 'Day' : 'Days'}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Base: {estimate.base_lead_time_days}d + Penalty: {estimate.out_of_stock_penalty_days}d
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Arrival</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatDate(estimate.estimated_delivery_date)}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Guaranteed fulfillment window
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Regional Shipping Fee</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ${Number(estimate.shipping_fee || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Flat municipal hub freight
                  </div>
                </div>
              </div>

              {/* Item stock breakdown */}
              {estimate.item_breakdown && estimate.item_breakdown.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Fulfillment Inventory Inspection:
                  </div>
                  <div className="table-container" style={{ background: '#ffffff', borderRadius: '8px' }}>
                    <table className="enterprise-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>SKU / Product</th>
                          <th>Qty Requested</th>
                          <th>Warehouse Stock</th>
                          <th>Stock Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimate.item_breakdown.map((itm, i) => (
                          <tr key={i}>
                            <td>
                              <strong>{itm.title}</strong>
                              <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-muted)' }}>{itm.sku}</span>
                            </td>
                            <td>{itm.requested_quantity}</td>
                            <td>{itm.current_stock} units available</td>
                            <td>
                              {itm.adds_delay ? (
                                <span className="chip chip-amber">Shortage (+3d Delay)</span>
                              ) : (
                                <span className="chip chip-emerald">In Stock</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 3: Live Parcel Tracker with 4-Step Progress Stepper
          ======================================================================= */}
      {activeTab === 'tracker' && (
        <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">Live Parcel Tracking &amp; Status Stepper</div>
              <div className="card-subtitle">
                Query parcel dispatch progress across Texas distribution centers by tracking reference.
              </div>
            </div>
          </div>

          {/* Quick-Click Sample Tracking Badges */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '8px' }}>
              1-Click Demo Samples:
            </span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {sampleTrackingNumbers.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => handleQuickTrack(s.code)}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                  }}
                >
                  <code>{s.code}</code> ({s.city}) &middot; <span className={`chip ${STATUS_CHIP[s.status] || 'chip-slate'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{s.status}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g. TX-TRK-9081241)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loadingTrack}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <SearchIcon className="btn-icon" />
              <span>{loadingTrack ? 'Tracking...' : 'Track Parcel'}</span>
            </button>
          </form>

          {trackError && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
              <strong>Error:</strong> {trackError}
            </div>
          )}

          {/* Visual Tracking Stepper & Context Card */}
          {shipment && (
            <div style={{ marginTop: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', background: 'var(--bg-subtle)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Parcel Reference
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                    <code>{shipment.tracking_number}</code>
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`chip ${STATUS_CHIP[shipment.shipping_status] || 'chip-slate'}`} style={{ fontSize: '0.85rem', padding: '6px 14px', fontWeight: 700 }}>
                    {shipment.shipping_status}
                  </span>
                </div>
              </div>

              {/* 4-Step Progress Stepper */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                position: 'relative',
                margin: '28px 0',
              }}>
                {[
                  { step: 1, label: 'Order Confirmed', time: 'Initial placement' },
                  { step: 2, label: 'Dispatched from Hub', time: formatDateTime(shipment.dispatched_at) },
                  { step: 3, label: 'In Transit across TX', time: shipment.shipping_status === 'IN_TRANSIT' ? 'On Highway / Rail' : 'En route' },
                  { step: 4, label: 'Delivered', time: formatDateTime(shipment.delivered_at) },
                ].map((st) => {
                  const currIdx = getStepperIndex(shipment.shipping_status);
                  const isDone = st.step <= currIdx;
                  const isCurrent = st.step === currIdx;

                  return (
                    <div key={st.step} style={{ textAlign: 'center', position: 'relative' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        margin: '0 auto 8px auto',
                        background: isDone ? 'var(--primary)' : 'var(--bg-card)',
                        border: isDone ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                        color: isDone ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        {isDone && st.step < currIdx ? '✓' : st.step}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: isDone ? 700 : 500, color: isDone ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {st.time}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Context Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#ffffff', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Destination City &amp; Hub</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {shipment.city_name} &middot; {shipment.hub_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Arrival</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                    {formatDate(shipment.estimated_arrival)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Linked Order #</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {shipment.order_id ? `#${shipment.order_id} (${shipment.order_status})` : 'Standalone Parcel'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recipient Information</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>
                    {shipment.customer_name || 'Registered Customer'}
                    {shipment.recipient_phone ? ` &middot; ${shipment.recipient_phone}` : ''}
                  </div>
                </div>
              </div>

              {shipment.delivery_address && (
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong>Delivery Street Address:</strong> {shipment.delivery_address}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 4: Dispatches Pipeline & Logistics Management
          ======================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <div className="card-title">Texas Dispatches &amp; Fulfillment Pipeline</div>
              <div className="card-subtitle">
                Monitor and advance shipment statuses across the state network. Synchronizes with order status records.
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPipelineStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    background: pipelineStatusFilter === st ? 'var(--primary)' : 'var(--bg-card)',
                    color: pipelineStatusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search dispatches by tracking number or destination city..."
              value={pipelineSearch}
              onChange={(e) => {
                setPipelineSearch(e.target.value);
                fetchShipmentsList(pipelineStatusFilter, e.target.value);
              }}
              style={{
                width: '100%',
                maxWidth: '420px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
              }}
            />
          </div>

          {/* Feedback Alert */}
          {statusUpdateMessage && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.825rem',
              marginBottom: '16px',
              background: statusUpdateMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${statusUpdateMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              color: statusUpdateMessage.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            }}>
              {statusUpdateMessage.text}
            </div>
          )}

          {/* Shipments Table */}
          <div className="table-container">
            <table className="enterprise-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Destination Hub</th>
                  <th>Status</th>
                  <th>Est. Arrival</th>
                  <th>Dispatched At</th>
                  <th>Order Ref</th>
                  <th>Action / Status Advance</th>
                </tr>
              </thead>
              <tbody>
                {loadingShipments ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading dispatch pipeline...
                    </td>
                  </tr>
                ) : shipmentsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No shipments matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  shipmentsList.map((s) => (
                    <tr key={s.shipment_id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>
                          {s.tracking_number}
                        </strong>
                      </td>
                      <td>
                        <div>{s.city_name}</div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{s.hub_name}</span>
                      </td>
                      <td>
                        <span className={`chip ${STATUS_CHIP[s.shipping_status] || 'chip-slate'}`}>
                          {s.shipping_status}
                        </span>
                      </td>
                      <td>{formatDate(s.estimated_arrival)}</td>
                      <td>{formatDateTime(s.dispatched_at)}</td>
                      <td>
                        {s.order_id ? (
                          <span>Order #{s.order_id}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleQuickTrack(s.tracking_number)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-subtle)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Track
                          </button>

                          {/* Quick Lifecycle Advance Buttons */}
                          {s.shipping_status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(s.shipment_id, 'DISPATCHED')}
                              disabled={updatingShipmentId === s.shipment_id}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--warning-border)',
                                background: 'var(--warning-bg)',
                                color: 'var(--warning-text)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Dispatch
                            </button>
                          )}

                          {s.shipping_status === 'DISPATCHED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(s.shipment_id, 'IN_TRANSIT')}
                              disabled={updatingShipmentId === s.shipment_id}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--primary-border)',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              In Transit
                            </button>
                          )}

                          {s.shipping_status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(s.shipment_id, 'DELIVERED')}
                              disabled={updatingShipmentId === s.shipment_id}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--success-border)',
                                background: 'var(--success-bg)',
                                color: 'var(--success-text)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}