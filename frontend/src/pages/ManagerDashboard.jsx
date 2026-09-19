import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/login');
        } else {
            setUser(JSON.parse(savedUser));
        }
    }, [navigate]);



    if (!user) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>
                        Welcome back, {user.username || user.full_name}!
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manager Dashboard &amp; Account Overview</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Profile Details</h3>
                    <p><strong>Name:</strong> {user.username || user.full_name}</p>
                    <p><strong>Role ID:</strong> {user.role_id || 1}</p>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Shopping Cart</h3>
                    <p>Explore our products and fill your cart.</p>
                    <button
                        onClick={() => navigate('/catalog')}
                        style={{ marginTop: '10px', padding: '6px 12px', cursor: 'pointer' }}
                    >
                        Go to Catalog
                    </button>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Your Orders</h3>
                    <p>Track your current orders and history.</p>
                    <button
                        onClick={() => navigate('/orders')}
                        style={{ marginTop: '10px', padding: '6px 12px', cursor: 'pointer' }}
                    >
                        View Orders
                    </button>
                </div>
            </div>
        </div>
    );
}
