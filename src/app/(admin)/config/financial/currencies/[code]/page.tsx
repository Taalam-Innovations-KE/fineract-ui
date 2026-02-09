"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	CurrencyConfigurationData,
	CurrencyData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

function resolveTenantId(tenantId?: string | null): string {
	const normalized = tenantId?.trim();
	return normalized && normalized.length > 0 ? normalized : "default";
}

async function getResponseErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	const payload = await response.json().catch(() => null);
	if (payload && typeof payload === "object" && "message" in payload) {
		const message = (payload as { message?: unknown }).message;
		if (typeof message === "string" && message.trim().length > 0) {
			return message;
		}
	}
	return fallback;
}

async function fetchCurrencies(
	tenantId: string,
): Promise<CurrencyConfigurationData> {
	const response = await fetch(BFF_ROUTES.currencies, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(response, "Failed to fetch currencies"),
		);
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
	const effectiveTenantId = resolveTenantId(tenantId);

	const {
		data: currenciesConfig,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["currencies", effectiveTenantId],
		queryFn: () => fetchCurrencies(effectiveTenantId),
	});

	const currency = currenciesConfig?.currencyOptions?.find(
		(c: CurrencyData) => c.code === code,
	);

	if (isLoading) {
		return (
			<PageShell
				title="Currency Details"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/financial/currencies">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Currencies
						</Link>
					</Button>
				}
			>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-56" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={`currency-detail-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-5 w-40" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (error || !currency) {
		return (
			<PageShell
				title="Currency Details"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/financial/currencies">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Currencies
						</Link>
					</Button>
				}
			>
				<div className="py-6 text-center text-destructive">
					{(error as Error)?.message ||
						"Failed to load currency details. Please try again."}
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
			actions={
				<Button asChild variant="outline">
					<Link href="/config/financial/currencies">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Currencies
					</Link>
				</Button>
			}
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
