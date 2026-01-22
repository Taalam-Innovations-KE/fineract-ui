import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoanProductsResponse } from "@/lib/fineract/generated/types.gen";

interface LoanProductFinancialTermsProps {
	data: GetLoanProductsResponse;
	formatCurrency: (amount: number | undefined, symbol?: string) => string;
	enumMap: Record<string, string>;
}

export function LoanProductFinancialTerms({
	data,
	formatCurrency,
	enumMap,
}: LoanProductFinancialTermsProps) {
	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="grid gap-3 md:grid-cols-2">
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Default Principal
							</div>
							<div className="text-sm">
								{formatCurrency(data.principal, data.currency?.displaySymbol)}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Principal Range
							</div>
							<div className="text-sm">
								{formatCurrency(
									data.minPrincipal,
									data.currency?.displaySymbol,
								)}{" "}
								-{" "}
								{formatCurrency(
									data.maxPrincipal,
									data.currency?.displaySymbol,
								)}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Principal Variations for Borrower Cycle
							</div>
							<div className="text-sm">
								{data.principalVariationsForBorrowerCycle?.length
									? data.principalVariationsForBorrowerCycle.join(", ")
									: "—"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Rate Per Period
							</div>
							<div className="text-sm">
								{data.interestRatePerPeriod ?? "—"}%
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Rate Frequency Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.interestRateFrequencyType?.code || ""] ||
											data.interestRateFrequencyType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.interestRateFrequencyType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Annual Interest Rate
							</div>
							<div className="text-sm">{data.annualInterestRate ?? "—"}%</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.interestType?.code || ""] ||
											data.interestType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.interestType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Amortization Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.amortizationType?.code || ""] ||
											data.amortizationType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Code: {data.amortizationType?.code || "N/A"}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Calculation Period Type
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-sm cursor-help">
										{enumMap[data.interestCalculationPeriodType?.code || ""] ||
											data.interestCalculationPeriodType?.code ||
											"—"}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Code: {data.interestCalculationPeriodType?.code || "N/A"}
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Recalculation Enabled
							</div>
							<div className="text-sm">
								{data.isInterestRecalculationEnabled ? "Yes" : "No"}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase text-muted-foreground">
								Interest Recognition on Disbursement Date
							</div>
							<div className="text-sm">
								{data.interestRecognitionOnDisbursementDate ? "Yes" : "No"}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
