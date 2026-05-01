import axios from 'axios';

/**
 * Configuration for the API Base URL.
 * Uses Vite environment variables for flexibility between development and production.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor
 * This ensures that every outgoing request is checked for authentication requirements.
 */
api.interceptors.request.use(
    (config) => {
        // 1. Retrieve the standard JWT token from localStorage.
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 2. Handle Admin-specific credentials for protected routes.
        const adminKey = localStorage.getItem('adminKey');
        
        // Check if the current request is targeting admin or plagiarism endpoints[cite: 1].
        const isProtectedPath = config.url.includes('/admin') || config.url.includes('/plagiarism');
        
        // Attach the x-admin-key header only if the key exists and the path is protected[cite: 1].
        if (adminKey && isProtectedPath) {
            config.headers['x-admin-key'] = adminKey;
        }

        return config;
    },
    (error) => {
        // Handle request errors before they are sent[cite: 1].
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor (Optional but Recommended)
 * Useful for global error handling, such as redirecting on 401 Unauthorized[cite: 1].
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Logic to handle expired tokens or unauthorized access could go here[cite: 1].
            console.warn("Unauthorized request - check authentication status.");
        }
        return Promise.reject(error);
    }
);

export default api;