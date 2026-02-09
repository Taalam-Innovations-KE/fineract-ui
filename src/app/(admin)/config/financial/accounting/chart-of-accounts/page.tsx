"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Download,
	FileUp,
	Plus,
	Trash2,
	Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	CodeValueData,
	EnumOptionData,
	GetGlAccountsResponse,
	GetGlAccountsTemplateResponse,
	PostGlAccountsRequest,
	PutGlAccountsRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type GlTemplateData = GetGlAccountsTemplateResponse & {
	incomeHeaderAccountOptions?: Array<{
		id?: number;
		name?: string;
		glCode?: string;
	}>;
	allowedIncomeTagOptions?: Array<CodeValueData>;
};

type FormState = {
	name: string;
	glCode: string;
	description: string;
	type: string;
	usage: string;
	manualEntriesAllowed: boolean;
	disabled: boolean;
	parentId: string;
	tagId: string;
};

const DEFAULT_FORM: FormState = {
	name: "",
	glCode: "",
	description: "",
	type: "",
	usage: "",
	manualEntriesAllowed: true,
	disabled: false,
	parentId: "none",
	tagId: "none",
};

function AccountsTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{Array.from({ length: 7 }).map((_, index) => (
								<th key={`coa-header-skeleton-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, rowIndex) => (
							<tr key={`coa-row-skeleton-${rowIndex}`}>
								{Array.from({ length: 7 }).map((_, cellIndex) => (
									<td
										key={`coa-cell-skeleton-${rowIndex}-${cellIndex}`}
										className="px-3 py-2"
									>
										<Skeleton className="h-4 w-full max-w-28" />
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

async function fetchAccounts(
	tenantId: string,
): Promise<GetGlAccountsResponse[]> {
	const response = await fetch(BFF_ROUTES.glaccounts, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch GL accounts");
	}

	return response.json();
}

async function fetchTemplate(tenantId: string): Promise<GlTemplateData> {
	const response = await fetch(BFF_ROUTES.glAccountsTemplate, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch GL accounts template");
	}

	return response.json();
}

async function createAccount(tenantId: string, payload: PostGlAccountsRequest) {
	const response = await fetch(BFF_ROUTES.glaccounts, {
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
			result?.message ||
				result?.defaultUserMessage ||
				"Failed to create account",
		);
	}

	return result;
}

async function updateAccount(
	tenantId: string,
	glAccountId: number,
	payload: PutGlAccountsRequest,
) {
	const response = await fetch(BFF_ROUTES.glAccountById(glAccountId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(
			result?.message ||
				result?.defaultUserMessage ||
				"Failed to update account",
		);
	}

	return result;
}

async function deleteAccount(tenantId: string, glAccountId: number) {
	const response = await fetch(BFF_ROUTES.glAccountById(glAccountId), {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(
			result?.message ||
				result?.defaultUserMessage ||
				"Failed to delete account",
		);
	}

	return result;
}

function normalizeTemplateDefaults(
	template?: GlTemplateData,
): Pick<FormState, "type" | "usage" | "manualEntriesAllowed" | "disabled"> {
	return {
		type: template?.type?.id ? String(template.type.id) : "",
		usage: template?.usage?.id ? String(template.usage.id) : "",
		manualEntriesAllowed: template?.manualEntriesAllowed ?? true,
		disabled: template?.disabled ?? false,
	};
}

function getHeaderOptionsByType(
	template: GlTemplateData | undefined,
	typeId: number,
) {
	if (!template) return [];

	switch (typeId) {
		case 1:
			return template.assetHeaderAccountOptions || [];
		case 2:
			return template.liabilityHeaderAccountOptions || [];
		case 3:
			return template.equityHeaderAccountOptions || [];
		case 4:
			return template.incomeHeaderAccountOptions || [];
		case 5:
			return template.expenseHeaderAccountOptions || [];
		default:
			return [];
	}
}

function getTagOptionsByType(
	template: GlTemplateData | undefined,
	typeId: number,
) {
	if (!template) return [];

	switch (typeId) {
		case 1:
			return template.allowedAssetsTagOptions || [];
		case 2:
			return template.allowedLiabilitiesTagOptions || [];
		case 3:
			return template.allowedEquityTagOptions || [];
		case 4:
			return template.allowedIncomeTagOptions || [];
		case 5:
			return template.allowedExpensesTagOptions || [];
		default:
			return [];
	}
}

type TreeNode = GetGlAccountsResponse & { children: TreeNode[] };

function buildAccountTree(accounts: GetGlAccountsResponse[]): TreeNode[] {
	const nodes = new Map<number, TreeNode>();
	const roots: TreeNode[] = [];

	for (const account of accounts) {
		if (!account.id) continue;
		nodes.set(account.id, { ...account, children: [] });
	}

	for (const account of accounts) {
		if (!account.id) continue;
		const current = nodes.get(account.id);
		if (!current) continue;

		if (account.parentId && nodes.has(account.parentId)) {
			nodes.get(account.parentId)?.children.push(current);
		} else {
			roots.push(current);
		}
	}

	const sortNodes = (items: TreeNode[]) => {
		items.sort((a, b) => (a.glCode || "").localeCompare(b.glCode || ""));
		for (const item of items) {
			sortNodes(item.children);
		}
	};

	sortNodes(roots);
	return roots;
}

export default function ChartOfAccountsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [usageFilter, setUsageFilter] = useState("all");
	const [disabledFilter, setDisabledFilter] = useState("active");
	const [viewMode, setViewMode] = useState<"table" | "tree">("table");

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingAccount, setEditingAccount] =
		useState<GetGlAccountsResponse | null>(null);
	const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
	const [formError, setFormError] = useState<string | null>(null);

	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [uploadInputKey, setUploadInputKey] = useState(0);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const accountsQuery = useQuery({
		queryKey: ["glaccounts", tenantId],
		queryFn: () => fetchAccounts(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["glaccounts-template", tenantId],
		queryFn: () => fetchTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostGlAccountsRequest) =>
			createAccount(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["glaccounts", tenantId] });
			setIsSheetOpen(false);
			setEditingAccount(null);
			setToastMessage("GL account created successfully");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutGlAccountsRequest) =>
			updateAccount(tenantId, editingAccount?.id || 0, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["glaccounts", tenantId] });
			setIsSheetOpen(false);
			setEditingAccount(null);
			setToastMessage("GL account updated successfully");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteAccount(tenantId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["glaccounts", tenantId] });
			setToastMessage("GL account deleted successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const accounts = accountsQuery.data || [];
	const template = templateQuery.data;
	const typeOptions = template?.accountTypeOptions || [];
	const usageOptions = template?.usageOptions || [];

	const parentNameMap = useMemo(() => {
		const map = new Map<number, string>();
		for (const account of accounts) {
			if (account.id && account.name) {
				map.set(account.id, account.name);
			}
		}
		return map;
	}, [accounts]);

	const filteredAccounts = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();

		return accounts.filter((account) => {
			if (disabledFilter === "active" && account.disabled) return false;
			if (disabledFilter === "disabled" && !account.disabled) return false;
			if (typeFilter !== "all" && String(account.type?.id) !== typeFilter) {
				return false;
			}
			if (usageFilter !== "all" && String(account.usage?.id) !== usageFilter) {
				return false;
			}
			if (!normalizedSearch) return true;

			return (
				(account.name || "").toLowerCase().includes(normalizedSearch) ||
				(account.glCode || "").toLowerCase().includes(normalizedSearch) ||
				(account.nameDecorated || "").toLowerCase().includes(normalizedSearch)
			);
		});
	}, [accounts, searchTerm, typeFilter, usageFilter, disabledFilter]);

	const accountTree = useMemo(
		() => buildAccountTree(filteredAccounts),
		[filteredAccounts],
	);

	const selectedTypeId = Number(formState.type || 0);
	const parentOptions = getHeaderOptionsByType(template, selectedTypeId);
	const tagOptions = getTagOptionsByType(template, selectedTypeId);

	const openCreateSheet = () => {
		const defaults = normalizeTemplateDefaults(template);
		setEditingAccount(null);
		setFormError(null);
		setFormState({
			...DEFAULT_FORM,
			...defaults,
		});
		setIsSheetOpen(true);
	};

	const openEditSheet = (account: GetGlAccountsResponse) => {
		setEditingAccount(account);
		setFormError(null);
		setFormState({
			name: account.name || "",
			glCode: account.glCode || "",
			description: account.description || "",
			type: account.type?.id ? String(account.type.id) : "",
			usage: account.usage?.id ? String(account.usage.id) : "",
			manualEntriesAllowed: account.manualEntriesAllowed ?? true,
			disabled: account.disabled ?? false,
			parentId: account.parentId ? String(account.parentId) : "none",
			tagId: account.tagId?.id ? String(account.tagId.id) : "none",
		});
		setIsSheetOpen(true);
	};

	const buildPayload = ():
		| PostGlAccountsRequest
		| PutGlAccountsRequest
		| null => {
		if (!formState.name.trim()) {
			setFormError("Account name is required");
			return null;
		}
		if (!formState.glCode.trim()) {
			setFormError("GL code is required");
			return null;
		}
		if (!formState.type) {
			setFormError("Account type is required");
			return null;
		}
		if (!formState.usage) {
			setFormError("Usage is required");
			return null;
		}

		setFormError(null);

		const payload: PutGlAccountsRequest = {
			name: formState.name.trim(),
			glCode: formState.glCode.trim(),
			type: Number(formState.type),
			usage: Number(formState.usage),
			manualEntriesAllowed: formState.manualEntriesAllowed,
		};

		if (formState.description.trim()) {
			payload.description = formState.description.trim();
		}
		if (formState.parentId !== "none") {
			payload.parentId = Number(formState.parentId);
		}
		if (formState.tagId !== "none") {
			payload.tagId = Number(formState.tagId);
		}
		if (editingAccount) {
			payload.disabled = formState.disabled;
		}

		return payload;
	};

	const handleSave = () => {
		const payload = buildPayload();
		if (!payload) return;

		if (editingAccount) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload as PostGlAccountsRequest);
		}
	};

	const handleDelete = (account: GetGlAccountsResponse) => {
		if (!account.id) return;
		const confirmed = window.confirm(
			`Delete account ${account.name} (${account.glCode})?`,
		);
		if (!confirmed) return;
		deleteMutation.mutate(account.id);
	};

	const handleDownloadTemplate = async () => {
		try {
			setUploadError(null);
			const response = await fetch(
				`${BFF_ROUTES.glAccountsDownloadTemplate}?dateFormat=${encodeURIComponent("dd MMMM yyyy")}`,
				{
					headers: { "x-tenant-id": tenantId },
				},
			);

			if (!response.ok) {
				const error = await response.json().catch(() => null);
				throw new Error(error?.message || "Failed to download template");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			const disposition = response.headers.get("content-disposition") || "";
			const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
			anchor.href = url;
			anchor.download = filenameMatch?.[1] || "glaccounts-template.xls";
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			setUploadError(
				error instanceof Error ? error.message : "Failed to download template",
			);
		}
	};

	const handleUploadTemplate = async () => {
		if (!uploadFile) {
			setUploadError("Please choose a template file first");
			return;
		}

		try {
			setUploadError(null);
			const payload = new FormData();
			payload.append("uploadedInputStream", uploadFile);
			payload.append("locale", "en");
			payload.append("dateFormat", "dd MMMM yyyy");

			const response = await fetch(BFF_ROUTES.glAccountsUploadTemplate, {
				method: "POST",
				headers: { "x-tenant-id": tenantId },
				body: payload,
			});

			const result = await response.json().catch(() => null);
			if (!response.ok) {
				throw new Error(
					result?.message ||
						result?.defaultUserMessage ||
						"Template upload failed",
				);
			}

			setUploadFile(null);
			setUploadInputKey((prev) => prev + 1);
			setToastMessage("Template uploaded successfully");
			queryClient.invalidateQueries({ queryKey: ["glaccounts", tenantId] });
			queryClient.invalidateQueries({
				queryKey: ["glaccounts-template", tenantId],
			});
		} catch (error) {
			setUploadError(
				error instanceof Error ? error.message : "Template upload failed",
			);
		}
	};

	const accountColumns = [
		{
			header: "Name",
			cell: (account: GetGlAccountsResponse) => (
				<div>
					<div className="font-medium">{account.name || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{account.nameDecorated || ""}
					</div>
				</div>
			),
		},
		{
			header: "GL Code",
			cell: (account: GetGlAccountsResponse) => (
				<span className="font-mono">{account.glCode || "—"}</span>
			),
		},
		{
			header: "Type",
			cell: (account: GetGlAccountsResponse) => (
				<Badge variant="secondary">{account.type?.value || "—"}</Badge>
			),
		},
		{
			header: "Usage",
			cell: (account: GetGlAccountsResponse) => (
				<Badge variant="outline">{account.usage?.value || "—"}</Badge>
			),
		},
		{
			header: "Parent",
			cell: (account: GetGlAccountsResponse) => (
				<span>
					{(account.parentId && parentNameMap.get(account.parentId)) || "—"}
				</span>
			),
		},
		{
			header: "Status",
			cell: (account: GetGlAccountsResponse) => (
				<Badge variant={account.disabled ? "destructive" : "success"}>
					{account.disabled ? "Disabled" : "Active"}
				</Badge>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (account: GetGlAccountsResponse) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => openEditSheet(account)}
					>
						Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleDelete(account)}
						disabled={deleteMutation.isPending}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			),
		},
	];

	const renderTreeNode = (node: TreeNode, depth: number): React.ReactNode => {
		return (
			<div key={node.id} className="space-y-1">
				<div
					className="flex items-center justify-between rounded-sm border border-border/60 px-3 py-2"
					style={{ marginLeft: `${depth * 16}px` }}
				>
					<div className="flex items-center gap-2">
						<Workflow className="h-4 w-4 text-muted-foreground" />
						<div>
							<div className="text-sm font-medium">{node.name}</div>
							<div className="text-xs text-muted-foreground font-mono">
								{node.glCode}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{node.type?.value}</Badge>
						<Badge variant="secondary">{node.usage?.value}</Badge>
					</div>
				</div>
				{node.children.map((child) => renderTreeNode(child, depth + 1))}
			</div>
		);
	};

	const stats = useMemo(() => {
		const byType: Record<string, number> = {};
		for (const account of accounts) {
			const key = account.type?.value || "Unknown";
			byType[key] = (byType[key] || 0) + 1;
		}
		return byType;
	}, [accounts]);

	const isBusy =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return (
		<>
			<PageShell
				title="Chart of Accounts"
				subtitle="Manage hierarchical GL accounts, template export/import, and account status"
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
							Create Account
						</Button>
					</div>
				}
			>
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
						<Card>
							<CardContent className="pt-6">
								<div className="text-sm text-muted-foreground">
									Total Accounts
								</div>
								<div className="text-2xl font-bold">{accounts.length}</div>
							</CardContent>
						</Card>
						{Object.entries(stats).map(([type, count]) => (
							<Card key={type}>
								<CardContent className="pt-6">
									<div className="text-sm text-muted-foreground">{type}</div>
									<div className="text-2xl font-bold">{count}</div>
								</CardContent>
							</Card>
						))}
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Import / Export</CardTitle>
							<CardDescription>
								Download the official GL template and upload bulk account
								updates.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex flex-col gap-3 md:flex-row md:items-end">
								<div className="flex-1 space-y-2">
									<Label htmlFor="upload-template">Template File (.xls)</Label>
									<Input
										id="upload-template"
										key={uploadInputKey}
										type="file"
										accept=".xls,.xlsx"
										onChange={(event) =>
											setUploadFile(event.target.files?.[0] || null)
										}
									/>
								</div>
								<div className="flex items-center gap-2">
									<Button variant="outline" onClick={handleDownloadTemplate}>
										<Download className="h-4 w-4 mr-2" />
										Download Template
									</Button>
									<Button onClick={handleUploadTemplate}>
										<FileUp className="h-4 w-4 mr-2" />
										Upload Template
									</Button>
								</div>
							</div>
							{uploadError && (
								<Alert variant="destructive">
									<AlertTitle>Import/Export Error</AlertTitle>
									<AlertDescription>{uploadError}</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Accounts</CardTitle>
							<CardDescription>
								Filter accounts and switch between table and hierarchy view.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
								<div className="space-y-2 lg:col-span-2">
									<Label htmlFor="search">Search</Label>
									<Input
										id="search"
										placeholder="Search by name or GL code"
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Type</Label>
									<Select value={typeFilter} onValueChange={setTypeFilter}>
										<SelectTrigger>
											<SelectValue placeholder="All types" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Types</SelectItem>
											{typeOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.value}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Usage</Label>
									<Select value={usageFilter} onValueChange={setUsageFilter}>
										<SelectTrigger>
											<SelectValue placeholder="All usage" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Usage</SelectItem>
											{usageOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.value}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Status</Label>
									<Select
										value={disabledFilter}
										onValueChange={setDisabledFilter}
									>
										<SelectTrigger>
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="disabled">Disabled</SelectItem>
											<SelectItem value="all">All</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant={viewMode === "table" ? "default" : "outline"}
									onClick={() => setViewMode("table")}
								>
									Table View
								</Button>
								<Button
									variant={viewMode === "tree" ? "default" : "outline"}
									onClick={() => setViewMode("tree")}
								>
									Hierarchy View
								</Button>
							</div>

							{accountsQuery.isLoading || templateQuery.isLoading ? (
								<AccountsTableSkeleton />
							) : viewMode === "table" ? (
								<DataTable
									data={filteredAccounts}
									columns={accountColumns}
									getRowId={(account) =>
										account.id || account.glCode || "gl-row"
									}
									emptyMessage="No GL accounts found for the selected filters."
								/>
							) : (
								<div className="space-y-2">
									{accountTree.length === 0 ? (
										<div className="rounded-sm border border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
											No accounts available for hierarchy view.
										</div>
									) : (
										accountTree.map((node) => renderTreeNode(node, 0))
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{editingAccount ? "Edit GL Account" : "Create GL Account"}
						</SheetTitle>
						<SheetDescription>
							Manage chart of accounts using live template options.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6 space-y-4">
						{formError && (
							<Alert variant="destructive">
								<AlertTitle>Validation Error</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="name">Account Name</Label>
								<Input
									id="name"
									value={formState.name}
									onChange={(event) =>
										setFormState((prev) => ({
											...prev,
											name: event.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="glCode">GL Code</Label>
								<Input
									id="glCode"
									value={formState.glCode}
									onChange={(event) =>
										setFormState((prev) => ({
											...prev,
											glCode: event.target.value,
										}))
									}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								value={formState.description}
								onChange={(event) =>
									setFormState((prev) => ({
										...prev,
										description: event.target.value,
									}))
								}
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Type</Label>
								<Select
									value={formState.type}
									onValueChange={(value) =>
										setFormState((prev) => ({
											...prev,
											type: value,
											parentId: "none",
											tagId: "none",
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										{typeOptions.map((option: EnumOptionData) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Usage</Label>
								<Select
									value={formState.usage}
									onValueChange={(value) =>
										setFormState((prev) => ({ ...prev, usage: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select usage" />
									</SelectTrigger>
									<SelectContent>
										{usageOptions.map((option: EnumOptionData) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Parent Header Account</Label>
								<Select
									value={formState.parentId}
									onValueChange={(value) =>
										setFormState((prev) => ({ ...prev, parentId: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="No parent" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No Parent</SelectItem>
										{parentOptions.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.name} ({option.glCode})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Tag</Label>
								<Select
									value={formState.tagId}
									onValueChange={(value) =>
										setFormState((prev) => ({ ...prev, tagId: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="No tag" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No Tag</SelectItem>
										{tagOptions.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Manual Entries Allowed</Label>
								<Select
									value={formState.manualEntriesAllowed ? "true" : "false"}
									onValueChange={(value) =>
										setFormState((prev) => ({
											...prev,
											manualEntriesAllowed: value === "true",
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">Yes</SelectItem>
										<SelectItem value="false">No</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{editingAccount && (
								<div className="space-y-2">
									<Label>Status</Label>
									<Select
										value={formState.disabled ? "disabled" : "active"}
										onValueChange={(value) =>
											setFormState((prev) => ({
												...prev,
												disabled: value === "disabled",
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="disabled">Disabled</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</div>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setIsSheetOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isBusy}>
								{editingAccount ? "Save Changes" : "Create Account"}
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
