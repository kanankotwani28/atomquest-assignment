import axios from 'axios';

// Why a base instance: you set the base URL once here.
// Every API file imports this — if you ever change the URL,
// you change it in exactly one place.
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor: before every request, attach the token
// This runs automatically — no need to manually add headers in every call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: if any request gets a 401,
// clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;