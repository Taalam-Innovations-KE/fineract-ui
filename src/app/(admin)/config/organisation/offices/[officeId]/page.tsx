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
import type { OfficeData } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchOffice(tenantId: string, officeId: string) {
	const response = await fetch(`${BFF_ROUTES.offices}/${officeId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch office");
	}

	return response.json() as Promise<OfficeData>;
}

export default function OfficeDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const officeId = params.officeId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["office", tenantId, officeId],
		queryFn: () => fetchOffice(tenantId, officeId),
		enabled: Boolean(tenantId) && Boolean(officeId),
	});

	return (
		<PageShell
			title="Office Details"
			subtitle="Inspect submitted office information"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/organisation/offices">Back to Offices</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Office Profile</CardTitle>
					<CardDescription>
						Read-only view of office information.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading office details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load office details. Please try again.
						</div>
					)}
					{!isLoading && !error && data && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Office Name
								</div>
								<div className="text-lg font-semibold">{data.name || "—"}</div>
								<div className="text-sm text-muted-foreground">
									{data.nameDecorated || ""}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Office Type
								</div>
								<Badge variant={data.parentId ? "secondary" : "default"}>
									{data.parentId ? "Branch" : "Head"}
								</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Parent Office
								</div>
								<div className="text-sm">{data.parentName || "—"}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Opening Date
								</div>
								<div className="text-sm">{data.openingDate || "—"}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									External ID
								</div>
								<div className="text-sm">
									{data.externalId ? String(data.externalId) : "—"}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
