import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
    ZapIcon,
    ShieldCheckIcon,
    ArrowRightIcon
} from '../components/Icons';

export default function ManagerDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [topSelling, setTopSelling] = useState([]);
    const [categoryTotals, setCategoryTotals] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/login');
            return;
        }
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        const fetchManagerData = async () => {
            try {
                const [resTop, resCat, resTxn] = await Promise.all([
                    api.get('/analytics/reports/top-selling'),
                    api.get('/analytics/reports/category-orders'),
                    api.get('/analytics/transactions').catch(() => ({ data: { data: [] } })),
                ]);

                setTopSelling(resTop.data?.data || []);
                setCategoryTotals(resCat.data?.data || []);
                setRecentTransactions(resTxn.data?.data || []);
            } catch (err) {
                console.warn('Falling back to demo operational metrics:', err);
                setTopSelling([
                    { product_id: 1, product_name: 'Apex Pro Terminal Ultra', category_name: 'Enterprise Hardware', total_units_sold: 88, total_revenue: 114312.0, revenue_rank: 1 },
                    { product_id: 4, product_name: 'Precision Barcode Hub v4', category_name: 'Warehouse Logistics', total_units_sold: 142, total_revenue: 69580.0, revenue_rank: 2 },
                    { product_id: 2, product_name: 'OmniRouter Wi-Fi 6E Edge', category_name: 'Networking & IoT', total_units_sold: 95, total_revenue: 42750.0, revenue_rank: 3 },
                ]);
                setCategoryTotals([
                    { category_name: 'Enterprise Hardware', total_category_revenue: 173652.0, total_orders: 134, total_units_sold: 134 },
                    { category_name: 'Warehouse Logistics', total_category_revenue: 153120.0, total_orders: 348, total_units_sold: 348 },
                    { category_name: 'ALL CATEGORIES (GRAND TOTAL)', total_category_revenue: 424350.0, total_orders: 849, total_units_sold: 849 },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchManagerData();
    }, [navigate]);

    if (!user) return null;

    const grandTotalRow = categoryTotals.find(c => c.category_name?.includes('GRAND TOTAL')) || {};
    const totalVolume = grandTotalRow.total_category_revenue || categoryTotals.reduce((a, b) => a + Number(b.total_category_revenue || 0), 0);
    const totalUnits = grandTotalRow.total_units_sold || categoryTotals.reduce((a, b) => a + Number(b.total_units_sold || 0), 0);

    return (
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Banner */}
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            Role 2: Manager View
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            ID: #{user.id || 150003}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                        Store &amp; Inventory Operations Center
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                        Welcome, {user.username || user.full_name || 'Manager'} • Catalog Administration &amp; Sales Rankings
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                        to="/analytics"
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            background: 'var(--accent)',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>Full Analytics Hub</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                    <Link
                        to="/catalog"
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-main)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        Manage Products
                    </Link>
                </div>
            </div>

            {/* Quick Operational KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Category Volume</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        ${Number(totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Aggregation via <code>v_category_order_totals</code>
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Units Dispatched</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginTop: '8px' }}>
                        {Number(totalUnits).toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Texas regional fulfillment centers
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Ranked SKU</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        {topSelling[0]?.product_name || 'Apex Pro Terminal'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '4px', fontWeight: 600 }}>
                        Rank #1 • ${Number(topSelling[0]?.total_revenue || 0).toLocaleString()} rev
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DCL Privilege Tier</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        analytics_viewer
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Granted in Lecture Note 8 SQL
                    </div>
                </div>
            </div>

            {/* Main Manager Sections Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                {/* Left: Top Selling Products Leaderboard (Lecture Note 9 DENSE_RANK) */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                Top-Selling Products Leaderboard
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                View: <code>v_top_selling_products</code> • DENSE_RANK()
                            </p>
                        </div>
                        <Link to="/analytics" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                            View All 10 →
                        </Link>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 6px' }}>Rank</th>
                                    <th style={{ padding: '8px 6px' }}>Product</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Units</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topSelling.slice(0, 5).map((p, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '10px 6px' }}>
                                            <span style={{
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: p.revenue_rank === 1 ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                                                color: p.revenue_rank === 1 ? 'var(--warning-text)' : 'var(--text-secondary)'
                                            }}>
                                                #{p.revenue_rank}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 6px' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.product_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category_name}</div>
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>
                                            {p.total_units_sold}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                                            ${Number(p.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Category Distribution with ROLLUP (Lecture Note 9 WITH ROLLUP) */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                Category Volume &amp; Rollup Totals
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                View: <code>v_category_order_totals</code> • WITH ROLLUP
                            </p>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                            OLAP Summary
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 6px' }}>Category Name</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Orders</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoryTotals.map((c, idx) => {
                                    const isGrand = c.category_name?.includes('GRAND TOTAL');
                                    return (
                                        <tr
                                            key={idx}
                                            style={{
                                                borderBottom: '1px solid var(--border-light)',
                                                background: isGrand ? 'var(--bg-subtle)' : 'transparent',
                                                fontWeight: isGrand ? 800 : 400
                                            }}
                                        >
                                            <td style={{ padding: '10px 6px', color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                                                {c.category_name}
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>
                                                {c.total_orders || 0}
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: isGrand ? 'var(--primary)' : 'var(--text-main)' }}>
                                                ${Number(c.total_category_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
