import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const testAccounts = [
        {
            role: "Role 1: Customer",
            email: "customer@stockflow.test",
            password: "password123",
            badge: "Customer View",
            badgeColor: "var(--primary)",
            bgColor: "var(--primary-light)",
            description: "Personal orders, lifetime spending, and payment checkout settlement."
        },
        {
            role: "Role 2: Store Manager",
            email: "manager@stockflow.test",
            password: "password123",
            badge: "Manager View",
            badgeColor: "var(--accent)",
            bgColor: "var(--accent-light)",
            description: "Top-selling products ranking (DENSE_RANK) and category totals (WITH ROLLUP)."
        },
        {
            role: "Role 3: Administrator",
            email: "admin@stockflow.test",
            password: "password123",
            badge: "Admin View",
            badgeColor: "var(--success-text)",
            bgColor: "var(--success-bg)",
            description: "Executive quarterly moving averages, corporate leaderboard, and DCL security grants."
        }
    ];

    async function doLogin(emailToUse, passwordToUse) {
        setLoading(true);
        setMessage("");

        try {
            const response = await fetch('http://localhost:5000/api/auth_cart/login', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.access_token) {
                    localStorage.setItem('token', data.access_token);
                }
                localStorage.setItem('user', JSON.stringify(data.user));

                // Navigate directly to Analytics tab where their specific role interface is loaded
                navigate('/analytics');
            } else {
                setMessage(data.message || "Invalid credentials. Please try again.");
            }
        } catch (error) {
            console.error("Login error:", error);
            setMessage("An error occurred during login. Ensure backend server is running on port 5000.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        await doLogin(email, password);
    }

    function handleQuickFill(acc) {
        setEmail(acc.email);
        setPassword(acc.password);
        doLogin(acc.email, acc.password);
    }

    return (
        <div style={{ maxWidth: '680px', margin: '36px auto', padding: '0 16px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                    Sign In to StockFlow
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '4px' }}>
                    Role-Based Access Control • Lecture Note 8 (DCL Authorization &amp; Security)
                </p>
            </div>

            {/* Standard Login Form Card */}
            <div className="card" style={{ padding: '30px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                {message && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '18px',
                        fontSize: '0.85rem',
                        background: message.toLowerCase().includes('successful') ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: message.toLowerCase().includes('successful') ? 'var(--success-text)' : 'var(--danger-text)',
                        border: `1px solid ${message.toLowerCase().includes('successful') ? 'var(--success-border)' : 'var(--danger-border)'}`
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                            Email Address:
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="e.g. customer@stockflow.test"
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                            Password:
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="password123"
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '8px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.925rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In to StockFlow'}
                    </button>
                </form>

                {/* Quick 1-Click Role Accounts */}
                <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                            Demo Test Accounts (Click to Fill &amp; Sign In)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Password: <code>password123</code>
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {testAccounts.map((acc, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleQuickFill(acc)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = acc.badgeColor;
                                    e.currentTarget.style.background = acc.bgColor;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.background = 'var(--bg-subtle)';
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                            {acc.role}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: acc.bgColor, color: acc.badgeColor }}>
                                            {acc.badge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        <code>{acc.email}</code> • {acc.description}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        background: 'var(--bg-card)',
                                        border: `1px solid ${acc.badgeColor}`,
                                        color: acc.badgeColor,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Log In →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
