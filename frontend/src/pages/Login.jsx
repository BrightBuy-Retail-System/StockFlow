import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await api.post('/auth_cart/login', { email, password });
            const data = response.data;

            if (response.status === 200) {
                if (data.access_token) {
                    localStorage.setItem('token', data.access_token);
                }
                localStorage.setItem('user', JSON.stringify(data.user));

                const roleId = Number(data.user?.role_id);
                if (roleId === 1) {
                    navigate('/customer-dashboard');
                } else if (roleId === 2) {
                    navigate('/manager-dashboard');
                } else if (roleId === 3) {
                    navigate('/system-administrator');
                } else {
                    navigate('/');
                }
            } else {
                setMessage(data.message || "Invalid credentials. Please try again.");
            }

        } catch (error) {
            console.error("Login error:", error);
            setMessage(error.response?.data?.message || "An error occurred during login. Please try again.");

        } finally {
            setLoading(false);
        }

    }

    return (
        <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Welcome to BrightBuy</h2>
            <p style={{ color: 'var(--text-muted)' }}>Customer accounts, authentication, and shopping carts.</p>
            {message && <p style={{ margin: '12px 0', color: message.startsWith('Login') ? 'green' : 'crimson' }}>{message}</p>}

            <form onSubmit={handleSubmit}>

                <label>Email:
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value) }} required />
                </label>
                <br />

                <label>Password:
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value) }} required />
                </label>
                <br />

                <button type="submit" disabled={loading}> {loading ? 'Logging in...' : 'Login'}</button>
            </form>
        </div>


    );
}
