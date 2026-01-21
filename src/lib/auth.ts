const ADMIN_PASSWORD_KEY = 'admin_authenticated';
const ADMIN_PASSWORD = '123';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_PASSWORD_KEY) === 'true';
}

export function authenticateAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
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
