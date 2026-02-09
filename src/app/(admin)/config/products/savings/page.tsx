"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PiggyBank, Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SavingsProductForm } from "@/components/config/savings-product-form";
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
import { FormErrorBoundary } from "@/components/ui/form-error-boundary";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetSavingsProductsResponse } from "@/lib/fineract/generated/types.gen";
import {
	type SavingsProductRequestPayload,
	savingsProductsApi,
} from "@/lib/fineract/savings-products";
import { useTenantStore } from "@/store/tenant";

function SavingsProductsTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2 text-right">
								<Skeleton className="h-4 w-12" />
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, index) => (
							<tr key={`savings-product-row-${index}`}>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-32" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-16" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-12" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-28" />
								</td>
								<td className="px-3 py-2 text-right">
									<Skeleton className="h-8 w-16 ml-auto" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}

export default function SavingsProductsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const {
		data: products = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["savingsProducts", tenantId],
		queryFn: () => savingsProductsApi.list(tenantId),
	}) as {
		data: GetSavingsProductsResponse[];
		isLoading: boolean;
		error: Error | null;
	};

	const createMutation = useMutation({
		mutationFn: (payload: SavingsProductRequestPayload) =>
			savingsProductsApi.create(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["savingsProducts", tenantId],
			});
			setIsDrawerOpen(false);
		},
	});

	const uniqueCurrencies = useMemo(() => {
		const set = new Set<string>();
		for (const product of products) {
			if (product.currency?.code) {
				set.add(product.currency.code);
			}
		}
		return set.size;
	}, [products]);

	const avgInterest = useMemo(() => {
		if (!products.length) return 0;
		const rates = products
			.map((product) => product.nominalAnnualInterestRate)
			.filter((rate): rate is number => typeof rate === "number");
		if (!rates.length) return 0;
		const total = rates.reduce((sum, rate) => sum + rate, 0);
		return total / rates.length;
	}, [products]);

	const columns = [
		{
			header: "Product",
			cell: (product: GetSavingsProductsResponse) => (
				<div>
					<div className="font-medium">{product.name || "Unnamed Product"}</div>
					<div className="text-xs text-muted-foreground">
						{product.shortName || "Short name not set"}
					</div>
				</div>
			),
		},
		{
			header: "Currency",
			cell: (product: GetSavingsProductsResponse) => (
				<span className={product.currency?.code ? "" : "text-muted-foreground"}>
					{product.currency?.code || "—"}
				</span>
			),
		},
		{
			header: "Interest",
			cell: (product: GetSavingsProductsResponse) =>
				typeof product.nominalAnnualInterestRate === "number" ? (
					<Badge variant="info" className="text-xs px-2 py-0.5">
						{product.nominalAnnualInterestRate}%
					</Badge>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			header: "Accounting",
			cell: (product: GetSavingsProductsResponse) => (
				<span
					className={
						product.accountingRule?.value ? "" : "text-muted-foreground"
					}
				>
					{product.accountingRule?.value || "—"}
				</span>
			),
		},
		{
			header: "Transfer Fee",
			cell: (product: GetSavingsProductsResponse) =>
				product.withdrawalFeeForTransfers ? (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						Enabled
					</Badge>
				) : (
					<span className="text-muted-foreground">Disabled</span>
				),
		},
	];

	return (
		<PageShell
			title="Savings Products"
			subtitle="Configure and manage savings product offerings"
			actions={
				<Button onClick={() => setIsDrawerOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Create Savings Product
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<PiggyBank className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{products.length}</div>
									<div className="text-sm text-muted-foreground">
										Total Products
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<Wallet className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">{uniqueCurrencies}</div>
									<div className="text-sm text-muted-foreground">
										Currencies
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
									<PiggyBank className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{avgInterest.toFixed(2)}%
									</div>
									<div className="text-sm text-muted-foreground">
										Avg Interest
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Savings Products</CardTitle>
						<CardDescription>
							{products.length} product{products.length !== 1 ? "s" : ""}{" "}
							configured
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? <SavingsProductsTableSkeleton /> : null}
						{error ? (
							<div className="text-center py-8 text-destructive">
								Failed to load savings products. Please try again.
							</div>
						) : null}
						{!isLoading && !error && products.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								No savings products found. Create your first savings product to
								get started.
							</div>
						) : null}
						{!isLoading && !error && products.length > 0 ? (
							<DataTable
								data={products}
								columns={columns}
								getRowId={(product) =>
									String(product.id ?? product.name ?? "savings-product-row")
								}
								enableActions={true}
								getViewUrl={(product) =>
									`/config/products/savings/${product.id}`
								}
							/>
						) : null}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-[80vw] overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Create Savings Product</SheetTitle>
						<SheetDescription>
							Configure a new savings product definition
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<FormErrorBoundary>
							<SavingsProductForm
								isOpen={isDrawerOpen}
								onSubmit={(payload) => createMutation.mutateAsync(payload)}
								onCancel={() => setIsDrawerOpen(false)}
							/>
						</FormErrorBoundary>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
