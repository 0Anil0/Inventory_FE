export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3011/api`
    : 'http://localhost:3011/api');

export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  ME: '/auth/me',
} as const;

export const USER_ENDPOINTS = {
  USERS: '/users',
  ROLES: '/roles',
} as const;
