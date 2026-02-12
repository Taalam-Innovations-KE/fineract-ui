"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { FormErrorBoundary } from "@/components/ui/form-error-boundary";
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
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import { loanProductsApi } from "@/lib/fineract/loan-products";
import { useTenantStore } from "@/store/tenant";

const LoanProductWizard = dynamic(() =>
	import("@/components/config/loan-product-wizard").then(
		(mod) => mod.LoanProductWizard,
	),
);

const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const LOAN_PRODUCTS_PAGE_SIZE = 10;
const LOAN_PRODUCTS_FIELDS =
	"id,name,shortName,principal,interestRatePerPeriod,currency,accountingRule";

type LoanProductDisplay = {
	id?: number | string;
	name?: string;
	shortName?: string;
	principal?: number;
	interestRatePerPeriod?: number;
	currency?: {
		code?: string;
		displaySymbol?: string;
	};
	accountingRule?: {
		value?: string;
	};
};

type LoanProductsListResponse =
	| LoanProductDisplay[]
	| {
			pageItems?: LoanProductDisplay[];
			totalFilteredRecords?: number;
	  };

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

function LoanProductWizardSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-8 w-40" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-24 w-full" />
			<div className="grid gap-4 md:grid-cols-2">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="flex justify-end gap-2">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}

export default function LoanProductsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const previousTenantIdRef = useRef(tenantId);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [pageIndex, setPageIndex] = useState(0);

	const productsQuery = useQuery<LoanProductsListResponse>({
		queryKey: ["loanProducts", tenantId, pageIndex, LOAN_PRODUCTS_PAGE_SIZE],
		queryFn: () =>
			loanProductsApi.list<LoanProductDisplay>(tenantId, {
				offset: pageIndex * LOAN_PRODUCTS_PAGE_SIZE,
				limit: LOAN_PRODUCTS_PAGE_SIZE,
				orderBy: "id",
				sortOrder: "DESC",
				fields: LOAN_PRODUCTS_FIELDS,
			}),
		enabled: Boolean(tenantId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
		placeholderData: (previousData) => previousData,
	});

	const currenciesQuery = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: () => fetchCurrencies(tenantId),
		enabled: isDrawerOpen && Boolean(tenantId),
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const createMutation = useMutation({
		mutationFn: (data: PostLoanProductsRequest) =>
			loanProductsApi.create(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loanProducts", tenantId] });
			setPageIndex(0);
			setIsDrawerOpen(false);
		},
	});

	useEffect(() => {
		if (previousTenantIdRef.current !== tenantId) {
			setPageIndex(0);
			previousTenantIdRef.current = tenantId;
		}
	}, [tenantId]);

	const enabledCurrencies = useMemo(
		() =>
			currenciesQuery.data?.selectedCurrencyOptions?.map((c) => c.code!) || [],
		[currenciesQuery.data],
	);

	const products = useMemo(() => {
		if (!productsQuery.data) return [];

		if (Array.isArray(productsQuery.data)) {
			const start = pageIndex * LOAN_PRODUCTS_PAGE_SIZE;
			return productsQuery.data.slice(start, start + LOAN_PRODUCTS_PAGE_SIZE);
		}

		return productsQuery.data.pageItems || [];
	}, [productsQuery.data, pageIndex]);

	const totalProducts = useMemo(() => {
		if (!productsQuery.data) return 0;

		if (Array.isArray(productsQuery.data)) {
			return productsQuery.data.length;
		}

		return productsQuery.data.totalFilteredRecords || products.length;
	}, [productsQuery.data, products.length]);

	const handleCreateProduct = async (
		data: PostLoanProductsRequest,
	): Promise<void> => {
		return (await createMutation.mutateAsync(data)) as void;
	};

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
					{product.accountingRule?.value || "—"}
				</span>
			),
		},
	];

	const isProductsInitialLoading =
		productsQuery.isLoading && !productsQuery.data;

	return (
		<PageShell
			title="Loan Products"
			subtitle="Configure and manage loan product offerings"
			actions={
				<Button onClick={() => setIsDrawerOpen(true)}>
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
									<div className="text-2xl font-bold">{totalProducts}</div>
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
										{currenciesQuery.data ? enabledCurrencies.length : "—"}
									</div>
									<div className="text-sm text-muted-foreground">
										Currencies
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{currenciesQuery.isSuccess && enabledCurrencies.length === 0 && (
					<Card>
						<CardContent className="pt-6">
							<div className="text-center text-sm text-muted-foreground">
								Please enable at least one currency in the{" "}
								<Link
									href="/config/financial/currencies"
									className="text-primary hover:underline"
									prefetch={false}
								>
									Currencies
								</Link>{" "}
								module before creating loan products.
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Loan Products</CardTitle>
						<CardDescription>
							{totalProducts} product{totalProducts !== 1 ? "s" : ""} configured
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isProductsInitialLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: LOAN_PRODUCTS_PAGE_SIZE }).map(
									(_, index) => (
										<Skeleton
											key={`loan-products-row-skeleton-${index}`}
											className="h-12 w-full"
										/>
									),
								)}
							</div>
						)}
						{productsQuery.error && (
							<div className="text-center py-8 text-destructive">
								Failed to load loan products. Please try again.
							</div>
						)}
						{!isProductsInitialLoading &&
							!productsQuery.error &&
							totalProducts === 0 && (
								<div className="text-center py-8 text-muted-foreground">
									No loan products found. Create your first loan product to get
									started.
								</div>
							)}
						{!isProductsInitialLoading &&
							!productsQuery.error &&
							totalProducts > 0 && (
								<DataTable
									data={products}
									columns={productColumns}
									manualPagination={true}
									pageSize={LOAN_PRODUCTS_PAGE_SIZE}
									pageIndex={pageIndex}
									totalRows={totalProducts}
									onPageChange={setPageIndex}
									getRowId={(product: LoanProductDisplay) =>
										String(product.id ?? product.name ?? "product-row")
									}
									enableActions={true}
									getViewUrl={(product) =>
										`/config/products/loans/${product.id}`
									}
								/>
							)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-[80vw] overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Create Loan Product</SheetTitle>
						<SheetDescription>
							Configure a new loan product with a multi-step wizard
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						{currenciesQuery.isLoading && <LoanProductWizardSkeleton />}

						{currenciesQuery.error && (
							<Alert variant="destructive">
								<AlertTitle>Currency lookup failed</AlertTitle>
								<AlertDescription>
									Unable to load currencies. Please retry opening this form.
								</AlertDescription>
							</Alert>
						)}

						{currenciesQuery.isSuccess && enabledCurrencies.length === 0 && (
							<Alert>
								<AlertTitle>No enabled currencies</AlertTitle>
								<AlertDescription>
									Enable at least one currency in{" "}
									<Link
										href="/config/financial/currencies"
										className="underline"
										prefetch={false}
									>
										Currencies
									</Link>{" "}
									before creating loan products.
								</AlertDescription>
							</Alert>
						)}

						{currenciesQuery.isSuccess && enabledCurrencies.length > 0 && (
							<FormErrorBoundary>
								<LoanProductWizard
									currencies={enabledCurrencies}
									isOpen={isDrawerOpen}
									onSubmit={handleCreateProduct}
									onCancel={() => setIsDrawerOpen(false)}
								/>
							</FormErrorBoundary>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
