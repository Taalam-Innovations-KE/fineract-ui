"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Percent, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetProvisioningCriteriaCriteriaIdResponse,
	GetProvisioningCriteriaResponse,
	GlAccountData,
	LoanProductData,
	PostProvisioningCriteriaRequest,
	ProvisioningCriteriaData,
	ProvisioningCriteriaDefinitionData,
	PutProvisioningCriteriaRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type DefinitionRow = {
	categoryId: string;
	categoryName: string;
	minAge: number | null;
	maxAge: number | null;
	provisioningPercentage: string;
	liabilityAccountId: string;
	expenseAccountId: string;
	enabled: boolean;
};

type FormState = {
	criteriaName: string;
	selectedLoanProductIds: string[];
	definitions: DefinitionRow[];
};

const EMPTY_FORM: FormState = {
	criteriaName: "",
	selectedLoanProductIds: [],
	definitions: [],
};

function ProvisioningCriteriaSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<Table>
					<TableHeader className="border-b border-border/60 bg-muted/40">
						<TableRow>
							{Array.from({ length: 4 }).map((_, index) => (
								<TableHead key={`prov-head-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, rowIndex) => (
							<TableRow key={`prov-row-${rowIndex}`}>
								{Array.from({ length: 4 }).map((_, cellIndex) => (
									<TableCell
										key={`prov-cell-${rowIndex}-${cellIndex}`}
										className="px-3 py-2"
									>
										<Skeleton className="h-4 w-28" />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

function accountTypeLabel(account: GlAccountData) {
	return (account.type?.value || account.type?.code || "").toLowerCase();
}

function getLiabilityAccounts(accounts: GlAccountData[]) {
	const filtered = accounts.filter((account) =>
		accountTypeLabel(account).includes("liabil"),
	);
	return filtered.length > 0 ? filtered : accounts;
}

function getExpenseAccounts(accounts: GlAccountData[]) {
	const filtered = accounts.filter((account) =>
		accountTypeLabel(account).includes("expense"),
	);
	return filtered.length > 0 ? filtered : accounts;
}

function formatAgeRange(minAge: number | null, maxAge: number | null) {
	if (minAge === null && maxAge === null) {
		return "Age range not defined";
	}
	if (minAge !== null && maxAge !== null) {
		return `${minAge} to ${maxAge} days`;
	}
	if (minAge !== null) {
		return `${minAge}+ days`;
	}
	return `Up to ${maxAge || 0} days`;
}

function normalizeDefinitions(
	templateDefinitions: Array<ProvisioningCriteriaDefinitionData>,
	criteriaDefinitions: Array<ProvisioningCriteriaDefinitionData>,
) {
	const byCategory = new Map<number, ProvisioningCriteriaDefinitionData>();

	for (const definition of templateDefinitions) {
		if (definition.categoryId !== undefined) {
			byCategory.set(definition.categoryId, definition);
		}
	}

	for (const definition of criteriaDefinitions) {
		if (definition.categoryId === undefined) {
			continue;
		}
		const existing = byCategory.get(definition.categoryId);
		byCategory.set(definition.categoryId, {
			...existing,
			...definition,
			categoryName: definition.categoryName || existing?.categoryName,
			minAge: definition.minAge ?? existing?.minAge,
			maxAge: definition.maxAge ?? existing?.maxAge,
		});
	}

	return Array.from(byCategory.values()).sort(
		(left, right) => (left.minAge ?? 0) - (right.minAge ?? 0),
	);
}

function toLoanProductPayload(
	selectedIds: string[],
	loanProductOptions: Array<LoanProductData>,
) {
	const selected = new Set(selectedIds);
	const payload: Array<LoanProductData> = [];

	for (const product of loanProductOptions) {
		if (!product.id || !selected.has(String(product.id))) {
			continue;
		}
		payload.push({
			id: product.id,
			name: product.name,
			shortName: product.shortName,
		});
	}

	return payload;
}

function buildDefinitionsForForm(
	templateDefinitions: Array<ProvisioningCriteriaDefinitionData>,
	criteriaDefinitions: Array<ProvisioningCriteriaDefinitionData>,
	defaultLiabilityAccountId: string,
	defaultExpenseAccountId: string,
) {
	const criteriaByCategoryId = new Map<
		number,
		ProvisioningCriteriaDefinitionData
	>();

	for (const definition of criteriaDefinitions) {
		if (definition.categoryId !== undefined) {
			criteriaByCategoryId.set(definition.categoryId, definition);
		}
	}

	const merged = normalizeDefinitions(templateDefinitions, criteriaDefinitions);

	return merged.map((definition) => {
		const categoryId = definition.categoryId
			? String(definition.categoryId)
			: "";
		const selectedDefinition =
			definition.categoryId !== undefined
				? criteriaByCategoryId.get(definition.categoryId)
				: undefined;

		return {
			categoryId,
			categoryName:
				definition.categoryName || `Category ${categoryId || "Unknown"}`,
			minAge: definition.minAge ?? null,
			maxAge: definition.maxAge ?? null,
			provisioningPercentage:
				selectedDefinition?.provisioningPercentage !== undefined
					? String(selectedDefinition.provisioningPercentage)
					: "",
			liabilityAccountId:
				selectedDefinition?.liabilityAccount !== undefined
					? String(selectedDefinition.liabilityAccount)
					: defaultLiabilityAccountId,
			expenseAccountId:
				selectedDefinition?.expenseAccount !== undefined
					? String(selectedDefinition.expenseAccount)
					: defaultExpenseAccountId,
			enabled: true,
		};
	});
}

async function fetchProvisioningCriteria(
	tenantId: string,
): Promise<GetProvisioningCriteriaResponse[]> {
	const response = await fetch(BFF_ROUTES.provisioningCriteria, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch provisioning criteria");
	}

	return response.json();
}

async function fetchProvisioningTemplate(
	tenantId: string,
): Promise<ProvisioningCriteriaData> {
	const response = await fetch(BFF_ROUTES.provisioningCriteriaTemplate, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch provisioning criteria template");
	}

	return response.json();
}

async function fetchProvisioningCriteriaById(
	tenantId: string,
	criteriaId: number,
): Promise<GetProvisioningCriteriaCriteriaIdResponse> {
	const response = await fetch(
		BFF_ROUTES.provisioningCriteriaById(criteriaId),
		{
			headers: { "x-tenant-id": tenantId },
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch provisioning criteria details");
	}

	return response.json();
}

async function createProvisioningCriteria(
	tenantId: string,
	payload: PostProvisioningCriteriaRequest,
) {
	const response = await fetch(BFF_ROUTES.provisioningCriteria, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(
			result?.message || "Failed to create provisioning criteria",
		);
	}

	return result;
}

async function updateProvisioningCriteria(
	tenantId: string,
	criteriaId: number,
	payload: PutProvisioningCriteriaRequest,
) {
	const response = await fetch(
		BFF_ROUTES.provisioningCriteriaById(criteriaId),
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(
			result?.message || "Failed to update provisioning criteria",
		);
	}

	return result;
}

async function deleteProvisioningCriteria(
	tenantId: string,
	criteriaId: number,
) {
	const response = await fetch(
		BFF_ROUTES.provisioningCriteriaById(criteriaId),
		{
			method: "DELETE",
			headers: { "x-tenant-id": tenantId },
		},
	);

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(
			result?.message || "Failed to delete provisioning criteria",
		);
	}

	return result;
}

export default function ProvisioningCriteriaPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState("");
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingCriteria, setEditingCriteria] =
		useState<GetProvisioningCriteriaResponse | null>(null);
	const [loadingCriteriaId, setLoadingCriteriaId] = useState<number | null>(
		null,
	);
	const [criteriaPendingDelete, setCriteriaPendingDelete] =
		useState<GetProvisioningCriteriaResponse | null>(null);
	const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
	const [pageError, setPageError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const criteriaQuery = useQuery({
		queryKey: ["provisioning-criteria", tenantId],
		queryFn: () => fetchProvisioningCriteria(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["provisioning-criteria-template", tenantId],
		queryFn: () => fetchProvisioningTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostProvisioningCriteriaRequest) =>
			createProvisioningCriteria(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["provisioning-criteria", tenantId],
			});
			setIsSheetOpen(false);
			setEditingCriteria(null);
			setToastMessage("Provisioning criteria created successfully");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutProvisioningCriteriaRequest) =>
			updateProvisioningCriteria(
				tenantId,
				editingCriteria?.criteriaId || 0,
				payload,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["provisioning-criteria", tenantId],
			});
			setIsSheetOpen(false);
			setEditingCriteria(null);
			setToastMessage("Provisioning criteria updated successfully");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (criteriaId: number) =>
			deleteProvisioningCriteria(tenantId, criteriaId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["provisioning-criteria", tenantId],
			});
			setToastMessage("Provisioning criteria deleted successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) {
			return;
		}
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const template = templateQuery.data;
	const criteriaList = criteriaQuery.data || [];
	const loanProductOptions = template?.loanProducts || [];
	const glAccountOptions = template?.glAccounts || [];
	const templateDefinitions = template?.definitions || [];
	const liabilityAccountOptions = useMemo(
		() => getLiabilityAccounts(glAccountOptions),
		[glAccountOptions],
	);
	const expenseAccountOptions = useMemo(
		() => getExpenseAccounts(glAccountOptions),
		[glAccountOptions],
	);
	const defaultLiabilityAccountId = liabilityAccountOptions[0]?.id
		? String(liabilityAccountOptions[0].id)
		: "";
	const defaultExpenseAccountId = expenseAccountOptions[0]?.id
		? String(expenseAccountOptions[0].id)
		: "";

	const filteredCriteria = useMemo(() => {
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) {
			return criteriaList;
		}
		return criteriaList.filter((criteria) =>
			(criteria.criteriaName || "").toLowerCase().includes(normalized),
		);
	}, [criteriaList, searchTerm]);

	const openCreateSheet = () => {
		setPageError(null);
		setFormError(null);
		if (!template) {
			setPageError("Provisioning template is not available yet.");
			return;
		}

		setEditingCriteria(null);
		setFormState({
			criteriaName: "",
			selectedLoanProductIds: [],
			definitions: buildDefinitionsForForm(
				templateDefinitions,
				[],
				defaultLiabilityAccountId,
				defaultExpenseAccountId,
			),
		});
		setIsSheetOpen(true);
	};

	const openEditSheet = async (criteria: GetProvisioningCriteriaResponse) => {
		if (!criteria.criteriaId) {
			return;
		}
		setPageError(null);
		setFormError(null);
		if (!template) {
			setPageError("Provisioning template is not available yet.");
			return;
		}

		setLoadingCriteriaId(criteria.criteriaId);
		try {
			const details = await fetchProvisioningCriteriaById(
				tenantId,
				criteria.criteriaId,
			);
			setEditingCriteria(criteria);
			setFormState({
				criteriaName: details.criteriaName || "",
				selectedLoanProductIds: (details.loanProducts || [])
					.map((product) => product.id)
					.filter((id): id is number => id !== undefined)
					.map((id) => String(id)),
				definitions: buildDefinitionsForForm(
					templateDefinitions,
					details.provisioningcriteria || [],
					defaultLiabilityAccountId,
					defaultExpenseAccountId,
				),
			});
			setIsSheetOpen(true);
		} catch (error) {
			setPageError(
				error instanceof Error
					? error.message
					: "Failed to load provisioning criteria details",
			);
		} finally {
			setLoadingCriteriaId(null);
		}
	};

	const handleDelete = (criteria: GetProvisioningCriteriaResponse) => {
		if (!criteria.criteriaId) {
			return;
		}
		setCriteriaPendingDelete(criteria);
	};

	const confirmDelete = () => {
		if (!criteriaPendingDelete?.criteriaId) {
			return;
		}
		deleteMutation.mutate(criteriaPendingDelete.criteriaId, {
			onSettled: () => setCriteriaPendingDelete(null),
		});
	};

	const toggleLoanProduct = (loanProductId: string, checked: boolean) => {
		setFormState((prev) => {
			const existing = new Set(prev.selectedLoanProductIds);
			if (checked) {
				existing.add(loanProductId);
			} else {
				existing.delete(loanProductId);
			}
			return {
				...prev,
				selectedLoanProductIds: Array.from(existing),
			};
		});
	};

	const updateDefinitionRow = (
		categoryId: string,
		changes: Partial<DefinitionRow>,
	) => {
		setFormState((prev) => ({
			...prev,
			definitions: prev.definitions.map((definition) =>
				definition.categoryId === categoryId
					? { ...definition, ...changes }
					: definition,
			),
		}));
	};

	const handleSave = () => {
		if (!formState.criteriaName.trim()) {
			setFormError("Criteria name is required");
			return;
		}
		if (formState.selectedLoanProductIds.length === 0) {
			setFormError("Select at least one loan product");
			return;
		}

		const activeDefinitions = formState.definitions.filter(
			(definition) => definition.enabled,
		);
		if (activeDefinitions.length === 0) {
			setFormError("At least one provisioning definition is required");
			return;
		}

		const provisioningcriteria: Array<ProvisioningCriteriaDefinitionData> = [];

		for (const definition of activeDefinitions) {
			if (!definition.categoryId) {
				setFormError("Category id is required for all active definitions");
				return;
			}
			if (!definition.provisioningPercentage.trim()) {
				setFormError(
					`Provisioning percentage is required for ${definition.categoryName}`,
				);
				return;
			}

			const percentage = Number(definition.provisioningPercentage);
			if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
				setFormError(
					`Provisioning percentage for ${definition.categoryName} must be between 0 and 100`,
				);
				return;
			}
			if (!definition.liabilityAccountId || !definition.expenseAccountId) {
				setFormError(
					`Select liability and expense accounts for ${definition.categoryName}`,
				);
				return;
			}

			provisioningcriteria.push({
				categoryId: Number(definition.categoryId),
				categoryName: definition.categoryName,
				minAge: definition.minAge ?? undefined,
				maxAge: definition.maxAge ?? undefined,
				provisioningPercentage: percentage,
				liabilityAccount: Number(definition.liabilityAccountId),
				expenseAccount: Number(definition.expenseAccountId),
			});
		}

		const payload: PostProvisioningCriteriaRequest = {
			criteriaName: formState.criteriaName.trim(),
			loanProducts: toLoanProductPayload(
				formState.selectedLoanProductIds,
				loanProductOptions,
			),
			provisioningcriteria,
		};

		setFormError(null);
		if (editingCriteria?.criteriaId) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const isBusy =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending ||
		loadingCriteriaId !== null;

	return (
		<>
			<PageShell
				title="Provisioning Criteria"
				subtitle="Define provisioning percentages and GL mappings by delinquency classification"
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/financial/accounting">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Accounting Setup
							</Link>
						</Button>
						<Button
							onClick={openCreateSheet}
							disabled={templateQuery.isLoading || templateQuery.isError}
						>
							<Plus className="h-4 w-4 mr-2" />
							Create Criteria
						</Button>
					</div>
				}
			>
				{pageError && (
					<Alert variant="destructive">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{pageError}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Criteria Registry</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2 max-w-lg">
							<Label htmlFor="search-provisioning-criteria">
								Search Criteria
							</Label>
							<Input
								id="search-provisioning-criteria"
								placeholder="Search by criteria name"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
							/>
						</div>
						{criteriaQuery.isLoading || templateQuery.isLoading ? (
							<ProvisioningCriteriaSkeleton />
						) : (
							<Table>
								<TableHeader className="border-b border-border/60 bg-muted/40">
									<TableRow>
										<TableHead className="px-3 py-2">Criteria</TableHead>
										<TableHead className="px-3 py-2">Created By</TableHead>
										<TableHead className="px-3 py-2">Status</TableHead>
										<TableHead className="px-3 py-2 text-right">
											Actions
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="divide-y divide-border/60">
									{filteredCriteria.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={4}
												className="px-3 py-6 text-center text-sm text-muted-foreground"
											>
												No provisioning criteria found.
											</TableCell>
										</TableRow>
									) : (
										filteredCriteria.map((criteria) => (
											<TableRow
												key={
													criteria.criteriaId ||
													criteria.criteriaName ||
													"criteria"
												}
											>
												<TableCell className="px-3 py-2">
													<div>
														<div className="font-medium">
															{criteria.criteriaName || "—"}
														</div>
														<div className="text-xs text-muted-foreground">
															ID: {criteria.criteriaId || "—"}
														</div>
													</div>
												</TableCell>
												<TableCell className="px-3 py-2">
													{criteria.createdBy || "—"}
												</TableCell>
												<TableCell className="px-3 py-2">
													<Badge variant="success">Active</Badge>
												</TableCell>
												<TableCell className="px-3 py-2 text-right">
													<div className="flex items-center justify-end gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => openEditSheet(criteria)}
															disabled={
																loadingCriteriaId === criteria.criteriaId ||
																templateQuery.isLoading ||
																templateQuery.isError
															}
														>
															Edit
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleDelete(criteria)}
															disabled={deleteMutation.isPending}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet
				open={isSheetOpen}
				onOpenChange={(open) => {
					setIsSheetOpen(open);
					if (!open) {
						setFormError(null);
						setEditingCriteria(null);
					}
				}}
			>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{editingCriteria
								? "Edit Provisioning Criteria"
								: "Create Provisioning Criteria"}
						</SheetTitle>
						<SheetDescription>
							Configure product scope, delinquency percentages, and GL account
							mappings.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						{formError && (
							<Alert variant="destructive">
								<AlertTitle>Validation Error</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="criteria-name">Provisioning Criteria Name</Label>
							<Input
								id="criteria-name"
								value={formState.criteriaName}
								onChange={(event) =>
									setFormState((prev) => ({
										...prev,
										criteriaName: event.target.value,
									}))
								}
								placeholder="e.g. Portfolio at Risk Policy"
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Loan Products</Label>
								<Badge variant="secondary">
									{formState.selectedLoanProductIds.length} selected
								</Badge>
							</div>
							<div className="max-h-40 space-y-2 overflow-y-auto rounded-sm border border-border/60 p-2">
								{loanProductOptions.length === 0 && (
									<p className="text-sm text-muted-foreground">
										No loan products available in template.
									</p>
								)}
								{loanProductOptions
									.filter((product) => product.id !== undefined)
									.map((product) => {
										const productId = String(product.id);
										const checked =
											formState.selectedLoanProductIds.includes(productId);
										const label =
											product.name || product.shortName || productId;
										return (
											<Label
												key={productId}
												htmlFor={`loan-product-${productId}`}
												className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-accent/50"
											>
												<Checkbox
													id={`loan-product-${productId}`}
													checked={checked}
													onCheckedChange={(value) =>
														toggleLoanProduct(productId, value === true)
													}
												/>
												<span className="text-sm">{label}</span>
											</Label>
										);
									})}
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label>Classification & Percentage</Label>
								<Badge variant="outline">
									{
										formState.definitions.filter(
											(definition) => definition.enabled,
										).length
									}{" "}
									active
								</Badge>
							</div>

							{formState.definitions.length === 0 && (
								<Alert variant="destructive">
									<AlertTitle>No Definitions Available</AlertTitle>
									<AlertDescription>
										No provisioning category definitions were returned by the
										template.
									</AlertDescription>
								</Alert>
							)}

							{formState.definitions.map((definition) => (
								<Card
									key={definition.categoryId || definition.categoryName}
									className="rounded-sm border border-border/60"
								>
									<CardContent className="space-y-3 pt-4">
										<div className="flex items-center justify-between">
											<div>
												<div className="font-medium">
													{definition.categoryName}
												</div>
												<div className="text-xs text-muted-foreground">
													{formatAgeRange(definition.minAge, definition.maxAge)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Checkbox
													checked={definition.enabled}
													onCheckedChange={(value) =>
														updateDefinitionRow(definition.categoryId, {
															enabled: value === true,
														})
													}
												/>
												<span className="text-xs text-muted-foreground">
													Include
												</span>
											</div>
										</div>

										{definition.enabled && (
											<div className="grid gap-3 md:grid-cols-3">
												<div className="space-y-2">
													<Label>Provision %</Label>
													<div className="relative">
														<Input
															type="number"
															min={0}
															max={100}
															step={0.01}
															value={definition.provisioningPercentage}
															onChange={(event) =>
																updateDefinitionRow(definition.categoryId, {
																	provisioningPercentage: event.target.value,
																})
															}
															placeholder="0.00"
														/>
														<Percent className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
													</div>
												</div>

												<div className="space-y-2">
													<Label>Liability GL</Label>
													<Select
														value={definition.liabilityAccountId}
														onValueChange={(value) =>
															updateDefinitionRow(definition.categoryId, {
																liabilityAccountId: value,
															})
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select liability account" />
														</SelectTrigger>
														<SelectContent>
															{liabilityAccountOptions.map((account) => (
																<SelectItem
																	key={account.id}
																	value={String(account.id)}
																>
																	{account.name || "Unnamed"} (
																	{account.glCode || "—"})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2">
													<Label>Expense GL</Label>
													<Select
														value={definition.expenseAccountId}
														onValueChange={(value) =>
															updateDefinitionRow(definition.categoryId, {
																expenseAccountId: value,
															})
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select expense account" />
														</SelectTrigger>
														<SelectContent>
															{expenseAccountOptions.map((account) => (
																<SelectItem
																	key={account.id}
																	value={String(account.id)}
																>
																	{account.name || "Unnamed"} (
																	{account.glCode || "—"})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							))}
						</div>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setIsSheetOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={handleSave}
								disabled={isBusy || formState.definitions.length === 0}
							>
								{editingCriteria ? "Save Changes" : "Create Criteria"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={criteriaPendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setCriteriaPendingDelete(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Provisioning Criteria?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete "
							{criteriaPendingDelete?.criteriaName || "selected criteria"}".
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

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
