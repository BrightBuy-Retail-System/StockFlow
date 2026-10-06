import { useEffect, useState } from 'react';
import api from '../api/client';

const STATUS_CHIP = {
  PENDING: 'chip-slate',
  DISPATCHED: 'chip-amber',
  IN_TRANSIT: 'chip-blue',
  DELIVERED: 'chip-emerald',
};

export default function LogisticsPage() {
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState('');
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [loadingTrack, setLoadingTrack] = useState(false);

  useEffect(() => {
    api.get('/logistics/cities')
      .then((res) => setCities(res.data))
      .catch(() => setCities([]));
  }, []);

  const handleEstimate = async (e) => {
    e.preventDefault();
    setEstimateError('');
    setEstimate(null);

    if (!cityId || !variantId) {
      setEstimateError('Please select a city and enter a variant ID.');
      return;
    }

    setLoadingEstimate(true);
    try {
      const res = await api.post('/logistics/calculate-delivery', {
        city_id: Number(cityId),
        items: [{ variant_id: Number(variantId), quantity: Number(quantity) || 1 }],
      });
      setEstimate(res.data);
    } catch (err) {
      setEstimateError(err.response?.data?.error || 'Could not calculate delivery estimate.');
    } finally {
      setLoadingEstimate(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setTrackError('');
    setShipment(null);

    if (!trackingNumber.trim()) {
      setTrackError('Enter a tracking number.');
      return;
    }

    setLoadingTrack(true);
    try {
      const res = await api.get(`/logistics/shipments/${trackingNumber.trim()}`);
      setShipment(res.data);
    } catch (err) {
      setTrackError(err.response?.data?.error || 'Shipment not found.');
    } finally {
      setLoadingTrack(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '0.875rem',
    color: 'var(--text-main)',
    marginTop: '4px',
  };

  const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Logistics & Delivery</h1>
          <p className="page-desc">Delivery lead-time estimation, city routing, and shipment tracking.</p>
        </div>
      </div>

      {/* Delivery Estimator */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Delivery Estimator</div>
            <div className="card-subtitle">Estimate lead time and cost for a destination city and item.</div>
          </div>
        </div>

        <form onSubmit={handleEstimate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Destination city</label>
            <select style={inputStyle} value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">Select a city</option>
              {cities.map((c) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.city_name} ({c.hub_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Variant ID</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>

          <div>
            <label style={labelStyle}>Quantity</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <button type="submit" className="btn-primary" disabled={loadingEstimate}>
              {loadingEstimate ? 'Calculating…' : 'Estimate Delivery'}
            </button>
          </div>
        </form>

        {estimateError && (
          <p style={{ color: 'var(--danger-text)', fontSize: '0.85rem', marginTop: '14px' }}>{estimateError}</p>
        )}

        {estimate && (
          <div style={{
            marginTop: '18px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            border: '1px solid var(--primary-border)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              <div>
                <div style={labelStyle}>Shipping to</div>
                <div style={{ fontWeight: 700 }}>{estimate.city_name} &middot; {estimate.hub_name}</div>
              </div>
              <div>
                <div style={labelStyle}>Lead time</div>
                <div style={{ fontWeight: 700 }}>
                  {estimate.total_lead_time_days} day{estimate.total_lead_time_days !== 1 ? 's' : ''}
                  {estimate.out_of_stock_penalty_days > 0 && (
                    <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>
                      {' '}(incl. +{estimate.out_of_stock_penalty_days}d out-of-stock delay)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Estimated arrival</div>
                <div style={{ fontWeight: 700 }}>{estimate.estimated_delivery_date}</div>
              </div>
              <div>
                <div style={labelStyle}>Shipping fee</div>
                <div style={{ fontWeight: 700 }}>${Number(estimate.shipping_fee || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shipment Tracker */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Track a Shipment</div>
            <div className="card-subtitle">Look up status by tracking number.</div>
          </div>
        </div>

        <form onSubmit={handleTrack} style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '220px' }}>
            <label style={labelStyle}>Tracking number</label>
            <input
              style={inputStyle}
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TX-TRK-9081241"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loadingTrack}>
            {loadingTrack ? 'Searching…' : 'Track'}
          </button>
        </form>

        {trackError && (
          <p style={{ color: 'var(--danger-text)', fontSize: '0.85rem', marginTop: '14px' }}>{trackError}</p>
        )}

        {shipment && (
          <div className="table-container" style={{ marginTop: '18px' }}>
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Estimated arrival</th>
                  <th>Dispatched</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{shipment.tracking_number}</td>
                  <td>{shipment.city_name} &middot; {shipment.hub_name}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[shipment.shipping_status] || 'chip-slate'}`}>
                      {shipment.shipping_status}
                    </span>
                  </td>
                  <td>{shipment.estimated_arrival || '—'}</td>
                  <td>{shipment.dispatched_at || '—'}</td>
                  <td>{shipment.delivered_at || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}