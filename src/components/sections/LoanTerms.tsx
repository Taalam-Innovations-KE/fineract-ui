import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanTermsProps {
	data: GetLoansLoanIdResponse;
}

export function LoanTerms({ data }: LoanTermsProps) {
	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Repayment Terms */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Repayment Configuration
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Repayment Strategy:
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="text-sm font-medium cursor-help">
												{data.transactionProcessingStrategyCode || "—"}
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>Transaction processing strategy used for repayments</p>
										</TooltipContent>
									</Tooltip>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Amortization Type:
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="text-sm font-medium cursor-help">
												{data.amortizationType?.description ||
													data.amortizationType?.code ||
													"—"}
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>Code: {data.amortizationType?.code || "N/A"}</p>
										</TooltipContent>
									</Tooltip>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Interest Calculation Period:
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="text-sm font-medium cursor-help">
												{data.interestCalculationPeriodType?.description ||
													data.interestCalculationPeriodType?.code ||
													"—"}
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>
												Code:{" "}
												{data.interestCalculationPeriodType?.code || "N/A"}
											</p>
										</TooltipContent>
									</Tooltip>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Allow Partial Period Interest:
									</span>
									<span className="text-sm font-medium">
										{data.interestRecognitionOnDisbursementDate ? "Yes" : "No"}
									</span>
								</div>
							</div>
						</div>

						{/* Interest Terms */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Interest Terms
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Interest Rate:
									</span>
									<span className="text-sm font-medium">
										{data.interestRatePerPeriod ?? "—"}%
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Interest Type:
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="text-sm font-medium cursor-help">
												{data.interestType?.description ||
													data.interestType?.code ||
													"—"}
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>Code: {data.interestType?.code || "N/A"}</p>
										</TooltipContent>
									</Tooltip>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Is Floating Interest Rate:
									</span>
									<span className="text-sm font-medium">
										{data.isFloatingInterestRate ? "Yes" : "No"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Annual Interest Rate:
									</span>
									<span className="text-sm font-medium">
										{data.annualInterestRate
											? `${data.annualInterestRate.toFixed(2)}%`
											: "—"}
									</span>
								</div>
							</div>
						</div>

						{/* Schedule Terms */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Schedule Terms
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Number of Repayments:
									</span>
									<span className="text-sm font-medium">
										{data.numberOfRepayments || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Repayment Every:
									</span>
									<span className="text-sm font-medium">
										{data.repaymentEvery || "—"}{" "}
										{data.repaymentFrequencyType?.description || "periods"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Term Frequency:
									</span>
									<span className="text-sm font-medium">
										{data.termFrequency || "—"}{" "}
										{data.termPeriodFrequencyType?.description || "periods"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Fixed EMI Amount:
									</span>
									<span className="text-sm font-medium">
										{data.summary?.fixedEmiAmount
											? `${data.currency?.displaySymbol || ""}${data.summary.fixedEmiAmount}`
											: "—"}
									</span>
								</div>
							</div>
						</div>

						{/* Additional Terms */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Additional Terms
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Grace on Principal Payment:
									</span>
									<span className="text-sm font-medium">
										{data.graceOnPrincipalPayment || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Grace on Interest Payment:
									</span>
									<span className="text-sm font-medium">
										{data.graceOnInterestPayment || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Grace on Interest Charged:
									</span>
									<span className="text-sm font-medium">
										{data.graceOnInterestCharged || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										In Arrears Tolerance:
									</span>
									<span className="text-sm font-medium">
										{data.inArrearsTolerance
											? `${data.currency?.displaySymbol || ""}${data.inArrearsTolerance}`
											: "—"}
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
