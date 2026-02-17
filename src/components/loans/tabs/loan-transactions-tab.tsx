"use client";

import { ChevronDown, ExternalLink, Info, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import type {
	GetLoansLoanIdResponse,
	GetLoansLoanIdTransactions,
} from "@/lib/fineract/generated/types.gen";
import {
	type DisbursementSummary,
	getDisbursementSummary,
	getTransactionTypeDisplay,
} from "@/lib/fineract/loan-disbursement-utils";
import { cn } from "@/lib/utils";

type TransactionFilter =
	| "all"
	| "repayment"
	| "disbursement"
	| "writeoff"
	| "waiver";
type TransactionView = "list" | "statement";
type StatementAmountDirection = "debit" | "credit";

const TRANSACTION_VIEW_OPTIONS = [
	{ value: "list", label: "List" },
	{ value: "statement", label: "Statement" },
] as const;

interface LoanTransactionsTabProps {
	transactions: GetLoansLoanIdTransactions[] | undefined;
	currency?: string;
	isLoading?: boolean;
	loan?: GetLoansLoanIdResponse;
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

function getTransactionTimestamp(
	transaction: GetLoansLoanIdTransactions,
): number {
	const dateInput = transaction.date ?? transaction.transactionDate;
	if (!dateInput) return 0;
	return new Date(dateInput).getTime();
}

function getStatementAmountDirection(
	transaction: GetLoansLoanIdTransactions,
): StatementAmountDirection {
	const code = transaction.type?.code?.toLowerCase() || "";

	if (
		code.includes("repayment") ||
		code.includes("charge") ||
		code.includes("accrual")
	) {
		return "debit";
	}

	if (
		code.includes("disbursement") ||
		code.includes("waiver") ||
		code.includes("waive") ||
		code.includes("writeoff") ||
		code.includes("write_off") ||
		code.includes("refund")
	) {
		return "credit";
	}

	// Unknown transactions default to debit for conservative statement treatment.
	return "debit";
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
	loan,
}: LoanTransactionsTabProps) {
	const [view, setView] = useState<TransactionView>("list");
	const [filter, setFilter] = useState<TransactionFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTransaction, setSelectedTransaction] =
		useState<GetLoansLoanIdTransactions | null>(null);

	// Calculate disbursement summary for context
	const disbursementSummary = getDisbursementSummary(loan, transactions);
	const hasNetOffContext = disbursementSummary?.hasNetOff ?? false;

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
	const statementTransactions = [...filteredTransactions].sort((a, b) => {
		const timestampDiff =
			getTransactionTimestamp(a) - getTransactionTimestamp(b);
		if (timestampDiff !== 0) return timestampDiff;
		return (a.id ?? 0) - (b.id ?? 0);
	});
	const showStatementBalance = statementTransactions.some(
		(tx) =>
			tx.outstandingLoanBalance !== undefined &&
			tx.outstandingLoanBalance !== null,
	);

	const filterOptions: { value: TransactionFilter; label: string }[] = [
		{ value: "all", label: "All Types" },
		{ value: "repayment", label: "Repayments" },
		{ value: "disbursement", label: "Disbursements" },
		{ value: "waiver", label: "Waivers" },
		{ value: "writeoff", label: "Write Offs" },
	];

	return (
		<div className="space-y-4">
			{/* Payout Breakdown Card - shown when there's net-off */}
			{hasNetOffContext && disbursementSummary && (
				<PayoutBreakdownCard
					summary={disbursementSummary}
					currency={currency}
				/>
			)}

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

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					Showing {filteredTransactions.length} of {transactions.length}{" "}
					transactions
				</p>
				<ViewModeToggle
					view={view}
					onViewChange={setView}
					options={TRANSACTION_VIEW_OPTIONS}
				/>
			</div>

			{view === "list" ? (
				<Card className="overflow-hidden">
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
									<TableCell colSpan={10} className="py-8 text-center">
										<p className="text-muted-foreground">
											No transactions match your search.
										</p>
									</TableCell>
								</TableRow>
							) : (
								filteredTransactions.map((tx) => {
									const typeDisplay = getTransactionTypeDisplay(
										tx.type,
										hasNetOffContext,
									);
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
												<Badge
													variant={typeDisplay.variant}
													className="text-xs"
												>
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
				</Card>
			) : (
				<Card className="overflow-hidden border border-border/60">
					{hasNetOffContext && (
						<div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
							Netted-off fee deductions are listed as debit statement entries.
						</div>
					)}
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead>Date</TableHead>
								<TableHead>Particulars</TableHead>
								<TableHead className="text-right">Debit</TableHead>
								<TableHead className="text-right">Credit</TableHead>
								{showStatementBalance && (
									<TableHead className="text-right">Balance</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{statementTransactions.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={showStatementBalance ? 5 : 4}
										className="py-8 text-center"
									>
										<p className="text-muted-foreground">
											No transactions match your search.
										</p>
									</TableCell>
								</TableRow>
							) : (
								statementTransactions.map((tx) => {
									const typeDisplay = getTransactionTypeDisplay(
										tx.type,
										hasNetOffContext,
									);
									const direction = getStatementAmountDirection(tx);
									const amount = Math.abs(tx.amount ?? 0);
									const isReversed = tx.manuallyReversed;
									const paymentRef =
										tx.paymentDetailData?.receiptNumber || tx.externalId;

									return (
										<TableRow
											key={tx.id}
											className={cn(
												"cursor-pointer hover:bg-muted/50",
												isReversed && "opacity-60 line-through",
											)}
											onClick={() => setSelectedTransaction(tx)}
										>
											<TableCell className="whitespace-nowrap">
												{formatDate(tx.date)}
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<div className="flex flex-wrap items-center gap-1.5">
														<span className="text-sm font-medium">
															{typeDisplay.label}
														</span>
														{typeDisplay.isNetOff && (
															<Badge
																variant="outline"
																className="text-[10px] text-orange-700"
															>
																Netted-off Fee
															</Badge>
														)}
														{isReversed && (
															<Badge
																variant="outline"
																className="text-[10px] text-red-600"
															>
																Reversed
															</Badge>
														)}
													</div>
													<p className="text-xs text-muted-foreground">
														{paymentRef ? `Ref: ${paymentRef}` : "—"}
													</p>
												</div>
											</TableCell>
											<TableCell
												className={cn(
													"text-right font-mono text-sm",
													direction === "debit" && "font-medium text-rose-700",
												)}
											>
												{direction === "debit"
													? `${currency} ${formatAmount(amount)}`
													: "—"}
											</TableCell>
											<TableCell
												className={cn(
													"text-right font-mono text-sm",
													direction === "credit" &&
														"font-medium text-emerald-700",
												)}
											>
												{direction === "credit"
													? `${currency} ${formatAmount(amount)}`
													: "—"}
											</TableCell>
											{showStatementBalance && (
												<TableCell className="text-right font-mono text-sm">
													{tx.outstandingLoanBalance !== undefined &&
													tx.outstandingLoanBalance !== null
														? `${currency} ${formatAmount(tx.outstandingLoanBalance)}`
														: "—"}
												</TableCell>
											)}
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</Card>
			)}

			{/* Transaction Detail Dialog */}
			<Dialog
				open={selectedTransaction !== null}
				onOpenChange={() => setSelectedTransaction(null)}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Transaction Details</DialogTitle>
						<DialogDescription>
							{
								getTransactionTypeDisplay(
									selectedTransaction?.type,
									hasNetOffContext,
								).label
							}{" "}
							on {formatDate(selectedTransaction?.date)}
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
										{
											getTransactionTypeDisplay(
												selectedTransaction.type,
												hasNetOffContext,
											).label
										}
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

interface PayoutBreakdownCardProps {
	summary: DisbursementSummary;
	currency: string;
}

function PayoutBreakdownCard({ summary, currency }: PayoutBreakdownCardProps) {
	return (
		<Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<CardTitle className="text-sm font-medium">
						Payout Breakdown
					</CardTitle>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-4 w-4 text-muted-foreground cursor-help" />
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="text-sm">
									Upfront fees were deducted from the disbursement. The customer
									received the net amount shown below.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<CardDescription className="text-xs">
					Disbursement with upfront fee deduction
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="flex flex-wrap items-center gap-4 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Gross Disbursed:</span>
						<span className="font-mono font-medium">
							{currency} {formatAmount(summary.grossDisbursed)}
						</span>
					</div>
					<span className="text-muted-foreground">−</span>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Fees Deducted:</span>
						<span className="font-mono font-medium text-orange-600">
							{currency} {formatAmount(summary.upfrontFeesDeducted)}
						</span>
					</div>
					<span className="text-muted-foreground">=</span>
					<div className="flex items-center gap-2 bg-green-100 px-2 py-1 rounded">
						<span className="text-green-800 font-medium">Net Paid Out:</span>
						<span className="font-mono font-bold text-green-800">
							{currency} {formatAmount(summary.netPaidToClient)}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
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
