import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanFinancialDetailsProps {
	data: GetLoansLoanIdResponse;
	formatCurrency: (amount: number | undefined, symbol?: string) => string;
}

export function LoanFinancialDetails({
	data,
	formatCurrency,
}: LoanFinancialDetailsProps) {
	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Principal Information */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Principal Information
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Applied Principal:
									</span>
									<span className="text-sm font-medium">
										{formatCurrency(
											data.principal,
											data.currency?.displaySymbol,
										)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Approved Principal:
									</span>
									<span className="text-sm font-medium">
										{formatCurrency(
											data.approvedPrincipal,
											data.currency?.displaySymbol,
										)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Proposed Principal:
									</span>
									<span className="text-sm font-medium">
										{formatCurrency(
											data.proposedPrincipal,
											data.currency?.displaySymbol,
										)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Net Disbursal Amount:
									</span>
									<span className="text-sm font-medium">
										{formatCurrency(
											data.netDisbursalAmount,
											data.currency?.displaySymbol,
										)}
									</span>
								</div>
							</div>
						</div>

						{/* Interest Information */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Interest Configuration
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
										Interest Rate Frequency:
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="text-sm font-medium cursor-help">
												{data.interestRateFrequencyType?.description ||
													data.interestRateFrequencyType?.code ||
													"—"}
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<p>
												Code: {data.interestRateFrequencyType?.code || "N/A"}
											</p>
										</TooltipContent>
									</Tooltip>
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

						{/* Currency Information */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Currency Details
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Currency Code:
									</span>
									<span className="text-sm font-medium font-mono">
										{data.currency?.code || "—"}
									</span>
								</div>
								{data.summary && (
									<>
										<div className="flex justify-between items-center py-2 border-b border-border/30">
											<span className="text-sm text-muted-foreground">
												Total Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.totalRepayment,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
										<div className="flex justify-between items-center py-2 border-b border-border/30">
											<span className="text-sm text-muted-foreground">
												Principal Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.principalPaid,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
										<div className="flex justify-between items-center py-2">
											<span className="text-sm text-muted-foreground">
												Interest Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.interestPaid,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
									</>
								)}
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Decimal Places:
									</span>
									<span className="text-sm font-medium">
										{data.currency?.decimalPlaces || "—"}
									</span>
								</div>
							</div>
						</div>

						{/* Summary Information */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Loan Summary
							</div>
							<div className="space-y-3">
								{data.summary && (
									<>
										<div className="flex justify-between items-center py-2 border-b border-border/30">
											<span className="text-sm text-muted-foreground">
												Total Outstanding:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.totalOutstanding,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
										<div className="flex justify-between items-center py-2 border-b border-border/30">
											<span className="text-sm text-muted-foreground">
												Total Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.totalRepayment,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
										<div className="flex justify-between items-center py-2 border-b border-border/30">
											<span className="text-sm text-muted-foreground">
												Principal Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.principalPaid,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
										<div className="flex justify-between items-center py-2">
											<span className="text-sm text-muted-foreground">
												Interest Paid:
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(
													data.summary.interestPaid,
													data.currency?.displaySymbol,
												)}
											</span>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
