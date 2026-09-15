import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import api from '../api/client';

export default function DashboardLayout() {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        api.get('/health')
            .then(() => setIsOnline(true))
            .catch(() => setIsOnline(false));
    }, []);

    return (
        <div className="app-layout">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="brand-header">
                    <span>BrightBuy</span>
                    <span className="brand-badge">Retail</span>
                </div>

                <ul className="nav-menu">
                    <li className="nav-item">
                        <NavLink to="/" end>Overview</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/catalog">Catalog</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/auth-cart">Cart & Users</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/orders">Orders</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/logistics">Logistics</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink to="/analytics">Analytics</NavLink>
                    </li>
                </ul>
            </aside>

            {/* Main Container Area */}
            <div className="main-wrapper">
                <header className="top-navbar">
                    <div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Environment: <strong>Local Development</strong>
                        </span>
                    </div>
                    <div className="status-pill">
                        <span className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`}></span>
                        <span>{isOnline ? 'Backend Connected' : 'Backend Offline'}</span>
                    </div>
                </header>

                <main className="content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}