import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
    ZapIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    ArrowRightIcon
} from '../components/Icons';

export default function SystemAdministrator() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [quarterly, setQuarterly] = useState([]);
    const [dclData, setDclData] = useState({ roles: [], grants: [], recent_audit_logs: [] });
    const [transactions, setTransactions] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/login');
            return;
        }
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        const fetchAdminData = async () => {
            try {
                const [resQuarterly, resDcl, resTxn, resCust] = await Promise.all([
                    api.get('/analytics/reports/quarterly-sales'),
                    api.get('/analytics/dcl-matrix').catch(() => ({ data: { data: {} } })),
                    api.get('/analytics/transactions').catch(() => ({ data: { data: [] } })),
                    api.get('/analytics/reports/customer-summary'),
                ]);

                setQuarterly(resQuarterly.data?.data || []);
                setDclData(resDcl.data?.data || { roles: [], grants: [], recent_audit_logs: [] });
                setTransactions(resTxn.data?.data || []);
                setCustomers(resCust.data?.data || []);
            } catch (err) {
                console.warn('Falling back to demo executive metrics:', err);
                setQuarterly([
                    { sales_year: 2026, sales_quarter: 1, total_orders: 142, gross_revenue: 68450.0, net_collected_revenue: 62100.0, moving_avg_quarterly_revenue: 68450.0 },
                    { sales_year: 2026, sales_quarter: 2, total_orders: 198, gross_revenue: 94200.0, net_collected_revenue: 89400.0, moving_avg_quarterly_revenue: 81325.0 },
                    { sales_year: 2026, sales_quarter: 3, total_orders: 224, gross_revenue: 112800.0, net_collected_revenue: 106500.0, moving_avg_quarterly_revenue: 103500.0 },
                ]);
                setCustomers([
                    { customer_name: 'Austin Techworks Hub', primary_city: 'Austin Hub', total_orders: 14, lifetime_spending: 38450.0 },
                    { customer_name: 'Dallas Freight Systems', primary_city: 'Dallas Hub', total_orders: 11, lifetime_spending: 31200.0 },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [navigate]);

    if (!user) return null;

    const totalGross = quarterly.reduce((acc, q) => acc + Number(q.gross_revenue || 0), 0);
    const totalNet = quarterly.reduce((acc, q) => acc + Number(q.net_collected_revenue || 0), 0);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Banner */}
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                            Role 3: Administrator View
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            ID: #{user.id || 150004}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                        Enterprise Command &amp; Security Console
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                        Welcome, {user.username || user.full_name || 'System Admin'} • Financial Moving Averages, DCL Security &amp; Audit Logs
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                        to="/analytics"
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>Analytics Center</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                    <Link
                        to="/payment"
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
                        Test Payment Processing
                    </Link>
                </div>
            </div>

            {/* Executive KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Revenue (OLAP)</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        ${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Summed across all quarterly periods
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Collected Revenue</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
                        ${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Verified by <code>PAYMENT_TRANSACTION</code>
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settlement Ledger</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        {transactions.length} Txns
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        ACID transactions in database
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Privileges</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                        ALL PRIVILEGES
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Lecture Note 8: Full DCL Control
                    </div>
                </div>
            </div>

            {/* Quarterly Sales Moving Averages & Customer Spending Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
                {/* Quarterly Sales with Windowing Moving Average (Lecture Note 9) */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                Quarterly Revenue &amp; Moving Average
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                View: <code>v_quarterly_sales_report</code> • Window: ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
                            </p>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                            Lecture Note 9
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 6px' }}>Period</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Orders</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Gross Revenue</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Moving Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quarterly.map((q, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '10px 6px', fontWeight: 600, color: 'var(--text-main)' }}>
                                            {q.sales_year} Q{q.sales_quarter}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                                            {q.total_orders}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>
                                            ${Number(q.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                                            ${Number(q.moving_avg_quarterly_revenue || q.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Customer Spending Leaderboard (Lecture Note 3 & 4) */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                Corporate Customer Spending Leaderboard
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                View: <code>v_customer_order_summary</code> • Multi-Table Outer Joins
                            </p>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--success-bg)', color: 'var(--success-text)', fontWeight: 700 }}>
                            Lecture Note 3 &amp; 4
                        </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 6px' }}>Customer Name</th>
                                    <th style={{ padding: '8px 6px' }}>Hub</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Orders</th>
                                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Lifetime Spend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.slice(0, 5).map((c, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '10px 6px', fontWeight: 600, color: 'var(--text-main)' }}>
                                            {c.customer_name}
                                        </td>
                                        <td style={{ padding: '10px 6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {c.primary_city}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                                            {c.total_orders}
                                        </td>
                                        <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                                            ${Number(c.lifetime_spending || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DCL Security & Role Authorization Console (Lecture Note 8) */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                            DCL Authorization &amp; Role Security Matrix
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Direct implementation of Lecture Note 8 (<code>CREATE ROLE</code>, <code>GRANT</code>, <code>REVOKE</code>) and Lecture Note 5 (Database Triggers).
                        </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--info-bg)', color: 'var(--info-text)', fontWeight: 700 }}>
                        SQL DCL Console
                    </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '10px 8px' }}>Role Name</th>
                                <th style={{ padding: '10px 8px' }}>Target Database Objects</th>
                                <th style={{ padding: '10px 8px' }}>Granted Privileges (DCL)</th>
                                <th style={{ padding: '10px 8px' }}>Lecture Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(dclData.grants || [
                                { role: "Customer (Role 1)", target_objects: "orders, cart_items, PAYMENT_TRANSACTION", privileges: "SELECT (own), INSERT (payments, orders)", lecture_reference: "Lecture Note 2 & 8" },
                                { role: "Store Manager (Role 2)", target_objects: "v_top_selling_products, v_category_order_totals", privileges: "SELECT (analytics views), UPDATE (inventory)", lecture_reference: "Lecture Note 4 & 8" },
                                { role: "System Administrator (Role 3)", target_objects: "ALL VIEWS, audit_logs, users, roles", privileges: "ALL PRIVILEGES, GRANT OPTION, REVOKE", lecture_reference: "Lecture Note 5 & 8" },
                                { role: "analytics_viewer (DB Role)", target_objects: "4 Virtual Views (05_analytics.sql)", privileges: "GRANT SELECT ON VIEWS", lecture_reference: "Lecture Note 8" },
                            ]).map((g, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-main)' }}>
                                        {g.role}
                                    </td>
                                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)' }}>
                                        {g.target_objects}
                                    </td>
                                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                        <code>{g.privileges}</code>
                                    </td>
                                    <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {g.lecture_reference}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Audit Logs Trigger Trail */}
                {dclData.recent_audit_logs?.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                            Recent Security &amp; Payment Audit Trail (Lecture Note 5 Triggers):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {dclData.recent_audit_logs.slice(0, 4).map((log, idx) => (
                                <div key={idx} style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '8px' }}>[{log.event_action}]</span>
                                        <span style={{ color: 'var(--text-main)' }}>{log.event_details}</span>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                        {log.created_at ? String(log.created_at).replace('T', ' ').split('.')[0] : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
