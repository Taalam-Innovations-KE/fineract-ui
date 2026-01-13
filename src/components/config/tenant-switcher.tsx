"use client";

import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenantStore } from "@/store/tenant";

/**
 * Tenant switcher component
 * Displays current tenant and allows switching (future: dropdown for multiple tenants)
 */
export function TenantSwitcher() {
	const { tenantId } = useTenantStore();

	return (
		<div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-sidebar-border">
			<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/12">
				<Building2 className="h-4 w-4 text-primary" />
			</div>
			<div className="flex flex-col">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Tenant
				</span>
				<Badge variant="secondary" className="w-fit text-[12px] px-1.5 py-0">
					{tenantId}
				</Badge>
			</div>
		</div>
	);
}
