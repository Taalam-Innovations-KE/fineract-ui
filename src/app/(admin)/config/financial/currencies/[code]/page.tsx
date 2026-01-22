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
import type {
	CurrencyConfigurationData,
	CurrencyData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchCurrencies(
	tenantId: string,
): Promise<CurrencyConfigurationData> {
	const response = await fetch(BFF_ROUTES.currencies, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch currencies");
	}

	return response.json();
}

export default function CurrencyDetailPage({
	params,
}: {
	params: Promise<{ code: string }>;
}) {
	const { code } = use(params);
	const { tenantId } = useTenantStore();

	const {
		data: currenciesConfig,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: () => fetchCurrencies(tenantId),
	});

	const currency = currenciesConfig?.currencyOptions?.find(
		(c: CurrencyData) => c.code === code,
	);

	if (isLoading) {
		return (
			<PageShell title="Currency Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading currency details...
				</div>
			</PageShell>
		);
	}

	if (error || !currency) {
		return (
			<PageShell title="Currency Details">
				<div className="py-6 text-center text-destructive">
					Failed to load currency details. Please try again.
				</div>
			</PageShell>
		);
	}

	const isActive = currenciesConfig?.selectedCurrencyOptions?.some(
		(c: CurrencyData) => c.code === code,
	);

	return (
		<PageShell
			title={`Currency: ${currency.name}`}
			subtitle="View currency details"
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Currency Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Name</label>
								<p className="text-lg font-semibold">{currency.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Code</label>
								<p>{currency.code}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Display Symbol</label>
								<p>{currency.displaySymbol || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Decimal Places</label>
								<p>{currency.decimalPlaces || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">In Multiples Of</label>
								<p>{currency.inMultiplesOf || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Status</label>
								<p>
									{isActive ? (
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
