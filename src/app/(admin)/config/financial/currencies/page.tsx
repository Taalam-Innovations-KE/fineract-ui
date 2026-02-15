"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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

async function updateCurrencies(tenantId: string, currencies: string[]) {
	const response = await fetch(BFF_ROUTES.currencies, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify({ currencies }),
	});

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(response, "Failed to update currencies"),
		);
	}

	return response.json();
}

function areSetsEqual(a: Set<string>, b: Set<string>) {
	if (a.size !== b.size) return false;
	for (const value of a) {
		if (!b.has(value)) return false;
	}
	return true;
}

function CurrenciesTableSkeleton() {
	return (
		<div className="space-y-2">
			<table className="w-full text-left text-sm">
				<thead className="border-b border-border/60 bg-muted/40">
					<tr>
						<th className="px-3 py-2">
							<Skeleton className="h-4 w-20" />
						</th>
						<th className="px-3 py-2">
							<Skeleton className="h-4 w-24" />
						</th>
						<th className="px-3 py-2 text-right">
							<Skeleton className="h-4 w-16 ml-auto" />
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border/60">
					{Array.from({ length: 6 }).map((_, index) => (
						<tr key={`currency-row-skeleton-${index}`}>
							<td className="px-3 py-3">
								<Skeleton className="h-4 w-16" />
							</td>
							<td className="px-3 py-3">
								<Skeleton className="h-4 w-36" />
							</td>
							<td className="px-3 py-3 text-right">
								<Skeleton className="h-4 w-8 ml-auto" />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CurrencyOptionsSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 8 }).map((_, index) => (
				<div
					key={`currency-option-skeleton-${index}`}
					className="flex items-start gap-3 rounded-sm border border-border/60 p-3"
				>
					<Skeleton className="h-4 w-4 mt-1" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-3 w-28" />
					</div>
				</div>
			))}
		</div>
	);
}

export default function CurrenciesPage() {
	const { tenantId } = useTenantStore();
	const effectiveTenantId = useMemo(
		() => resolveTenantId(tenantId),
		[tenantId],
	);
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

	const {
		data: currencyConfig,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ["currencies", effectiveTenantId],
		queryFn: () => fetchCurrencies(effectiveTenantId),
	});

	const updateMutation = useMutation({
		mutationFn: (currencies: string[]) =>
			updateCurrencies(effectiveTenantId, currencies),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["currencies", effectiveTenantId],
			});
			setIsDrawerOpen(false);
			toast.success("Currencies updated successfully");
		},
	});

	const activeCurrencies = useMemo(
		() => currencyConfig?.selectedCurrencyOptions || [],
		[currencyConfig],
	);
	const currencyOptions = useMemo(
		() => currencyConfig?.currencyOptions || [],
		[currencyConfig],
	);

	const activeCodes = useMemo(
		() =>
			new Set(
				activeCurrencies
					.map((currency) => currency.code)
					.filter((code): code is string => Boolean(code)),
			),
		[activeCurrencies],
	);

	const filteredOptions = useMemo(() => {
		const normalized = searchTerm.trim().toLowerCase();
		const sortedOptions = [...currencyOptions].sort((a, b) =>
			(a.code || "").localeCompare(b.code || ""),
		);

		if (!normalized) {
			return sortedOptions;
		}

		return sortedOptions.filter((currency) => {
			const code = currency.code || "";
			const name = currency.name || currency.displayLabel || "";
			return (
				code.toLowerCase().includes(normalized) ||
				name.toLowerCase().includes(normalized)
			);
		});
	}, [currencyOptions, searchTerm]);

	const isSelectionDirty = !areSetsEqual(selectedCodes, activeCodes);

	const currencyColumns = [
		{
			header: "ISO Code",
			cell: (currency: CurrencyData) => (
				<span className="font-medium">{currency.code || "—"}</span>
			),
		},
		{
			header: "Name",
			cell: (currency: CurrencyData) => (
				<span>{currency.name || currency.displayLabel || "—"}</span>
			),
		},
		{
			header: "Decimal Places",
			cell: (currency: CurrencyData) => (
				<span>{currency.decimalPlaces ?? "—"}</span>
			),
			headerClassName: "text-right",
			className: "text-right",
		},
	];

	const toggleCurrency = (code?: string) => {
		if (!code) return;
		const nextSelected = new Set(selectedCodes);
		if (nextSelected.has(code)) {
			nextSelected.delete(code);
		} else {
			nextSelected.add(code);
		}
		setSelectedCodes(nextSelected);
	};

	const handleOpenDrawer = () => {
		// Refetch fresh data and reset state when opening the drawer
		refetch();
		setSearchTerm("");
		// Initialize selection from current config
		const initialCodes = new Set(
			(currencyConfig?.selectedCurrencyOptions || [])
				.map((currency) => currency.code)
				.filter((code): code is string => Boolean(code)),
		);
		setSelectedCodes(initialCodes);
		setIsDrawerOpen(true);
	};

	const handleSaveChanges = () => {
		updateMutation.mutate(Array.from(selectedCodes));
	};

	const handleCloseDrawer = () => {
		setIsDrawerOpen(false);
	};

	return (
		<>
			<PageShell
				title="Currencies"
				subtitle="Manage active currencies without leaving the dashboard"
				actions={
					<Button onClick={handleOpenDrawer} disabled={isLoading}>
						Configure Currencies
					</Button>
				}
			>
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Active Currencies</CardTitle>
								<CardDescription>
									View which currencies are enabled across the platform.
								</CardDescription>
							</div>
							<Badge variant="secondary">
								{activeCurrencies.length} Active
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading && <CurrenciesTableSkeleton />}
						{error && (
							<Alert variant="destructive">
								<AlertTitle>Unable to load currencies</AlertTitle>
								<AlertDescription className="flex items-center justify-between gap-3">
									<span>
										{(error as Error)?.message ||
											"Failed to load currencies. Please try again."}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetch()}
									>
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						)}
						{!isLoading && !error && (
							<DataTable
								data={activeCurrencies}
								columns={currencyColumns}
								getRowId={(currency) =>
									currency.code || currency.name || "currency-row"
								}
								emptyMessage="No active currencies configured."
								enableActions={true}
								getViewUrl={(currency) =>
									`/config/financial/currencies/${currency.code}`
								}
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
					<SheetHeader>
						<SheetTitle>Manage Active Currencies</SheetTitle>
						<SheetDescription>
							Search and toggle currencies to control availability in the
							system.
						</SheetDescription>
					</SheetHeader>
					<div className="flex-1 overflow-y-auto mt-6 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currency-search">Search currencies</Label>
							<Input
								id="currency-search"
								placeholder="Search by ISO code or name"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
							/>
						</div>

						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>{selectedCodes.size} selected</span>
							<span>{currencyOptions.length} available</span>
						</div>

						{isFetching && (
							<div className="text-sm text-muted-foreground">
								Refreshing currency list...
							</div>
						)}

						{error && (
							<Alert variant="destructive">
								<AlertTitle>Unable to load currencies</AlertTitle>
								<AlertDescription className="flex items-center justify-between gap-3">
									<span>
										{(error as Error)?.message ||
											"Failed to load currencies. Please try again."}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetch()}
									>
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						)}

						{updateMutation.isError && (
							<Alert variant="destructive">
								<AlertTitle>Update failed</AlertTitle>
								<AlertDescription>
									{(updateMutation.error as Error)?.message ||
										"Failed to update currencies. Please try again."}
								</AlertDescription>
							</Alert>
						)}

						<div className="space-y-3">
							{isFetching && currencyOptions.length === 0 ? (
								<CurrencyOptionsSkeleton />
							) : filteredOptions.length === 0 ? (
								<div className="rounded-sm border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
									No currencies match your search.
								</div>
							) : (
								filteredOptions.map((currency, index) => {
									const code = currency.code;
									const label =
										currency.name ||
										currency.displayLabel ||
										"Unknown currency";
									const decimalPlaces = currency.decimalPlaces ?? "—";
									const isChecked = code ? selectedCodes.has(code) : false;
									const checkboxId = code
										? `currency-${code}`
										: `currency-option-${index}`;

									return (
										<div
											key={code || `${label}-${index}`}
											className="flex items-start gap-3 rounded-sm border border-border/60 p-3"
										>
											<Checkbox
												id={checkboxId}
												checked={isChecked}
												onCheckedChange={() => toggleCurrency(code)}
												disabled={!code}
											/>
											<Label
												htmlFor={checkboxId}
												className="flex-1 cursor-pointer"
											>
												<div className="flex items-center justify-between gap-2">
													<div className="text-sm font-medium">
														{code || "—"}
														{code ? " · " : ""}
														{label}
													</div>
													<Badge variant={isChecked ? "success" : "secondary"}>
														{isChecked ? "Active" : "Inactive"}
													</Badge>
												</div>
												<div className="text-xs text-muted-foreground">
													Decimal places: {decimalPlaces}
												</div>
											</Label>
										</div>
									);
								})
							)}
						</div>
					</div>
					<div className="flex items-center justify-end gap-2 border-t pt-4 mt-4">
						<Button type="button" variant="outline" onClick={handleCloseDrawer}>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleSaveChanges}
							disabled={!isSelectionDirty || updateMutation.isPending}
						>
							{updateMutation.isPending ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
