"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter, Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageShell } from "@/components/config/page-shell";
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
	GetJournalEntriesTransactionIdResponse,
	JournalEntryTransactionItem,
} from "@/lib/fineract/generated/types.gen";
import {
	type TransactionFilters,
	transactionFiltersSchema,
} from "@/lib/schemas/transactions";
import { useTenantStore } from "@/store/tenant";

type TransactionListItem = JournalEntryTransactionItem;

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
	if (!params.has("limit")) params.set("limit", "50");

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
	const [filters, setFilters] = useState<TransactionFilters>({});

	const transactionsQuery = useQuery({
		queryKey: ["transactions", tenantId, filters],
		queryFn: () => fetchTransactions(tenantId, filters),
	});

	const { register, handleSubmit, reset } = useForm<TransactionFilters>();

	const transactions = transactionsQuery.data?.pageItems || [];

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
	};

	const clearFilters = () => {
		reset();
		setFilters({});
	};

	return (
		<PageShell
			title="Transactions"
			subtitle="View and search journal entries and transactions"
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
										onValueChange={(value) =>
											setFilters((prev) => ({
												...prev,
												entryType:
													value === "all" ? undefined : parseInt(value),
											}))
										}
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
									className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
								>
									<Search className="w-4 h-4 mr-2" />
									Apply Filters
								</button>
								<button
									type="button"
									onClick={clearFilters}
									className="inline-flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
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
							{transactions.length} transaction
							{transactions.length !== 1 ? "s" : ""} found
						</CardDescription>
					</CardHeader>
					<CardContent>
						{transactionsQuery.isLoading && (
							<div className="py-6 text-center text-muted-foreground">
								Loading transactions...
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
								getRowId={(transaction) =>
									transaction.id?.toString() || "transaction-row"
								}
								emptyMessage="No transactions found. Try adjusting your filters."
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
