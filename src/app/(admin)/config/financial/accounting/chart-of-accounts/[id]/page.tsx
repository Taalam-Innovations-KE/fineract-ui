"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	BookOpen,
	CalendarCheck2,
	Landmark,
	Receipt,
	ShieldCheck,
	Workflow,
} from "lucide-react";
import Link from "next/link";
import {
	type ComponentType,
	use,
	useEffect,
	useMemo,
	useState,
} from "react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	FINERACT_DATE_FORMAT,
	FINERACT_LOCALE,
	formatDateStringToFormat,
} from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetGlAccountsResponse,
	GetGlClosureResponse,
	GetJournalEntriesTransactionIdResponse,
	JournalEntryData,
	JournalEntryTransactionItem,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const PAGE_SIZE = 8;

type ManualFilter = "all" | "manual";

type LedgerFilters = {
	transactionId: string;
	manualEntries: ManualFilter;
	fromDate: string;
	toDate: string;
};

const DEFAULT_FILTERS: LedgerFilters = {
	transactionId: "",
	manualEntries: "all",
	fromDate: "",
	toDate: "",
};

function resolveTenantId(tenantId?: string | null): string {
	const normalized = tenantId?.trim();
	return normalized && normalized.length > 0 ? normalized : "default";
}

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

async function getResponseErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	const payload = (await response.json().catch(() => null)) as unknown;
	const record = toRecord(payload);
	if (!record) {
		return fallback;
	}

	const message = record.message;
	if (typeof message === "string" && message.trim().length > 0) {
		return message;
	}

	const defaultUserMessage = record.defaultUserMessage;
	if (
		typeof defaultUserMessage === "string" &&
		defaultUserMessage.trim().length > 0
	) {
		return defaultUserMessage;
	}

	return fallback;
}

async function fetchGlAccountById(
	tenantId: string,
	glAccountId: number,
): Promise<GetGlAccountsResponse> {
	const params = new URLSearchParams({ fetchRunningBalance: "true" });
	const response = await fetch(
		`${BFF_ROUTES.glAccountById(glAccountId)}?${params.toString()}`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(response, "Failed to fetch GL account"),
		);
	}

	return response.json();
}

async function fetchLedgerLines(
	tenantId: string,
	glAccountId: number,
	filters: LedgerFilters,
	pageIndex: number,
): Promise<GetJournalEntriesTransactionIdResponse> {
	const params = new URLSearchParams({
		glAccountId: String(glAccountId),
		limit: String(PAGE_SIZE),
		offset: String(pageIndex * PAGE_SIZE),
		orderBy: "transactionDate",
		sortOrder: "DESC",
		runningBalance: "true",
		transactionDetails: "true",
	});

	if (filters.manualEntries === "manual") {
		params.set("manualEntriesOnly", "true");
	}

	if (filters.transactionId.trim()) {
		params.set("transactionId", filters.transactionId.trim());
	}

	const hasDateFilters = Boolean(filters.fromDate || filters.toDate);
	if (hasDateFilters) {
		params.set("dateFormat", FINERACT_DATE_FORMAT);
		params.set("locale", FINERACT_LOCALE);

		if (filters.fromDate) {
			params.set(
				"fromDate",
				formatDateStringToFormat(filters.fromDate, FINERACT_DATE_FORMAT),
			);
		}

		if (filters.toDate) {
			params.set(
				"toDate",
				formatDateStringToFormat(filters.toDate, FINERACT_DATE_FORMAT),
			);
		}
	}

	const response = await fetch(`${BFF_ROUTES.journalEntries}?${params.toString()}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(
				response,
				"Failed to fetch ledger transactions",
			),
		);
	}

	const payload = (await response.json()) as unknown;
	if (Array.isArray(payload)) {
		return {
			pageItems: payload as JournalEntryTransactionItem[],
			totalFilteredRecords: payload.length,
		};
	}

	const payloadRecord = toRecord(payload);
	if (payloadRecord) {
		return payloadRecord as unknown as GetJournalEntriesTransactionIdResponse;
	}

	return {
		pageItems: [],
		totalFilteredRecords: 0,
	};
}

async function fetchJournalLineById(
	tenantId: string,
	journalEntryId: number,
): Promise<JournalEntryData> {
	const response = await fetch(BFF_ROUTES.journalEntryById(journalEntryId), {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(
				response,
				"Failed to fetch transaction details",
			),
		);
	}

	return response.json();
}

async function fetchClosures(tenantId: string): Promise<GetGlClosureResponse[]> {
	const response = await fetch(BFF_ROUTES.glClosures, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error(
			await getResponseErrorMessage(
				response,
				"Failed to fetch accounting closures",
			),
		);
	}

	return response.json();
}

function formatDate(value?: string): string {
	if (!value) {
		return "N/A";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatDateTime(value?: string): string {
	if (!value) {
		return "N/A";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatAmount(
	amount?: number,
	currencyCode?: string,
	currencySymbol?: string,
): string {
	if (amount === undefined || amount === null) {
		return "N/A";
	}

	const formatted = amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	const currency = currencySymbol || currencyCode;
	return currency ? `${currency} ${formatted}` : formatted;
}

function formatText(value: unknown): string {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => formatText(item)).join(", ");
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

function humanizeKey(value: string): string {
	return value
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (char) => char.toUpperCase())
		.trim();
}

function normalizeDetailValue(value: unknown): string {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => normalizeDetailValue(item)).join(", ");
	}
	if (typeof value === "object") {
		return Object.entries(value as Record<string, unknown>)
			.map(
				([key, childValue]) =>
					`${humanizeKey(key)}: ${normalizeDetailValue(childValue)}`,
			)
			.join(" • ");
	}
	return String(value);
}

function getDetailPairs(details: unknown): Array<{ label: string; value: string }> {
	const record = toRecord(details);
	if (!record) {
		return [];
	}

	return Object.entries(record).map(([key, value]) => ({
		label: humanizeKey(key),
		value: normalizeDetailValue(value),
	}));
}

function getEntryTypeLabel(entry: JournalEntryTransactionItem): string {
	return entry.entryType?.value || entry.entryType?.code || "N/A";
}

function isDebitEntry(entry: JournalEntryTransactionItem): boolean {
	return getEntryTypeLabel(entry).toLowerCase().includes("debit");
}

function isCreditEntry(entry: JournalEntryTransactionItem): boolean {
	return getEntryTypeLabel(entry).toLowerCase().includes("credit");
}

function getRowId(entry: JournalEntryTransactionItem): string {
	if (entry.id !== undefined && entry.id !== null) {
		return String(entry.id);
	}

	return [
		entry.transactionId ?? "txn",
		entry.transactionDate ?? "date",
		entry.amount ?? "amount",
		entry.entryType?.id ?? entry.entryType?.code ?? "entry",
	].join("-");
}

function MetricCard({
	label,
	value,
	subtitle,
	icon: Icon,
}: {
	label: string;
	value: string;
	subtitle?: string;
	icon: ComponentType<{ className?: string }>;
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
						{subtitle ? (
							<div className="text-xs text-muted-foreground">{subtitle}</div>
						) : null}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<div className="text-sm text-muted-foreground">{label}</div>
			<div className="text-right text-sm font-medium">{value}</div>
		</div>
	);
}

function PageSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<Card key={`metric-skeleton-${index}`}>
						<CardContent className="space-y-2 pt-6">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-28" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-56 w-full" />
				</CardContent>
			</Card>
		</div>
	);
}

export default function LedgerDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const ledgerId = Number(id);
	const isValidLedgerId = Number.isFinite(ledgerId) && ledgerId > 0;

	const { tenantId } = useTenantStore();
	const effectiveTenantId = useMemo(() => resolveTenantId(tenantId), [tenantId]);

	const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_FILTERS);
	const [pageIndex, setPageIndex] = useState(0);
	const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

	useEffect(() => {
		setPageIndex(0);
	}, [filters]);

	const accountQuery = useQuery({
		queryKey: ["glaccount-ledger-view", effectiveTenantId, ledgerId],
		queryFn: () => fetchGlAccountById(effectiveTenantId, ledgerId),
		enabled: Boolean(effectiveTenantId && isValidLedgerId),
	});

	const linesQuery = useQuery({
		queryKey: ["glaccount-ledger-lines", effectiveTenantId, ledgerId, filters, pageIndex],
		queryFn: () => fetchLedgerLines(effectiveTenantId, ledgerId, filters, pageIndex),
		enabled: Boolean(effectiveTenantId && isValidLedgerId),
	});

	const closuresQuery = useQuery({
		queryKey: ["glaccount-ledger-closures", effectiveTenantId],
		queryFn: () => fetchClosures(effectiveTenantId),
		enabled: Boolean(effectiveTenantId),
	});

	const lines = linesQuery.data?.pageItems || [];
	const totalRows = linesQuery.data?.totalFilteredRecords || lines.length;

	useEffect(() => {
		if (lines.length === 0) {
			setSelectedRowId(null);
			return;
		}

		const hasSelection =
			selectedRowId !== null && lines.some((line) => getRowId(line) === selectedRowId);

		if (!hasSelection) {
			setSelectedRowId(getRowId(lines[0]));
		}
	}, [lines, selectedRowId]);

	const selectedLine = useMemo(
		() => lines.find((line) => getRowId(line) === selectedRowId) || null,
		[lines, selectedRowId],
	);

	const selectedLineId = selectedLine?.id;
	const selectedLineQuery = useQuery({
		queryKey: ["glaccount-ledger-line", effectiveTenantId, selectedLineId],
		queryFn: () => fetchJournalLineById(effectiveTenantId, selectedLineId || 0),
		enabled: Boolean(effectiveTenantId && selectedLineId),
	});

	const selectedLineDetails = getDetailPairs(
		selectedLineQuery.data?.transactionDetails || selectedLine?.transactionDetails,
	);

	const sortedClosures = useMemo(
		() =>
			[...(closuresQuery.data || [])].sort((left, right) => {
				const leftTime = new Date(left.closingDate || "").getTime();
				const rightTime = new Date(right.closingDate || "").getTime();
				return rightTime - leftTime;
			}),
		[closuresQuery.data],
	);

	const debitTotal = lines.reduce((total, line) => {
		if (!isDebitEntry(line)) {
			return total;
		}
		return total + (line.amount || 0);
	}, 0);

	const creditTotal = lines.reduce((total, line) => {
		if (!isCreditEntry(line)) {
			return total;
		}
		return total + (line.amount || 0);
	}, 0);

	const manualCount = lines.filter((line) => line.manualEntry).length;
	const reversedCount = lines.filter((line) => line.reversed).length;

	const tableColumns = useMemo<DataTableColumn<JournalEntryTransactionItem>[]>(
		() => [
			{
				header: "Posting Date",
				cell: (line) => (
					<div>
						<div className="font-medium">{formatDate(line.transactionDate)}</div>
						<div className="text-xs text-muted-foreground">
							Submitted: {formatDateTime(line.submittedOnDate)}
						</div>
					</div>
				),
			},
			{
				header: "Transaction",
				cell: (line) => (
					<div>
						<div className="font-medium">{line.transactionId || "N/A"}</div>
						<div className="text-xs text-muted-foreground">
							Ref: {line.referenceNumber || "N/A"}
						</div>
					</div>
				),
			},
			{
				header: "Entry",
				cell: (line) => (
					<div className="space-y-1">
						<Badge variant={isDebitEntry(line) ? "default" : "secondary"}>
							{getEntryTypeLabel(line)}
						</Badge>
						<div className="text-sm font-medium">
							{formatAmount(
								line.amount,
								line.currency?.code,
								line.currency?.displaySymbol,
							)}
						</div>
					</div>
				),
			},
			{
				header: "Context",
				cell: (line) => (
					<div>
						<div className="text-sm">{line.officeName || "N/A"}</div>
						<div className="text-xs text-muted-foreground">
							{line.entityType?.value || line.entityType?.code || "N/A"} /{" "}
							{line.entityId || "N/A"}
						</div>
					</div>
				),
			},
			{
				header: "Audit",
				cell: (line) => (
					<div className="space-y-1">
						<div className="text-sm">{line.createdByUserName || "N/A"}</div>
						<div className="text-xs text-muted-foreground">
							{formatDateTime(line.createdDate)}
						</div>
						<div className="flex flex-wrap items-center gap-1">
							<Badge variant={line.manualEntry ? "warning" : "outline"}>
								{line.manualEntry ? "Manual" : "System"}
							</Badge>
							{line.reversed ? (
								<Badge variant="destructive">Reversed</Badge>
							) : null}
						</div>
					</div>
				),
			},
			{
				header: "Actions",
				headerClassName: "text-right",
				className: "text-right",
				cell: (line) => (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							setSelectedRowId(getRowId(line));
						}}
					>
						Inspect
					</Button>
				),
			},
		],
		[],
	);

	const hasError =
		accountQuery.error || linesQuery.error || closuresQuery.error || selectedLineQuery.error;

	const headerActions = (
		<Button variant="outline" asChild>
			<Link href="/config/financial/accounting/chart-of-accounts">
				<ArrowLeft className="h-4 w-4 mr-2" />
				Back to Chart of Accounts
			</Link>
		</Button>
	);

	if (!isValidLedgerId) {
		return (
			<PageShell
				title="Ledger View"
				subtitle="Invalid ledger identifier"
				actions={headerActions}
			>
				<Alert variant="destructive">
					<AlertTitle>Invalid Account ID</AlertTitle>
					<AlertDescription>
						The requested ledger identifier is invalid.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	if (accountQuery.isLoading || linesQuery.isLoading) {
		return (
			<PageShell
				title="Ledger View"
				subtitle="Loading ledger details and transaction lines"
				actions={headerActions}
			>
				<PageSkeleton />
			</PageShell>
		);
	}

	const account = accountQuery.data;
	if (!account) {
		return (
			<PageShell
				title="Ledger View"
				subtitle="Account not found"
				actions={headerActions}
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load ledger</AlertTitle>
					<AlertDescription>
						{getErrorMessage(accountQuery.error, "GL account details were not found.")}
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={
				<div className="flex items-center gap-2">
					<span>{account.name || "Ledger"}</span>
					<Badge variant={account.disabled ? "destructive" : "success"}>
						{account.disabled ? "Disabled" : "Active"}
					</Badge>
					<Badge variant="outline">{account.type?.value || "N/A"}</Badge>
				</div>
			}
			subtitle={`Account #${account.id || "N/A"} • GL Code ${account.glCode || "N/A"}`}
			actions={headerActions}
		>
			<div className="space-y-6">
				{hasError ? (
					<Alert variant="destructive">
						<AlertTitle>Unable to load ledger data</AlertTitle>
						<AlertDescription>
							{getErrorMessage(
								hasError,
								"An error occurred while loading ledger transactions.",
							)}
						</AlertDescription>
					</Alert>
				) : null}

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<MetricCard
						label="Organization Running Balance"
						value={formatAmount(account.organizationRunningBalance)}
						subtitle="From GL account snapshot"
						icon={BookOpen}
					/>
					<MetricCard
						label="Filtered Ledger Lines"
						value={String(totalRows)}
						subtitle={`${lines.length} shown on current page`}
						icon={Receipt}
					/>
					<MetricCard
						label="Debit Total (Current Page)"
						value={formatAmount(debitTotal)}
						subtitle="Sum of debit rows"
						icon={Landmark}
					/>
					<MetricCard
						label="Credit Total (Current Page)"
						value={formatAmount(creditTotal)}
						subtitle="Sum of credit rows"
						icon={Workflow}
					/>
					<MetricCard
						label="Manual Lines"
						value={String(manualCount)}
						subtitle="Manual journal entries"
						icon={ShieldCheck}
					/>
					<MetricCard
						label="Reversed Lines"
						value={String(reversedCount)}
						subtitle={`${sortedClosures.length} closure records found`}
						icon={CalendarCheck2}
					/>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Account Breakdown</CardTitle>
						<CardDescription>
							Core chart-of-accounts fields for this ledger account.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 xl:grid-cols-3">
						<Card className="border border-border/60">
							<CardHeader>
								<CardTitle className="text-base">Identity</CardTitle>
							</CardHeader>
							<CardContent className="divide-y">
								<DetailRow label="Account ID" value={formatText(account.id)} />
								<DetailRow label="GL Code" value={formatText(account.glCode)} />
								<DetailRow label="Name" value={formatText(account.name)} />
								<DetailRow
									label="Decorated Name"
									value={formatText(account.nameDecorated)}
								/>
							</CardContent>
						</Card>

						<Card className="border border-border/60">
							<CardHeader>
								<CardTitle className="text-base">Classification</CardTitle>
							</CardHeader>
							<CardContent className="divide-y">
								<DetailRow label="Type" value={formatText(account.type?.value)} />
								<DetailRow label="Usage" value={formatText(account.usage?.value)} />
								<DetailRow
									label="Parent ID"
									value={formatText(account.parentId)}
								/>
								<DetailRow label="Tag" value={formatText(account.tagId?.name)} />
							</CardContent>
						</Card>

						<Card className="border border-border/60">
							<CardHeader>
								<CardTitle className="text-base">Controls</CardTitle>
							</CardHeader>
							<CardContent className="divide-y">
								<DetailRow
									label="Manual Entries Allowed"
									value={account.manualEntriesAllowed ? "Yes" : "No"}
								/>
								<DetailRow
									label="Disabled"
									value={account.disabled ? "Yes" : "No"}
								/>
								<DetailRow
									label="Description"
									value={formatText(account.description)}
								/>
								<DetailRow
									label="Org Running Balance"
									value={formatAmount(account.organizationRunningBalance)}
								/>
							</CardContent>
						</Card>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ledger Filters</CardTitle>
						<CardDescription>
							Filter transactions for this ledger account.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div className="space-y-2">
							<Label>Manual Entries</Label>
							<Select
								value={filters.manualEntries}
								onValueChange={(value) =>
									setFilters((current) => ({
										...current,
										manualEntries: value as ManualFilter,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="All entries" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Entries</SelectItem>
									<SelectItem value="manual">Manual Only</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ledger-txn-id">Transaction ID</Label>
							<Input
								id="ledger-txn-id"
								placeholder="Filter by transaction ID"
								value={filters.transactionId}
								onChange={(event) =>
									setFilters((current) => ({
										...current,
										transactionId: event.target.value,
									}))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ledger-from-date">From Date</Label>
							<Input
								id="ledger-from-date"
								type="date"
								value={filters.fromDate}
								onChange={(event) =>
									setFilters((current) => ({
										...current,
										fromDate: event.target.value,
									}))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ledger-to-date">To Date</Label>
							<Input
								id="ledger-to-date"
								type="date"
								value={filters.toDate}
								onChange={(event) =>
									setFilters((current) => ({
										...current,
										toDate: event.target.value,
									}))
								}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ledger Transactions</CardTitle>
						<CardDescription>
							Posting lines for {account.glCode || "this account"} with audit and
							context dimensions.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							data={lines}
							columns={tableColumns}
							getRowId={getRowId}
							manualPagination={true}
							pageSize={PAGE_SIZE}
							pageIndex={pageIndex}
							totalRows={totalRows}
							onPageChange={setPageIndex}
							onRowClick={(line) => setSelectedRowId(getRowId(line))}
							emptyMessage="No ledger lines found for this account and filter set."
						/>
					</CardContent>
				</Card>

				{selectedLine ? (
					<Card>
						<CardHeader>
							<CardTitle>
								Transaction Breakdown: {selectedLine.transactionId || "N/A"}
							</CardTitle>
							<CardDescription>
								Detailed posting, state, and audit values for the selected line.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 xl:grid-cols-3">
								<Card className="border border-border/60">
									<CardHeader>
										<CardTitle className="text-base">Posting</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<DetailRow
											label="Journal Entry ID"
											value={formatText(
												selectedLineQuery.data?.id || selectedLine.id,
											)}
										/>
										<DetailRow
											label="Transaction ID"
											value={formatText(selectedLine.transactionId)}
										/>
										<DetailRow
											label="Transaction Date"
											value={formatDate(selectedLine.transactionDate)}
										/>
										<DetailRow
											label="Entry Type"
											value={getEntryTypeLabel(selectedLine)}
										/>
										<DetailRow
											label="Amount"
											value={formatAmount(
												selectedLine.amount,
												selectedLine.currency?.code,
												selectedLine.currency?.displaySymbol,
											)}
										/>
									</CardContent>
								</Card>

								<Card className="border border-border/60">
									<CardHeader>
										<CardTitle className="text-base">Context</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<DetailRow
											label="GL Account"
											value={`${formatText(selectedLine.glAccountCode)} - ${formatText(selectedLine.glAccountName)}`}
										/>
										<DetailRow
											label="Office"
											value={formatText(selectedLine.officeName)}
										/>
										<DetailRow
											label="Entity"
											value={`${formatText(selectedLine.entityType?.value || selectedLine.entityType?.code)} / ${formatText(selectedLine.entityId)}`}
										/>
										<DetailRow
											label="Organization Running Balance"
											value={formatAmount(
												selectedLine.organizationRunningBalance,
												selectedLine.currency?.code,
												selectedLine.currency?.displaySymbol,
											)}
										/>
									</CardContent>
								</Card>

								<Card className="border border-border/60">
									<CardHeader>
										<CardTitle className="text-base">Audit & State</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<DetailRow
											label="Created By"
											value={formatText(selectedLine.createdByUserName)}
										/>
										<DetailRow
											label="Created Date"
											value={formatDateTime(selectedLine.createdDate)}
										/>
										<DetailRow
											label="Submitted On"
											value={formatDateTime(selectedLine.submittedOnDate)}
										/>
										<DetailRow
											label="Manual Entry"
											value={selectedLine.manualEntry ? "Yes" : "No"}
										/>
										<DetailRow
											label="Reversed"
											value={selectedLine.reversed ? "Yes" : "No"}
										/>
										<DetailRow
											label="Reference Number"
											value={formatText(selectedLine.referenceNumber)}
										/>
										<DetailRow
											label="Comments"
											value={formatText(selectedLine.comments)}
										/>
									</CardContent>
								</Card>
							</div>

							<Card className="border border-border/60">
								<CardHeader>
									<CardTitle className="text-base">Transaction Details</CardTitle>
									<CardDescription>
										Expanded transactionDetails payload for deeper audit context.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-2">
									{selectedLineQuery.isLoading ? (
										<Skeleton className="h-12 w-full" />
									) : selectedLineDetails.length > 0 ? (
										selectedLineDetails.map((detail) => (
											<div
												key={`${detail.label}-${detail.value}`}
												className="rounded-sm border border-border/60 px-3 py-2"
											>
												<div className="text-xs text-muted-foreground">
													{detail.label}
												</div>
												<div className="text-sm font-medium">{detail.value}</div>
											</div>
										))
									) : (
										<div className="text-sm text-muted-foreground">
											No additional transaction details returned for this entry.
										</div>
									)}
								</CardContent>
							</Card>
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Transaction Breakdown</CardTitle>
							<CardDescription>
								Select a transaction line to inspect detailed fields.
							</CardDescription>
						</CardHeader>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Accounting Closures</CardTitle>
						<CardDescription>
							Recent closure records that can be used as posting boundary
							reference points.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{closuresQuery.isLoading ? (
							<Skeleton className="h-28 w-full" />
						) : sortedClosures.length > 0 ? (
							sortedClosures.slice(0, 5).map((closure) => (
								<div
									key={`closure-${closure.id}`}
									className="rounded-sm border border-border/60 px-3 py-2"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="text-sm font-medium">
											{closure.officeName || `Office #${closure.officeId || "N/A"}`}
										</div>
										<Badge variant="outline">
											Closed: {formatDate(closure.closingDate)}
										</Badge>
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										By: {closure.createdByUsername || "N/A"} • Comments: {" "}
										{closure.comments || "N/A"}
									</div>
								</div>
							))
						) : (
							<div className="text-sm text-muted-foreground">
								No closures available.
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
