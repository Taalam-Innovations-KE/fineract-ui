"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageShell } from "@/components/config/page-shell";
import { JournalEntryForm } from "@/components/journal-entry-form";
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
	GetJournalEntriesTransactionIdResponse,
	JournalEntryTransactionItem,
} from "@/lib/fineract/generated/types.gen";
import {
	type TransactionFilters,
	transactionFiltersSchema,
} from "@/lib/schemas/transactions";
import { useTenantStore } from "@/store/tenant";

type TransactionListItem = JournalEntryTransactionItem;
const TRANSACTIONS_PAGE_SIZE = 10;

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${Math.abs(amount).toLocaleString()}`;
}

function formatDate(dateStr: string | undefined) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function getEntryTypeColor(entryType: { value?: string } | undefined) {
	if (!entryType?.value) return "bg-gray-100 text-gray-800";
	const type = entryType.value.toLowerCase();
	if (type.includes("debit")) return "bg-blue-100 text-blue-800";
	if (type.includes("credit")) return "bg-green-100 text-green-800";
	return "bg-gray-100 text-gray-800";
}

async function fetchTransactions(
	tenantId: string,
	filters: TransactionFilters = {},
	pageIndex = 0,
	pageSize = TRANSACTIONS_PAGE_SIZE,
): Promise<GetJournalEntriesTransactionIdResponse> {
	const params = new URLSearchParams();

	// Add filters to query params
	Object.entries(filters).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			if (value instanceof Date) {
				params.set(key, value.toISOString().split("T")[0]);
			} else {
				params.set(key, String(value));
			}
		}
	});

	// Default sorting and pagination
	if (!params.has("orderBy")) params.set("orderBy", "transactionDate");
	if (!params.has("sortOrder")) params.set("sortOrder", "DESC");
	params.set("offset", String(pageIndex * pageSize));
	params.set("limit", String(pageSize));

	const queryString = params.toString();
	const url = queryString
		? `${BFF_ROUTES.journalEntries}?${queryString}`
		: BFF_ROUTES.journalEntries;

	const response = await fetch(url, {
		headers: { "fineract-platform-tenantid": tenantId },
	});

	if (!response.ok) {
		throw new Error("Failed to fetch transactions");
	}

	return response.json();
}

export default function TransactionsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [filters, setFilters] = useState<TransactionFilters>({});
	const [pageIndex, setPageIndex] = useState(0);
	const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

	const transactionsQuery = useQuery({
		queryKey: [
			"transactions",
			tenantId,
			filters,
			pageIndex,
			TRANSACTIONS_PAGE_SIZE,
		],
		queryFn: () =>
			fetchTransactions(tenantId, filters, pageIndex, TRANSACTIONS_PAGE_SIZE),
		enabled: Boolean(tenantId),
	});

	const { register, handleSubmit, reset } = useForm<TransactionFilters>();

	const transactions = transactionsQuery.data?.pageItems || [];
	const totalTransactions = transactionsQuery.data?.totalFilteredRecords || 0;

	const transactionColumns = [
		{
			header: "Transaction ID",
			cell: (transaction: TransactionListItem) => (
				<Link
					href={`/config/operations/transactions/${transaction.id}`}
					className="block hover:underline"
				>
					<div className="font-medium">{transaction.transactionId || "—"}</div>
					<div className="text-xs text-muted-foreground">{transaction.id}</div>
				</Link>
			),
		},
		{
			header: "Date",
			cell: (transaction: TransactionListItem) => (
				<span>{formatDate(transaction.transactionDate)}</span>
			),
		},
		{
			header: "GL Account",
			cell: (transaction: TransactionListItem) => (
				<div>
					<div className="font-medium">{transaction.glAccountName || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{transaction.glAccountCode}
					</div>
				</div>
			),
		},
		{
			header: "Amount",
			cell: (transaction: TransactionListItem) => (
				<div className="text-right">
					<div
						className={`font-mono font-medium ${
							transaction.entryType?.value?.toLowerCase().includes("credit")
								? "text-green-600"
								: "text-blue-600"
						}`}
					>
						{transaction.entryType?.value?.toLowerCase().includes("credit")
							? "+"
							: "-"}
						{formatCurrency(transaction.amount)}
					</div>
				</div>
			),
		},
		{
			header: "Type",
			cell: (transaction: TransactionListItem) => (
				<span
					className={`px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(transaction.entryType)}`}
				>
					{transaction.entryType?.value || "Unknown"}
				</span>
			),
		},
		{
			header: "Office",
			cell: (transaction: TransactionListItem) => (
				<span>{transaction.officeName || "—"}</span>
			),
		},
	];

	const onSubmit = (data: TransactionFilters) => {
		setFilters(data);
		setPageIndex(0);
	};

	const clearFilters = () => {
		reset();
		setFilters({});
		setPageIndex(0);
	};

	return (
		<PageShell
			title="Transactions"
			subtitle="View and search journal entries and transactions"
			actions={
				<Button
					onClick={() => setIsCreateDrawerOpen(true)}
					className="rounded-none"
				>
					Create Transaction
				</Button>
			}
		>
			<div className="space-y-6">
				{/* Filters */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="w-5 h-5" />
							Filters
						</CardTitle>
						<CardDescription>
							Filter transactions by various criteria
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="space-y-2">
									<Label htmlFor="transactionId">Transaction ID</Label>
									<Input
										id="transactionId"
										{...register("transactionId")}
										placeholder="Search by transaction ID"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="fromDate">From Date</Label>
									<Input id="fromDate" type="date" {...register("fromDate")} />
								</div>

								<div className="space-y-2">
									<Label htmlFor="toDate">To Date</Label>
									<Input id="toDate" type="date" {...register("toDate")} />
								</div>

								<div className="space-y-2">
									<Label htmlFor="entryType">Entry Type</Label>
									<Select
										onValueChange={(value) => {
											setFilters((prev) => ({
												...prev,
												entryType:
													value === "all" ? undefined : parseInt(value),
											}));
											setPageIndex(0);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="All types" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Types</SelectItem>
											<SelectItem value="1">Debit</SelectItem>
											<SelectItem value="2">Credit</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="submit"
									className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-none hover:bg-primary/90"
								>
									<Search className="w-4 h-4 mr-2" />
									Apply Filters
								</button>
								<button
									type="button"
									onClick={clearFilters}
									className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-none hover:bg-secondary/90"
								>
									Clear Filters
								</button>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* Transactions List */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Receipt className="w-5 h-5" />
							Transaction History
						</CardTitle>
						<CardDescription>
							{totalTransactions} transaction
							{totalTransactions !== 1 ? "s" : ""} found
						</CardDescription>
					</CardHeader>
					<CardContent>
						{transactionsQuery.isLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: TRANSACTIONS_PAGE_SIZE }).map(
									(_, index) => (
										<Skeleton
											key={`transactions-row-skeleton-${index}`}
											className="h-12 w-full"
										/>
									),
								)}
							</div>
						)}
						{transactionsQuery.error && (
							<div className="py-6 text-center text-destructive">
								Failed to load transactions. Please try again.
							</div>
						)}
						{!transactionsQuery.isLoading && !transactionsQuery.error && (
							<DataTable
								data={transactions}
								columns={transactionColumns}
								manualPagination={true}
								pageSize={TRANSACTIONS_PAGE_SIZE}
								pageIndex={pageIndex}
								totalRows={totalTransactions}
								onPageChange={setPageIndex}
								getRowId={(transaction) =>
									transaction.id?.toString() || "transaction-row"
								}
								emptyMessage="No transactions found. Try adjusting your filters."
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-4xl p-3 overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Create Journal Entry</SheetTitle>
						<SheetDescription>
							Add a new manual journal entry to the system.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-3">
						<JournalEntryForm
							onSuccess={() => {
								setIsCreateDrawerOpen(false);
								queryClient.invalidateQueries({
									queryKey: ["transactions", tenantId],
								});
							}}
							onCancel={() => setIsCreateDrawerOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
