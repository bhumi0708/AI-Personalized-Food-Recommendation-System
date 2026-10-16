/**
 * Centralized API configuration for FoodAI Frontend.
 * Points by default to the FastAPI backend running at http://127.0.0.1:8001/api,
 * with override support via the VITE_API_BASE_URL environment variable.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('foodai_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export default API_BASE;
