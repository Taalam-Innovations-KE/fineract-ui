"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BookOpen,
	Check,
	Eye,
	PenLine,
	Plus,
	Receipt,
	RotateCcw,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetGlAccountsResponse,
	GetJournalEntriesTransactionIdResponse,
	JournalEntryData,
	OfficeData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";
import { useTransactionStore } from "@/store/transactions";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

type JournalEntryListItem = JournalEntryData & {
	id?: number;
	transactionId?: string;
	transactionDate?: string;
	entryType?: { value?: string };
	officeName?: string;
	glAccountName?: string;
	amount?: number;
	manualEntry?: boolean;
	reversed?: boolean;
};

type JournalEntriesResponse = {
	pageItems?: JournalEntryListItem[];
	totalFilteredRecords?: number;
};

async function fetchJournalEntries(
	tenantId: string,
	filters: Record<string, string>,
): Promise<JournalEntriesResponse> {
	const params = new URLSearchParams();
	Object.entries(filters).forEach(([key, value]) => {
		if (value && value !== "all") params.append(key, value);
	});
	const response = await fetch(`${BFF_ROUTES.journalEntries}?${params}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch journal entries");
	}

	return response.json();
}

async function reverseJournalEntry(
	tenantId: string,
	transactionId: string,
): Promise<{ transactionId: string }> {
	const response = await fetch(
		`${BFF_ROUTES.journalEntries}/reverse/${transactionId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify({}),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message ||
				data.errors?.[0]?.defaultUserMessage ||
				"Failed to reverse journal entry",
		);
	}

	return data;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day}/${month}/${year}`;
}

export default function TransactionsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const { getStatus, setStatus } = useTransactionStore();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const [filters, setFilters] = useState({
		officeId: "",
		glAccountId: "",
		fromDate: "",
		toDate: "",
		status: "all", // all, pending, approved, rejected, active, reversed
	});

	const officesQuery = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.offices}`, {
				headers: { "x-tenant-id": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch offices");
			return (await response.json()) as OfficeData[];
		},
		staleTime: DEFAULT_STALE_TIME,
	});

	const glaccountsQuery = useQuery({
		queryKey: ["glaccounts", tenantId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.glaccounts}`, {
				headers: { "x-tenant-id": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch GL accounts");
			return (await response.json()) as GetGlAccountsResponse[];
		},
		staleTime: DEFAULT_STALE_TIME,
	});

	const journalEntriesQuery = useQuery({
		queryKey: ["journalEntries", tenantId, filters],
		queryFn: () => fetchJournalEntries(tenantId, filters),
		staleTime: DEFAULT_STALE_TIME,
	});

	const reverseMutation = useMutation({
		mutationFn: (transactionId: string) =>
			reverseJournalEntry(tenantId, transactionId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["journalEntries", tenantId, filters],
			});
			setToastMessage("Journal entry reversed successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const journalEntries = journalEntriesQuery.data?.pageItems || [];
	const totalRecords = journalEntriesQuery.data?.totalFilteredRecords || 0;

	// Client-side filter for status
	let filteredEntries = journalEntries;
	if (filters.status !== "all") {
		filteredEntries = journalEntries.filter((entry) => {
			const approvalStatus = getStatus(entry.transactionId || "");
			switch (filters.status) {
				case "pending":
					return !entry.reversed && approvalStatus === "pending";
				case "approved":
					return !entry.reversed && approvalStatus === "approved";
				case "rejected":
					return !entry.reversed && approvalStatus === "rejected";
				case "active":
					return !entry.reversed;
				case "reversed":
					return entry.reversed;
				default:
					return true;
			}
		});
	}

	const manualEntries = journalEntries.filter((entry) => entry.manualEntry);
	const systemEntries = journalEntries.filter((entry) => !entry.manualEntry);
	const reversedEntries = journalEntries.filter((entry) => entry.reversed);

	const journalEntryColumns = [
		{
			header: "Transaction",
			cell: (entry: JournalEntryListItem) => (
				<div>
					<div className="font-medium">{entry.transactionId || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{entry.manualEntry ? "Manual" : "System"}
					</div>
				</div>
			),
		},
		{
			header: "Date",
			cell: (entry: JournalEntryListItem) => (
				<span>{formatDate(entry.transactionDate || "")}</span>
			),
		},
		{
			header: "Office",
			cell: (entry: JournalEntryListItem) => (
				<span className={entry.officeName ? "" : "text-muted-foreground"}>
					{entry.officeName || "—"}
				</span>
			),
		},
		{
			header: "Amount",
			cell: (entry: JournalEntryListItem) => (
				<span className="font-mono">{formatCurrency(entry.amount)}</span>
			),
		},
		{
			header: "Status",
			cell: (entry: JournalEntryListItem) => {
				const approvalStatus = getStatus(entry.transactionId || "");
				if (entry.reversed) {
					return (
						<Badge variant="destructive" className="text-xs px-2 py-0.5">
							Reversed
						</Badge>
					);
				}
				if (approvalStatus === "approved") {
					return (
						<Badge variant="success" className="text-xs px-2 py-0.5">
							Approved
						</Badge>
					);
				}
				if (approvalStatus === "rejected") {
					return (
						<Badge variant="destructive" className="text-xs px-2 py-0.5">
							Rejected
						</Badge>
					);
				}
				return (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						Pending
					</Badge>
				);
			},
		},
		{
			header: "Actions",
			cell: (entry: JournalEntryListItem) => (
				<div className="flex items-center justify-end gap-2">
					<Button type="button" variant="outline" size="sm" asChild>
						<a href={`/config/operations/transactions/${entry.id}`}>
							<Eye className="mr-1 h-3 w-3" />
							View
						</a>
					</Button>
					{!entry.reversed && (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const transactionId = entry.transactionId;
									if (
										transactionId &&
										confirm(
											"Are you sure you want to approve this journal entry?",
										)
									) {
										setStatus(transactionId, "approved");
										setToastMessage("Journal entry approved");
									}
								}}
							>
								<Check className="mr-1 h-3 w-3" />
								Approve
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const transactionId = entry.transactionId;
									if (
										transactionId &&
										confirm(
											"Are you sure you want to reject this journal entry?",
										)
									) {
										setStatus(transactionId, "rejected");
										setToastMessage("Journal entry rejected");
									}
								}}
							>
								<X className="mr-1 h-3 w-3" />
								Reject
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									if (
										entry.transactionId &&
										confirm(
											"Are you sure you want to edit this journal entry? This will reverse the original and create a new one.",
										)
									) {
										window.location.href = `/config/operations/transactions/create?edit=true&transactionId=${entry.transactionId}`;
									}
								}}
							>
								<PenLine className="mr-1 h-3 w-3" />
								Edit
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									if (
										entry.transactionId &&
										confirm(
											"Are you sure you want to reverse this journal entry?",
										)
									) {
										reverseMutation.mutate(entry.transactionId);
									}
								}}
								disabled={reverseMutation.isPending}
							>
								<RotateCcw className="mr-1 h-3 w-3" />
								Reverse
							</Button>
						</>
					)}
				</div>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<>
			<PageShell
				title="Journal Entries"
				subtitle="View and manage journal entries and transactions"
				actions={
					<Button asChild>
						<a href="/config/operations/transactions/create">
							<Plus className="h-4 w-4 mr-2" />
							Create Journal Entry
						</a>
					</Button>
				}
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-4">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<BookOpen className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-2xl font-bold">{totalRecords}</div>
										<div className="text-sm text-muted-foreground">
											Total Entries
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-500/10">
										<PenLine className="h-5 w-5 text-blue-500" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{manualEntries.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Manual Entries
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gray-500/10">
										<Receipt className="h-5 w-5 text-gray-500" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{systemEntries.length}
										</div>
										<div className="text-sm text-muted-foreground">
											System Entries
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-red-500/10">
										<RotateCcw className="h-5 w-5 text-red-500" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{reversedEntries.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Reversed Entries
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Filters</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-6">
								<div>
									<Label htmlFor="office">Office</Label>
									<Select
										value={filters.officeId}
										onValueChange={(value) =>
											setFilters((prev) => ({ ...prev, officeId: value }))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="All offices" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All offices</SelectItem>
											{officesQuery.data?.map((office) => (
												<SelectItem
													key={office.id}
													value={office.id?.toString() || ""}
												>
													{office.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="glAccount">GL Account</Label>
									<Select
										value={filters.glAccountId}
										onValueChange={(value) =>
											setFilters((prev) => ({ ...prev, glAccountId: value }))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="All accounts" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All accounts</SelectItem>
											{glaccountsQuery.data?.map((account) => (
												<SelectItem
													key={account.id}
													value={account.id?.toString() || ""}
												>
													{account.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="fromDate">From Date</Label>
									<Input
										type="date"
										value={filters.fromDate}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												fromDate: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label htmlFor="toDate">To Date</Label>
									<Input
										type="date"
										value={filters.toDate}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												toDate: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label htmlFor="status">Status</Label>
									<Select
										value={filters.status}
										onValueChange={(value) =>
											setFilters((prev) => ({ ...prev, status: value }))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="pending">Pending</SelectItem>
											<SelectItem value="approved">Approved</SelectItem>
											<SelectItem value="rejected">Rejected</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="reversed">Reversed</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Journal Entries</CardTitle>
							<CardDescription>
								{filteredEntries.length} journal{" "}
								{filteredEntries.length !== 1 ? "entries" : "entry"} in the
								system
							</CardDescription>
						</CardHeader>
						<CardContent>
							{journalEntriesQuery.isLoading && (
								<div className="py-6 text-center text-muted-foreground">
									Loading journal entries...
								</div>
							)}
							{journalEntriesQuery.error && (
								<div className="py-6 text-center text-destructive">
									Failed to load journal entries. Please try again.
								</div>
							)}
							{!journalEntriesQuery.isLoading && !journalEntriesQuery.error && (
								<DataTable
									data={filteredEntries}
									columns={journalEntryColumns}
									getRowId={(entry) =>
										entry.id?.toString() || entry.transactionId || "entry-row"
									}
									emptyMessage="No journal entries found."
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 w-[280px]">
					<Alert variant="success">
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</>
	);
}
