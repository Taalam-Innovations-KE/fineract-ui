import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";

interface LoanTimelineProps {
	data: GetLoansLoanIdResponse;
}

export function LoanTimeline({ data }: LoanTimelineProps) {
	const formatDate = (dateStr?: string) => {
		if (!dateStr) return "—";
		const date = new Date(dateStr);
		return date.toLocaleDateString();
	};

	return (
		<TooltipProvider>
			<Card>
				<CardContent className="p-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Application Timeline */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Application Timeline
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Submitted On:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.submittedOnDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Submitted By:
									</span>
									<span className="text-sm font-medium">
										{data.timeline?.submittedByUsername || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Approved On:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.approvedOnDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Approved By:
									</span>
									<span className="text-sm font-medium">
										{data.timeline?.approvedByUsername || "—"}
									</span>
								</div>
							</div>
						</div>

						{/* Disbursement Timeline */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Disbursement Timeline
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Expected Disbursement:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.expectedDisbursementDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Actual Disbursement:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.actualDisbursementDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Disbursed By:
									</span>
									<span className="text-sm font-medium">
										{data.timeline?.disbursedByUsername || "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Closed On:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.closedOnDate)}
									</span>
								</div>
							</div>
						</div>

						{/* Repayment Timeline */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Repayment Timeline
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Expected Mature On:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.expectedMaturityDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Actual Mature On:
									</span>
									<span className="text-sm font-medium">
										{formatDate(data.timeline?.actualMaturityDate)}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Last Repayment On:
									</span>
									<span className="text-sm font-medium">
										{data.repaymentSchedule?.periods
											?.filter((p) => p.complete)
											?.sort(
												(a, b) =>
													new Date(b.dueDate || "").getTime() -
													new Date(a.dueDate || "").getTime(),
											)[0]?.dueDate
											? formatDate(
													data.repaymentSchedule.periods
														.filter((p) => p.complete)
														.sort(
															(a, b) =>
																new Date(b.dueDate || "").getTime() -
																new Date(a.dueDate || "").getTime(),
														)[0].dueDate,
												)
											: "—"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Next Repayment Due:
									</span>
									<span className="text-sm font-medium">
										{data.repaymentSchedule?.periods
											?.filter((p) => !p.complete)
											?.sort(
												(a, b) =>
													new Date(a.dueDate || "").getTime() -
													new Date(b.dueDate || "").getTime(),
											)[0]?.dueDate
											? formatDate(
													data.repaymentSchedule.periods
														.filter((p) => !p.complete)
														.sort(
															(a, b) =>
																new Date(a.dueDate || "").getTime() -
																new Date(b.dueDate || "").getTime(),
														)[0].dueDate,
												)
											: "—"}
									</span>
								</div>
							</div>
						</div>

						{/* Additional Timeline Info */}
						<div>
							<div className="text-xs uppercase text-muted-foreground mb-3">
								Additional Information
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Term Frequency:
									</span>
									<span className="text-sm font-medium">
										{data.termFrequency}{" "}
										{data.termPeriodFrequencyType?.description || "periods"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Repayment Frequency:
									</span>
									<span className="text-sm font-medium">
										Every {data.repaymentEvery}{" "}
										{data.repaymentFrequencyType?.description || "periods"}
									</span>
								</div>
								<div className="flex justify-between items-center py-2 border-b border-border/30">
									<span className="text-sm text-muted-foreground">
										Number of Repayments:
									</span>
									<span className="text-sm font-medium">
										{data.numberOfRepayments}
									</span>
								</div>
								<div className="flex justify-between items-center py-2">
									<span className="text-sm text-muted-foreground">
										Loan Type:
									</span>
									<span className="text-sm font-medium">
										{data.loanType?.description || data.loanType?.code || "—"}
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
