"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddCollateralDialog } from "@/components/loans/dialogs";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { CollateralResponse } from "@/lib/schemas/loan-metadata";
import { useTenantStore } from "@/store/tenant";

interface LoanCollateralTabProps {
	loanId: number;
	currency?: string;
}

function formatAmount(amount: number | undefined): string {
	if (amount === undefined || amount === null) return "—";
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function LoanCollateralTab({
	loanId,
	currency = "KES",
}: LoanCollateralTabProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<CollateralResponse | null>(
		null,
	);

	const collateralQuery = useQuery({
		queryKey: ["loanCollaterals", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanCollaterals(loanId), {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch collaterals");
			return response.json() as Promise<CollateralResponse[]>;
		},
		enabled: !!loanId,
	});

	const deleteMutation = useMutation({
		mutationFn: async (collateralId: number) => {
			const response = await fetch(
				`${BFF_ROUTES.loanCollaterals(loanId)}/${collateralId}`,
				{
					method: "DELETE",
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete collateral");
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["loanCollaterals", loanId, tenantId],
			});
			setDeleteTarget(null);
		},
	});

	const handleAddSuccess = () => {
		queryClient.invalidateQueries({
			queryKey: ["loanCollaterals", loanId, tenantId],
		});
	};

	if (collateralQuery.isLoading) {
		return <LoanCollateralTabSkeleton />;
	}

	const collateral = collateralQuery.data || [];
	const totalValue = collateral.reduce(
		(sum, item) => sum + (item.value || 0),
		0,
	);

	if (collateral.length === 0) {
		return (
			<>
				<Card>
					<CardContent className="py-8 text-center">
						<Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium text-muted-foreground mb-2">
							No Collateral Recorded
						</p>
						<p className="text-sm text-muted-foreground mb-4">
							Add collateral items to secure this loan.
						</p>
						<Button onClick={() => setShowAddDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add Collateral
						</Button>
					</CardContent>
				</Card>
				<AddCollateralDialog
					open={showAddDialog}
					onOpenChange={setShowAddDialog}
					loanId={loanId}
					currency={currency}
					onSuccess={handleAddSuccess}
				/>
			</>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{/* Header with Add button */}
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-medium">Loan Collateral</h3>
						<p className="text-xs text-muted-foreground">
							{collateral.length} item{collateral.length !== 1 ? "s" : ""}
						</p>
					</div>
					<Button size="sm" onClick={() => setShowAddDialog(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Add Collateral
					</Button>
				</div>

				{/* Summary Card */}
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Total Collateral Value
								</p>
								<p className="text-lg font-semibold font-mono">
									{currency} {formatAmount(totalValue)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Collateral Table */}
				<div className="rounded-md border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead>Type</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="text-right">Value</TableHead>
								<TableHead className="w-16">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{collateral.map((item, index) => (
								<TableRow key={item.id || index}>
									<TableCell className="font-medium">
										{item.type?.name ||
											item.type?.description ||
											"Unknown Type"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{item.description || "—"}
									</TableCell>
									<TableCell className="text-right font-mono">
										{currency} {formatAmount(item.value)}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteTarget(item)}
											className="text-destructive hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Add Dialog */}
			<AddCollateralDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				loanId={loanId}
				currency={currency}
				onSuccess={handleAddSuccess}
			/>

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Collateral</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove this{" "}
							<strong>{deleteTarget?.type?.name || "collateral item"}</strong>
							{deleteTarget?.value
								? ` valued at ${currency} ${formatAmount(deleteTarget.value)}`
								: ""}
							? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteTarget?.id && deleteMutation.mutate(deleteTarget.id)
							}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Removing..." : "Remove Collateral"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function LoanCollateralTabSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-9 w-32" />
			</div>
			<Card>
				<CardContent className="p-4">
					<Skeleton className="h-4 w-32 mb-2" />
					<Skeleton className="h-7 w-40" />
				</CardContent>
			</Card>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>
								<Skeleton className="h-4 w-16" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-24" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-16" />
							</TableHead>
							<TableHead>
								<Skeleton className="h-4 w-8" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3].map((row) => (
							<TableRow key={row}>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-48" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-8" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
