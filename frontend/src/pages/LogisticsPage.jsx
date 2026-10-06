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

    </div>
  );
}
