"use client";

import { ChevronDown, ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { GetLoansLoanIdTransactions } from "@/lib/fineract/generated/types.gen";
import { cn } from "@/lib/utils";

type TransactionFilter =
	| "all"
	| "repayment"
	| "disbursement"
	| "writeoff"
	| "waiver";

interface LoanTransactionsTabProps {
	transactions: GetLoansLoanIdTransactions[] | undefined;
	currency?: string;
	isLoading?: boolean;
}

function formatDate(dateInput: string | number[] | undefined): string {
	if (!dateInput) return "—";
	if (Array.isArray(dateInput)) {
		const [year, month, day] = dateInput;
		return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}
	return new Date(dateInput).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatAmount(amount: number | undefined): string {
	if (amount === undefined || amount === null) return "—";
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function getTransactionTypeDisplay(
	type: { code?: string; description?: string } | undefined,
): {
	label: string;
	variant: "default" | "secondary" | "outline" | "destructive";
} {
	if (!type?.code) return { label: "Unknown", variant: "outline" };

	const code = type.code.toLowerCase();

	if (code.includes("repayment")) {
		return { label: "Repayment", variant: "default" };
	}
	if (code.includes("disbursement")) {
		return { label: "Disbursement", variant: "secondary" };
	}
	if (code.includes("writeoff") || code.includes("write_off")) {
		return { label: "Write Off", variant: "destructive" };
	}
	if (code.includes("waiver") || code.includes("waive")) {
		return { label: "Waiver", variant: "outline" };
	}
	if (code.includes("charge")) {
		return { label: "Charge", variant: "secondary" };
	}
	if (code.includes("accrual")) {
		return { label: "Accrual", variant: "outline" };
	}

	return { label: type.description || type.code, variant: "outline" };
}

function matchesFilter(
	transaction: GetLoansLoanIdTransactions,
	filter: TransactionFilter,
): boolean {
	if (filter === "all") return true;
	const code = transaction.type?.code?.toLowerCase() || "";

	switch (filter) {
		case "repayment":
			return code.includes("repayment");
		case "disbursement":
			return code.includes("disbursement");
		case "writeoff":
			return code.includes("writeoff") || code.includes("write_off");
		case "waiver":
			return code.includes("waiver") || code.includes("waive");
		default:
			return true;
	}
}

export function LoanTransactionsTab({
	transactions,
	currency = "KES",
	isLoading,
}: LoanTransactionsTabProps) {
	const [filter, setFilter] = useState<TransactionFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTransaction, setSelectedTransaction] =
		useState<GetLoansLoanIdTransactions | null>(null);

	if (isLoading) {
		return <LoanTransactionsTabSkeleton />;
	}

	if (!transactions || transactions.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">No transactions recorded yet.</p>
				</CardContent>
			</Card>
		);
	}

	const filteredTransactions = transactions.filter((tx) => {
		if (!matchesFilter(tx, filter)) return false;
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			const matchesAmount = tx.amount?.toString().includes(query);
			const matchesRef =
				tx.externalId?.toLowerCase().includes(query) ||
				tx.paymentDetailData?.receiptNumber?.toLowerCase().includes(query);
			return matchesAmount || matchesRef;
		}
		return true;
	});

	const filterOptions: { value: TransactionFilter; label: string }[] = [
		{ value: "all", label: "All Types" },
		{ value: "repayment", label: "Repayments" },
		{ value: "disbursement", label: "Disbursements" },
		{ value: "waiver", label: "Waivers" },
		{ value: "writeoff", label: "Write Offs" },
	];

	return (
		<div className="space-y-4">
			{/* Search and Filter */}
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by receipt #, external ID, or amount..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
					/>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline">
							{filterOptions.find((f) => f.value === filter)?.label}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{filterOptions.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() => setFilter(option.value)}
							>
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Results Count */}
			<p className="text-sm text-muted-foreground">
				Showing {filteredTransactions.length} of {transactions.length}{" "}
				transactions
			</p>

			{/* Transactions Table */}
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Date</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead className="text-right">Principal</TableHead>
							<TableHead className="text-right">Interest</TableHead>
							<TableHead className="text-right">Fees</TableHead>
							<TableHead className="text-right">Penalties</TableHead>
							<TableHead>Payment Ref</TableHead>
							<TableHead className="text-right">Balance</TableHead>
							<TableHead className="w-10"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredTransactions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={10} className="text-center py-8">
									<p className="text-muted-foreground">
										No transactions match your search.
									</p>
								</TableCell>
							</TableRow>
						) : (
							filteredTransactions.map((tx) => {
								const typeDisplay = getTransactionTypeDisplay(tx.type);
								const isReversed = tx.manuallyReversed;

								return (
									<TableRow
										key={tx.id}
										className={cn(
											"cursor-pointer hover:bg-muted/50",
											isReversed && "opacity-60 line-through",
										)}
										onClick={() => setSelectedTransaction(tx)}
									>
										<TableCell>{formatDate(tx.date)}</TableCell>
										<TableCell>
											<Badge variant={typeDisplay.variant} className="text-xs">
												{typeDisplay.label}
											</Badge>
											{isReversed && (
												<Badge
													variant="outline"
													className="ml-1 text-xs text-red-600"
												>
													Reversed
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm font-medium">
											{formatAmount(tx.amount)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(tx.principalPortion)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(tx.interestPortion)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(tx.feeChargesPortion)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(tx.penaltyChargesPortion)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{tx.paymentDetailData?.receiptNumber ||
												tx.externalId ||
												"—"}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(tx.outstandingLoanBalance)}
										</TableCell>
										<TableCell>
											<ExternalLink className="h-4 w-4 text-muted-foreground" />
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			{/* Transaction Detail Dialog */}
			<Dialog
				open={selectedTransaction !== null}
				onOpenChange={() => setSelectedTransaction(null)}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Transaction Details</DialogTitle>
						<DialogDescription>
							{selectedTransaction?.type?.description} on{" "}
							{formatDate(selectedTransaction?.date)}
						</DialogDescription>
					</DialogHeader>
					{selectedTransaction && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">
										Transaction ID
									</p>
									<p className="font-medium">{selectedTransaction.id}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Date</p>
									<p className="font-medium">
										{formatDate(selectedTransaction.date)}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Type</p>
									<p className="font-medium">
										{selectedTransaction.type?.description}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Amount</p>
									<p className="font-medium font-mono">
										{currency} {formatAmount(selectedTransaction.amount)}
									</p>
								</div>
							</div>

							<div className="border-t pt-4">
								<p className="text-sm font-medium mb-2">Breakdown</p>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Principal:</span>
										<span className="font-mono">
											{formatAmount(selectedTransaction.principalPortion)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Interest:</span>
										<span className="font-mono">
											{formatAmount(selectedTransaction.interestPortion)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Fees:</span>
										<span className="font-mono">
											{formatAmount(selectedTransaction.feeChargesPortion)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Penalties:</span>
										<span className="font-mono">
											{formatAmount(selectedTransaction.penaltyChargesPortion)}
										</span>
									</div>
								</div>
							</div>

							{selectedTransaction.paymentDetailData && (
								<div className="border-t pt-4">
									<p className="text-sm font-medium mb-2">Payment Details</p>
									<div className="grid grid-cols-2 gap-2 text-sm">
										{selectedTransaction.paymentDetailData.paymentType && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">
													Payment Type:
												</span>
												<span>
													{
														selectedTransaction.paymentDetailData.paymentType
															.name
													}
												</span>
											</div>
										)}
										{selectedTransaction.paymentDetailData.receiptNumber && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">
													Receipt #:
												</span>
												<span>
													{selectedTransaction.paymentDetailData.receiptNumber}
												</span>
											</div>
										)}
										{selectedTransaction.paymentDetailData.bankNumber && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">Bank:</span>
												<span>
													{selectedTransaction.paymentDetailData.bankNumber}
												</span>
											</div>
										)}
									</div>
								</div>
							)}

							{selectedTransaction.manuallyReversed && (
								<div className="border-t pt-4">
									<Badge variant="destructive">
										This transaction has been reversed
									</Badge>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function LoanTransactionsTabSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex gap-3">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 w-32" />
			</div>
			<Skeleton className="h-4 w-48" />
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
								<TableHead key={i}>
									<Skeleton className="h-4 w-16" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
							<TableRow key={row}>
								{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cell) => (
									<TableCell key={cell}>
										<Skeleton className="h-4 w-16" />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
