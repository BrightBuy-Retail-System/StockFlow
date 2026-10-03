import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await api.post('/auth_cart/register', { 
                username: name, 
                password: password, 
                email: email 
            });
            const data = response.data;

            if (response.status === 201 || response.status === 200) {
                if (data.access_token) {
                    localStorage.setItem('token', data.access_token);
                }
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/customer-dashboard');
            } else {
                setMessage(data.message || "Invalid credentials. Please try again.");
            }

        } catch (error) {
            console.error("Registration error:", error);
            setMessage(error.response?.data?.message || "An error occurred during registration. Please try again.");

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

                <label>Username:
                    <input type="text" value={name} onChange={(e) => { setName(e.target.value) }} required />
                </label>
                <br />

                <label>Password:
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value) }} required />
                </label>
                <br />

                <label>Email:
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value) }} required />
                </label>
                <br />

                <button type="submit" disabled={loading}> {loading ? 'Registering...' : 'Register'}</button>
            </form>
        </div>


    );
}
