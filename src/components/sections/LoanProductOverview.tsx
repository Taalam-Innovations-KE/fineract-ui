import {
	ArrowRightLeft,
	Banknote,
	Calendar,
	CheckCircle,
	Clock,
	Currency,
	FileText,
	Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoanProductsResponse } from "@/lib/fineract/generated/types.gen";

interface ExtendedGetLoanProductsResponse extends GetLoanProductsResponse {
	description?: string;
}

interface LoanProductOverviewProps {
	data: ExtendedGetLoanProductsResponse;
	enumMap: Record<string, string>;
}

export function LoanProductOverview({
	data,
	enumMap,
}: LoanProductOverviewProps) {
	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					{/* Banner Header */}
					<div className="bg-gradient-to-r from-primary/15 via-primary/8 to-secondary/15 border border-border/50 rounded-lg p-3 mb-3 shadow-sm">
						<div className="flex items-start gap-4">
							<div className="p-2 bg-primary/10 rounded-full">
								<Banknote className="w-6 h-6 text-primary" />
							</div>
							<div className="flex-1">
								<h1 className="text-xl font-bold text-foreground">
									{data.name}
								</h1>
								<p className="text-muted-foreground mt-1 leading-relaxed">
									{data.description || "No description provided"}
								</p>
								<div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
									<div className="flex items-center gap-1">
										<Calendar className="w-4 h-4" />
										<span>Start: {data.startDate || "Not set"}</span>
									</div>
									<div className="flex items-center gap-1">
										<CheckCircle className="w-4 h-4" />
										<span>Status: {data.status || "Unknown"}</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Primary Details */}
					<div className="grid gap-3 md:grid-cols-3 mb-4">
						<div className="bg-muted/30 p-2 rounded-lg border border-border/30">
							<div className="flex items-center gap-2 mb-2">
								<Currency className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Currency
								</span>
							</div>
							<div className="text-lg font-semibold">
								{data.currency?.name || "—"} ({data.currency?.code || "—"})
							</div>
							<div className="text-sm text-muted-foreground">
								Symbol: {data.currency?.displaySymbol || "—"}
							</div>
						</div>

						<div className="bg-muted/30 p-2 rounded-lg border border-border/30">
							<div className="flex items-center gap-2 mb-2">
								<Banknote className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Principal
								</span>
							</div>
							<div className="text-lg font-semibold">
								{data.principal
									? `${data.currency?.displaySymbol || ""}${data.principal.toLocaleString()}`
									: "—"}
							</div>
							<div className="text-sm text-muted-foreground">
								Min: {data.minPrincipal || "—"} | Max:{" "}
								{data.maxPrincipal || "—"}
							</div>
						</div>

						<div className="bg-muted/30 p-2 rounded-lg border border-border/30">
							<div className="flex items-center gap-1.5 mb-1">
								<Clock className="w-4 h-4 text-primary" />
								<span className="text-xs font-medium text-muted-foreground uppercase">
									Term
								</span>
							</div>
							<div className="text-sm font-semibold">
								{data.numberOfRepayments
									? `${data.numberOfRepayments} repayments`
									: "—"}
							</div>
							<div className="text-xs text-muted-foreground">
								Every {data.repaymentEvery || "—"}{" "}
								{enumMap[data.repaymentFrequencyType?.code || ""] ||
									data.repaymentFrequencyType?.code ||
									""}
							</div>
						</div>
					</div>

					{/* Secondary Details */}
					<div className="grid gap-3 md:grid-cols-2">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Percent className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Interest Rate
								</span>
							</div>
							<div className="text-sm">
								{data.interestRatePerPeriod
									? `${data.interestRatePerPeriod}% ${enumMap[data.interestRateFrequencyType?.code || ""] || data.interestRateFrequencyType?.code || ""}`
									: "—"}
							</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								Type:{" "}
								{enumMap[data.interestType?.code || ""] ||
									data.interestType?.code ||
									"—"}
							</div>
						</div>

						<div>
							<div className="flex items-center gap-2 mb-2">
								<ArrowRightLeft className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Repayment Schedule
								</span>
							</div>
							<div className="text-sm">
								Every {data.repaymentEvery || "—"}{" "}
								{enumMap[data.repaymentFrequencyType?.code || ""] ||
									data.repaymentFrequencyType?.code ||
									""}
							</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								Amortization:{" "}
								{enumMap[data.amortizationType?.code || ""] ||
									data.amortizationType?.code ||
									"—"}
							</div>
						</div>

						<div>
							<div className="flex items-center gap-2 mb-2">
								<FileText className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium text-muted-foreground uppercase">
									Additional Details
								</span>
							</div>
							<div className="text-sm">
								Short Name: {data.shortName || "Not set"}
							</div>
							<div className="text-sm mt-1">
								End Date: {data.endDate || "Not set"}
							</div>
						</div>

						<div>
							<div className="text-sm font-medium text-muted-foreground uppercase mb-2">
								Status
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="secondary" className="hover:bg-accent/80">
										{data.status || "—"}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Status Code: {data.status || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
