export default function OverviewPage() {
    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    System Overview
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    BrightBuy Retail Inventory & Order Management Control Center
                </p>
            </div>

            <div className="card-grid">
                <div className="card">
                    <div className="card-title">Backend Architecture</div>
                    <div className="card-value" style={{ fontSize: '1.25rem' }}>Flask REST API</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                        Port 5000 · Connection Pool Enabled
                    </p>
                </div>

                <div className="card">
                    <div className="card-title">Frontend Client</div>
                    <div className="card-value" style={{ fontSize: '1.25rem' }}>React (Vite SPA)</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                        Port 5173 · React Router v6
                    </p>
                </div>

                <div className="card">
                    <div className="card-title">Database Engine</div>
                    <div className="card-value" style={{ fontSize: '1.25rem' }}>MySQL InnoDB</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                        14 Tables · 5 Functional Domains
                    </p>
                </div>
            </div>

            <div className="card">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
                    Engineering Modules
                </h2>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Catalog & Variants:</strong> Product listing, filtering, and SKU inventory.</li>
                    <li><strong>Authentication & Cart:</strong> User sessions, role management, and shopping basket.</li>
                    <li><strong>Orders & Checkout:</strong> Atomic checkout transactions and audit trails.</li>
                    <li><strong>Texas Logistics:</strong> City lead-time calculations and delivery tracking.</li>
                    <li><strong>Payments & Analytics:</strong> Transaction logging and executive reporting.</li>
                </ul>
            </div>
        </div>
    );
}