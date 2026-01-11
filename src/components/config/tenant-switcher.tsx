'use client';

import { useTenantStore } from '@/store/tenant';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

/**
 * Tenant switcher component
 * Displays current tenant and allows switching (future: dropdown for multiple tenants)
 */
export function TenantSwitcher() {
  const { tenantId } = useTenantStore();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Building2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">Tenant</span>
        <Badge variant="secondary" className="w-fit text-xs">
          {tenantId}
        </Badge>
      </div>
    </div>
  );
}
