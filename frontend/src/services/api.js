import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
    : '/api'
});

let tokenGetter = null;
let currentUserId = null;
let currentUserEmail = null;
let currentUserName = null;

export const setTokenGetter = (fn) => {
  tokenGetter = fn;
};

export const setCurrentUser = (info) => {
  if (typeof info === 'string') {
    currentUserId = info;
  } else if (info) {
    currentUserId = info.id || null;
    currentUserEmail = info.email || null;
    currentUserName = info.name || null;
  }
};

export const setCurrentUserId = (id) => {
  currentUserId = id;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(async (config) => {
  let token = null;

  if (tokenGetter) {
    try {
      token = await tokenGetter();
    } catch (e) {}
  }

  if (!token && window.Clerk && window.Clerk.session) {
    try {
      token = await window.Clerk.session.getToken();
    } catch (e) {}
  }

  if (!token) {
    token = localStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach user identity headers in development
  if (currentUserId) {
    config.headers['x-user-id'] = currentUserId;
  }
  if (currentUserEmail) {
    config.headers['x-user-email'] = currentUserEmail;
  }
  if (currentUserName) {
    config.headers['x-user-name'] = currentUserName;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return Promise.reject(error.response ? error.response.data : { message: 'Network Error' });
});

export default api;
