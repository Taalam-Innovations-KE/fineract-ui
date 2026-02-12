"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type InboxTab = "pending" | "mine";

type MakerCheckerEntry = {
	auditId: number;
	makerId?: number;
	makerName?: string;
	checkerId?: number;
	checkerName?: string;
	madeOnDate?: string;
	checkedOnDate?: string;
	processingResult: string;
	resourceId?: string;
	entityName?: string;
	actionName?: string;
	officeName?: string;
	clientName?: string;
	groupName?: string;
	commandAsJson?: string;
};

type SearchTemplate = {
	actionNames: string[];
	entityNames: string[];
	appUsers: Array<{ id: number; username: string }>;
};

type InboxResponse = {
	items: MakerCheckerEntry[];
	searchTemplate: SearchTemplate;
	summary: {
		total: number;
		pending: number;
		approved: number;
		rejected: number;
	};
	currentUser: {
		id: number;
		username: string;
		isSuperChecker: boolean;
	} | null;
};

type InboxFilters = {
	actionName: string;
	entityName: string;
	processingResult: string;
	makerDateTimeFrom: string;
	makerDateTimeTo: string;
	q: string;
};

const ALL_FILTER_OPTION = "__all__";
const STATUS_OPTIONS = ["awaiting.approval", "approved", "rejected"];

function getStatusVariant(status: string) {
	switch (status.toLowerCase()) {
		case "awaiting.approval":
			return "warning";
		case "approved":
			return "success";
		case "rejected":
			return "destructive";
		default:
			return "secondary";
	}
}

function parseCommandAsJson(
	commandAsJson?: string,
): Record<string, unknown> | null {
	if (!commandAsJson) return null;
	try {
		return JSON.parse(commandAsJson) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function toLocalDate(value?: string): string {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function buildInboxQuery(tab: InboxTab, filters: InboxFilters): string {
	const params = new URLSearchParams();
	params.set("scope", tab);
	params.set("includeJson", "true");

	if (filters.actionName) params.set("actionName", filters.actionName);
	if (filters.entityName) params.set("entityName", filters.entityName);
	if (filters.processingResult)
		params.set("processingResult", filters.processingResult);
	if (filters.makerDateTimeFrom)
		params.set(
			"makerDateTimeFrom",
			new Date(filters.makerDateTimeFrom).toISOString(),
		);
	if (filters.makerDateTimeTo)
		params.set(
			"makerDateTimeTo",
			new Date(filters.makerDateTimeTo).toISOString(),
		);
	if (filters.q) params.set("q", filters.q);

	return params.toString();
}

async function fetchInbox(
	tenantId: string,
	tab: InboxTab,
	filters: InboxFilters,
): Promise<InboxResponse> {
	const queryString = buildInboxQuery(tab, filters);
	const response = await fetch(`/api/maker-checker/inbox?${queryString}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
		cache: "no-store",
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: "Failed to load maker-checker inbox" }));
		throw errorPayload;
	}

	return response.json();
}

async function approveOrRejectEntry(
	auditId: number,
	command: "approve" | "reject",
): Promise<void> {
	const response = await fetch("/api/maker-checker/inbox", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ auditId, command }),
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: `Failed to ${command} entry` }));
		throw errorPayload;
	}
}

async function withdrawEntry(auditId: number): Promise<void> {
	const response = await fetch("/api/maker-checker/inbox", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ auditId }),
	});

	if (!response.ok) {
		const errorPayload = await response
			.json()
			.catch(() => ({ message: "Failed to withdraw entry" }));
		throw errorPayload;
	}
}

function InboxPageSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`maker-checker-inbox-stat-skeleton-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-8 w-16" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-52" />
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								key={`maker-checker-filter-skeleton-${index}`}
								className="space-y-2"
							>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-44" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-10 w-full" />
					{Array.from({ length: 8 }).map((_, index) => (
						<Skeleton
							key={`maker-checker-row-skeleton-${index}`}
							className="h-10 w-full"
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export default function InboxPage() {
	const queryClient = useQueryClient();
	const { tenantId } = useTenantStore();
	const [tab, setTab] = useState<InboxTab>("pending");
	const [filters, setFilters] = useState<InboxFilters>({
		actionName: "",
		entityName: "",
		processingResult: tab === "pending" ? "awaiting.approval" : "",
		makerDateTimeFrom: "",
		makerDateTimeTo: "",
		q: "",
	});
	const [selectedEntry, setSelectedEntry] = useState<MakerCheckerEntry | null>(
		null,
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const {
		data: inboxResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["maker-checker-inbox", tenantId, tab, filters],
		queryFn: () => fetchInbox(tenantId, tab, filters),
		enabled: Boolean(tenantId),
	});

	const actionMutation = useMutation({
		mutationFn: (params: { auditId: number; command: "approve" | "reject" }) =>
			approveOrRejectEntry(params.auditId, params.command),
		onSuccess: () => {
			setSubmitError(null);
			queryClient.invalidateQueries({
				queryKey: ["maker-checker-inbox", tenantId],
			});
			queryClient.invalidateQueries({ queryKey: ["maker-checker-impact"] });
			setSelectedEntry(null);
		},
		onError: (error, variables) => {
			setSubmitError(
				toSubmitActionError(error, {
					action:
						variables.command === "approve"
							? "approveMakerCheckerEntry"
							: "rejectMakerCheckerEntry",
					endpoint: "/api/maker-checker/inbox",
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const withdrawMutation = useMutation({
		mutationFn: (auditId: number) => withdrawEntry(auditId),
		onSuccess: () => {
			setSubmitError(null);
			queryClient.invalidateQueries({
				queryKey: ["maker-checker-inbox", tenantId],
			});
			queryClient.invalidateQueries({ queryKey: ["maker-checker-impact"] });
			setSelectedEntry(null);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteMakerCheckerEntry",
					endpoint: "/api/maker-checker/inbox",
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const isProcessing = actionMutation.isPending || withdrawMutation.isPending;
	const entries = inboxResponse?.items ?? [];
	const searchTemplate = inboxResponse?.searchTemplate;
	const summary = inboxResponse?.summary;
	const currentUser = inboxResponse?.currentUser;

	const columns: DataTableColumn<MakerCheckerEntry>[] = useMemo(() => {
		return [
			{
				header: "Date",
				cell: (entry) => (
					<span className="text-sm">{toLocalDate(entry.madeOnDate)}</span>
				),
			},
			{
				header: "Operation",
				cell: (entry) => (
					<div>
						<div className="font-medium">
							{entry.entityName || "Unknown Entity"}
						</div>
						<div className="text-sm text-muted-foreground">
							{entry.actionName || "Unknown Action"}
						</div>
					</div>
				),
			},
			{
				header: "Maker",
				cell: (entry) => (
					<span className="text-sm">
						{entry.makerName || (entry.makerId ? `User ${entry.makerId}` : "-")}
					</span>
				),
			},
			{
				header: "Resource",
				cell: (entry) => (
					<span className="font-mono text-xs text-muted-foreground">
						{entry.resourceId || "-"}
					</span>
				),
			},
			{
				header: "Status",
				cell: (entry) => (
					<Badge variant={getStatusVariant(entry.processingResult)}>
						{entry.processingResult}
					</Badge>
				),
			},
			{
				header: "Actions",
				cell: (entry) => {
					const isAwaiting =
						entry.processingResult.toLowerCase() === "awaiting.approval";
					return (
						<div className="flex items-center justify-end gap-2">
							{tab === "pending" ? (
								<>
									<Button
										size="sm"
										onClick={(event) => {
											event.stopPropagation();
											actionMutation.mutate({
												auditId: entry.auditId,
												command: "approve",
											});
										}}
										disabled={!isAwaiting || isProcessing}
									>
										Approve
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={(event) => {
											event.stopPropagation();
											actionMutation.mutate({
												auditId: entry.auditId,
												command: "reject",
											});
										}}
										disabled={!isAwaiting || isProcessing}
									>
										Reject
									</Button>
								</>
							) : (
								<Button
									size="sm"
									variant="outline"
									onClick={(event) => {
										event.stopPropagation();
										withdrawMutation.mutate(entry.auditId);
									}}
									disabled={!isAwaiting || isProcessing}
								>
									Withdraw
								</Button>
							)}
						</div>
					);
				},
				className: "text-right",
				headerClassName: "text-right",
			},
		];
	}, [actionMutation, isProcessing, tab, withdrawMutation]);

	const parsedCommand = parseCommandAsJson(selectedEntry?.commandAsJson);

	const clearFilters = () => {
		setFilters({
			actionName: "",
			entityName: "",
			processingResult: tab === "pending" ? "awaiting.approval" : "",
			makerDateTimeFrom: "",
			makerDateTimeTo: "",
			q: "",
		});
	};

	const updateTab = (value: string) => {
		const nextTab: InboxTab = value === "mine" ? "mine" : "pending";
		setTab(nextTab);
		setFilters((current) => ({
			...current,
			processingResult: nextTab === "pending" ? "awaiting.approval" : "",
		}));
	};

	return (
		<PageShell
			title="Maker Checker Inbox"
			subtitle="Review checker queue items and monitor your submitted maker requests."
			actions={
				<Button variant="outline" asChild>
					<Link href="/config/system/maker-checker">
						<ArrowLeft className="h-4 w-4" />
						Back to Maker Checker
					</Link>
				</Button>
			}
		>
			{isLoading ? (
				<InboxPageSkeleton />
			) : error ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to load maker-checker inbox</AlertTitle>
					<AlertDescription>
						Refresh and try again. If this persists, verify that your role has
						checker permissions.
					</AlertDescription>
				</Alert>
			) : (
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Total</p>
								<p className="text-2xl font-bold">{summary?.total ?? 0}</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Pending</p>
								<p className="text-2xl font-bold">{summary?.pending ?? 0}</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Approved</p>
								<p className="text-2xl font-bold">{summary?.approved ?? 0}</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Rejected</p>
								<p className="text-2xl font-bold">{summary?.rejected ?? 0}</p>
							</CardContent>
						</Card>
					</div>

					<SubmitErrorAlert
						error={submitError}
						title="Failed to process maker-checker action"
					/>

					<Card>
						<CardHeader>
							<CardTitle>Inbox Scope</CardTitle>
						</CardHeader>
						<CardContent>
							<Tabs value={tab} onValueChange={updateTab}>
								<TabsList>
									<TabsTrigger value="pending">Pending Approvals</TabsTrigger>
									<TabsTrigger value="mine">My Requests</TabsTrigger>
								</TabsList>
							</Tabs>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Filters</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2">
									<label
										htmlFor="maker-checker-search"
										className="text-sm font-medium"
									>
										Search
									</label>
									<Input
										id="maker-checker-search"
										value={filters.q}
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												q: event.target.value,
											}))
										}
										placeholder="Search by audit ID, operation, resource..."
									/>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="maker-checker-action"
										className="text-sm font-medium"
									>
										Action
									</label>
									<Select
										value={filters.actionName || ALL_FILTER_OPTION}
										onValueChange={(value) =>
											setFilters((current) => ({
												...current,
												actionName: value === ALL_FILTER_OPTION ? "" : value,
											}))
										}
									>
										<SelectTrigger id="maker-checker-action">
											<SelectValue placeholder="All Actions" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_FILTER_OPTION}>
												All Actions
											</SelectItem>
											{searchTemplate?.actionNames.map((action) => (
												<SelectItem key={action} value={action}>
													{action}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="maker-checker-entity"
										className="text-sm font-medium"
									>
										Entity
									</label>
									<Select
										value={filters.entityName || ALL_FILTER_OPTION}
										onValueChange={(value) =>
											setFilters((current) => ({
												...current,
												entityName: value === ALL_FILTER_OPTION ? "" : value,
											}))
										}
									>
										<SelectTrigger id="maker-checker-entity">
											<SelectValue placeholder="All Entities" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_FILTER_OPTION}>
												All Entities
											</SelectItem>
											{searchTemplate?.entityNames.map((entity) => (
												<SelectItem key={entity} value={entity}>
													{entity}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="maker-checker-status"
										className="text-sm font-medium"
									>
										Status
									</label>
									<Select
										value={filters.processingResult || ALL_FILTER_OPTION}
										onValueChange={(value) =>
											setFilters((current) => ({
												...current,
												processingResult:
													value === ALL_FILTER_OPTION ? "" : value,
											}))
										}
									>
										<SelectTrigger id="maker-checker-status">
											<SelectValue placeholder="All Statuses" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_FILTER_OPTION}>
												All Statuses
											</SelectItem>
											{STATUS_OPTIONS.map((status) => (
												<SelectItem key={status} value={status}>
													{status}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="maker-checker-from-date"
										className="text-sm font-medium"
									>
										Made From
									</label>
									<Input
										id="maker-checker-from-date"
										type="datetime-local"
										value={filters.makerDateTimeFrom}
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												makerDateTimeFrom: event.target.value,
											}))
										}
									/>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="maker-checker-to-date"
										className="text-sm font-medium"
									>
										Made To
									</label>
									<Input
										id="maker-checker-to-date"
										type="datetime-local"
										value={filters.makerDateTimeTo}
										onChange={(event) =>
											setFilters((current) => ({
												...current,
												makerDateTimeTo: event.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2">
								<Button variant="outline" onClick={clearFilters}>
									Clear Filters
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="space-y-1.5">
							<CardTitle>
								{tab === "pending"
									? "Pending Approval Queue"
									: "My Submitted Requests"}{" "}
								({entries.length})
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								{tab === "pending"
									? "Only entries your checker scope can act on are shown."
									: "Review the requests you submitted as maker and withdraw pending ones."}
							</p>
						</CardHeader>
						<CardContent>
							<DataTable
								data={entries}
								columns={columns}
								getRowId={(entry) => entry.auditId}
								pageSize={10}
								emptyMessage="No maker-checker items match the selected filters."
								onRowClick={(entry) => setSelectedEntry(entry)}
							/>
						</CardContent>
					</Card>
				</div>
			)}

			<Sheet
				open={Boolean(selectedEntry)}
				onOpenChange={(open) => {
					if (!open) setSelectedEntry(null);
				}}
			>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>
							{selectedEntry
								? `Audit Entry #${selectedEntry.auditId}`
								: "Audit Entry"}
						</SheetTitle>
						<SheetDescription>
							Review maker-checker payload and run approval actions.
						</SheetDescription>
					</SheetHeader>

					{selectedEntry && (
						<div className="mt-6 space-y-4">
							<div className="rounded-sm border border-border/60 p-4">
								<div className="space-y-2 text-sm">
									<p>
										<span className="font-semibold">Entity:</span>{" "}
										{selectedEntry.entityName || "-"}
									</p>
									<p>
										<span className="font-semibold">Action:</span>{" "}
										{selectedEntry.actionName || "-"}
									</p>
									<p>
										<span className="font-semibold">Resource:</span>{" "}
										{selectedEntry.resourceId || "-"}
									</p>
									<p>
										<span className="font-semibold">Maker:</span>{" "}
										{selectedEntry.makerName ||
											(selectedEntry.makerId
												? `User ${selectedEntry.makerId}`
												: "-")}
									</p>
									<p>
										<span className="font-semibold">Made On:</span>{" "}
										{toLocalDate(selectedEntry.madeOnDate)}
									</p>
									<div className="flex items-center gap-2">
										<span className="font-semibold">Status:</span>
										<Badge
											variant={getStatusVariant(selectedEntry.processingResult)}
										>
											{selectedEntry.processingResult}
										</Badge>
									</div>
								</div>
							</div>

							{parsedCommand && (
								<div className="space-y-2">
									<p className="text-sm font-semibold">Command Payload</p>
									<pre className="max-h-[20rem] overflow-auto rounded-sm border border-border/60 bg-muted/40 p-3 text-xs">
										{JSON.stringify(parsedCommand, null, 2)}
									</pre>
								</div>
							)}

							<div className="flex items-center justify-end gap-2 pt-2">
								{tab === "pending" ? (
									<>
										<Button
											onClick={() =>
												actionMutation.mutate({
													auditId: selectedEntry.auditId,
													command: "approve",
												})
											}
											disabled={
												selectedEntry.processingResult.toLowerCase() !==
													"awaiting.approval" || isProcessing
											}
										>
											Approve
										</Button>
										<Button
											variant="outline"
											onClick={() =>
												actionMutation.mutate({
													auditId: selectedEntry.auditId,
													command: "reject",
												})
											}
											disabled={
												selectedEntry.processingResult.toLowerCase() !==
													"awaiting.approval" || isProcessing
											}
										>
											Reject
										</Button>
									</>
								) : (
									<Button
										variant="outline"
										onClick={() =>
											withdrawMutation.mutate(selectedEntry.auditId)
										}
										disabled={
											selectedEntry.processingResult.toLowerCase() !==
												"awaiting.approval" || isProcessing
										}
									>
										Withdraw Request
									</Button>
								)}
							</div>

							{currentUser && (
								<p className="text-xs text-muted-foreground">
									Active user: {currentUser.username}
									{currentUser.isSuperChecker ? " (super checker)" : ""}
								</p>
							)}
						</div>
					)}
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
