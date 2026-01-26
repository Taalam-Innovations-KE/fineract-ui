"use client";

import { AlertCircle, Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	GetLoansLoanIdRepaymentPeriod,
	GetLoansLoanIdRepaymentSchedule,
} from "@/lib/fineract/generated/types.gen";
import { cn } from "@/lib/utils";

type FilterType = "all" | "due" | "overdue" | "paid";

interface LoanScheduleTabProps {
	schedule: GetLoansLoanIdRepaymentSchedule | undefined;
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

function isPeriodOverdue(period: GetLoansLoanIdRepaymentPeriod): boolean {
	if (!period.dueDate || period.complete) return false;
	const dueDate = Array.isArray(period.dueDate)
		? new Date(period.dueDate[0], period.dueDate[1] - 1, period.dueDate[2])
		: new Date(period.dueDate);
	return dueDate < new Date() && (period.totalOutstandingForPeriod || 0) > 0;
}

function isPeriodDue(period: GetLoansLoanIdRepaymentPeriod): boolean {
	return !period.complete && (period.totalOutstandingForPeriod || 0) > 0;
}

function isNextDue(
	period: GetLoansLoanIdRepaymentPeriod,
	periods: GetLoansLoanIdRepaymentPeriod[],
): boolean {
	if (period.complete || period.period === undefined || period.period === 0)
		return false;
	const unpaidPeriods = periods
		.filter((p) => !p.complete && p.period && p.period > 0)
		.sort((a, b) => (a.period || 0) - (b.period || 0));
	return unpaidPeriods.length > 0 && unpaidPeriods[0].period === period.period;
}

function getNextDuePeriod(
	periods: GetLoansLoanIdRepaymentPeriod[] | undefined,
): GetLoansLoanIdRepaymentPeriod | undefined {
	if (!periods) return undefined;
	const unpaidPeriods = periods
		.filter((p) => !p.complete && p.period && p.period > 0)
		.sort((a, b) => (a.period || 0) - (b.period || 0));
	return unpaidPeriods[0];
}

function getTotalOverdue(
	periods: GetLoansLoanIdRepaymentPeriod[] | undefined,
): number {
	if (!periods) return 0;
	return periods
		.filter((p) => isPeriodOverdue(p))
		.reduce((sum, p) => sum + (p.totalOutstandingForPeriod || 0), 0);
}

export function LoanScheduleTab({
	schedule,
	currency = "KES",
	isLoading,
}: LoanScheduleTabProps) {
	const [filter, setFilter] = useState<FilterType>("all");

	if (isLoading) {
		return <LoanScheduleTabSkeleton />;
	}

	if (!schedule?.periods) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">No schedule data available.</p>
				</CardContent>
			</Card>
		);
	}

	const periods = schedule.periods.filter((p) => p.period && p.period > 0);
	const nextDue = getNextDuePeriod(periods);
	const totalOverdue = getTotalOverdue(periods);

	const filteredPeriods = periods.filter((period) => {
		switch (filter) {
			case "paid":
				return period.complete;
			case "due":
				return isPeriodDue(period);
			case "overdue":
				return isPeriodOverdue(period);
			default:
				return true;
		}
	});

	const filterOptions: { value: FilterType; label: string }[] = [
		{ value: "all", label: "All Installments" },
		{ value: "due", label: "Due" },
		{ value: "overdue", label: "Overdue" },
		{ value: "paid", label: "Paid" },
	];

	return (
		<div className="space-y-4">
			{/* Mini Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<Card className="bg-blue-50/50 border-blue-200">
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Next Due Date
								</p>
								<p className="font-semibold">
									{nextDue ? formatDate(nextDue.dueDate) : "—"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-green-50/50 border-green-200">
					<CardContent className="p-4">
						<div>
							<p className="text-xs text-muted-foreground uppercase tracking-wide">
								Next Installment
							</p>
							<p className="font-semibold font-mono">
								{currency} {formatAmount(nextDue?.totalDueForPeriod)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card
					className={cn(
						"border-l-4",
						totalOverdue > 0
							? "bg-red-50/50 border-red-200 border-l-red-500"
							: "bg-gray-50/50",
					)}
				>
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							{totalOverdue > 0 && (
								<AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
							)}
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide">
									Total Overdue
								</p>
								<p
									className={cn(
										"font-semibold font-mono",
										totalOverdue > 0 && "text-red-600",
									)}
								>
									{currency} {formatAmount(totalOverdue)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filter */}
			<div className="flex justify-between items-center">
				<p className="text-sm text-muted-foreground">
					Showing {filteredPeriods.length} of {periods.length} installments
				</p>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
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

			{/* Schedule Table */}
			<Card className="overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="w-16">#</TableHead>
							<TableHead>Due Date</TableHead>
							<TableHead className="text-right">Principal</TableHead>
							<TableHead className="text-right">Interest</TableHead>
							<TableHead className="text-right">Fees</TableHead>
							<TableHead className="text-right">Penalty</TableHead>
							<TableHead className="text-right">Total Due</TableHead>
							<TableHead className="text-right">Paid</TableHead>
							<TableHead className="text-right">Outstanding</TableHead>
							<TableHead className="text-right">Balance</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredPeriods.length === 0 ? (
							<TableRow>
								<TableCell colSpan={10} className="text-center py-8">
									<p className="text-muted-foreground">
										No installments match the current filter.
									</p>
								</TableCell>
							</TableRow>
						) : (
							filteredPeriods.map((period) => {
								const isOverdue = isPeriodOverdue(period);
								const isNext = isNextDue(period, periods);

								return (
									<TableRow
										key={period.period}
										className={cn(
											isNext && "bg-blue-50/50 border-l-2 border-l-blue-500",
											isOverdue && !isNext && "bg-red-50/30",
										)}
									>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{period.period}
												{isNext && (
													<Badge
														variant="secondary"
														className="text-xs bg-blue-100 text-blue-700"
													>
														Next
													</Badge>
												)}
												{isOverdue && (
													<Badge variant="destructive" className="text-xs">
														Overdue
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>{formatDate(period.dueDate)}</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(period.principalDue)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(period.interestDue)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(period.feeChargesDue)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(period.penaltyChargesDue)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm font-medium">
											{formatAmount(period.totalDueForPeriod)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm text-green-600">
											{formatAmount(period.totalPaidForPeriod)}
										</TableCell>
										<TableCell
											className={cn(
												"text-right font-mono text-sm font-medium",
												(period.totalOutstandingForPeriod || 0) > 0 &&
													"text-red-600",
											)}
										>
											{formatAmount(period.totalOutstandingForPeriod)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											{formatAmount(period.principalLoanBalanceOutstanding)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export function LoanScheduleTabSkeleton() {
	return (
		<div className="space-y-4">
			{/* Mini Cards Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<CardContent className="p-4">
							<Skeleton className="h-4 w-20 mb-2" />
							<Skeleton className="h-6 w-28" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Table Skeleton */}
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
