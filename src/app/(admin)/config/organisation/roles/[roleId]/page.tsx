"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetRolesResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchRole(tenantId: string, roleId: string) {
	const response = await fetch(`${BFF_ROUTES.roles}/${roleId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch role");
	}

	return response.json() as Promise<GetRolesResponse>;
}

export default function RoleDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const roleId = params.roleId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["role", tenantId, roleId],
		queryFn: () => fetchRole(tenantId, roleId),
		enabled: Boolean(tenantId) && Boolean(roleId),
	});

	const isAdminRole = (role?: GetRolesResponse | null) =>
		role?.name?.toLowerCase().includes("admin") ||
		role?.name?.toLowerCase().includes("super");

	return (
		<PageShell
			title="Role Details"
			subtitle="Inspect role setup and description"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/organisation/roles">Back to Roles</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Role Overview</CardTitle>
					<CardDescription>Read-only view of role information.</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading role details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load role details. Please try again.
						</div>
					)}
					{!isLoading && !error && data && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Role Name
								</div>
								<div className="text-lg font-semibold">{data.name}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Type
								</div>
								<Badge
									variant={isAdminRole(data) ? "destructive" : "secondary"}
								>
									{isAdminRole(data) ? "Admin" : "Operational"}
								</Badge>
							</div>
							<div className="md:col-span-2">
								<div className="text-xs uppercase text-muted-foreground">
									Description
								</div>
								<div className="text-sm">
									{data.description || "No description provided."}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
