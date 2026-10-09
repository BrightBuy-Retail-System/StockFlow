import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/client';
import {
  LogisticsIcon,
  SearchIcon,
  TruckIcon,
  CheckCircleIcon,
  DatabaseIcon,
  LayersIcon,
  RefreshCwIcon
} from '../components/Icons';

export default function LogisticsPage() {
  // Navigation Tabs: 'tracking' | 'upcoming' | 'hubs' | 'calculator'
  const [activeTab, setActiveTab] = useState('tracking');

  // Core Data
  const [cities, setCities] = useState([]);
  const [upcomingShipments, setUpcomingShipments] = useState([]);
  const [inventoryVariants, setInventoryVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tracking Lookup State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [loadingTrack, setLoadingTrack] = useState(false);

  // Delivery Calculator State
  const [calcCityId, setCalcCityId] = useState('');
  const [calcVariantId, setCalcVariantId] = useState('');
  const [calcQuantity, setCalcQuantity] = useState(1);
  const [calcResult, setCalcResult] = useState(null);
  const [calcError, setCalcError] = useState('');
  const [loadingCalc, setLoadingCalc] = useState(false);

  // Upcoming Filter State
  const [upcomingFilter, setUpcomingFilter] = useState('ALL');
  const [upcomingSearch, setUpcomingSearch] = useState('');

  // Notification State
  const [notification, setNotification] = useState(null);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch Logistics Hubs & Upcoming Shipments
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [citiesRes, upcomingRes, invRes] = await Promise.allSettled([
        api.get('/logistics/cities'),
        api.get('/logistics/upcoming-shipments'),
        api.get('/catalog/admin/inventory')
      ]);

      if (citiesRes.status === 'fulfilled') {
        const cityList = citiesRes.value.data || [];
        setCities(cityList);
        if (cityList.length > 0 && !calcCityId) {
          setCalcCityId(cityList[0].city_id);
        }
      }

      if (upcomingRes.status === 'fulfilled') {
        setUpcomingShipments(upcomingRes.value.data || []);
      }

      if (invRes.status === 'fulfilled') {
        const invList = invRes.value.data || [];
        setInventoryVariants(invList);
        if (invList.length > 0 && !calcVariantId) {
          setCalcVariantId(invList[0].variant_id);
        }
      }
    } catch (err) {
      console.error('Error loading logistics data:', err);
      showNotice('Failed to sync logistics data from Texas hubs.', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calcCityId, calcVariantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tracking Search
  const handleTrack = async (targetTrackNo) => {
    const num = (targetTrackNo || trackingNumber).trim();
    if (!num) {
      setTrackError('Please enter a valid tracking number.');
      return;
    }

    setLoadingTrack(true);
    setTrackError('');
    setShipment(null);

    try {
      const res = await api.get(`/logistics/shipments/${encodeURIComponent(num)}`);
      setShipment(res.data);
      setTrackingNumber(num);
    } catch (err) {
      setTrackError(err.response?.data?.error || `No active shipment found for tracking code "${num}".`);
    } finally {
      setLoadingTrack(false);
    }
  };

  // Handle Delivery Lead Time Calculation (Course Feature 5)
  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!calcCityId || !calcVariantId) {
      setCalcError('Please select both a Texas destination city and a product variant.');
      return;
    }

    setLoadingCalc(true);
    setCalcError('');
    setCalcResult(null);

    try {
      const res = await api.post('/logistics/calculate-delivery', {
        city_id: Number(calcCityId),
        items: [
          {
            variant_id: Number(calcVariantId),
            quantity: Number(calcQuantity) || 1
          }
        ]
      });
      setCalcResult(res.data);
      showNotice('Delivery lead time and estimated date calculated successfully.');
    } catch (err) {
      setCalcError(err.response?.data?.error || 'Failed to calculate delivery estimate.');
    } finally {
      setLoadingCalc(false);
    }
  };

  // Export CSV Helper
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        keys.join(','),
        ...data.map((row) =>
          keys
            .map((k) => {
              let val = row[k];
              if (val === null || val === undefined) return '""';
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              return val;
            })
            .join(',')
        )
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Upcoming Shipments
  const filteredUpcoming = useMemo(() => {
    return upcomingShipments.filter((s) => {
      const matchesStatus =
        upcomingFilter === 'ALL' ||
        (s.shipping_status && s.shipping_status.toUpperCase() === upcomingFilter);

      const q = upcomingSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.tracking_number && s.tracking_number.toLowerCase().includes(q)) ||
        (s.city_name && s.city_name.toLowerCase().includes(q)) ||
        (s.hub_name && s.hub_name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [upcomingShipments, upcomingFilter, upcomingSearch]);

  return (
    <div className="st-admin-container">
      
      {/* Toast Notification */}
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
      {/* 1. CLEAN LOGISTICS HEADER                                            */}
      {/* ==================================================================== */}
      <div className="st-admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span className="st-badge-admin-role">Texas Logistics Network</span>
            <span className="st-badge-cluster-status">
              <span className="st-pulse-dot" />
              Central Warehouse Dispatch Active
            </span>
          </div>

          <h1 className="st-admin-title">Logistics &amp; Hub Distribution</h1>
          <p className="st-admin-subtitle">
            Manage regional Texas fulfillment hubs, track real-time dispatches, review shipments, and calculate delivery lead times.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={refreshing}
          className="st-btn-header-sync"
        >
          <RefreshCwIcon style={{ width: '0.875rem', height: '0.875rem', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{refreshing ? 'Syncing...' : 'Sync Texas Hubs'}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 2. LOGISTICS KPI CARDS STRIP                                         */}
      {/* ==================================================================== */}
      <div className="st-admin-kpi-grid">
        
        {/* KPI 1: Active Texas Hubs */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Texas Distribution Hubs</span>
            <div className="st-admin-kpi-iconbox">
              <LogisticsIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {cities.length}
          </div>
          <div className="st-admin-kpi-foot">
            Dallas, Houston, Austin, Fort Worth, etc.
          </div>
        </div>

        {/* KPI 2: Upcoming Shipments */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Active Shipments</span>
            <div className="st-admin-kpi-iconbox">
              <TruckIcon style={{ width: '1rem', height: '1rem', color: '#059669' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            {upcomingShipments.length}
          </div>
          <div className="st-admin-kpi-foot">
            Pending dispatch &amp; regional transit
          </div>
        </div>

        {/* KPI 3: Standard Delivery Time */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Base Lead Times</span>
            <div className="st-admin-kpi-iconbox">
              <CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#4f46e5' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            5 – 7 Days
          </div>
          <div className="st-admin-kpi-foot">
            5d for Main Hubs · 7d for Other Cities
          </div>
        </div>

        {/* KPI 4: Stock Out Penalty */}
        <div className="st-admin-kpi-card">
          <div className="st-admin-kpi-top">
            <span className="st-admin-kpi-label">Stockout Buffer</span>
            <div className="st-admin-kpi-iconbox">
              <DatabaseIcon style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
            </div>
          </div>
          <div className="st-admin-kpi-value">
            +3 Days
          </div>
          <div className="st-admin-kpi-foot">
            Applies automatically when variant stock is 0
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. LOGISTICS TABS NAVIGATION                                         */}
      {/* ==================================================================== */}
      <div className="st-admin-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`st-admin-tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
        >
          <SearchIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Package Tracking &amp; Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`st-admin-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          <TruckIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Upcoming Dispatches</span>
          <span className="st-pill-badge-blue">{upcomingShipments.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hubs')}
          className={`st-admin-tab-btn ${activeTab === 'hubs' ? 'active' : ''}`}
        >
          <LogisticsIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Texas Hubs &amp; Routing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          className={`st-admin-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
        >
          <LayersIcon style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>Delivery Lead Time Calculator</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB CONTENT 1: SHIPMENT TRACKING & TIMELINE                          */}
      {/* ==================================================================== */}
      {activeTab === 'tracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '4px' }}>
              Real-Time Texas Shipment Tracker
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Lookup dispatch timestamps, hub transit milestones, and estimated delivery dates using a valid tracking number.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrack();
              }}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              <input
                type="text"
                placeholder="Enter tracking code (e.g., TX-TRK-9081242, TX-BRIGHT-20260100)..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="st-admin-search-input"
                style={{ flex: 1, minWidth: '280px', fontFamily: 'monospace' }}
              />

              <button
                type="submit"
                disabled={loadingTrack}
                className="st-btn-primary"
              >
                {loadingTrack ? 'Tracking...' : 'Track Shipment'}
              </button>
            </form>

            {/* Quick Demo Tracking Pills */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Quick Lookup Examples:</span>
              {[
                'TX-TRK-9081241',
                'TX-TRK-9081242',
                'TX-TRK-9081243',
                'TX-BRIGHT-20260100',
                'TX-BRIGHT-20260101'
              ].map((trk) => (
                <button
                  key={trk}
                  type="button"
                  onClick={() => handleTrack(trk)}
                  className="st-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'monospace' }}
                >
                  {trk}
                </button>
              ))}
            </div>

            {trackError && (
              <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem' }}>
                {trackError}
              </div>
            )}
          </div>

          {/* Tracking Result Card */}
          {shipment && (
            <div className="st-admin-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Tracking Number
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                    {shipment.tracking_number}
                  </div>
                </div>

                <span
                  className={
                    shipment.shipping_status === 'DELIVERED'
                      ? 'st-chip-paid'
                      : shipment.shipping_status === 'IN_TRANSIT'
                      ? 'st-chip-confirmed'
                      : shipment.shipping_status === 'DISPATCHED'
                      ? 'st-chip-shipped'
                      : 'st-chip-pending'
                  }
                >
                  {shipment.shipping_status}
                </span>
              </div>

              {/* Visual Shipment Timeline */}
              <div style={{ margin: '24px 0', padding: '20px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', position: 'relative' }}>
                  {[
                    { label: 'Order Confirmed', completed: true },
                    { label: 'Central Dispatched', completed: shipment.dispatched_at || shipment.shipping_status !== 'PENDING' },
                    { label: 'In Transit Hub', completed: shipment.shipping_status === 'IN_TRANSIT' || shipment.shipping_status === 'DELIVERED' },
                    { label: 'Delivered', completed: shipment.shipping_status === 'DELIVERED' }
                  ].map((step, idx) => (
                    <div key={idx} style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: step.completed ? '#2563eb' : '#f1f5f9',
                          color: step.completed ? '#ffffff' : '#94a3b8',
                          border: step.completed ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: step.completed ? 600 : 500, color: step.completed ? '#0f172a' : '#94a3b8' }}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Destination Texas City</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{shipment.city_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Regional Distribution Hub</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{shipment.hub_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Estimated Arrival Date</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {shipment.estimated_arrival ? new Date(shipment.estimated_arrival).toLocaleDateString() : 'Calculating'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Dispatched Timestamp</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {shipment.dispatched_at ? new Date(shipment.dispatched_at).toLocaleString() : 'Awaiting Dispatch'}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB CONTENT 2: UPCOMING DISPATCHES PIPELINE                          */}
      {/* ==================================================================== */}
      {activeTab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Controls Bar */}
          <div className="st-admin-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="st-admin-search-wrap">
              <span className="st-admin-search-icon">
                <SearchIcon style={{ width: '0.9rem', height: '0.9rem' }} />
              </span>
              <input
                type="text"
                placeholder="Search shipments by tracking number, city, or hub..."
                value={upcomingSearch}
                onChange={(e) => setUpcomingSearch(e.target.value)}
                className="st-admin-search-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['ALL', 'PENDING', 'DISPATCHED', 'IN_TRANSIT'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setUpcomingFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: upcomingFilter === st ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: upcomingFilter === st ? '#eff6ff' : '#ffffff',
                    color: upcomingFilter === st ? '#1d4ed8' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}

              <button
                type="button"
                onClick={() => exportToCSV(filteredUpcoming, 'upcoming_shipments_export')}
                className="st-btn-pill-export"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Tracking Code</th>
                    <th>Destination City</th>
                    <th>Texas Hub Facility</th>
                    <th>Estimated Arrival</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No upcoming shipments found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUpcoming.map((s) => (
                      <tr key={s.shipment_id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {s.tracking_number}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {s.city_name}
                        </td>
                        <td style={{ color: '#475569' }}>
                          {s.hub_name}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleDateString() : 'TBD'}
                        </td>
                        <td>
                          <span
                            className={
                              s.shipping_status === 'IN_TRANSIT'
                                ? 'st-chip-confirmed'
                                : s.shipping_status === 'DISPATCHED'
                                ? 'st-chip-shipped'
                                : 'st-chip-pending'
                            }
                          >
                            {s.shipping_status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('tracking');
                              handleTrack(s.tracking_number);
                            }}
                            className="st-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            Track &rarr;
                          </button>
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

      {/* ==================================================================== */}
      {/* TAB CONTENT 3: TEXAS HUBS & ROUTING DIRECTORY                        */}
      {/* ==================================================================== */}
      {activeTab === 'hubs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Explanation Banner */}
          <div className="st-admin-card" style={{ padding: '18px 22px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af', margin: '0 0 6px' }}>
              Texas Hub Lead-Time Routing Policy
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
              • <strong>Main Texas Cities (Dallas, Fort Worth, Austin, Houston, San Antonio):</strong> 5 days delivery when items are in stock.<br />
              • <strong>Regional Texas Hubs (El Paso, Arlington, Plano, etc.):</strong> 7 days delivery when items are in stock.<br />
              • <strong>Stockout Penalty Buffer:</strong> +3 business days automatically added if item inventory is 0 at time of order.
            </p>
          </div>

          {/* Hubs Directory Table */}
          <div className="st-admin-card">
            <div className="st-admin-table-wrap">
              <table className="st-admin-table">
                <thead>
                  <tr>
                    <th>Destination Texas City</th>
                    <th>Distribution Hub Facility</th>
                    <th>Hub Classification</th>
                    <th>Standard Lead Time</th>
                    <th>Base Shipping Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => {
                    const isMain = ['dallas', 'fort worth', 'austin', 'houston', 'san antonio'].includes(c.city_name.toLowerCase());
                    return (
                      <tr key={c.city_id}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {c.city_name}
                        </td>
                        <td style={{ color: '#475569' }}>
                          {c.hub_name}
                        </td>
                        <td>
                          <span
                            className={isMain ? 'st-chip-paid' : 'st-chip-role-mgr'}
                          >
                            {isMain ? 'Metro Central Hub' : 'Regional Hub'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          {isMain ? '5 Days (In Stock)' : '7 Days (In Stock)'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          ${Number(c.shipping_fee || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB CONTENT 4: DELIVERY LEAD TIME CALCULATOR                          */}
      {/* ==================================================================== */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* Calculator Input Form */}
          <div className="st-admin-card" style={{ padding: '24px' }}>
            <h3 className="st-admin-card-title" style={{ marginBottom: '4px' }}>
              Texas Delivery Lead Time Calculator
            </h3>
            <p className="st-admin-card-subtitle" style={{ marginBottom: '18px' }}>
              Simulate delivery lead times and out-of-stock buffer calculations against live inventory.
            </p>

            <form onSubmit={handleCalculate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Destination Texas City *
                </label>
                <select
                  value={calcCityId}
                  onChange={(e) => setCalcCityId(e.target.value)}
                  className="st-modal-form-input"
                >
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.city_name} — {c.hub_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Product Variant / SKU *
                </label>
                <select
                  value={calcVariantId}
                  onChange={(e) => setCalcVariantId(e.target.value)}
                  className="st-modal-form-input"
                >
                  {inventoryVariants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      [{v.sku}] {v.product_name} ({v.stock_quantity > 0 ? `${v.stock_quantity} in stock` : 'Out of stock'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Order Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(e.target.value)}
                  className="st-modal-form-input"
                />
              </div>

              {calcError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.825rem' }}>
                  {calcError}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingCalc}
                className="st-btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              >
                {loadingCalc ? 'Calculating...' : 'Calculate Delivery Estimate'}
              </button>
            </form>
          </div>

          {/* Calculator Result Card */}
          <div className="st-admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {calcResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Calculation Summary
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '4px 0 0', color: '#0f172a' }}>
                    Destination: {calcResult.city_name}
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: '#64748b' }}>Hub: {calcResult.hub_name}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Base Lead Time</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{calcResult.base_lead_time_days} Days</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '8px', background: calcResult.out_of_stock_penalty_days > 0 ? '#fffbeb' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: calcResult.out_of_stock_penalty_days > 0 ? '#92400e' : '#64748b', fontWeight: 600 }}>
                      Stockout Penalty
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: calcResult.out_of_stock_penalty_days > 0 ? '#92400e' : '#0f172a' }}>
                      +{calcResult.out_of_stock_penalty_days} Days
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>Total Delivery Lead Time</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>
                    {calcResult.total_lead_time_days} Business Days
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
                    Estimated Arrival: <strong>{new Date(calcResult.estimated_delivery_date).toLocaleDateString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Standard Shipping Fee:</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>
                    ${Number(calcResult.shipping_fee || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#64748b' }}>
                  <TruckIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
                  No Estimate Calculated Yet
                </h4>
                <p style={{ fontSize: '0.85rem', margin: 0, color: '#64748b' }}>
                  Select a destination city and item SKU on the left to simulate the Texas delivery timeline.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
