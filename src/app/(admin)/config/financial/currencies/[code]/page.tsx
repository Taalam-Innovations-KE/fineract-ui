"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, CheckCircle2, Hash } from "lucide-react";
import Link from "next/link";
import { type ElementType, use, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	CurrencyConfigurationData,
	CurrencyData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
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

async function parseSubmitResponse<T>(
	response: Response,
	fallbackMessage: string,
): Promise<T> {
	const payload = (await response.json().catch(() => ({
		message: fallbackMessage,
		statusCode: response.status,
	}))) as T;

	if (!response.ok) {
		throw payload;
	}

	return payload;
}

async function updateCurrencies(tenantId: string, currencies: string[]) {
	const response = await fetch(BFF_ROUTES.currencies, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify({ currencies }),
	});

	return parseSubmitResponse(response, "Failed to update currencies");
}

function MetricCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: ElementType;
}) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
						<Icon className="h-5 w-5 text-primary" />
					</div>
					<div>
						<div className="text-2xl font-bold">{value}</div>
						<div className="text-sm text-muted-foreground">{label}</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-right text-sm font-medium">{value}</span>
		</div>
	);
}

function CurrencyDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={`currency-metric-skeleton-${index}`}>
						<CardContent className="space-y-2 pt-6">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-8 w-24" />
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-52" />
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								key={`currency-detail-row-skeleton-${index}`}
								className="grid grid-cols-2 gap-3"
							>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-24" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent className="space-y-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default function CurrencyDetailPage({
	params,
}: {
	params: Promise<{ code: string }>;
}) {
	const { code: routeCode } = use(params);
	const { tenantId } = useTenantStore();
	const effectiveTenantId = useMemo(
		() => resolveTenantId(tenantId),
		[tenantId],
	);
	const queryClient = useQueryClient();
	const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const code = routeCode.trim().toUpperCase();

	const currenciesQuery = useQuery({
		queryKey: ["currencies", effectiveTenantId],
		queryFn: () => fetchCurrencies(effectiveTenantId),
	});

	const activeCodes = useMemo(
		() =>
			(currenciesQuery.data?.selectedCurrencyOptions || [])
				.map((currency) => currency.code)
				.filter((currencyCode): currencyCode is string =>
					Boolean(currencyCode),
				),
		[currenciesQuery.data],
	);

	const deactivateMutation = useMutation({
		mutationFn: () => {
			const nextActiveCodes = activeCodes.filter(
				(activeCode) => activeCode.toUpperCase() !== code,
			);
			return updateCurrencies(effectiveTenantId, nextActiveCodes);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["currencies", effectiveTenantId],
			});
			setSubmitError(null);
			setDeactivateDialogOpen(false);
			toast.success(`Currency ${code} deactivated successfully`);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deactivateCurrency",
					endpoint: BFF_ROUTES.currencies,
					method: "PUT",
					tenantId: effectiveTenantId,
				}),
			);
		},
	});

	const currency =
		currenciesQuery.data?.selectedCurrencyOptions?.find(
			(c: CurrencyData) => c.code?.toUpperCase() === code,
		) ||
		currenciesQuery.data?.currencyOptions?.find(
			(c: CurrencyData) => c.code?.toUpperCase() === code,
		);

	if (currenciesQuery.isLoading) {
		return (
			<PageShell
				title="Currency Details"
				subtitle="View currency setup and manage activation"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/financial/currencies">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Currencies
						</Link>
					</Button>
				}
			>
				<CurrencyDetailSkeleton />
			</PageShell>
		);
	}

	if (currenciesQuery.error) {
		return (
			<PageShell
				title="Currency Details"
				subtitle="View currency setup and manage activation"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/financial/currencies">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Currencies
						</Link>
					</Button>
				}
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load currency details</AlertTitle>
					<AlertDescription className="flex items-center justify-between gap-3">
						<span>
							{(currenciesQuery.error as Error)?.message ||
								"Failed to load currency details. Please try again."}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => currenciesQuery.refetch()}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	if (!currency) {
		return (
			<PageShell
				title="Currency Details"
				subtitle="View currency setup and manage activation"
				actions={
					<Button asChild variant="outline">
						<Link href="/config/financial/currencies">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Currencies
						</Link>
					</Button>
				}
			>
				<Alert variant="destructive">
					<AlertTitle>Currency not found</AlertTitle>
					<AlertDescription>
						Currency code "{code}" was not found in this tenant.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const isActive = activeCodes.some(
		(activeCode) => activeCode.toUpperCase() === code,
	);
	const currencyCode = currency.code || code;
	const displayName = currency.name || currency.displayLabel || currencyCode;

	return (
		<>
			<PageShell
				title={`Currency: ${displayName}`}
				subtitle="Review configuration and control active availability"
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
					<SubmitErrorAlert
						error={submitError}
						title="Unable to update currency status"
					/>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<MetricCard
							label="Currency Code"
							value={currencyCode}
							icon={Hash}
						/>
						<MetricCard
							label="Decimal Places"
							value={String(currency.decimalPlaces ?? "—")}
							icon={Banknote}
						/>
						<MetricCard
							label="Current Status"
							value={isActive ? "Active" : "Inactive"}
							icon={CheckCircle2}
						/>
					</div>

					<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
						<Card>
							<CardHeader>
								<CardTitle>Currency Information</CardTitle>
								<CardDescription>
									Core metadata and number formatting settings
								</CardDescription>
							</CardHeader>
							<CardContent className="divide-y">
								<InfoRow label="Name" value={displayName} />
								<InfoRow label="ISO Code" value={currencyCode} />
								<InfoRow
									label="Display Label"
									value={currency.displayLabel || "—"}
								/>
								<InfoRow
									label="Display Symbol"
									value={currency.displaySymbol || "—"}
								/>
								<InfoRow
									label="Decimal Places"
									value={String(currency.decimalPlaces ?? "—")}
								/>
								<InfoRow
									label="In Multiples Of"
									value={String(currency.inMultiplesOf ?? "—")}
								/>
								<InfoRow
									label="Status"
									value={isActive ? "Active" : "Inactive"}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Actions</CardTitle>
								<CardDescription>
									Manage whether this currency is available in the platform
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{isActive ? (
									<Alert variant="warning">
										<AlertTitle>Currency is active</AlertTitle>
										<AlertDescription>
											Deactivation removes this currency from the allowed
											currency list for new operations.
										</AlertDescription>
									</Alert>
								) : (
									<Alert>
										<AlertTitle>Currency is inactive</AlertTitle>
										<AlertDescription>
											This currency is currently not available for new
											configurations.
										</AlertDescription>
									</Alert>
								)}

								<div>
									<Badge variant={isActive ? "success" : "secondary"}>
										{isActive ? "Active" : "Inactive"}
									</Badge>
								</div>

								<Button
									type="button"
									variant="destructive"
									disabled={!isActive || deactivateMutation.isPending}
									onClick={() => {
										setSubmitError(null);
										setDeactivateDialogOpen(true);
									}}
								>
									{deactivateMutation.isPending
										? "Deactivating..."
										: `Deactivate ${currencyCode}`}
								</Button>

								<p className="text-xs text-muted-foreground">
									Only active currencies can be deactivated from this page.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</PageShell>

			<AlertDialog
				open={deactivateDialogOpen}
				onOpenChange={setDeactivateDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Currency</AlertDialogTitle>
						<AlertDialogDescription>
							Deactivate "{currencyCode}"? This will remove it from active
							currencies.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deactivateMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deactivateMutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								deactivateMutation.mutate();
							}}
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
