"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoanProductEditForm } from "@/components/config/forms/loan-product-edit-form";
import { LoanProductWizard } from "@/components/config/loan-product-wizard";
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
import { DataTable } from "@/components/ui/data-table";
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
	GetLoanProductsResponse,
	PostLoanProductsRequest,
	PutLoanProductsProductIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { loanProductsApi } from "@/lib/fineract/loan-products";
import { useTenantStore } from "@/store/tenant";

type LoanProductDisplay = GetLoanProductsResponse;

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

export default function LoanProductsPage() {
	const { tenantId } = useTenantStore();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
	const [selectedProductId, setSelectedProductId] = useState<number | null>(
		null,
	);
	const queryClient = useQueryClient();

	const handleEditDrawerClose = (open: boolean) => {
		setIsEditDrawerOpen(open);
		if (!open) {
			setSelectedProductId(null);
		}
	};

	const {
		data: products = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["loanProducts", tenantId],
		queryFn: () => loanProductsApi.list(tenantId),
	});

	const { data: currencyConfig } = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: () => fetchCurrencies(tenantId),
	});

	const enabledCurrencies =
		currencyConfig?.selectedCurrencyOptions?.map((c) => c.code!) || [];

	const createMutation = useMutation({
		mutationFn: (data: PostLoanProductsRequest) =>
			loanProductsApi.create(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loanProducts", tenantId] });
			setIsDrawerOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: PutLoanProductsProductIdRequest) =>
			loanProductsApi.update(tenantId, selectedProductId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loanProducts", tenantId] });
			setIsEditDrawerOpen(false);
			setSelectedProductId(null);
		},
	});

	const productDetailQuery = useQuery({
		queryKey: ["loanProduct", tenantId, selectedProductId],
		queryFn: () => loanProductsApi.getById(tenantId, selectedProductId ?? 0),
		enabled: Boolean(selectedProductId) && isEditDrawerOpen,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	});

	const productTemplateQuery = useQuery({
		queryKey: ["loanProductTemplate", tenantId],
		queryFn: () => loanProductsApi.getTemplate(tenantId),
		enabled: isEditDrawerOpen,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	});

	const templateQuery = useQuery({
		queryKey: ["loanProductTemplate", tenantId],
		queryFn: () => loanProductsApi.getTemplate(tenantId),
		enabled: isDrawerOpen || isEditDrawerOpen,
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	});

	const productColumns = [
		{
			header: "Product",
			cell: (product: LoanProductDisplay) => (
				<div>
					<div className="font-medium">{product.name}</div>
					<div className="text-xs text-muted-foreground">
						{product.shortName || "Short name not set"}
					</div>
				</div>
			),
		},
		{
			header: "Currency",
			cell: (product: LoanProductDisplay) => (
				<span className={product.currency?.code ? "" : "text-muted-foreground"}>
					{product.currency?.code || "—"}
				</span>
			),
		},
		{
			header: "Principal",
			cell: (product: LoanProductDisplay) =>
				product.principal ? (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						{product.currency?.displaySymbol}
						{product.principal}
					</Badge>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			header: "Interest",
			cell: (product: LoanProductDisplay) =>
				product.interestRatePerPeriod !== undefined ? (
					<Badge variant="info" className="text-xs px-2 py-0.5">
						{product.interestRatePerPeriod}%
					</Badge>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			header: "Accounting",
			cell: (product: LoanProductDisplay) => (
				<span className={product.accountingRule ? "" : "text-muted-foreground"}>
					{product.accountingRule?.description ||
						product.accountingRule?.code ||
						"—"}
				</span>
			),
		},
		{
			header: "Actions",
			cell: (product: LoanProductDisplay) => (
				<div className="flex items-center justify-end gap-2">
					<Button asChild variant="outline" size="sm" disabled={!product.id}>
						<Link href={`/config/products/loans/${product.id ?? ""}`}>
							View
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							if (!product.id) return;
							setSelectedProductId(Number(product.id));
							setIsEditDrawerOpen(true);
						}}
						disabled={!product.id}
					>
						Edit
					</Button>
				</div>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<PageShell
			title="Loan Products"
			subtitle="Configure and manage loan product offerings"
			actions={
				<Button onClick={() => setIsDrawerOpen(true)} disabled={false}>
					<Plus className="h-4 w-4 mr-2" />
					Create Loan Product
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<CreditCard className="h-5 w-5 text-primary" />
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
									<TrendingUp className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{enabledCurrencies.length}
									</div>
									<div className="text-sm text-muted-foreground">
										Currencies
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{enabledCurrencies.length === 0 && (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center text-sm text-muted-foreground">
								Please enable at least one currency in the{" "}
								<a
									href="/config/financial/currencies"
									className="text-primary hover:underline"
								>
									Currencies
								</a>{" "}
								module before creating loan products.
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Loan Products</CardTitle>
						<CardDescription>
							{products.length} product{products.length !== 1 ? "s" : ""}{" "}
							configured
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="text-center py-8 text-muted-foreground">
								Loading loan products...
							</div>
						)}
						{error && (
							<div className="text-center py-8 text-destructive">
								Failed to load loan products. Please try again.
							</div>
						)}
						{!isLoading && !error && products.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No loan products found. Create your first loan product to get
								started.
							</div>
						)}
						{!isLoading && !error && products.length > 0 && (
							<DataTable
								data={products}
								columns={productColumns}
								getRowId={(product: LoanProductDisplay) =>
									String(product.id ?? product.name ?? "product-row")
								}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Create Loan Product Sheet */}
			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="!w-[80vw] !max-w-7xl overflow-y-auto max-h-[90vh]"
				>
					<SheetHeader>
						<SheetTitle>Create Loan Product</SheetTitle>
						<SheetDescription>
							Configure a new loan product with a multi-step wizard
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<LoanProductWizard
							currencies={
								templateQuery.data?.currencyOptions?.map((c) => c.code!) || []
							}
							isOpen={isDrawerOpen}
							onSubmit={async (data) => {
								await createMutation.mutateAsync(data);
							}}
							onCancel={() => setIsDrawerOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet open={isEditDrawerOpen} onOpenChange={handleEditDrawerClose}>
				<SheetContent side="right" className="!w-[65vw] !max-w-5xl">
					<LoanProductWizard
						currencies={enabledCurrencies}
						isOpen={isEditDrawerOpen}
						onSubmit={async (data) => {
							await updateMutation.mutateAsync(
								data as PutLoanProductsProductIdRequest,
							);
						}}
						onCancel={() => setIsEditDrawerOpen(false)}
						isEdit={true}
						productId={selectedProductId ?? undefined}
					/>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
