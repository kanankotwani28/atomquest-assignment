import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  maxRedirects: 0,
});

// ── Request interceptor: attach JWT ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 session expiry handling ──
let sessionExpiredShown = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sessionExpiredShown) {
      sessionExpiredShown = true;

      // Clear stored credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Show re-login prompt instead of silently redirecting
      const shouldReLogin = window.confirm(
        'Your session has expired. Would you like to log in again?'
      );

      if (shouldReLogin) {
        window.location.href = '/login';
      } else {
        window.location.href = '/login';
      }

      // Reset flag after a brief delay to prevent multiple prompts
      setTimeout(() => { sessionExpiredShown = false; }, 3000);
    }
    return Promise.reject(error);
  }
);

export default api;