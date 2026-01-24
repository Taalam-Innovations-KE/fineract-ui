"use client";

import {
	AlertTriangle,
	Building2,
	Calendar,
	FileText,
	Percent,
	User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanOverviewTabProps {
	loan: GetLoansLoanIdResponse;
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

function formatCurrency(amount: number | undefined, currency = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	return `${currency} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function InfoRow({
	label,
	value,
	className,
}: {
	label: string;
	value: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex justify-between py-2 ${className || ""}`}>
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-right">{value}</span>
		</div>
	);
}

export function LoanOverviewTab({ loan, isLoading }: LoanOverviewTabProps) {
	if (isLoading) {
		return <LoanOverviewTabSkeleton />;
	}

	const timeline = loan.timeline;
	const summary = loan.summary;
	const currency = loan.currency?.displaySymbol || "KES";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{/* Loan Summary Card */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<FileText className="h-4 w-4" />
						Loan Summary
					</CardTitle>
				</CardHeader>
				<CardContent className="divide-y">
					<InfoRow label="Account No" value={loan.accountNo || "—"} />
					<InfoRow label="External ID" value={loan.externalId || "—"} />
					<InfoRow
						label="Client"
						value={
							<span className="flex items-center gap-1">
								<User className="h-3 w-3" />
								{loan.clientName || "—"}
							</span>
						}
					/>
					<InfoRow label="Product" value={loan.loanProductName || "—"} />
					<InfoRow
						label="Loan Officer"
						value={loan.loanOfficerName || "Not Assigned"}
					/>
					<InfoRow
						label="Branch"
						value={
							<span className="flex items-center gap-1">
								<Building2 className="h-3 w-3" />
								{loan.timeline?.submittedByFirstname || "—"}
							</span>
						}
					/>
				</CardContent>
			</Card>

			{/* Terms & Pricing Card */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Percent className="h-4 w-4" />
						Terms & Pricing
					</CardTitle>
				</CardHeader>
				<CardContent className="divide-y">
					<InfoRow
						label="Principal"
						value={formatCurrency(loan.principal, currency)}
					/>
					<InfoRow
						label="Approved Amount"
						value={formatCurrency(loan.approvedPrincipal, currency)}
					/>
					<InfoRow
						label="Term"
						value={`${loan.termFrequency || 0} ${
							loan.termPeriodFrequencyType?.description?.toLowerCase() ||
							"months"
						}`}
					/>
					<InfoRow
						label="Repayments"
						value={`${loan.numberOfRepayments || 0} installments`}
					/>
					<InfoRow
						label="Interest Rate"
						value={
							loan.interestRatePerPeriod !== undefined
								? `${loan.interestRatePerPeriod}% ${
										loan.interestRateFrequencyType?.description || "per annum"
									}`
								: "—"
						}
					/>
					<InfoRow
						label="Interest Type"
						value={loan.interestType?.description || "—"}
					/>
					<InfoRow
						label="Amortization"
						value={loan.amortizationType?.description || "—"}
					/>
				</CardContent>
			</Card>

			{/* Timeline Card */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Calendar className="h-4 w-4" />
						Timeline
					</CardTitle>
				</CardHeader>
				<CardContent className="divide-y">
					<InfoRow
						label="Submitted On"
						value={
							<span>
								{formatDate(timeline?.submittedOnDate)}
								{timeline?.submittedByUsername && (
									<span className="text-muted-foreground ml-1">
										by {timeline.submittedByUsername}
									</span>
								)}
							</span>
						}
					/>
					<InfoRow
						label="Approved On"
						value={
							<span>
								{formatDate(timeline?.approvedOnDate)}
								{timeline?.approvedByUsername && (
									<span className="text-muted-foreground ml-1">
										by {timeline.approvedByUsername}
									</span>
								)}
							</span>
						}
					/>
					<InfoRow
						label="Expected Disbursement"
						value={formatDate(timeline?.expectedDisbursementDate)}
					/>
					<InfoRow
						label="Actual Disbursement"
						value={formatDate(timeline?.actualDisbursementDate)}
					/>
					<InfoRow
						label="Expected Maturity"
						value={formatDate(timeline?.expectedMaturityDate)}
					/>
					{timeline?.closedOnDate && (
						<InfoRow
							label="Closed On"
							value={formatDate(timeline.closedOnDate)}
						/>
					)}
				</CardContent>
			</Card>

			{/* Flags / Status Card */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<AlertTriangle className="h-4 w-4" />
						Status Flags
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex flex-wrap gap-2">
						{summary?.inArrears && (
							<Badge variant="destructive" className="text-xs">
								In Arrears
							</Badge>
						)}
						{summary?.isNPA && (
							<Badge variant="destructive" className="text-xs">
								NPA
							</Badge>
						)}
						{loan.chargedOff && (
							<Badge variant="secondary" className="text-xs">
								Charged Off
							</Badge>
						)}
						{loan.delinquencyRange && (
							<Badge variant="destructive" className="text-xs">
								Delinquent: {loan.delinquencyRange.classification}
							</Badge>
						)}
						{!summary?.inArrears &&
							!summary?.isNPA &&
							!loan.chargedOff &&
							!loan.delinquencyRange && (
								<Badge variant="outline" className="text-xs">
									No Flags
								</Badge>
							)}
					</div>

					{summary?.overdueSinceDate && (
						<div className="pt-2 border-t">
							<InfoRow
								label="Overdue Since"
								value={
									<span className="text-red-600">
										{formatDate(summary.overdueSinceDate)}
									</span>
								}
							/>
						</div>
					)}

					{summary?.totalOverdue !== undefined && summary.totalOverdue > 0 && (
						<div className="pt-2 border-t">
							<InfoRow
								label="Total Overdue"
								value={
									<span className="text-red-600 font-medium">
										{formatCurrency(summary.totalOverdue, currency)}
									</span>
								}
							/>
						</div>
					)}

					{loan.delinquent && (
						<div className="pt-2 border-t space-y-1">
							<p className="text-xs text-muted-foreground">
								Delinquency Details
							</p>
							<div className="text-sm">
								<InfoRow
									label="Days Past Due"
									value={loan.delinquent.pastDueDays || 0}
								/>
								{loan.delinquent.delinquentAmount !== undefined && (
									<InfoRow
										label="Delinquent Amount"
										value={formatCurrency(
											loan.delinquent.delinquentAmount,
											currency,
										)}
									/>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export function LoanOverviewTabSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{[1, 2, 3, 4].map((i) => (
				<Card key={i}>
					<CardHeader className="pb-3">
						<Skeleton className="h-5 w-32" />
					</CardHeader>
					<CardContent className="space-y-3">
						{[1, 2, 3, 4, 5].map((j) => (
							<div key={j} className="flex justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-32" />
							</div>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
