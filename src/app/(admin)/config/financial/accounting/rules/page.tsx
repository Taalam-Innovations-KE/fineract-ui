"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
	AccountingRuleData,
	AccountRuleRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type RuleFormState = {
	name: string;
	description: string;
	officeId: string;
	accountToDebit: string;
	accountToCredit: string;
};

const DEFAULT_FORM: RuleFormState = {
	name: "",
	description: "",
	officeId: "",
	accountToDebit: "",
	accountToCredit: "",
};

function RulesTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{Array.from({ length: 5 }).map((_, index) => (
								<th key={`rules-header-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 6 }).map((_, rowIndex) => (
							<tr key={`rules-row-${rowIndex}`}>
								{Array.from({ length: 5 }).map((_, cellIndex) => (
									<td
										key={`rules-cell-${rowIndex}-${cellIndex}`}
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

async function fetchRules(tenantId: string): Promise<AccountingRuleData[]> {
	const response = await fetch(BFF_ROUTES.accountingRules, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch accounting rules");
	}

	return response.json();
}

async function fetchTemplate(tenantId: string): Promise<AccountingRuleData> {
	const response = await fetch(BFF_ROUTES.accountingRulesTemplate, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch accounting rules template");
	}

	return response.json();
}

async function parseSubmitResponse<T>(
	response: Response,
	fallbackMessage: string,
): Promise<T> {
	const result = (await response.json().catch(() => ({
		message: fallbackMessage,
		status: response.status,
	}))) as T;
	if (!response.ok) {
		throw result;
	}
	return result;
}

async function createRule(tenantId: string, payload: AccountRuleRequest) {
	const response = await fetch(BFF_ROUTES.accountingRules, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse(response, "Failed to create accounting rule");
}

async function updateRule(
	tenantId: string,
	ruleId: number,
	payload: AccountRuleRequest,
) {
	const response = await fetch(BFF_ROUTES.accountingRuleById(ruleId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseSubmitResponse(response, "Failed to update accounting rule");
}

async function deleteRule(tenantId: string, ruleId: number) {
	const response = await fetch(BFF_ROUTES.accountingRuleById(ruleId), {
		method: "DELETE",
		headers: { "x-tenant-id": tenantId },
	});

	return parseSubmitResponse(response, "Failed to delete accounting rule");
}

export default function AccountingRulesPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState("");
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<AccountingRuleData | null>(
		null,
	);
	const [formState, setFormState] = useState<RuleFormState>(DEFAULT_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const rulesQuery = useQuery({
		queryKey: ["accounting-rules", tenantId],
		queryFn: () => fetchRules(tenantId),
	});

	const templateQuery = useQuery({
		queryKey: ["accounting-rules-template", tenantId],
		queryFn: () => fetchTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: AccountRuleRequest) => createRule(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accounting-rules", tenantId],
			});
			setIsSheetOpen(false);
			setEditingRule(null);
			setFormError(null);
			setSubmitError(null);
			toast.success("Accounting rule created successfully");
		},
		onError: (error) => {
			const trackedError = toSubmitActionError(error, {
				action: "createAccountingRule",
				endpoint: BFF_ROUTES.accountingRules,
				method: "POST",
				tenantId,
			});
			setSubmitError(trackedError);
			setFormError(trackedError.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: AccountRuleRequest) =>
			updateRule(tenantId, editingRule?.id || 0, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accounting-rules", tenantId],
			});
			setIsSheetOpen(false);
			setEditingRule(null);
			setFormError(null);
			setSubmitError(null);
			toast.success("Accounting rule updated successfully");
		},
		onError: (error) => {
			const trackedError = toSubmitActionError(error, {
				action: "updateAccountingRule",
				endpoint: BFF_ROUTES.accountingRuleById(editingRule?.id || 0),
				method: "PUT",
				tenantId,
			});
			setSubmitError(trackedError);
			setFormError(trackedError.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteRule(tenantId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["accounting-rules", tenantId],
			});
			setSubmitError(null);
			toast.success("Accounting rule deleted successfully");
		},
		onError: (error, id) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteAccountingRule",
					endpoint: BFF_ROUTES.accountingRuleById(id),
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const template = templateQuery.data;
	const rules = rulesQuery.data || [];
	const officeOptions = template?.allowedOffices || [];
	const accountOptions = template?.allowedAccounts || [];

	const filteredRules = useMemo(() => {
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) return rules;
		return rules.filter((rule) => {
			return (
				(rule.name || "").toLowerCase().includes(normalized) ||
				(rule.officeName || "").toLowerCase().includes(normalized)
			);
		});
	}, [rules, searchTerm]);

	const openCreateSheet = () => {
		setEditingRule(null);
		setFormError(null);
		setSubmitError(null);
		setFormState({
			...DEFAULT_FORM,
			officeId: officeOptions[0]?.id ? String(officeOptions[0].id) : "",
			accountToDebit: accountOptions[0]?.id ? String(accountOptions[0].id) : "",
			accountToCredit: accountOptions[0]?.id
				? String(accountOptions[0].id)
				: "",
		});
		setIsSheetOpen(true);
	};

	const openEditSheet = (rule: AccountingRuleData) => {
		setEditingRule(rule);
		setFormError(null);
		setSubmitError(null);
		setFormState({
			name: rule.name || "",
			description: rule.description || "",
			officeId: rule.officeId ? String(rule.officeId) : "",
			accountToDebit: rule.debitAccounts?.[0]?.id
				? String(rule.debitAccounts[0].id)
				: "",
			accountToCredit: rule.creditAccounts?.[0]?.id
				? String(rule.creditAccounts[0].id)
				: "",
		});
		setIsSheetOpen(true);
	};

	const handleSave = () => {
		setSubmitError(null);
		if (!formState.name.trim()) {
			setFormError("Rule name is required");
			return;
		}
		if (!formState.officeId) {
			setFormError("Office is required");
			return;
		}
		if (!formState.accountToDebit || !formState.accountToCredit) {
			setFormError("Debit and credit accounts are required");
			return;
		}

		setFormError(null);
		const payload: AccountRuleRequest = {
			name: formState.name.trim(),
			officeId: Number(formState.officeId),
			accountToDebit: Number(formState.accountToDebit),
			accountToCredit: Number(formState.accountToCredit),
		};
		if (formState.description.trim()) {
			payload.description = formState.description.trim();
		}

		if (editingRule) {
			updateMutation.mutate(payload);
		} else {
			createMutation.mutate(payload);
		}
	};

	const handleDelete = (rule: AccountingRuleData) => {
		setSubmitError(null);
		if (!rule.id) return;
		const confirmed = window.confirm(
			`Delete accounting rule \"${rule.name}\"?`,
		);
		if (!confirmed) return;
		deleteMutation.mutate(rule.id);
	};

	const columns = [
		{
			header: "Rule",
			cell: (rule: AccountingRuleData) => (
				<div>
					<div className="font-medium">{rule.name || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{rule.description || "No description"}
					</div>
				</div>
			),
		},
		{
			header: "Office",
			cell: (rule: AccountingRuleData) => <span>{rule.officeName || "—"}</span>,
		},
		{
			header: "Debit / Credit",
			cell: (rule: AccountingRuleData) => (
				<div className="text-xs">
					<div>
						Debit:{" "}
						{rule.debitAccounts?.map((item) => item.name).join(", ") || "—"}
					</div>
					<div>
						Credit:{" "}
						{rule.creditAccounts?.map((item) => item.name).join(", ") || "—"}
					</div>
				</div>
			),
		},
		{
			header: "Type",
			cell: (rule: AccountingRuleData) => (
				<Badge variant={rule.systemDefined ? "secondary" : "outline"}>
					{rule.systemDefined ? "System" : "Custom"}
				</Badge>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (rule: AccountingRuleData) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => openEditSheet(rule)}
					>
						Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleDelete(rule)}
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
				title="Accounting Rules"
				subtitle="Create reusable debit and credit posting rule definitions"
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
							Create Rule
						</Button>
					</div>
				}
			>
				<Card>
					<CardHeader>
						<CardTitle>Rule Registry</CardTitle>
						<CardDescription>
							{rules.length} rules configured in this tenant.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<SubmitErrorAlert
							error={submitError}
							title="Accounting rule action failed"
						/>
						<div className="space-y-2 max-w-lg">
							<Label htmlFor="search-rules">Search Rules</Label>
							<Input
								id="search-rules"
								placeholder="Search by name or office"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
							/>
						</div>
						{rulesQuery.isLoading || templateQuery.isLoading ? (
							<RulesTableSkeleton />
						) : (
							<DataTable
								data={filteredRules}
								columns={columns}
								getRowId={(rule) => rule.id || `rule-${rule.name}`}
								emptyMessage="No accounting rules found."
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{editingRule ? "Edit Accounting Rule" : "Create Accounting Rule"}
						</SheetTitle>
						<SheetDescription>
							Set office-specific debit and credit defaults.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						<SubmitErrorAlert
							error={submitError}
							title="Accounting rule action failed"
						/>
						{formError && (
							<Alert variant="destructive">
								<AlertTitle>Validation Error</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="rule-name">Rule Name</Label>
							<Input
								id="rule-name"
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
							<Label htmlFor="rule-description">Description</Label>
							<Input
								id="rule-description"
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
								<Label>Office</Label>
								<Select
									value={formState.officeId}
									onValueChange={(value) =>
										setFormState((prev) => ({ ...prev, officeId: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select office" />
									</SelectTrigger>
									<SelectContent>
										{officeOptions.map((office) => (
											<SelectItem key={office.id} value={String(office.id)}>
												{office.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Debit Account</Label>
								<Select
									value={formState.accountToDebit}
									onValueChange={(value) =>
										setFormState((prev) => ({ ...prev, accountToDebit: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select debit account" />
									</SelectTrigger>
									<SelectContent>
										{accountOptions.map((account) => (
											<SelectItem key={account.id} value={String(account.id)}>
												{account.name} ({account.glCode})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Credit Account</Label>
							<Select
								value={formState.accountToCredit}
								onValueChange={(value) =>
									setFormState((prev) => ({ ...prev, accountToCredit: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select credit account" />
								</SelectTrigger>
								<SelectContent>
									{accountOptions.map((account) => (
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
								{editingRule ? "Save Changes" : "Create Rule"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
