"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { OfficeData } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchOffice(tenantId: string, id: string): Promise<OfficeData> {
	const response = await fetch(`${BFF_ROUTES.offices}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch office");
	}

	return response.json();
}

export default function OfficeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();

	const {
		data: office,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["office", tenantId, id],
		queryFn: () => fetchOffice(tenantId, id),
	});

	if (isLoading) {
		return (
			<PageShell title="Office Details">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								{Array.from({ length: 4 }).map((_, index) => (
									<div
										key={`office-detail-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-6 w-40" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (error || !office) {
		return (
			<PageShell title="Office Details">
				<div className="py-6 text-center text-destructive">
					Failed to load office details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell title={`Office: ${office.name}`} subtitle="View office details">
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Office Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Name</label>
								<p className="text-lg font-semibold">{office.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">External ID</label>
								<p>{office.externalId?.value || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Opening Date</label>
								<p>
									{office.openingDate?.[0]}-{office.openingDate?.[1]}-
									{office.openingDate?.[2] || "—"}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">Parent Office</label>
								<p>{office.parentName || "—"}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
