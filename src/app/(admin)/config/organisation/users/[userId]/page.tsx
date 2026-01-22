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
import type { GetUsersResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchUser(tenantId: string, userId: string) {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch user");
	}

	return response.json() as Promise<GetUsersResponse>;
}

export default function UserDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const userId = params.userId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["user", tenantId, userId],
		queryFn: () => fetchUser(tenantId, userId),
		enabled: Boolean(tenantId) && Boolean(userId),
	});

	return (
		<PageShell
			title="User Details"
			subtitle="Review submitted user profile information"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/organisation/users">Back to Users</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Profile Overview</CardTitle>
					<CardDescription>
						Read-only view of this user profile.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading user details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load user details. Please try again.
						</div>
					)}
					{!isLoading && !error && data && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Name
								</div>
								<div className="text-lg font-semibold">
									{data.firstname} {data.lastname}
								</div>
								<div className="text-sm text-muted-foreground">
									@{data.username || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Office
								</div>
								<div className="text-sm">
									{data.officeName || "No office assigned"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Email
								</div>
								<div className="text-sm">{data.email || "—"}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Roles
								</div>
								<div className="flex flex-wrap gap-2">
									{data.selectedRoles?.length ? (
										data.selectedRoles.map((role) => (
											<Badge key={role.id} variant="secondary">
												{role.name}
											</Badge>
										))
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
