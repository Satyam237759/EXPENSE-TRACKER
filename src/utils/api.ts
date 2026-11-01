/**
 * SmartSpend API Client & Auth Interceptor
 * Manages JWT/session tokens, localStorage caching, and automatically adds
 * Bearer authorization headers to all /api/ requests.
 */

import { User } from '../types.ts';

const TOKEN_KEY = 'smartspend_token';
const USER_KEY = 'smartspend_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

// Global fetch interceptor so all existing and child views automatically send Bearer token
let isInterceptorInstalled = false;
export function setupFetchInterceptor(onUnauthorized?: () => void) {
  if (isInterceptorInstalled || typeof window === 'undefined') return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

    const token = getStoredToken();

    // Only intercept local API requests
    if (url.startsWith('/api/') && token) {
      const headers = new Headers(
        init?.headers || (typeof input === 'object' && 'headers' in input ? (input as Request).headers : {})
      );

      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const modifiedInit: RequestInit = {
        ...init,
        headers,
      };

      const response = await originalFetch(input, modifiedInit);

      // If token expired or invalid (401), clear credentials and alert listener
      if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        removeStoredToken();
        removeStoredUser();
        if (onUnauthorized) {
          onUnauthorized();
        }
      }

      return response;
    }

    return originalFetch(input, init);
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json();
  if (data.success && data.token && data.user) {
    setStoredToken(data.token);
    setStoredUser(data.user);
  }
  return data;
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password, currency: 'INR' }),
  });
  const data = await res.json();
  if (data.success && data.token && data.user) {
    setStoredToken(data.token);
    setStoredUser(data.user);
  }
  return data;
}

export async function checkAuth(): Promise<{ authenticated: boolean; user?: User }> {
  const token = getStoredToken();
  if (!token) {
    return { authenticated: false };
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.authenticated && data.user) {
      setStoredUser(data.user);
      return { authenticated: true, user: data.user };
    }
  } catch (e) {
    console.error('Auth verification failed', e);
  }
  removeStoredToken();
  removeStoredUser();
  return { authenticated: false };
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  removeStoredToken();
  removeStoredUser();
}
