import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoanProductsResponse } from "@/lib/fineract/generated/types.gen";

interface LoanProductScheduleProps {
	data: GetLoanProductsResponse;
	formatCurrency: (amount: number | undefined, symbol?: string) => string;
	enumMap: Record<string, string>;
}

export function LoanProductSchedule({
	data,
	formatCurrency,
	enumMap,
}: LoanProductScheduleProps) {
	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="grid gap-3 md:grid-cols-2">
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Number of Repayments
							</div>
							<div className="text-sm">{data.numberOfRepayments || "—"}</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Repayment Range
							</div>
							<div className="text-sm">
								{data.minNumberOfRepayments || "—"} -{" "}
								{data.maxNumberOfRepayments || "—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Repayment Every
							</div>
							<div className="text-sm">{data.repaymentEvery || "—"}</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Repayment Frequency Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.repaymentFrequencyType?.code || ""] ||
											data.repaymentFrequencyType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.repaymentFrequencyType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Repayment Start Date Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.repaymentStartDateType?.code || ""] ||
											data.repaymentStartDateType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.repaymentStartDateType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Number of Repayment Variations for Borrower Cycle
							</div>
							<div className="text-sm">
								{data.numberOfRepaymentVariationsForBorrowerCycle?.length
									? data.numberOfRepaymentVariationsForBorrowerCycle.join(", ")
									: "—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Principal Threshold for Last Installment
							</div>
							<div className="text-sm">
								{formatCurrency(
									data.principalThresholdForLastInstalment,
									data.currency?.displaySymbol,
								)}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Days in Month Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.daysInMonthType?.code || ""] ||
											data.daysInMonthType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.daysInMonthType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Days in Year Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.daysInYearType?.code || ""] ||
											data.daysInYearType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.daysInYearType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Days in Year Custom Strategy
							</div>
							<div className="text-sm">
								{data.daysInYearCustomStrategy?.description ||
									data.daysInYearCustomStrategy?.code ||
									"—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Fixed Length
							</div>
							<div className="text-sm">{data.fixedLength || "—"}</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Fixed Principal Percentage Per Installment
							</div>
							<div className="text-sm">
								{data.fixedPrincipalPercentagePerInstallment ?? "—"}%
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Include in Borrower Cycle
							</div>
							<div className="text-sm">
								{data.includeInBorrowerCycle ? "Yes" : "No"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Use Borrower Cycle
							</div>
							<div className="text-sm">
								{data.useBorrowerCycle ? "Yes" : "No"}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
