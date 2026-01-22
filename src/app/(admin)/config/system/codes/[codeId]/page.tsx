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
import { DataTable } from "@/components/ui/data-table";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetCodesResponse,
	GetCodeValuesDataResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchCode(tenantId: string, codeId: string) {
	const response = await fetch(`${BFF_ROUTES.codes}/${codeId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code");
	}

	return response.json() as Promise<GetCodesResponse>;
}

async function fetchCodeValues(tenantId: string, codeId: string) {
	const response = await fetch(`${BFF_ROUTES.codes}/${codeId}/codevalues`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code values");
	}

	return response.json() as Promise<GetCodeValuesDataResponse[]>;
}

export default function CodeDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const codeId = params.codeId as string;

	const codeQuery = useQuery({
		queryKey: ["code", tenantId, codeId],
		queryFn: () => fetchCode(tenantId, codeId),
		enabled: Boolean(tenantId) && Boolean(codeId),
	});

	const valuesQuery = useQuery({
		queryKey: ["code-values", tenantId, codeId],
		queryFn: () => fetchCodeValues(tenantId, codeId),
		enabled: Boolean(tenantId) && Boolean(codeId),
	});

	const valueColumns = [
		{
			header: "Value",
			cell: (value: GetCodeValuesDataResponse) => (
				<div>
					<div className="font-medium">{value.name || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{value.description || "No description"}
					</div>
				</div>
			),
		},
		{
			header: "Status",
			cell: (value: GetCodeValuesDataResponse) => (
				<Badge variant={value.active === false ? "secondary" : "success"}>
					{value.active === false ? "Inactive" : "Active"}
				</Badge>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<PageShell
			title="Code Details"
			subtitle="Review code values and metadata"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/system/codes">Back to Codes</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>{codeQuery.data?.name || "Code"}</CardTitle>
					<CardDescription>Read-only view of code values.</CardDescription>
				</CardHeader>
				<CardContent>
					{(codeQuery.isLoading || valuesQuery.isLoading) && (
						<div className="py-6 text-center text-muted-foreground">
							Loading code details...
						</div>
					)}
					{(codeQuery.error || valuesQuery.error) && (
						<div className="py-6 text-center text-destructive">
							Failed to load code details. Please try again.
						</div>
					)}
					{!codeQuery.isLoading &&
						!valuesQuery.isLoading &&
						!codeQuery.error &&
						!valuesQuery.error && (
							<DataTable
								data={valuesQuery.data || []}
								columns={valueColumns}
								getRowId={(value) => value.id ?? value.name ?? "code-value"}
								emptyMessage="No code values found."
							/>
						)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
