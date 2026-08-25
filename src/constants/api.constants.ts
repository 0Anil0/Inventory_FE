export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  ME: '/auth/me',
} as const;

export const USER_ENDPOINTS = {
  USERS: '/users',
  ROLES: '/roles',
} as const;
