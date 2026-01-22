"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
		const error = await response.json();
		throw new Error(error.message || "Failed to update currencies");
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

export default function CurrenciesPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<
		string | null
	>(null);
	const [isEditActive, setIsEditActive] = useState(false);

	const {
		data: currencyConfig,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: () => fetchCurrencies(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: (currencies: string[]) =>
			updateCurrencies(tenantId, currencies),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currencies", tenantId] });
			setIsDrawerOpen(false);
			setIsEditDrawerOpen(false);
			setSelectedCurrencyCode(null);
			setToastMessage("Currencies updated successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

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

	const selectedCurrency = useMemo(() => {
		if (!selectedCurrencyCode) return null;
		return (
			currencyOptions.find(
				(currency) => currency.code === selectedCurrencyCode,
			) ||
			activeCurrencies.find(
				(currency) => currency.code === selectedCurrencyCode,
			) ||
			null
		);
	}, [activeCurrencies, currencyOptions, selectedCurrencyCode]);

	useEffect(() => {
		if (!selectedCurrencyCode) return;
		setIsEditActive(activeCodes.has(selectedCurrencyCode));
	}, [activeCodes, selectedCurrencyCode]);

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
		{
			header: "Actions",
			cell: (currency: CurrencyData) => (
				<div className="flex items-center justify-end gap-2">
					<Button asChild variant="outline" size="sm" disabled={!currency.code}>
						<Link href={`/config/financial/currencies/${currency.code ?? ""}`}>
							<Eye className="mr-2 h-4 w-4" />
							View
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							if (!currency.code) return;
							setSelectedCurrencyCode(currency.code);
							setIsEditDrawerOpen(true);
						}}
						disabled={!currency.code}
					>
						<PenLine className="mr-2 h-4 w-4" />
						Edit
					</Button>
				</div>
			),
			className: "text-right",
			headerClassName: "text-right",
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

	const handleSaveCurrency = () => {
		if (!selectedCurrencyCode) return;
		const nextCodes = new Set(activeCodes);
		if (isEditActive) {
			nextCodes.add(selectedCurrencyCode);
		} else {
			nextCodes.delete(selectedCurrencyCode);
		}
		updateMutation.mutate(Array.from(nextCodes));
	};

	const handleCloseDrawer = () => {
		setIsDrawerOpen(false);
	};

	const handleCloseEditDrawer = (open: boolean) => {
		setIsEditDrawerOpen(open);
		if (!open) {
			setSelectedCurrencyCode(null);
		}
	};

	return (
		<>
			<PageShell
				title="Currencies"
				subtitle="Manage active currencies without leaving the dashboard"
				actions={
					<Button onClick={handleOpenDrawer}>Configure Currencies</Button>
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
						{isLoading && (
							<div className="text-center py-6 text-muted-foreground">
								Loading currencies...
							</div>
						)}
						{error && (
							<div className="text-center py-6 text-destructive">
								Failed to load currencies. Please try again.
							</div>
						)}
						{!isLoading && !error && (
							<DataTable
								data={activeCurrencies}
								columns={currencyColumns}
								getRowId={(currency) =>
									currency.code || currency.name || "currency-row"
								}
								emptyMessage="No active currencies configured."
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col"
				>
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
								<AlertDescription>
									{(error as Error)?.message ||
										"Failed to load currencies. Please try again."}
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
							{filteredOptions.length === 0 ? (
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
											/>
											<Label
												htmlFor={checkboxId}
												className="flex-1 cursor-pointer"
											>
												<div className="text-sm font-medium">
													{code || "—"}
													{code ? " · " : ""}
													{label}
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
							{updateMutation.isPending ? (
								"Saving..."
							) : (
								<>
									<PenLine className="mr-2 h-4 w-4" />
									Save Changes
								</>
							)}
						</Button>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet open={isEditDrawerOpen} onOpenChange={handleCloseEditDrawer}>
				<SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl">
					<SheetHeader>
						<SheetTitle>Currency Details</SheetTitle>
						<SheetDescription>
							Review and update active status for this currency.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6 space-y-4">
						<div className="rounded-sm border border-border/60 p-4 space-y-3">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									ISO Code
								</div>
								<div className="text-lg font-semibold">
									{selectedCurrency?.code || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Name
								</div>
								<div className="text-sm">
									{selectedCurrency?.name ||
										selectedCurrency?.displayLabel ||
										"—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Decimal Places
								</div>
								<div className="text-sm">
									{selectedCurrency?.decimalPlaces ?? "—"}
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between rounded-sm border border-border/60 p-4">
							<div>
								<div className="text-sm font-medium">Active Currency</div>
								<div className="text-xs text-muted-foreground">
									Toggle availability in the platform.
								</div>
							</div>
							<Checkbox
								checked={isEditActive}
								onCheckedChange={(value) => setIsEditActive(Boolean(value))}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => handleCloseEditDrawer(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleSaveCurrency}
								disabled={updateMutation.isPending || !selectedCurrencyCode}
							>
								{updateMutation.isPending ? (
									"Saving..."
								) : (
									<>
										<PenLine className="mr-2 h-4 w-4" />
										Save Changes
									</>
								)}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 w-[280px]">
					<Alert variant="success">
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</>
	);
}
