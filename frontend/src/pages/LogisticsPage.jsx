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
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Logistics & Delivery</h2>
      <p style={{ color: 'var(--text-muted)' }}>Delivery estimations, city routing, and dispatch tracking.</p>
    </div>
  );
}
