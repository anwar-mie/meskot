'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  preferredLocale: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  }) => void;
  clearSession: () => void;
  hasPermission: (code: string) => boolean;
  isStaff: () => boolean;
}

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'INVENTORY_MANAGER',
  'SALES_MANAGER',
  'DELIVERY_MANAGER',
  'DELIVERY_AGENT',
]);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
      hasPermission: (code) => {
        const user = get().user;
        if (!user) return false;
        if (user.roles.includes('SUPER_ADMIN')) return true;
        return user.permissions.includes(code);
      },
      isStaff: () => {
        const user = get().user;
        if (!user) return false;
        return user.roles.some((r) => STAFF_ROLES.has(r));
      },
    }),
    {
      name: 'meskot-auth-storage',
    },
  ),
);
