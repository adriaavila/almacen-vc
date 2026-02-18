import { Area } from '@/types';

const ADMIN_PASSWORD_KEY = 'admin_authenticated';
const ADMIN_PASSWORD = '123';
const USER_AREA_KEY = 'user_area';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_PASSWORD_KEY) === 'true';
}

export function authenticateAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
      // Dispatch custom event to notify AdminGuard of auth change
      window.dispatchEvent(new Event('adminAuthChange'));
    }
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  }
}

// User area management
export function getUserArea(): Area | null {
  if (typeof window === 'undefined') return null;
  const area = localStorage.getItem(USER_AREA_KEY);
  if (area && (area === 'Cocina' || area === 'Cafetin' || area === 'Limpieza' || area === 'Las casas')) {
    return area as Area;
  }
  return null;
}

export function setUserArea(area: Area): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_AREA_KEY, area);
    // Dispatch custom event to notify components of area change
    window.dispatchEvent(new Event('userAreaChange'));
  }
}

export function clearUserArea(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_AREA_KEY);
    window.dispatchEvent(new Event('userAreaChange'));
  }
}
