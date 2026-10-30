import axios from 'axios';

const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api' });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e) => e.response?.data?.message || e.message;
export const kes = (n) => 'KES ' + Number(n || 0).toLocaleString();
export const day = (d) => new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
export default api;
