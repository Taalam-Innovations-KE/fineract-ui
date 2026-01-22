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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetClientsClientIdResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchClient(
	tenantId: string,
	id: string,
): Promise<GetClientsClientIdResponse> {
	const response = await fetch(`${BFF_ROUTES.clients}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client");
	}

	return response.json();
}

export default function ClientDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();

	const {
		data: client,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["client", tenantId, id],
		queryFn: () => fetchClient(tenantId, id),
	});

	if (isLoading) {
		return (
			<PageShell title="Client Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading client details...
				</div>
			</PageShell>
		);
	}

	if (error || !client) {
		return (
			<PageShell title="Client Details">
				<div className="py-6 text-center text-destructive">
					Failed to load client details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Client: ${client.displayName}`}
			subtitle="View client details"
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Client Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Display Name</label>
								<p className="text-lg font-semibold">{client.displayName}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Account Number</label>
								<p>{client.accountNo}</p>
							</div>
							<div>
								<label className="text-sm font-medium">First Name</label>
								<p>{client.firstname || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Last Name</label>
								<p>{client.lastname || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Office</label>
								<p>{client.officeName || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Status</label>
								<p>
									{client.active ? (
										<Badge variant="success">Active</Badge>
									) : (
										<Badge variant="secondary">Inactive</Badge>
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
