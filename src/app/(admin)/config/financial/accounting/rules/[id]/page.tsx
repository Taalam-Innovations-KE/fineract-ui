"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	BookOpen,
	Building2,
	Calculator,
	Hash,
	Landmark,
} from "lucide-react";
import Link from "next/link";
import { type ElementType, use, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	AccountingRuleData,
	AccountingTagRuleData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

function formatText(value?: string | number | null): string {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}
	return String(value);
}

function hasTagMappings(rule: AccountingRuleData) {
	return (
		(rule.debitTags?.length || 0) > 0 || (rule.creditTags?.length || 0) > 0
	);
}

function isAdvancedRule(rule: AccountingRuleData) {
	return (
		hasTagMappings(rule) ||
		Boolean(rule.allowMultipleDebitEntries) ||
		Boolean(rule.allowMultipleCreditEntries) ||
		(rule.debitAccounts?.length || 0) > 1 ||
		(rule.creditAccounts?.length || 0) > 1
	);
}

function describeTagMappings(tags?: AccountingTagRuleData[]) {
	if (!tags?.length) {
		return [];
	}

	return tags.map((tagRule) => {
		const tagLabel =
			tagRule.tag?.name ||
			tagRule.tag?.value ||
			tagRule.tag?.code ||
			`Tag #${tagRule.tag?.id}`;
		const transactionType =
			tagRule.transactionType?.value ||
			tagRule.transactionType?.code ||
			"Unspecified transaction type";
		return {
			id: tagRule.id || `${tagLabel}-${transactionType}`,
			label: `${tagLabel} (${transactionType})`,
		};
	});
}

function resolveOfficeName(
	rule: AccountingRuleData,
	template?: AccountingRuleData,
): string {
	if (rule.officeName) {
		return rule.officeName;
	}

	const officeId = rule.officeId;
	if (!officeId) {
		return "N/A";
	}

	const office = template?.allowedOffices?.find((item) => item.id === officeId);
	if (office?.name) {
		return office.name;
	}

	return `Office #${officeId}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof (error as { message?: unknown }).message === "string"
	) {
		return (error as { message: string }).message;
	}
	return fallback;
}

async function fetchRuleById(
	tenantId: string,
	ruleId: number,
): Promise<AccountingRuleData> {
	const response = await fetch(BFF_ROUTES.accountingRuleById(ruleId), {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw (await response.json().catch(() => ({
			message: "Failed to fetch accounting rule details",
		}))) as unknown;
	}

	return response.json();
}

async function fetchRuleTemplate(
	tenantId: string,
): Promise<AccountingRuleData> {
	const response = await fetch(BFF_ROUTES.accountingRulesTemplate, {
		headers: { "x-tenant-id": tenantId },
	});

	if (!response.ok) {
		throw (await response.json().catch(() => ({
			message: "Failed to fetch accounting rules template",
		}))) as unknown;
	}

	return response.json();
}

function MetricCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: ElementType;
}) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
						<Icon className="h-5 w-5 text-primary" />
					</div>
					<div>
						<div className="text-2xl font-bold">{value}</div>
						<div className="text-sm text-muted-foreground">{label}</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-right text-sm font-medium">{value}</span>
		</div>
	);
}

function RuleDetailsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`rule-metric-skeleton-${index}`}>
						<CardContent className="space-y-2 pt-6">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-8 w-20" />
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-44" />
						<Skeleton className="h-4 w-64" />
					</CardHeader>
					<CardContent className="space-y-2">
						{Array.from({ length: 7 }).map((_, index) => (
							<div
								key={`rule-overview-skeleton-${index}`}
								className="grid grid-cols-2 gap-3"
							>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-36" />
						<Skeleton className="h-4 w-52" />
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<Skeleton
								key={`rule-mapping-skeleton-${index}`}
								className="h-4 w-full"
							/>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default function AccountingRuleDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const ruleId = Number(id);

	const headerActions = (
		<Button variant="outline" asChild>
			<Link href="/config/financial/accounting/rules">
				<ArrowLeft className="h-4 w-4 mr-2" />
				Back to Accounting Rules
			</Link>
		</Button>
	);

	const isValidRuleId = Number.isFinite(ruleId) && ruleId > 0;

	const ruleQuery = useQuery({
		queryKey: ["accounting-rule", tenantId, ruleId],
		queryFn: () => fetchRuleById(tenantId, ruleId),
		enabled: Boolean(tenantId && isValidRuleId),
	});

	const templateQuery = useQuery({
		queryKey: ["accounting-rules-template", tenantId],
		queryFn: () => fetchRuleTemplate(tenantId),
		enabled: Boolean(tenantId),
	});

	const rule = ruleQuery.data;
	const template = templateQuery.data;

	const officeName = useMemo(
		() => (rule ? resolveOfficeName(rule, template) : "N/A"),
		[rule, template],
	);

	if (!isValidRuleId) {
		return (
			<PageShell
				title="Accounting Rule Details"
				subtitle="Invalid rule identifier"
				actions={headerActions}
			>
				<Alert variant="destructive">
					<AlertTitle>Invalid Rule ID</AlertTitle>
					<AlertDescription>
						The requested accounting rule identifier is invalid.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	if (ruleQuery.isLoading || templateQuery.isLoading) {
		return (
			<PageShell
				title="Accounting Rule Details"
				subtitle="View rule metadata and mapping definitions"
				actions={headerActions}
			>
				<RuleDetailsSkeleton />
			</PageShell>
		);
	}

	if (ruleQuery.error || !rule) {
		return (
			<PageShell
				title="Accounting Rule Details"
				subtitle="Could not load accounting rule"
				actions={headerActions}
			>
				<Alert variant="destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						{getErrorMessage(
							ruleQuery.error,
							"Failed to load accounting rule details. Please try again.",
						)}
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const debitAccounts = rule.debitAccounts || [];
	const creditAccounts = rule.creditAccounts || [];
	const debitTagMappings = describeTagMappings(rule.debitTags);
	const creditTagMappings = describeTagMappings(rule.creditTags);
	const advancedRule = isAdvancedRule(rule);

	return (
		<PageShell
			title={
				<div className="flex items-center gap-2">
					<span>{formatText(rule.name)}</span>
					<Badge variant={rule.systemDefined ? "secondary" : "outline"}>
						{rule.systemDefined ? "System" : "Custom"}
					</Badge>
				</div>
			}
			subtitle={`Rule #${rule.id} • ${advancedRule ? "Advanced mapping" : "Simple account mapping"}`}
			actions={headerActions}
		>
			<div className="space-y-6">
				{advancedRule && (
					<Alert>
						<AlertTitle>Advanced mapping detected</AlertTitle>
						<AlertDescription>
							This rule uses tags, multi-entry settings, or multiple account
							mappings. The current sheet editor supports simple
							account-to-account mappings only.
						</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<MetricCard label="Rule ID" value={formatText(rule.id)} icon={Hash} />
					<MetricCard label="Office" value={officeName} icon={Building2} />
					<MetricCard
						label="Debit Mappings"
						value={String(debitAccounts.length || debitTagMappings.length)}
						icon={BookOpen}
					/>
					<MetricCard
						label="Credit Mappings"
						value={String(creditAccounts.length || creditTagMappings.length)}
						icon={Landmark}
					/>
				</div>

				<div className="grid gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Overview</CardTitle>
							<CardDescription>
								Rule-level fields used by accounting rule execution.
							</CardDescription>
						</CardHeader>
						<CardContent className="divide-y">
							<InfoRow label="Name" value={formatText(rule.name)} />
							<InfoRow label="Office" value={officeName} />
							<InfoRow
								label="Description"
								value={formatText(rule.description)}
							/>
							<InfoRow
								label="System Defined"
								value={rule.systemDefined ? "Yes" : "No"}
							/>
							<InfoRow
								label="Allow Multiple Debit Entries"
								value={rule.allowMultipleDebitEntries ? "Yes" : "No"}
							/>
							<InfoRow
								label="Allow Multiple Credit Entries"
								value={rule.allowMultipleCreditEntries ? "Yes" : "No"}
							/>
							<InfoRow
								label="Mapping Mode"
								value={advancedRule ? "Advanced" : "Simple"}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Form Submission Model</CardTitle>
							<CardDescription>
								The current create/edit form submits simple account mappings.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2">
								<span className="text-muted-foreground">Accepted fields</span>
								<span className="font-medium">
									name, officeId, accountToDebit, accountToCredit, description
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2">
								<span className="text-muted-foreground">Template metadata</span>
								<span className="font-medium">
									allowedOffices, allowedAccounts, tag options
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2">
								<span className="text-muted-foreground">Current rule mode</span>
								<span className="font-medium">
									{advancedRule
										? "Advanced (read-only in sheet editor)"
										: "Simple"}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Debit Mappings</CardTitle>
							<CardDescription>
								Preconfigured accounts and tags for debit entries.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{debitAccounts.length > 0 ? (
								debitAccounts.map((account) => (
									<div
										key={account.id || account.name}
										className="rounded-sm border px-3 py-2"
									>
										<div className="font-medium">
											{formatText(account.name)}
										</div>
										<div className="text-xs text-muted-foreground">
											GL Code: {formatText(account.glCode)}
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">
									No explicit debit account mappings.
								</p>
							)}

							{debitTagMappings.length > 0 && (
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-sm font-medium">
										<Calculator className="h-4 w-4 text-primary" />
										Debit Tag Rules
									</div>
									{debitTagMappings.map((mapping) => (
										<div
											key={mapping.id}
											className="rounded-sm border border-dashed px-3 py-2 text-sm"
										>
											{mapping.label}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Credit Mappings</CardTitle>
							<CardDescription>
								Preconfigured accounts and tags for credit entries.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{creditAccounts.length > 0 ? (
								creditAccounts.map((account) => (
									<div
										key={account.id || account.name}
										className="rounded-sm border px-3 py-2"
									>
										<div className="font-medium">
											{formatText(account.name)}
										</div>
										<div className="text-xs text-muted-foreground">
											GL Code: {formatText(account.glCode)}
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">
									No explicit credit account mappings.
								</p>
							)}

							{creditTagMappings.length > 0 && (
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-sm font-medium">
										<Calculator className="h-4 w-4 text-primary" />
										Credit Tag Rules
									</div>
									{creditTagMappings.map((mapping) => (
										<div
											key={mapping.id}
											className="rounded-sm border border-dashed px-3 py-2 text-sm"
										>
											{mapping.label}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</PageShell>
	);
}
