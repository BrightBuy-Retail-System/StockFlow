import axios from 'axios';
 
const getBaseUrl = () => {
    let rawUrl = import.meta.env.VITE_API_URL;
    if (!rawUrl) return '/api';
    rawUrl = rawUrl.trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('/')) {
        rawUrl = `https://${rawUrl}`;
    }
    const cleanUrl = rawUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically inject JWT Bearer token into outgoing requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercept responses: if 401 Unauthorized, clear stale session
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Allow callers to opt-out of an automatic redirect by setting `skipAuthRedirect` on the request config
            if (error.config && error.config.skipAuthRedirect) {
                return Promise.reject(error);
            }
            // Only redirect if not already on the login page
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;