"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	BadgeDollarSign,
	Calculator,
	PiggyBank,
	Settings,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SavingsProductForm } from "@/components/config/savings-product-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetSavingsProductsProductIdResponse } from "@/lib/fineract/generated/types.gen";
import {
	mapSavingsProductToFormData,
	type SavingsProductRequestPayload,
	savingsProductsApi,
} from "@/lib/fineract/savings-products";
import { useTenantStore } from "@/store/tenant";

type PageProps = {
	params: Promise<{ id: string }>;
};

function formatBoolean(value: boolean | undefined) {
	if (value === undefined) return "—";
	return value ? "Yes" : "No";
}

function formatPercentage(value: number | undefined) {
	if (value === undefined || value === null) return "—";
	return `${value}%`;
}

function readUnknownBooleanProperty(source: object, property: string): boolean {
	const record = source as Record<string, unknown>;
	const value = record[property];
	return typeof value === "boolean" ? value : false;
}

function readUnknownProperty(source: object, property: string): unknown {
	const record = source as Record<string, unknown>;
	return record[property];
}

function getMappingRows(product: GetSavingsProductsProductIdResponse) {
	const mappingObject = readUnknownProperty(product, "accountingMappings");
	if (!mappingObject || typeof mappingObject !== "object") {
		return [];
	}

	return Object.entries(mappingObject as Record<string, unknown>)
		.map(([key, value]) => {
			if (!value || typeof value !== "object") {
				return null;
			}

			const typedValue = value as Record<string, unknown>;
			const id = typeof typedValue.id === "number" ? typedValue.id : undefined;
			const name =
				typeof typedValue.name === "string" ? typedValue.name : undefined;
			if (!name && id === undefined) {
				return null;
			}

			const label = key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (char) => char.toUpperCase());

			return {
				key,
				label,
				id,
				name,
			};
		})
		.filter(
			(
				row,
			): row is { key: string; label: string; id?: number; name?: string } =>
				Boolean(row),
		);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between py-2 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-right">{value}</span>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={`metric-skeleton-${index}`}>
						<CardContent className="pt-6">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-6 w-32" />
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				{Array.from({ length: 2 }).map((_, index) => (
					<Card key={`details-skeleton-${index}`}>
						<CardHeader>
							<Skeleton className="h-5 w-48" />
						</CardHeader>
						<CardContent className="space-y-3">
							{Array.from({ length: 6 }).map((__, itemIndex) => (
								<div
									key={`details-skeleton-item-${index}-${itemIndex}`}
									className="flex items-center justify-between"
								>
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-24" />
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export default function SavingsProductDetailsPage({ params }: PageProps) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const router = useRouter();
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const {
		data: product,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["savingsProduct", tenantId, id],
		queryFn: () => savingsProductsApi.get(tenantId, id),
	});

	const updateMutation = useMutation({
		mutationFn: (payload: SavingsProductRequestPayload) =>
			savingsProductsApi.update(tenantId, id, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["savingsProduct", tenantId, id],
			});
			queryClient.invalidateQueries({
				queryKey: ["savingsProducts", tenantId],
			});
			setIsEditOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => savingsProductsApi.delete(tenantId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["savingsProducts", tenantId],
			});
			setIsDeleteDialogOpen(false);
			router.push("/config/products/savings");
		},
	});

	const mappingRows = useMemo(
		() => (product ? getMappingRows(product) : []),
		[product],
	);

	if (isLoading) {
		return (
			<PageShell title="Savings Product Details" subtitle="Loading...">
				<LoadingSkeleton />
			</PageShell>
		);
	}

	if (error || !product) {
		return (
			<PageShell
				title="Savings Product Details"
				subtitle="Error loading product"
			>
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-destructive">
							Failed to load savings product details. Please try again.
						</p>
					</CardContent>
				</Card>
			</PageShell>
		);
	}

	const accountingRule = product.accountingRule?.value || "—";
	const withdrawalFeeEnabled = Boolean(product.withdrawalFeeForTransfers);
	const withHoldTax = readUnknownBooleanProperty(product, "withHoldTax");
	const allowOverdraft = readUnknownBooleanProperty(product, "allowOverdraft");
	const dormancyTracking = readUnknownBooleanProperty(
		product,
		"isDormancyTrackingActive",
	);

	return (
		<PageShell
			title={product.name || "Savings Product"}
			subtitle={`${product.shortName || "—"} | ${product.currency?.code || "—"}`}
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" asChild>
						<Link href="/config/products/savings">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Savings Products
						</Link>
					</Button>
					<Button variant="outline" onClick={() => setIsEditOpen(true)}>
						Modify Product
					</Button>
					<AlertDialog
						open={isDeleteDialogOpen}
						onOpenChange={setIsDeleteDialogOpen}
					>
						<AlertDialogTrigger asChild>
							<Button variant="destructive">Delete Product</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete savings product?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. The product will be permanently
									removed.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={(event) => {
										event.preventDefault();
										deleteMutation.mutate();
									}}
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending ? "Deleting..." : "Delete"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
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
									<div className="text-sm text-muted-foreground">
										Interest Rate
									</div>
									<div className="text-2xl font-bold">
										{formatPercentage(product.nominalAnnualInterestRate)}
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
									<div className="text-sm text-muted-foreground">Currency</div>
									<div className="text-2xl font-bold">
										{product.currency?.code || "—"}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
									<Calculator className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-sm text-muted-foreground">
										Accounting Rule
									</div>
									<div className="text-base font-bold">{accountingRule}</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<BadgeDollarSign className="h-4 w-4" />
								Core Configuration
							</CardTitle>
						</CardHeader>
						<CardContent className="divide-y">
							<InfoRow label="Name" value={product.name || "—"} />
							<InfoRow label="Short Name" value={product.shortName || "—"} />
							<InfoRow label="Description" value={product.description || "—"} />
							<InfoRow
								label="Compounding"
								value={product.interestCompoundingPeriodType?.value || "—"}
							/>
							<InfoRow
								label="Posting"
								value={product.interestPostingPeriodType?.value || "—"}
							/>
							<InfoRow
								label="Calculation"
								value={product.interestCalculationType?.value || "—"}
							/>
							<InfoRow
								label="Days In Year"
								value={product.interestCalculationDaysInYearType?.value || "—"}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<Settings className="h-4 w-4" />
								Operational Settings
							</CardTitle>
						</CardHeader>
						<CardContent className="divide-y">
							<InfoRow
								label="Withdrawal Fee For Transfers"
								value={formatBoolean(withdrawalFeeEnabled)}
							/>
							<InfoRow
								label="Withhold Tax"
								value={formatBoolean(withHoldTax)}
							/>
							<InfoRow
								label="Allow Overdraft"
								value={formatBoolean(allowOverdraft)}
							/>
							<InfoRow
								label="Dormancy Tracking"
								value={formatBoolean(dormancyTracking)}
							/>
							<div className="py-2">
								<div className="text-sm text-muted-foreground mb-2">
									Charges
								</div>
								{Array.isArray(product.charges) &&
								product.charges.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{product.charges.map((chargeId) => (
											<Badge key={`charge-${chargeId}`} variant="secondary">
												Charge #{chargeId}
											</Badge>
										))}
									</div>
								) : (
									<div className="text-sm text-muted-foreground">
										No charges linked.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Wallet className="h-4 w-4" />
							Accounting Mappings
						</CardTitle>
					</CardHeader>
					<CardContent>
						{mappingRows.length === 0 ? (
							<div className="text-sm text-muted-foreground">
								No accounting mappings configured for this savings product.
							</div>
						) : (
							<div className="space-y-2">
								{mappingRows.map((row) => (
									<div
										key={row.key}
										className="flex items-center justify-between rounded-sm border p-3"
									>
										<div className="text-sm text-muted-foreground">
											{row.label}
										</div>
										<div className="text-sm font-medium text-right">
											{row.name || "—"}
											{row.id !== undefined ? ` (#${row.id})` : ""}
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{deleteMutation.isError ? (
					<div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4" />
							Failed to delete savings product. Resolve linked dependencies and
							try again.
						</div>
					</div>
				) : null}
			</div>

			<Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-[80vw] overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Modify Savings Product</SheetTitle>
						<SheetDescription>
							Update savings product configuration and accounting mappings
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<SavingsProductForm
							isOpen={isEditOpen}
							isEditMode={true}
							initialData={mapSavingsProductToFormData(product)}
							onSubmit={(payload) => updateMutation.mutateAsync(payload)}
							onCancel={() => setIsEditOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
