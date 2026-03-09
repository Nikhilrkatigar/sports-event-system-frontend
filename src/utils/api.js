import axios from 'axios';

const PROD_API_FALLBACK = 'https://sports-event-system-backend.onrender.com/api';

const resolveBaseUrl = () => {
  const envBase = (process.env.REACT_APP_API_URL || '').trim();
  if (envBase) return envBase.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') return PROD_API_FALLBACK;
  return '/api';
};

const baseURL = resolveBaseUrl();
const mediaOrigin = /^https?:\/\//i.test(baseURL) ? new URL(baseURL).origin : '';

const normalizeUploads = (value) => {
  if (!mediaOrigin) return value;
  if (Array.isArray(value)) return value.map(normalizeUploads);
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = normalizeUploads(v);
    });
    return out;
  }
  if (typeof value === 'string' && value.startsWith('/uploads/')) {
    return `${mediaOrigin}${value}`;
  }
  return value;
};

const API = axios.create({
  baseURL,
  timeout: 30000
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => {
    response.data = normalizeUploads(response.data);
    return response;
  },
  (error) => Promise.reject(error)
);

export default API;
