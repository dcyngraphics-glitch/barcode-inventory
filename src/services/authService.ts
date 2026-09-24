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

export interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  hardwareConcurrency: number;
  memory?: number;
  touchPoints: number;
  referrer: string;
}

export function collectDeviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    memory: nav.deviceMemory,
    touchPoints: navigator.maxTouchPoints || 0,
    referrer: document.referrer || 'direct',
  };
}

export async function loginWithDashboard(email: string, password: string): Promise<LoginResponse> {
  const deviceInfo = collectDeviceInfo();
  const res = await fetch(`${DASHBOARD_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, device: deviceInfo }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid credentials');
    }
    throw new Error(`Login failed: ${res.statusText}`);
  }

  return res.json();
}

export async function trackDeviceWithDashboard(token: string): Promise<void> {
  try {
    const deviceInfo = collectDeviceInfo();
    await fetch(`${DASHBOARD_API_URL}/api/device/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ device: deviceInfo }),
    });
  } catch {
    // Silently fail — device tracking is non-critical
  }
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
