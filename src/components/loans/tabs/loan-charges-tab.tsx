"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import type {
	GetLoansLoanIdLoanChargeData,
	GetLoansLoanIdResponse,
	GetLoansLoanIdTransactions,
} from "@/lib/fineract/generated/types.gen";
import { getFeeSettlementSummary } from "@/lib/fineract/loan-disbursement-utils";
import { cn } from "@/lib/utils";

interface LoanChargesTabProps {
	charges: GetLoansLoanIdLoanChargeData[] | undefined;
	currency?: string;
	isLoading?: boolean;
	feesOutstanding?: number;
	penaltiesOutstanding?: number;
	loan?: GetLoansLoanIdResponse;
	transactions?: GetLoansLoanIdTransactions[];
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

function getChargeStatusBadge(charge: GetLoansLoanIdLoanChargeData): {
	label: string;
	variant: "default" | "secondary" | "outline" | "destructive";
} {
	if (charge.paid) {
		return { label: "Paid", variant: "default" };
	}
	if (charge.waived) {
		return { label: "Waived", variant: "secondary" };
	}
	if ((charge.amountOutstanding || 0) > 0) {
		return { label: "Outstanding", variant: "destructive" };
	}
	return { label: "Pending", variant: "outline" };
}

export function LoanChargesTab({
	charges,
	currency = "KES",
	isLoading,
	feesOutstanding,
	penaltiesOutstanding,
	loan,
	transactions,
}: LoanChargesTabProps) {
	// Calculate fee settlement summary
	const feeSettlement = getFeeSettlementSummary(loan, transactions);

	if (isLoading) {
		return <LoanChargesTabSkeleton />;
	}

	if (!charges || charges.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">
						No charges applied to this loan.
					</p>
				</CardContent>
			</Card>
		);
	}

	const fees = charges.filter((c) => !c.penalty);
	const penalties = charges.filter((c) => c.penalty);

	return (
		<div className="space-y-4">
			{/* Fees Settlement at Disbursement Card */}
			{feeSettlement && feeSettlement.settledViaNetOff && (
				<Card className="border-l-4 border-l-green-500 bg-green-50/30">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-green-600" />
							<CardTitle className="text-base">
								Fees Settlement at Disbursement
							</CardTitle>
							<Badge
								variant="outline"
								className="text-xs bg-green-100 text-green-800 border-green-300"
							>
								Settled via Net-off
							</Badge>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="h-4 w-4 text-muted-foreground cursor-help" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p className="text-sm">
											These fees were automatically deducted from the
											disbursement amount. The customer received the net amount
											after fee deduction.
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<CardDescription>
							Upfront fees were deducted from the loan disbursement
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Fees Deducted at Disbursement
								</p>
								<p className="font-mono font-medium text-orange-600">
									{currency}{" "}
									{formatAmount(feeSettlement.feesDeductedAtDisbursement)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Total Fees Charged
								</p>
								<p className="font-mono font-medium">
									{currency} {formatAmount(feeSettlement.totalFeesCharged)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Total Paid
								</p>
								<p className="font-mono font-medium text-green-600">
									{currency} {formatAmount(feeSettlement.totalFeesPaid)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Outstanding
								</p>
								<p
									className={cn(
										"font-mono font-medium",
										feeSettlement.totalFeesOutstanding > 0
											? "text-red-600"
											: "text-green-600",
									)}
								>
									{currency} {formatAmount(feeSettlement.totalFeesOutstanding)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Card
					className={cn(
						"border-l-4",
						(feesOutstanding || 0) > 0
							? "border-l-orange-500 bg-orange-50/50"
							: "border-l-gray-300",
					)}
				>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Fees Outstanding
								</p>
								<p className="text-lg font-semibold font-mono">
									{currency} {formatAmount(feesOutstanding || 0)}
								</p>
							</div>
							<Badge variant="outline" className="text-xs">
								{fees.length} fee{fees.length !== 1 ? "s" : ""}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card
					className={cn(
						"border-l-4",
						(penaltiesOutstanding || 0) > 0
							? "border-l-red-500 bg-red-50/50"
							: "border-l-gray-300",
					)}
				>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Penalties Outstanding
								</p>
								<p
									className={cn(
										"text-lg font-semibold font-mono",
										(penaltiesOutstanding || 0) > 0 && "text-red-600",
									)}
								>
									{currency} {formatAmount(penaltiesOutstanding || 0)}
								</p>
							</div>
							<Badge variant="outline" className="text-xs">
								{penalties.length} penalt{penalties.length !== 1 ? "ies" : "y"}
							</Badge>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Charges Table */}
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Charge Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead>Due Date</TableHead>
							<TableHead className="text-right">Paid</TableHead>
							<TableHead className="text-right">Waived</TableHead>
							<TableHead className="text-right">Outstanding</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{charges.map((charge) => {
							const status = getChargeStatusBadge(charge);
							const hasOutstanding = (charge.amountOutstanding || 0) > 0;

							return (
								<TableRow
									key={charge.id}
									className={cn(hasOutstanding && "bg-yellow-50/30")}
								>
									<TableCell>
										<div className="flex items-center gap-2">
											{charge.penalty && (
												<AlertCircle className="h-4 w-4 text-red-500" />
											)}
											<span className="font-medium">{charge.name || "—"}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={charge.penalty ? "destructive" : "secondary"}
											className="text-xs"
										>
											{charge.penalty ? "Penalty" : "Fee"}
										</Badge>
									</TableCell>
									<TableCell className="text-right font-mono text-sm">
										{formatAmount(charge.amount)}
									</TableCell>
									<TableCell className="text-sm">
										{formatDate(charge.dueDate)}
									</TableCell>
									<TableCell className="text-right font-mono text-sm text-green-600">
										{formatAmount(charge.amountPaid)}
									</TableCell>
									<TableCell className="text-right font-mono text-sm text-blue-600">
										{formatAmount(charge.amountWaived)}
									</TableCell>
									<TableCell
										className={cn(
											"text-right font-mono text-sm font-medium",
											hasOutstanding && "text-red-600",
										)}
									>
										{formatAmount(charge.amountOutstanding)}
									</TableCell>
									<TableCell>
										<Badge variant={status.variant} className="text-xs">
											{status.label}
										</Badge>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export function LoanChargesTabSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{[1, 2].map((i) => (
					<Card key={i}>
						<CardContent className="p-4">
							<Skeleton className="h-4 w-28 mb-2" />
							<Skeleton className="h-7 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
								<TableHead key={i}>
									<Skeleton className="h-4 w-16" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3, 4].map((row) => (
							<TableRow key={row}>
								{[1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
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
