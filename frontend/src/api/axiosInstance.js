// src/api/axiosInstance.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to attach JWT and Admin credentials
api.interceptors.request.use(
    (config) => {
        // 1. Attach standard JWT token for authenticated users[cite: 1]
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 2. Attach Admin Key for specific endpoints
        // FIXED: Added parentheses to ensure the key is only attached if it exists AND the route matches.
        const adminKey = localStorage.getItem('adminKey');
        const isProtectedPath = config.url.includes('/admin') || config.url.includes('/plagiarism');
        
        if (adminKey && isProtectedPath) {
            config.headers['x-admin-key'] = adminKey;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;