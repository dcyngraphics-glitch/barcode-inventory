const DASHBOARD_API_URL = import.meta.env.VITE_DASHBOARD_API_URL || 'http://localhost:5000';

export type AuthStatus = 'loading' | 'unauthenticated' | 'pending' | 'active' | 'locked';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  status: 'pending' | 'active' | 'locked';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function loginWithDashboard(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${DASHBOARD_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid credentials');
    }
    throw new Error(`Login failed: ${res.statusText}`);
  }

  return res.json();
}

export async function validateToken(token: string): Promise<{ valid: boolean; user?: AuthUser }> {
  const res = await fetch(`${DASHBOARD_API_URL}/api/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    return { valid: false };
  }

  return res.json();
}

export function getStoredToken(): string | null {
  return localStorage.getItem('barcode_auth_token');
}

export function storeToken(token: string): void {
  localStorage.setItem('barcode_auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('barcode_auth_token');
}
