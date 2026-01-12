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
    <div className="flex items-center gap-4 px-6 py-5 border-b border-sidebar-border">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/12">
        <Building2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tenant
        </span>
        <Badge variant="secondary" className="w-fit text-[13px]">
          {tenantId}
        </Badge>
      </div>
    </div>
  );
}
