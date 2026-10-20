const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() { return localStorage.getItem('taskmaster_token'); }
export function setToken(token) {
  if (token) localStorage.setItem('taskmaster_token', token);
  else localStorage.removeItem('taskmaster_token');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
export const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
