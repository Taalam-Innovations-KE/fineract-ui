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
import type { Staff } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchStaffMember(tenantId: string, staffId: string) {
	const response = await fetch(`${BFF_ROUTES.staff}/${staffId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch staff member");
	}

	return response.json() as Promise<Staff>;
}

export default function StaffDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const staffId = params.staffId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["staff", tenantId, staffId],
		queryFn: () => fetchStaffMember(tenantId, staffId),
		enabled: Boolean(tenantId) && Boolean(staffId),
	});

	return (
		<PageShell
			title="Staff Details"
			subtitle="Review submitted staff information"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/organisation/staff">Back to Staff</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Staff Profile</CardTitle>
					<CardDescription>
						Read-only view of this staff record.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading staff details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load staff details. Please try again.
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
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Office
								</div>
								<div className="text-sm">{data.office?.name || "—"}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Role
								</div>
								<Badge variant={data.loanOfficer ? "default" : "secondary"}>
									{data.loanOfficer ? "Loan Officer" : "Staff"}
								</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Status
								</div>
								<Badge variant={data.active ? "success" : "secondary"}>
									{data.active ? "Active" : "Inactive"}
								</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									External ID
								</div>
								<div className="text-sm">{data.externalId || "—"}</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
