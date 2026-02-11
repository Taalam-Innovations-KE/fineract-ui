"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Trash2, User } from "lucide-react";
import { useState } from "react";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { AddGuarantorDialog } from "@/components/loans/dialogs";
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
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import type { GuarantorResponse } from "@/lib/schemas/loan-metadata";
import { useTenantStore } from "@/store/tenant";

interface LoanGuarantorsTabProps {
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

export function LoanGuarantorsTab({
	loanId,
	currency = "KES",
}: LoanGuarantorsTabProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<GuarantorResponse | null>(
		null,
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const guarantorsQuery = useQuery({
		queryKey: ["loanGuarantors", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanGuarantors(loanId), {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch guarantors");
			return response.json() as Promise<GuarantorResponse[]>;
		},
		enabled: !!loanId,
	});

	const deleteMutation = useMutation({
		mutationFn: async (guarantorId: number) => {
			const response = await fetch(
				`${BFF_ROUTES.loanGuarantors(loanId)}/${guarantorId}`,
				{
					method: "DELETE",
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) {
				const error = await response.json().catch(() => null);
				const message =
					typeof error === "object" &&
					error !== null &&
					"message" in error &&
					typeof (error as { message?: unknown }).message === "string"
						? ((error as { message: string }).message ??
							"Failed to delete guarantor")
						: "Failed to delete guarantor";
				if (typeof error === "object" && error !== null) {
					throw { ...error, message };
				}
				throw { message };
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["loanGuarantors", loanId, tenantId],
			});
			setSubmitError(null);
			setDeleteTarget(null);
		},
		onError: (error, guarantorId) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteLoanGuarantor",
					endpoint: `${BFF_ROUTES.loanGuarantors(loanId)}/${guarantorId}`,
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const handleAddSuccess = () => {
		queryClient.invalidateQueries({
			queryKey: ["loanGuarantors", loanId, tenantId],
		});
	};

	if (guarantorsQuery.isLoading) {
		return <LoanGuarantorsTabSkeleton />;
	}

	const guarantors = guarantorsQuery.data || [];
	const activeGuarantors = guarantors.filter((g) => g.status !== false);
	const totalOnHold = guarantors.reduce(
		(sum, g) => sum + (g.onHoldAmount || 0),
		0,
	);

	if (guarantors.length === 0) {
		return (
			<>
				<SubmitErrorAlert error={submitError} title="Guarantor action failed" />
				<Card>
					<CardContent className="py-8 text-center">
						<Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium text-muted-foreground mb-2">
							No Guarantors Assigned
						</p>
						<p className="text-sm text-muted-foreground mb-4">
							Add guarantors to secure this loan application.
						</p>
						<Button onClick={() => setShowAddDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add Guarantor
						</Button>
					</CardContent>
				</Card>
				<AddGuarantorDialog
					open={showAddDialog}
					onOpenChange={setShowAddDialog}
					loanId={loanId}
					onSuccess={handleAddSuccess}
				/>
			</>
		);
	}

	return (
		<>
			<div className="space-y-4">
				<SubmitErrorAlert error={submitError} title="Guarantor action failed" />
				{/* Header with Add button */}
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-medium">Loan Guarantors</h3>
						<p className="text-xs text-muted-foreground">
							{activeGuarantors.length} active guarantor
							{activeGuarantors.length !== 1 ? "s" : ""}
						</p>
					</div>
					<Button size="sm" onClick={() => setShowAddDialog(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Add Guarantor
					</Button>
				</div>

				{/* Summary Card */}
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Total Amount On Hold
								</p>
								<p className="text-lg font-semibold font-mono">
									{currency} {formatAmount(totalOnHold)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Guarantors Table */}
				<Card className="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead>Guarantor</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Relationship</TableHead>
								<TableHead className="text-right">Amount On Hold</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-16">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{guarantors.map((guarantor, index) => (
								<TableRow key={guarantor.id || index}>
									<TableCell>
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">
												{guarantor.firstname} {guarantor.lastname}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{guarantor.guarantorType?.value || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{guarantor.clientRelationshipType?.name || "—"}
									</TableCell>
									<TableCell className="text-right font-mono">
										{currency} {formatAmount(guarantor.onHoldAmount)}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												guarantor.status !== false ? "default" : "secondary"
											}
											className="text-xs"
										>
											{guarantor.status !== false ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteTarget(guarantor)}
											className="text-destructive hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</div>

			{/* Add Dialog */}
			<AddGuarantorDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				loanId={loanId}
				onSuccess={handleAddSuccess}
			/>

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Guarantor</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<strong>
								{deleteTarget?.firstname} {deleteTarget?.lastname}
							</strong>{" "}
							as a guarantor? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!deleteTarget?.id) return;
								setSubmitError(null);
								deleteMutation.mutate(deleteTarget.id);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Removing..." : "Remove Guarantor"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function LoanGuarantorsTabSkeleton() {
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
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<TableHead key={i}>
									<Skeleton className="h-4 w-20" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3].map((row) => (
							<TableRow key={row}>
								{[1, 2, 3, 4, 5, 6].map((cell) => (
									<TableCell key={cell}>
										<Skeleton className="h-4 w-24" />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
