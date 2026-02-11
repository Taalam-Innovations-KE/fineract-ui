"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AccountNumberFormatForm } from "@/components/config/forms/account-number-format-form";
import { PageShell } from "@/components/config/page-shell";
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
import { Skeleton } from "@/components/ui/skeleton";
import type {
	AccountNumberFormatMutationRequest,
	AccountNumberFormatRecord,
} from "@/lib/fineract/account-number-formats";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetAccountNumberFormatsResponseTemplate } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchAccountNumberFormats(
	tenantId: string,
): Promise<AccountNumberFormatRecord[]> {
	const response = await fetch(BFF_ROUTES.accountNumberFormats, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch account number formats");
	}

	return response.json();
}

async function fetchAccountNumberFormatsTemplate(
	tenantId: string,
): Promise<GetAccountNumberFormatsResponseTemplate> {
	const response = await fetch(BFF_ROUTES.accountNumberFormatsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch account number formats template");
	}

	return response.json();
}

async function createAccountNumberFormat(
	tenantId: string,
	data: AccountNumberFormatMutationRequest,
) {
	const response = await fetch(BFF_ROUTES.accountNumberFormats, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to create account number format" }));
		throw payload;
	}

	return response.json();
}

async function updateAccountNumberFormat(
	tenantId: string,
	formatId: number,
	data: AccountNumberFormatMutationRequest,
) {
	const response = await fetch(
		`${BFF_ROUTES.accountNumberFormats}/${formatId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(data),
		},
	);

	if (!response.ok) {
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to update account number format" }));
		throw payload;
	}

	return response.json();
}

async function deleteAccountNumberFormat(tenantId: string, formatId: number) {
	const response = await fetch(
		`${BFF_ROUTES.accountNumberFormats}/${formatId}`,
		{
			method: "DELETE",
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to delete account number format" }));
		throw payload;
	}

	return response.json();
}

export default function AccountNumberFormatsPage() {
	const { tenantId } = useTenantStore();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedFormat, setSelectedFormat] =
		useState<AccountNumberFormatRecord | null>(null);
	const queryClient = useQueryClient();

	const isEditing = Boolean(selectedFormat);

	const {
		data: formats = [],
		isLoading: formatsLoading,
		error: formatsError,
	} = useQuery({
		queryKey: ["accountNumberFormats", tenantId],
		queryFn: () => fetchAccountNumberFormats(tenantId),
	});

	const {
		data: templateData,
		isLoading: templateLoading,
		error: templateError,
	} = useQuery({
		queryKey: ["accountNumberFormatsTemplate", tenantId],
		queryFn: () => fetchAccountNumberFormatsTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (data: AccountNumberFormatMutationRequest) =>
			createAccountNumberFormat(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accountNumberFormats", tenantId],
			});
			setIsDialogOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: AccountNumberFormatMutationRequest) =>
			updateAccountNumberFormat(tenantId, selectedFormat!.id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accountNumberFormats", tenantId],
			});
			setIsDialogOpen(false);
			setSelectedFormat(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () =>
			deleteAccountNumberFormat(tenantId, Number(selectedFormat?.id)),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accountNumberFormats", tenantId],
			});
			setIsDialogOpen(false);
			setSelectedFormat(null);
		},
	});

	const handleRowClick = (row: AccountNumberFormatRecord) => {
		setSelectedFormat(row);
		setIsDialogOpen(true);
	};

	const handleCreateNew = () => {
		setSelectedFormat(null);
		setIsDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setIsDialogOpen(open);
		if (!open) {
			setSelectedFormat(null);
		}
	};

	const formatColumns = [
		{
			header: "Account Type",
			cell: (format: AccountNumberFormatRecord) => (
				<span className="font-medium">
					{format.accountType?.value || "Unknown"}
				</span>
			),
		},
		{
			header: "Prefix Type",
			cell: (format: AccountNumberFormatRecord) => (
				<span className="text-muted-foreground">
					{format.prefixType?.value || "Unknown"}
				</span>
			),
		},
		{
			header: "Prefix Characters",
			cell: (format: AccountNumberFormatRecord) => (
				<span className="text-muted-foreground">
					{format.prefixCharacter || "—"}
				</span>
			),
		},
	];

	// Calculate statistics
	const totalFormats = formats.length;
	const formatsByType = formats.reduce(
		(acc, format) => {
			const type = format.accountType?.value || "Unknown";
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const isLoading = formatsLoading || templateLoading;
	const hasError = formatsError || templateError;

	return (
		<PageShell
			title="Account Number Formats"
			subtitle="Configure account number formatting for different account types"
			actions={
				<Button onClick={handleCreateNew} disabled={!templateData}>
					<Plus className="h-4 w-4 mr-2" />
					Create Format
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Total Formats
								</span>
								<span className="text-2xl font-bold">{totalFormats}</span>
							</div>
						</CardContent>
					</Card>
					{Object.entries(formatsByType).map(([type, count]) => (
						<Card key={type}>
							<CardContent className="pt-6">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">{type}</span>
									<span className="text-2xl font-bold">{count}</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Account Number Formats</CardTitle>
						<CardDescription>
							Listing of all configured account number formats in your
							organization
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: 8 }).map((_, index) => (
									<Skeleton
										key={`account-number-format-skeleton-${index}`}
										className="h-12 w-full"
									/>
								))}
							</div>
						)}
						{hasError && (
							<div className="text-center py-8 text-destructive">
								Failed to load account number formats. Please try again.
							</div>
						)}
						{!isLoading && !hasError && formats.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No account number formats found. Create your first format to get
								started.
							</div>
						)}
						{!isLoading && !hasError && formats.length > 0 && (
							<DataTable
								data={formats}
								columns={formatColumns}
								getRowId={(row) => row.id?.toString() ?? "format-row"}
								onRowClick={handleRowClick}
								enableActions={false}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDialogOpen} onOpenChange={handleDialogClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditing
								? "Edit Account Number Format"
								: "Create New Account Number Format"}
						</SheetTitle>
						<SheetDescription>
							{isEditing
								? "Update account number format details"
								: "Configure how account numbers are formatted for a specific account type"}
						</SheetDescription>
					</SheetHeader>
					{templateData && (
						<div className="mt-6">
							<AccountNumberFormatForm
								key={selectedFormat?.id ?? "new"}
								templateData={templateData}
								initialData={selectedFormat ?? undefined}
								onSubmit={(data) =>
									isEditing
										? updateMutation.mutateAsync(data)
										: createMutation.mutateAsync(data)
								}
								onDelete={
									isEditing ? () => deleteMutation.mutateAsync() : undefined
								}
								onCancel={() => handleDialogClose(false)}
							/>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
