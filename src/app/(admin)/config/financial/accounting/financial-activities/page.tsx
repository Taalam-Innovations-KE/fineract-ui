"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	FinancialActivityAccountData,
	FinancialActivityData,
	GetFinancialActivityAccountsResponse,
	GlAccountData,
	PostFinancialActivityAccountsRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type MappingFormState = {
	financialActivityId: string;
	glAccountId: string;
};

const DEFAULT_FORM: MappingFormState = {
	financialActivityId: "",
	glAccountId: "",
};

function MappingSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{Array.from({ length: 4 }).map((_, index) => (
								<th key={`map-head-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 5 }).map((_, rowIndex) => (
							<tr key={`map-row-${rowIndex}`}>
								{Array.from({ length: 4 }).map((_, cellIndex) => (
									<td
										key={`map-cell-${rowIndex}-${cellIndex}`}
										className="px-3 py-2"
									>
										<Skeleton className="h-4 w-28" />
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

async function fetchMappings(
	tenantId: string,
): Promise<GetFinancialActivityAccountsResponse[]> {
	const response = await fetch(BFF_ROUTES.financialActivityAccounts, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) {
		throw new Error("Failed to fetch financial activity mappings");
	}
	return response.json();
}

async function fetchTemplate(
	tenantId: string,
): Promise<FinancialActivityAccountData> {
	const response = await fetch(BFF_ROUTES.financialActivityAccountsTemplate, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) {
		throw new Error("Failed to fetch mapping template");
	}
	return response.json();
}

async function parseSubmitResponse<T>(
	response: Response,
	fallbackMessage: string,
): Promise<T> {
	const result = (await response.json().catch(() => ({
		message: fallbackMessage,
		statusCode: response.status,
	}))) as T;
	if (!response.ok) {
		throw result;
	}
	return result;
}

async function createMapping(
	tenantId: string,
	payload: PostFinancialActivityAccountsRequest,
) {
	const response = await fetch(BFF_ROUTES.financialActivityAccounts, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});
	return parseSubmitResponse(response, "Failed to create mapping");
}

async function updateMapping(
	tenantId: string,
	mappingId: number,
	payload: PostFinancialActivityAccountsRequest,
) {
	const response = await fetch(
		BFF_ROUTES.financialActivityAccountById(mappingId),
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);
	return parseSubmitResponse(response, "Failed to update mapping");
}

async function deleteMapping(tenantId: string, mappingId: number) {
	const response = await fetch(
		BFF_ROUTES.financialActivityAccountById(mappingId),
		{
			method: "DELETE",
			headers: { "x-tenant-id": tenantId },
		},
	);
	return parseSubmitResponse(response, "Failed to delete mapping");
}

function mapActivityTypeToKey(mappedType?: string) {
	switch (mappedType) {
		case "ASSET":
			return "assetAccountOptions";
		case "LIABILITY":
			return "liabilityAccountOptions";
		case "EQUITY":
			return "equityAccountOptions";
		case "INCOME":
			return "incomeAccountOptions";
		case "EXPENSE":
			return "expenseAccountOptions";
		default:
			return "";
	}
}

export default function FinancialActivityMappingsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingMapping, setEditingMapping] =
		useState<GetFinancialActivityAccountsResponse | null>(null);
	const [formState, setFormState] = useState<MappingFormState>(DEFAULT_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const mappingsQuery = useQuery({
		queryKey: ["financial-activity-mappings", tenantId],
		queryFn: () => fetchMappings(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["financial-activity-template", tenantId],
		queryFn: () => fetchTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostFinancialActivityAccountsRequest) =>
			createMapping(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["financial-activity-mappings", tenantId],
			});
			setIsSheetOpen(false);
			setEditingMapping(null);
			setFormError(null);
			setSubmitError(null);
			setToastMessage("Mapping created successfully");
		},
		onError: (error) => {
			const trackedError = toSubmitActionError(error, {
				action: "createFinancialActivityMapping",
				endpoint: BFF_ROUTES.financialActivityAccounts,
				method: "POST",
				tenantId,
			});
			setSubmitError(trackedError);
			setFormError(trackedError.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PostFinancialActivityAccountsRequest) =>
			updateMapping(tenantId, editingMapping?.id || 0, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["financial-activity-mappings", tenantId],
			});
			setIsSheetOpen(false);
			setEditingMapping(null);
			setFormError(null);
			setSubmitError(null);
			setToastMessage("Mapping updated successfully");
		},
		onError: (error) => {
			const trackedError = toSubmitActionError(error, {
				action: "updateFinancialActivityMapping",
				endpoint: BFF_ROUTES.financialActivityAccountById(
					editingMapping?.id || 0,
				),
				method: "PUT",
				tenantId,
			});
			setSubmitError(trackedError);
			setFormError(trackedError.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteMapping(tenantId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["financial-activity-mappings", tenantId],
			});
			setSubmitError(null);
			setToastMessage("Mapping deleted successfully");
		},
		onError: (error, id) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteFinancialActivityMapping",
					endpoint: BFF_ROUTES.financialActivityAccountById(id),
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const template = templateQuery.data;
	const mappings = mappingsQuery.data || [];
	const activityOptions = template?.financialActivityOptions || [];
	const glAccountOptions = template?.glAccountOptions || {};

	const selectedActivity = useMemo(() => {
		return activityOptions.find(
			(activity) => String(activity.id) === formState.financialActivityId,
		);
	}, [activityOptions, formState.financialActivityId]);

	const selectableAccounts = useMemo(() => {
		if (!selectedActivity?.mappedGLAccountType) return [];
		const key = mapActivityTypeToKey(selectedActivity.mappedGLAccountType);
		const options =
			(glAccountOptions as Record<string, GlAccountData[]>)[key] || [];
		return options;
	}, [selectedActivity, glAccountOptions]);

	const openCreateSheet = () => {
		const defaultActivity = activityOptions[0];
		const key = mapActivityTypeToKey(defaultActivity?.mappedGLAccountType);
		const defaultAccounts =
			((glAccountOptions as Record<string, GlAccountData[]>)[key] || [])[0] ||
			null;
		setEditingMapping(null);
		setFormError(null);
		setSubmitError(null);
		setFormState({
			financialActivityId: defaultActivity?.id
				? String(defaultActivity.id)
				: "",
			glAccountId: defaultAccounts?.id ? String(defaultAccounts.id) : "",
		});
		setIsSheetOpen(true);
	};

	const openEditSheet = (mapping: GetFinancialActivityAccountsResponse) => {
		setEditingMapping(mapping);
		setFormError(null);
		setSubmitError(null);
		setFormState({
			financialActivityId: mapping.financialActivityData?.id
				? String(mapping.financialActivityData.id)
				: "",
			glAccountId: mapping.glAccountData?.id
				? String(mapping.glAccountData.id)
				: "",
		});
		setIsSheetOpen(true);
	};

	const handleSave = () => {
		setSubmitError(null);
		if (!formState.financialActivityId || !formState.glAccountId) {
			setFormError("Financial activity and GL account are required");
			return;
		}

		setFormError(null);
		const payload: PostFinancialActivityAccountsRequest = {
			financialActivityId: Number(formState.financialActivityId),
			glAccountId: Number(formState.glAccountId),
		};

		if (editingMapping) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const handleDelete = (mapping: GetFinancialActivityAccountsResponse) => {
		setSubmitError(null);
		if (!mapping.id) return;
		const confirmed = window.confirm(
			`Delete mapping for ${mapping.financialActivityData?.name || "activity"}?`,
		);
		if (!confirmed) return;
		deleteMutation.mutate(mapping.id);
	};

	const columns = [
		{
			header: "Activity",
			cell: (mapping: GetFinancialActivityAccountsResponse) => (
				<div>
					<div className="font-medium">
						{mapping.financialActivityData?.name || "—"}
					</div>
					<div className="text-xs text-muted-foreground">
						{mapping.financialActivityData?.id || ""}
					</div>
				</div>
			),
		},
		{
			header: "Mapped GL Type",
			cell: (mapping: GetFinancialActivityAccountsResponse) => (
				<Badge variant="outline">
					{mapping.financialActivityData?.mappedGLAccountType || "—"}
				</Badge>
			),
		},
		{
			header: "GL Account",
			cell: (mapping: GetFinancialActivityAccountsResponse) => (
				<div>
					<div className="font-medium">
						{mapping.glAccountData?.name || "—"}
					</div>
					<div className="text-xs font-mono text-muted-foreground">
						{mapping.glAccountData?.glCode || "—"}
					</div>
				</div>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (mapping: GetFinancialActivityAccountsResponse) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => openEditSheet(mapping)}
					>
						Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleDelete(mapping)}
						disabled={deleteMutation.isPending}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			),
		},
	];

	const isBusy =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return (
		<>
			<PageShell
				title="Financial Activity Mappings"
				subtitle="Map system financial activities to valid GL accounts"
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/financial/accounting">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Accounting Setup
							</Link>
						</Button>
						<Button onClick={openCreateSheet}>
							<Plus className="h-4 w-4 mr-2" />
							Create Mapping
						</Button>
					</div>
				}
			>
				<Card>
					<CardHeader>
						<CardTitle>Mappings</CardTitle>
						<CardDescription>
							{mappings.length} activity-to-account mappings configured.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<SubmitErrorAlert
							error={submitError}
							title="Financial activity mapping action failed"
						/>
						{mappingsQuery.isLoading || templateQuery.isLoading ? (
							<MappingSkeleton />
						) : (
							<DataTable
								data={mappings}
								columns={columns}
								getRowId={(mapping) => mapping.id || "mapping-row"}
								emptyMessage="No financial activity mappings found."
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{editingMapping ? "Edit Mapping" : "Create Mapping"}
						</SheetTitle>
						<SheetDescription>
							Select a financial activity and a compliant GL account.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						<SubmitErrorAlert
							error={submitError}
							title="Financial activity mapping action failed"
						/>
						{formError && (
							<Alert variant="destructive">
								<AlertTitle>Validation Error</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label>Financial Activity</Label>
							<Select
								value={formState.financialActivityId}
								onValueChange={(value) => {
									const selected = activityOptions.find(
										(activity) => String(activity.id) === value,
									);
									const key = mapActivityTypeToKey(
										selected?.mappedGLAccountType,
									);
									const nextAccount =
										((glAccountOptions as Record<string, GlAccountData[]>)[
											key
										] || [])[0]?.id || "";
									setFormState({
										financialActivityId: value,
										glAccountId: String(nextAccount),
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select activity" />
								</SelectTrigger>
								<SelectContent>
									{activityOptions.map((activity: FinancialActivityData) => (
										<SelectItem key={activity.id} value={String(activity.id)}>
											{activity.name} ({activity.mappedGLAccountType})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>GL Account</Label>
							<Select
								value={formState.glAccountId}
								onValueChange={(value) =>
									setFormState((prev) => ({ ...prev, glAccountId: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select GL account" />
								</SelectTrigger>
								<SelectContent>
									{selectableAccounts.map((account) => (
										<SelectItem key={account.id} value={String(account.id)}>
											{account.name} ({account.glCode})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setIsSheetOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isBusy}>
								<Link2 className="h-4 w-4 mr-2" />
								{editingMapping ? "Save Changes" : "Create Mapping"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{toastMessage && (
				<Alert
					variant="success"
					className="fixed bottom-6 right-6 z-50 w-[320px]"
				>
					<AlertTitle>Success</AlertTitle>
					<AlertDescription>{toastMessage}</AlertDescription>
				</Alert>
			)}
		</>
	);
}
