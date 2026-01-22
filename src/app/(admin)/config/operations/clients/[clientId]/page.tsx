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
	GetClientsClientIdIdentifiersResponse,
	GetClientsClientIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchClient(tenantId: string, clientId: string) {
	const response = await fetch(`${BFF_ROUTES.clients}/${clientId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client details");
	}

	return response.json() as Promise<GetClientsClientIdResponse>;
}

async function fetchClientIdentifiers(tenantId: string, clientId: string) {
	const response = await fetch(
		`/api/fineract/clients/${clientId}/identifiers`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch client identifiers");
	}

	return response.json() as Promise<GetClientsClientIdIdentifiersResponse[]>;
}

export default function ClientDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const clientId = params.clientId as string;

	const clientQuery = useQuery({
		queryKey: ["client", tenantId, clientId],
		queryFn: () => fetchClient(tenantId, clientId),
		enabled: Boolean(tenantId) && Boolean(clientId),
	});

	const identifiersQuery = useQuery({
		queryKey: ["client-identifiers", tenantId, clientId],
		queryFn: () => fetchClientIdentifiers(tenantId, clientId),
		enabled: Boolean(tenantId) && Boolean(clientId),
	});

	const identifierColumns = [
		{
			header: "Document",
			cell: (identifier: GetClientsClientIdIdentifiersResponse) => (
				<div>
					<div className="font-medium">
						{identifier.documentType?.name || "Document"}
					</div>
					<div className="text-xs text-muted-foreground">
						{identifier.description || ""}
					</div>
				</div>
			),
		},
		{
			header: "Value",
			cell: (identifier: GetClientsClientIdIdentifiersResponse) => (
				<span className="font-mono">{identifier.documentKey || "—"}</span>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<PageShell
			title="Client Details"
			subtitle="Inspect submitted client information"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/operations/clients">Back to Clients</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Profile Overview</CardTitle>
					<CardDescription>Read-only view of client data.</CardDescription>
				</CardHeader>
				<CardContent>
					{clientQuery.isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading client details...
						</div>
					)}
					{clientQuery.error && (
						<div className="py-6 text-center text-destructive">
							Failed to load client details. Please try again.
						</div>
					)}
					{!clientQuery.isLoading && !clientQuery.error && clientQuery.data && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Client Name
								</div>
								<div className="text-lg font-semibold">
									{clientQuery.data.displayName || "—"}
								</div>
								<div className="text-sm text-muted-foreground">
									{clientQuery.data.accountNo || "No account number"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Status
								</div>
								<Badge
									variant={clientQuery.data.active ? "success" : "secondary"}
								>
									{clientQuery.data.active ? "Active" : "Pending"}
								</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Office
								</div>
								<div className="text-sm">
									{clientQuery.data.officeName || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Email
								</div>
								<div className="text-sm">
									{clientQuery.data.emailAddress || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Activation Date
								</div>
								<div className="text-sm">
									{clientQuery.data.activationDate || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									External ID
								</div>
								<div className="text-sm">
									{clientQuery.data.externalId || "—"}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Identifiers</CardTitle>
					<CardDescription>
						Registered identification documents.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{identifiersQuery.isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading identifiers...
						</div>
					)}
					{identifiersQuery.error && (
						<div className="py-6 text-center text-destructive">
							Failed to load identifiers. Please try again.
						</div>
					)}
					{!identifiersQuery.isLoading && !identifiersQuery.error && (
						<DataTable
							data={identifiersQuery.data || []}
							columns={identifierColumns}
							getRowId={(identifier) =>
								identifier.id ?? identifier.documentKey ?? "identifier"
							}
							emptyMessage="No identifiers available."
						/>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
