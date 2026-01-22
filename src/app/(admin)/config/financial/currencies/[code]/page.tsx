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
import type { CurrencyConfigurationData } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchCurrencies(tenantId: string) {
	const response = await fetch(BFF_ROUTES.currencies, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch currencies");
	}

	return response.json() as Promise<CurrencyConfigurationData>;
}

export default function CurrencyDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const code = params.code as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: () => fetchCurrencies(tenantId),
		enabled: Boolean(tenantId),
	});

	const currency =
		data?.currencyOptions?.find((option) => option.code === code) ||
		data?.selectedCurrencyOptions?.find((option) => option.code === code) ||
		null;

	const isActive =
		data?.selectedCurrencyOptions?.some((option) => option.code === code) ||
		false;

	return (
		<PageShell
			title="Currency Details"
			subtitle="Inspect currency metadata"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/financial/currencies">Back to Currencies</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Currency Overview</CardTitle>
					<CardDescription>Read-only view of currency data.</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading currency details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load currency details. Please try again.
						</div>
					)}
					{!isLoading && !error && currency && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									ISO Code
								</div>
								<div className="text-lg font-semibold">{currency.code}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Status
								</div>
								<Badge variant={isActive ? "success" : "secondary"}>
									{isActive ? "Active" : "Inactive"}
								</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Name
								</div>
								<div className="text-sm">
									{currency.name || currency.displayLabel || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Decimal Places
								</div>
								<div className="text-sm">{currency.decimalPlaces ?? "—"}</div>
							</div>
						</div>
					)}
					{!isLoading && !error && !currency && (
						<div className="py-6 text-center text-muted-foreground">
							Currency not found.
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
