// src/api/axiosInstance.js
import axios from 'axios';

// Ensure this matches your backend port defined in server.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request Interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // If an admin key is stored, attach it for admin routes
        const adminKey = localStorage.getItem('adminKey');
        if (adminKey && config.url.includes('/admin') || config.url.includes('/plagiarism')) {
            config.headers['x-admin-key'] = adminKey;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;