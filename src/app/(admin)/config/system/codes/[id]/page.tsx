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
import { DataTable } from "@/components/ui/data-table";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetCodesResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchCode(
	tenantId: string,
	id: string,
): Promise<GetCodesResponse> {
	const response = await fetch(`${BFF_ROUTES.codes}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code");
	}

	return response.json();
}

export default function CodeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();

	const {
		data: code,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["code", tenantId, id],
		queryFn: () => fetchCode(tenantId, id),
	});

	if (isLoading) {
		return (
			<PageShell title="Code Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading code details...
				</div>
			</PageShell>
		);
	}

	if (error || !code) {
		return (
			<PageShell title="Code Details">
				<div className="py-6 text-center text-destructive">
					Failed to load code details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Code: ${code.name}`}
			subtitle="View code details and values"
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Code Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Name</label>
								<p className="text-lg font-semibold">{code.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">System Defined</label>
								<p>
									{code.systemDefined ? (
										<Badge variant="secondary">Yes</Badge>
									) : (
										<Badge variant="outline">No</Badge>
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Code values not implemented due to type issues */}
			</div>
		</PageShell>
	);
}
