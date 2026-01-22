import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanChargesProps {
	data: GetLoansLoanIdResponse;
	formatCurrency: (amount: number | undefined, symbol?: string) => string;
}

export function LoanCharges({ data, formatCurrency }: LoanChargesProps) {
	const charges = data.charges || [];

	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="space-y-6">
						{/* Charges Summary */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Charges Summary
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
									<div className="text-sm text-muted-foreground">
										Total Charges Outstanding
									</div>
									<div className="text-lg font-semibold">
										{formatCurrency(
											data.summary?.totalChargeAdjustment,
											data.currency?.displaySymbol,
										)}
									</div>
								</div>
								<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
									<div className="text-sm text-muted-foreground">
										Total Charges Paid
									</div>
									<div className="text-lg font-semibold">
										{formatCurrency(
											data.summary?.feeChargesPaid,
											data.currency?.displaySymbol,
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Individual Charges */}
						{charges.length > 0 && (
							<div>
								<div className="text-xs uppercase text-muted-foreground mb-3">
									Individual Charges ({charges.length})
								</div>
								<div className="space-y-3">
									{charges.map((charge, index) => (
										<div
											key={charge.id || index}
											className="bg-muted/30 p-3 rounded-lg border border-border/30"
										>
											<div className="grid gap-2 md:grid-cols-2">
												<div>
													<div className="text-sm font-medium">
														{charge.name || "Unnamed Charge"}
													</div>
													<div className="text-xs text-muted-foreground">
														{charge.chargeCalculationType?.value ||
															charge.chargeCalculationType?.code ||
															"—"}
													</div>
												</div>
												<div className="space-y-1">
													<div className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															Amount:
														</span>
														<span className="font-medium">
															{formatCurrency(
																charge.amount,
																data.currency?.displaySymbol,
															)}
														</span>
													</div>
													<div className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															Outstanding:
														</span>
														<span className="font-medium">
															{formatCurrency(
																charge.amountOutstanding,
																data.currency?.displaySymbol,
															)}
														</span>
													</div>
													<div className="flex justify-between text-sm">
														<span className="text-muted-foreground">Paid:</span>
														<span className="font-medium">
															{formatCurrency(
																charge.amountPaid,
																data.currency?.displaySymbol,
															)}
														</span>
													</div>
												</div>
											</div>
											{charge.dueDate && (
												<div className="mt-2 pt-2 border-t border-border/30">
													<div className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															Due Date:
														</span>
														<span>
															{new Date(charge.dueDate).toLocaleDateString()}
														</span>
													</div>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Charge Details from Summary */}
						{data.summary && (
							<div>
								<div className="text-xs uppercase text-muted-foreground mb-3">
									Charge Breakdown
								</div>
								<div className="grid gap-3 md:grid-cols-3">
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Fee Charges Charged
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.feeChargesCharged,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Fee Charges Outstanding
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.feeChargesOutstanding,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Fee Charges Waived
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.feeChargesWaived,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Penalty Charges Charged
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.penaltyChargesCharged,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Penalty Charges Outstanding
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.penaltyChargesOutstanding,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
									<div className="bg-muted/30 p-3 rounded-lg border border-border/30">
										<div className="text-sm text-muted-foreground">
											Penalty Charges Paid
										</div>
										<div className="text-lg font-semibold">
											{formatCurrency(
												data.summary.penaltyChargesPaid,
												data.currency?.displaySymbol,
											)}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* No Charges Message */}
						{charges.length === 0 && (
							<div className="text-center py-6 text-muted-foreground">
								No charges associated with this loan.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
