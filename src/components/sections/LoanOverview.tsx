import {
	Banknote,
	Calendar,
	CheckCircle,
	Clock,
	CreditCard,
	FileText,
	User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanOverviewProps {
	data: GetLoansLoanIdResponse;
}

function getStatusDisplay(status?: GetLoansLoanIdResponse["status"]) {
	if (!status) return { label: "Unknown", variant: "secondary" as const };

	let label = status.description || status.code || "Unknown";
	let variant: "default" | "secondary" | "success" | "warning" | "destructive" =
		"secondary";

	if (status.pendingApproval) {
		label = "Pending Approval";
		variant = "warning";
	} else if (status.active) {
		label = "Active";
		variant = "success";
	} else if (status.closed) {
		label = "Closed";
		variant = "secondary";
	}

	return { label, variant };
}

function formatDate(dateStr?: string) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	return date.toLocaleDateString();
}

function formatCurrency(amount: number | undefined, symbol?: string) {
	if (amount === undefined || amount === null) return "—";
	return `${symbol || "KES"} ${amount.toLocaleString()}`;
}

export function LoanOverview({ data }: LoanOverviewProps) {
	const statusInfo = getStatusDisplay(data.status);

	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					{/* Header Banner */}
					<div className="bg-gradient-to-r from-primary/15 via-primary/8 to-secondary/15 border border-border/50 rounded-lg p-4 mb-4 shadow-sm">
						<div className="flex items-start gap-4">
							<div className="p-3 bg-primary/10 rounded-full">
								<Banknote className="w-6 h-6 text-primary" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h1 className="text-xl font-bold text-foreground">
										{data.accountNo || "Loan Account"}
									</h1>
									<Badge
										variant={statusInfo.variant}
										className="text-sm px-3 py-1"
									>
										{statusInfo.label}
									</Badge>
								</div>
								<p className="text-muted-foreground mb-3">
									{data.loanProductName || "Loan Product"} •{" "}
									{data.clientName || "Client"}
								</p>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
									<div className="flex items-center gap-2">
										<User className="w-4 h-4 text-primary" />
										<span className="text-muted-foreground">Client:</span>
										<span className="font-medium">
											{data.clientName || "—"}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<CreditCard className="w-4 h-4 text-primary" />
										<span className="text-muted-foreground">Product:</span>
										<span className="font-medium">
											{data.loanProductName || "—"}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Banknote className="w-4 h-4 text-primary" />
										<span className="text-muted-foreground">Principal:</span>
										<span className="font-medium">
											{formatCurrency(
												data.principal,
												data.currency?.displaySymbol,
											)}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-primary" />
										<span className="text-muted-foreground">Submitted:</span>
										<span className="font-medium">
											{formatDate(data.timeline?.submittedOnDate)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Primary Details Grid */}
					<div className="grid gap-4 md:grid-cols-3 mb-4">
						<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
							<div className="flex items-center gap-2 mb-2">
								<Banknote className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Principal Amount
								</span>
							</div>
							<div className="text-lg font-semibold">
								{formatCurrency(data.principal, data.currency?.displaySymbol)}
							</div>
							<div className="text-sm text-muted-foreground">
								Approved:{" "}
								{formatCurrency(
									data.approvedPrincipal,
									data.currency?.displaySymbol,
								)}
							</div>
						</div>

						<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
							<div className="flex items-center gap-2 mb-2">
								<CheckCircle className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Repayment Terms
								</span>
							</div>
							<div className="text-lg font-semibold">
								{data.numberOfRepayments || "—"} repayments
							</div>
							<div className="text-sm text-muted-foreground">
								Every {data.repaymentEvery || "—"}{" "}
								{data.repaymentFrequencyType?.description || "periods"}
							</div>
						</div>

						<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
							<div className="flex items-center gap-2 mb-2">
								<Clock className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Interest Rate
								</span>
							</div>
							<div className="text-lg font-semibold">
								{data.interestRatePerPeriod ?? "—"}%
							</div>
							<div className="text-sm text-muted-foreground">
								{data.interestType?.description ||
									data.interestType?.code ||
									"Type"}{" "}
								• {data.interestRateFrequencyType?.description || "per period"}
							</div>
						</div>
					</div>

					{/* Secondary Details */}
					<div className="grid gap-3 md:grid-cols-2">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Calendar className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Important Dates
								</span>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Submitted:</span>
									<span>{formatDate(data.timeline?.submittedOnDate)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Approved:</span>
									<span>{formatDate(data.timeline?.approvedOnDate)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Expected Disbursement:
									</span>
									<span>
										{formatDate(data.timeline?.expectedDisbursementDate)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										Actual Disbursement:
									</span>
									<span>
										{formatDate(data.timeline?.actualDisbursementDate)}
									</span>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-2 mb-2">
								<FileText className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Loan Details
								</span>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">External ID:</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="font-mono cursor-help">
												{data.externalId || "—"}
											</span>
										</TooltipTrigger>
										{data.externalId && (
											<TooltipContent>
												<p>External reference ID</p>
											</TooltipContent>
										)}
									</Tooltip>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Loan Officer:</span>
									<span>{data.loanOfficerName || "—"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Purpose:</span>
									<span>{data.loanPurposeName || "—"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Currency:</span>
									<span>
										{data.currency?.code || "—"} (
										{data.currency?.displaySymbol || "—"})
									</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
