"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	PaymentTypeData,
	PaymentTypeRequest,
	PutPaymentTypesPaymentTypeIdRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { getFieldError } from "@/lib/fineract/ui-api-error";
import {
	type PaymentTypeFormData,
	paymentTypeSchema,
} from "@/lib/schemas/payment-type";
import { useTenantStore } from "@/store/tenant";

function PaymentTypesTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{Array.from({ length: 6 }).map((_, index) => (
								<th key={`payment-type-header-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, rowIndex) => (
							<tr key={`payment-type-row-${rowIndex}`}>
								{Array.from({ length: 6 }).map((_, colIndex) => (
									<td
										key={`payment-type-cell-${rowIndex}-${colIndex}`}
										className="px-3 py-2"
									>
										<Skeleton className="h-4 w-24" />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}

function PaymentTypeFormSkeleton() {
	return (
		<div className="mt-6 space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-24 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="rounded-sm border p-3">
				<Skeleton className="h-5 w-44" />
				<Skeleton className="mt-2 h-4 w-72" />
			</div>
			<div className="flex items-center justify-between gap-2 pt-2">
				<Skeleton className="h-9 w-20" />
				<Skeleton className="h-9 w-32" />
			</div>
		</div>
	);
}

function toFormValues(
	paymentType?: PaymentTypeData | null,
): PaymentTypeFormData {
	return {
		name: paymentType?.name || "",
		description: paymentType?.description || "",
		isCashPayment: Boolean(paymentType?.isCashPayment),
		position:
			typeof paymentType?.position === "number"
				? paymentType.position
				: undefined,
	};
}

async function fetchPaymentTypes(tenantId: string): Promise<PaymentTypeData[]> {
	const response = await fetch(BFF_ROUTES.paymentTypes, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw (await response.json().catch(() => ({
			message: "Failed to fetch payment types",
		}))) as unknown;
	}

	return response.json();
}

async function fetchPaymentTypeById(
	tenantId: string,
	paymentTypeId: number,
): Promise<PaymentTypeData> {
	const response = await fetch(BFF_ROUTES.paymentTypeById(paymentTypeId), {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw (await response.json().catch(() => ({
			message: "Failed to fetch payment type",
		}))) as unknown;
	}

	return response.json();
}

async function parseSubmitResponse<T>(
	response: Response,
	fallbackMessage: string,
): Promise<T> {
	const payload = (await response.json().catch(() => ({
		message: fallbackMessage,
		status: response.status,
	}))) as T;

	if (!response.ok) {
		throw payload;
	}

	return payload;
}

async function createPaymentType(
	tenantId: string,
	payload: PaymentTypeRequest,
): Promise<unknown> {
	const response = await fetch(BFF_ROUTES.paymentTypes, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse(response, "Failed to create payment type");
}

async function updatePaymentType(
	tenantId: string,
	paymentTypeId: number,
	payload: PutPaymentTypesPaymentTypeIdRequest,
): Promise<unknown> {
	const response = await fetch(BFF_ROUTES.paymentTypeById(paymentTypeId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse(response, "Failed to update payment type");
}

async function deletePaymentType(
	tenantId: string,
	paymentTypeId: number,
): Promise<unknown> {
	const response = await fetch(BFF_ROUTES.paymentTypeById(paymentTypeId), {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	return parseSubmitResponse(response, "Failed to delete payment type");
}

export default function PaymentTypesPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState("");
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingPaymentType, setEditingPaymentType] =
		useState<PaymentTypeData | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const form = useForm<PaymentTypeFormData>({
		resolver: zodResolver(paymentTypeSchema),
		defaultValues: {
			name: "",
			description: "",
			isCashPayment: false,
			position: undefined,
		},
	});

	const paymentTypesQuery = useQuery({
		queryKey: ["payment-types", tenantId],
		queryFn: () => fetchPaymentTypes(tenantId),
	});

	const paymentTypeDetailQuery = useQuery({
		queryKey: ["payment-type", tenantId, editingPaymentType?.id],
		queryFn: () =>
			fetchPaymentTypeById(tenantId, Number(editingPaymentType?.id)),
		enabled: isSheetOpen && editingPaymentType?.id !== undefined,
	});

	const paymentTypes = paymentTypesQuery.data || [];

	const nextPosition = useMemo(() => {
		const definedPositions = paymentTypes
			.map((item) => item.position)
			.filter((position): position is number => typeof position === "number");
		return definedPositions.length > 0 ? Math.max(...definedPositions) + 1 : 1;
	}, [paymentTypes]);

	const filteredPaymentTypes = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();
		if (!normalizedSearch) {
			return paymentTypes;
		}

		return paymentTypes.filter((item) => {
			return (
				(item.name || "").toLowerCase().includes(normalizedSearch) ||
				(item.description || "").toLowerCase().includes(normalizedSearch)
			);
		});
	}, [paymentTypes, searchTerm]);

	useEffect(() => {
		if (!paymentTypeDetailQuery.data || !isSheetOpen || !editingPaymentType) {
			return;
		}

		form.reset(toFormValues(paymentTypeDetailQuery.data));
	}, [editingPaymentType, form, isSheetOpen, paymentTypeDetailQuery.data]);

	const createMutation = useMutation({
		mutationFn: (payload: PaymentTypeRequest) =>
			createPaymentType(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payment-types", tenantId] });
			setSubmitError(null);
			setIsSheetOpen(false);
			toast.success("Payment type created successfully");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "createPaymentType",
					endpoint: BFF_ROUTES.paymentTypes,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutPaymentTypesPaymentTypeIdRequest) =>
			updatePaymentType(tenantId, Number(editingPaymentType?.id), payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payment-types", tenantId] });
			queryClient.invalidateQueries({
				queryKey: ["payment-type", tenantId, editingPaymentType?.id],
			});
			setSubmitError(null);
			setIsSheetOpen(false);
			toast.success("Payment type updated successfully");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updatePaymentType",
					endpoint: BFF_ROUTES.paymentTypeById(editingPaymentType?.id || 0),
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () =>
			deletePaymentType(tenantId, Number(editingPaymentType?.id)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["payment-types", tenantId] });
			setSubmitError(null);
			setIsDeleteDialogOpen(false);
			setIsSheetOpen(false);
			toast.success("Payment type deleted successfully");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deletePaymentType",
					endpoint: BFF_ROUTES.paymentTypeById(editingPaymentType?.id || 0),
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const isEditing = editingPaymentType !== null;
	const isSystemDefined = Boolean(editingPaymentType?.isSystemDefined);
	const isSubmitting =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	const nameApiError = getFieldError(submitError, "name");
	const descriptionApiError = getFieldError(submitError, "description");
	const positionApiError = getFieldError(submitError, "position");

	const handleCreateSheet = () => {
		setEditingPaymentType(null);
		setSubmitError(null);
		setIsDeleteDialogOpen(false);
		form.reset({
			name: "",
			description: "",
			isCashPayment: false,
			position: nextPosition,
		});
		setIsSheetOpen(true);
	};

	const handleEditSheet = (paymentType: PaymentTypeData) => {
		if (paymentType.id === undefined) {
			return;
		}

		setEditingPaymentType(paymentType);
		setSubmitError(null);
		setIsDeleteDialogOpen(false);
		form.reset(toFormValues(paymentType));
		setIsSheetOpen(true);
	};

	const handleSheetOpenChange = (open: boolean) => {
		setIsSheetOpen(open);
		if (!open) {
			setEditingPaymentType(null);
			setSubmitError(null);
			setIsDeleteDialogOpen(false);
		}
	};

	const onSubmit = (values: PaymentTypeFormData) => {
		setSubmitError(null);
		const payload: PaymentTypeRequest = {
			name: values.name.trim(),
			description: values.description?.trim() || undefined,
			isCashPayment: values.isCashPayment,
			position: values.position,
		};

		if (isEditing) {
			updateMutation.mutate(payload);
			return;
		}

		createMutation.mutate(payload);
	};

	const columns: DataTableColumn<PaymentTypeData>[] = [
		{
			header: "Name",
			cell: (item) => (
				<div>
					<div className="font-medium">{item.name || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{item.description || "No description"}
					</div>
				</div>
			),
		},
		{
			header: "Type",
			cell: (item) => (
				<Badge variant={item.isCashPayment ? "success" : "warning"}>
					{item.isCashPayment ? "Cash" : "Non-cash"}
				</Badge>
			),
		},
		{
			header: "Position",
			cell: (item) => <span>{item.position ?? "—"}</span>,
		},
		{
			header: "Scope",
			cell: (item) => (
				<Badge variant={item.isSystemDefined ? "secondary" : "outline"}>
					{item.isSystemDefined ? "System" : "Custom"}
				</Badge>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (item) => (
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={item.id === undefined}
					onClick={(event) => {
						event.stopPropagation();
						handleEditSheet(item);
					}}
				>
					<Pencil className="h-3.5 w-3.5 mr-1.5" />
					Edit
				</Button>
			),
		},
	];

	const totalPaymentTypes = paymentTypes.length;
	const totalCashPaymentTypes = paymentTypes.filter(
		(item) => item.isCashPayment,
	).length;
	const totalSystemDefined = paymentTypes.filter(
		(item) => item.isSystemDefined,
	).length;
	const totalCustom = totalPaymentTypes - totalSystemDefined;

	return (
		<PageShell
			title="Payment Types"
			subtitle="Manage payment methods used in transactions and product accounting mappings."
			actions={
				<Button onClick={handleCreateSheet}>
					<Plus className="h-4 w-4 mr-2" />
					Create Payment Type
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{totalPaymentTypes}</div>
							<div className="text-sm text-muted-foreground">
								Total Payment Types
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{totalCashPaymentTypes}</div>
							<div className="text-sm text-muted-foreground">
								Cash Payment Types
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{totalCustom}</div>
							<div className="text-sm text-muted-foreground">Custom Types</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{totalSystemDefined}</div>
							<div className="text-sm text-muted-foreground">System Types</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Payment Type Registry</CardTitle>
						<CardDescription>
							Configure payment methods for loan/savings transactions and fund
							source mappings.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="max-w-lg space-y-2">
							<Label htmlFor="payment-type-search">Search Payment Types</Label>
							<Input
								id="payment-type-search"
								placeholder="Search by name or description"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
							/>
						</div>

						{paymentTypesQuery.isLoading ? (
							<PaymentTypesTableSkeleton />
						) : paymentTypesQuery.error ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load payment types</AlertTitle>
								<AlertDescription>
									Payment types could not be loaded right now. Refresh the page
									and try again.
								</AlertDescription>
							</Alert>
						) : (
							<DataTable
								data={filteredPaymentTypes}
								columns={columns}
								getRowId={(item) => item.id || `payment-type-${item.name}`}
								pageSize={8}
								onRowClick={(item) => {
									if (item.id === undefined) {
										return;
									}

									handleEditSheet(item);
								}}
								emptyMessage="No payment types found."
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditing ? "Edit Payment Type" : "Create Payment Type"}
						</SheetTitle>
						<SheetDescription>
							Define how this payment method is labeled and classified for
							transaction usage.
						</SheetDescription>
					</SheetHeader>

					{isEditing && paymentTypeDetailQuery.isLoading ? (
						<PaymentTypeFormSkeleton />
					) : isEditing && paymentTypeDetailQuery.error ? (
						<Alert variant="destructive" className="mt-6">
							<AlertTitle>Unable to load payment type details</AlertTitle>
							<AlertDescription>
								Details for this payment type could not be loaded. Close this
								drawer and try again.
							</AlertDescription>
						</Alert>
					) : (
						<form
							className="mt-6 space-y-6"
							onSubmit={form.handleSubmit(onSubmit)}
						>
							<SubmitErrorAlert
								error={submitError}
								title="Unable to save payment type"
							/>

							<div className="space-y-2">
								<Label htmlFor="payment-type-name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="payment-type-name"
									placeholder="e.g. Mobile Money"
									{...form.register("name")}
								/>
								{(form.formState.errors.name?.message || nameApiError) && (
									<p className="text-sm text-destructive">
										{form.formState.errors.name?.message || nameApiError}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="payment-type-description">Description</Label>
								<Textarea
									id="payment-type-description"
									placeholder="Describe where and how this payment type should be used"
									rows={4}
									{...form.register("description")}
								/>
								{(form.formState.errors.description?.message ||
									descriptionApiError) && (
									<p className="text-sm text-destructive">
										{form.formState.errors.description?.message ||
											descriptionApiError}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="payment-type-position">Position</Label>
								<Input
									id="payment-type-position"
									type="number"
									min={0}
									step={1}
									{...form.register("position")}
								/>
								{(form.formState.errors.position?.message ||
									positionApiError) && (
									<p className="text-sm text-destructive">
										{form.formState.errors.position?.message ||
											positionApiError}
									</p>
								)}
							</div>

							<div className="rounded-sm border p-3">
								<Controller
									control={form.control}
									name="isCashPayment"
									render={({ field }) => (
										<div className="flex items-start gap-2">
											<Checkbox
												id="payment-type-is-cash"
												checked={field.value}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
											<div className="space-y-1">
												<Label htmlFor="payment-type-is-cash">
													Cash payment type
												</Label>
												<p className="text-xs text-muted-foreground">
													Enable this when the method represents physical cash
													collection or disbursement.
												</p>
											</div>
										</div>
									)}
								/>
							</div>

							{isSystemDefined && (
								<Alert>
									<AlertTitle>System-defined payment type</AlertTitle>
									<AlertDescription>
										This payment type is provided by the system. Deletion is
										disabled.
									</AlertDescription>
								</Alert>
							)}

							<div className="flex items-center justify-between gap-2 pt-2">
								<div>
									{isEditing && !isSystemDefined && (
										<Button
											type="button"
											variant="destructive"
											onClick={() => setIsDeleteDialogOpen(true)}
											disabled={isSubmitting}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete
										</Button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleSheetOpenChange(false)}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isSubmitting}>
										{isEditing ? "Save Changes" : "Create Payment Type"}
									</Button>
								</div>
							</div>
						</form>
					)}
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Payment Type</AlertDialogTitle>
						<AlertDialogDescription>
							Delete "{editingPaymentType?.name || "this payment type"}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								deleteMutation.mutate();
							}}
							disabled={deleteMutation.isPending}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	);
}
