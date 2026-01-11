'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TenantState {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
}

/**
 * Tenant store for managing multi-tenancy context
 * Persisted to localStorage for session persistence
 */
export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: 'default',
      setTenantId: (tenantId: string) => set({ tenantId }),
    }),
    {
      name: 'fineract-tenant-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
