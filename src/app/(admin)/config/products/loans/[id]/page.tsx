"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetLoanProductsProductIdResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchLoanProduct(
	tenantId: string,
	id: string,
): Promise<GetLoanProductsProductIdResponse> {
	const response = await fetch(`${BFF_ROUTES.loanProducts}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan product");
	}

	return response.json();
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatPercentage(value: number | undefined) {
	if (value === undefined || value === null) return "—";
	return `${value}%`;
}

function formatEnum(
	value: { description?: string; value?: string } | undefined,
) {
	if (!value) return "—";
	return value.description || value.value || "—";
}

function formatBoolean(value: boolean | undefined) {
	if (value === undefined) return "—";
	return value ? "Yes" : "No";
}

export default function LoanProductDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();

	const {
		data: product,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["loanProduct", tenantId, id],
		queryFn: () => fetchLoanProduct(tenantId, id),
	});

	if (isLoading) {
		return (
			<PageShell title="Loan Product Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading loan product details...
				</div>
			</PageShell>
		);
	}

	if (error || !product) {
		return (
			<PageShell title="Loan Product Details">
				<div className="py-6 text-center text-destructive">
					Failed to load loan product details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Loan Product: ${product.name}`}
			subtitle="Complete setup configuration"
		>
			<div className="space-y-6">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Product ID</label>
								<p className="font-mono">{product.id}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Name</label>
								<p className="text-lg font-semibold">{product.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Short Name</label>
								<p>{product.shortName}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Description</label>
								<p>{product.description || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Status</label>
								<p>{product.status || "—"}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Currency & Principal Amounts */}
				<Card>
					<CardHeader>
						<CardTitle>Currency & Principal Amounts</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Currency</label>
								<p>
									{product.currency?.displaySymbol} ({product.currency?.code})
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Principal Amount Range
								</label>
								<p className="font-mono">
									{formatCurrency(
										product.minPrincipal,
										product.currency?.displaySymbol,
									)}{" "}
									-{" "}
									{formatCurrency(
										product.maxPrincipal,
										product.currency?.displaySymbol,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">Default Principal</label>
								<p className="font-mono">
									{formatCurrency(
										product.principal,
										product.currency?.displaySymbol,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Principal Threshold for Last Installment
								</label>
								<p className="font-mono">
									{formatCurrency(
										product.principalThresholdForLastInstalment,
										product.currency?.displaySymbol,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Outstanding Loan Balance
								</label>
								<p className="font-mono">
									{formatCurrency(
										product.outstandingLoanBalance,
										product.currency?.displaySymbol,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Down Payment Percentage
								</label>
								<p>
									{formatPercentage(
										product.disbursedAmountPercentageForDownPayment,
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Repayment Terms */}
				<Card>
					<CardHeader>
						<CardTitle>Repayment Terms</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									Number of Repayments
								</label>
								<p>
									{product.minNumberOfRepayments || "—"} -{" "}
									{product.maxNumberOfRepayments || "—"} (default:{" "}
									{product.numberOfRepayments || "—"})
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Repayment Frequency
								</label>
								<p>
									Every {product.repaymentEvery}{" "}
									{formatEnum(product.repaymentFrequencyType)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Repayment Start Date Type
								</label>
								<p>{formatEnum(product.repaymentStartDateType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Amortization Type</label>
								<p>{formatEnum(product.amortizationType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Interest Type</label>
								<p>{formatEnum(product.interestType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Transaction Processing Strategy
								</label>
								<p>
									{product.transactionProcessingStrategyName ||
										product.transactionProcessingStrategyCode}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Loan Schedule Type
								</label>
								<p>{formatEnum(product.loanScheduleType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Loan Schedule Processing Type
								</label>
								<p>{formatEnum(product.loanScheduleProcessingType)}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Interest Configuration */}
				<Card>
					<CardHeader>
						<CardTitle>Interest Configuration</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									Interest Rate Per Period
								</label>
								<p>
									{formatPercentage(product.minInterestRatePerPeriod)} -{" "}
									{formatPercentage(product.maxInterestRatePerPeriod)} (default:{" "}
									{formatPercentage(product.interestRatePerPeriod)})
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Interest Rate Frequency Type
								</label>
								<p>{formatEnum(product.interestRateFrequencyType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Interest Calculation Period Type
								</label>
								<p>{formatEnum(product.interestCalculationPeriodType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Annual Interest Rate
								</label>
								<p>{formatPercentage(product.annualInterestRate)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Interest Recognition on Disbursement Date
								</label>
								<p>
									{formatBoolean(product.interestRecognitionOnDisbursementDate)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Interest Recalculation Enabled
								</label>
								<p>{formatBoolean(product.isInterestRecalculationEnabled)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Floating Interest Rate Calculation
								</label>
								<p>
									{formatBoolean(
										product.isFloatingInterestRateCalculationAllowed,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Linked to Floating Interest Rates
								</label>
								<p>{formatBoolean(product.isLinkedToFloatingInterestRates)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Rates Enabled</label>
								<p>{formatBoolean(product.isRatesEnabled)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Use Borrower Cycle
								</label>
								<p>{formatBoolean(product.useBorrowerCycle)}</p>
							</div>
						</div>
						{product.interestRecalculationData && (
							<div className="mt-4 p-4 bg-muted rounded-lg">
								<h4 className="font-medium mb-2">
									Interest Recalculation Details
								</h4>
								<div className="grid gap-2 text-sm">
									{/* Add interest recalculation fields if needed */}
									<p>Interest recalculation data available</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Time & Date Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Time & Date Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									Days in Month Type
								</label>
								<p>{formatEnum(product.daysInMonthType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Days in Year Type</label>
								<p>{formatEnum(product.daysInYearType)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Days in Year Custom Strategy
								</label>
								<p>{formatEnum(product.daysInYearCustomStrategy)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Fixed Length</label>
								<p>{product.fixedLength || "—"}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Fees & Penalties */}
				<Card>
					<CardHeader>
						<CardTitle>Fees & Penalties</CardTitle>
					</CardHeader>
					<CardContent>
						{product.charges && product.charges.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full border-collapse border border-border">
									<thead>
										<tr className="bg-muted">
											<th className="border border-border p-2 text-left">
												Charge ID
											</th>
											<th className="border border-border p-2 text-left">
												Amount
											</th>
										</tr>
									</thead>
									<tbody>
										{product.charges.map((charge, index) => (
											<tr key={index} className="hover:bg-muted/50">
												<td className="border border-border p-2">
													{charge.id || "—"}
												</td>
												<td className="border border-border p-2 font-mono">
													{formatCurrency(
														charge.amount,
														product.currency?.displaySymbol,
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-muted-foreground">
								No fees or penalties configured
							</p>
						)}
					</CardContent>
				</Card>

				{/* Accounting Setup */}
				<Card>
					<CardHeader>
						<CardTitle>Accounting Setup</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Accounting Rule</label>
								<p>{product.accountingRule?.description}</p>
							</div>
						</div>
						{product.accountingMappings && (
							<div className="mt-4">
								<h4 className="font-medium mb-2">Accounting Mappings</h4>
								<div className="text-sm text-muted-foreground">
									Detailed GL account mappings available
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Advanced Loan Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Advanced Loan Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									Allow Approved Disbursed Amounts Over Applied
								</label>
								<p>
									{formatBoolean(
										product.allowApprovedDisbursedAmountsOverApplied,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Allow Partial Period Interest Calculation
								</label>
								<p>
									{formatBoolean(product.allowPartialPeriodInterestCalculation)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Allow Variable Installments
								</label>
								<p>{formatBoolean(product.allowVariableInstallments)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Can Define Installment Amount
								</label>
								<p>{formatBoolean(product.canDefineInstallmentAmount)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Can Use for Topup</label>
								<p>{formatBoolean(product.canUseForTopup)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Multi Disburse Loan
								</label>
								<p>{formatBoolean(product.multiDisburseLoan)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Max Tranche Count</label>
								<p>{product.maxTrancheCount || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">Gap Settings</label>
								<p>
									Min: {product.minimumGap || "—"}, Max:{" "}
									{product.maximumGap || "—"}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Allow Full Term for Tranche
								</label>
								<p>{formatBoolean(product.allowFullTermForTranche)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Disallow Expected Disbursements
								</label>
								<p>{formatBoolean(product.disallowExpectedDisbursements)}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Enable Accrual Activity Posting
								</label>
								<p>{formatBoolean(product.enableAccrualActivityPosting)}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Tolerance & Delinquency */}
				<Card>
					<CardHeader>
						<CardTitle>Tolerance & Delinquency</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									In Arrears Tolerance
								</label>
								<p className="font-mono">
									{formatCurrency(
										product.inArrearsTolerance,
										product.currency?.displaySymbol,
									)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Enable Installment Level Delinquency
								</label>
								<p>
									{formatBoolean(product.enableInstallmentLevelDelinquency)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Delinquency Bucket
								</label>
								<p>{product.delinquencyBucket?.name || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Overdue Days for NPA
								</label>
								<p>{product.overdueDaysForNPA || "—"} days</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Due Days for Repayment Event
								</label>
								<p>{product.dueDaysForRepaymentEvent || "—"} days</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Over Due Days for Repayment Event
								</label>
								<p>{product.overDueDaysForRepaymentEvent || "—"} days</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Down Payment Settings */}
				{(product.enableDownPayment !== undefined ||
					product.enableAutoRepaymentForDownPayment !== undefined) && (
					<Card>
						<CardHeader>
							<CardTitle>Down Payment Settings</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium">
										Enable Down Payment
									</label>
									<p>{formatBoolean(product.enableDownPayment)}</p>
								</div>
								<div>
									<label className="text-sm font-medium">
										Enable Auto Repayment for Down Payment
									</label>
									<p>
										{formatBoolean(product.enableAutoRepaymentForDownPayment)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Borrower Cycle & Variations */}
				{(product.includeInBorrowerCycle || product.useBorrowerCycle) && (
					<Card>
						<CardHeader>
							<CardTitle>Borrower Cycle & Variations</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium">
										Include in Borrower Cycle
									</label>
									<p>{formatBoolean(product.includeInBorrowerCycle)}</p>
								</div>
								<div>
									<label className="text-sm font-medium">
										Use Borrower Cycle
									</label>
									<p>{formatBoolean(product.useBorrowerCycle)}</p>
								</div>
							</div>
							{product.numberOfRepaymentVariationsForBorrowerCycle &&
								product.numberOfRepaymentVariationsForBorrowerCycle.length >
									0 && (
									<div>
										<label className="text-sm font-medium">
											Repayment Variations for Borrower Cycle
										</label>
										<p>
											{product.numberOfRepaymentVariationsForBorrowerCycle.join(
												", ",
											)}
										</p>
									</div>
								)}
							{product.productsPrincipalVariationsForBorrowerCycle &&
								product.productsPrincipalVariationsForBorrowerCycle.length >
									0 && (
									<div>
										<label className="text-sm font-medium">
											Principal Variations for Borrower Cycle
										</label>
										<p>
											{product.productsPrincipalVariationsForBorrowerCycle.join(
												", ",
											)}
										</p>
									</div>
								)}
						</CardContent>
					</Card>
				)}

				{/* Additional Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Additional Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">
									Over Applied Calculation Type
								</label>
								<p>{product.overAppliedCalculationType || "—"}</p>
							</div>
							<div>
								<label className="text-sm font-medium">
									Supported Interest Refund Types
								</label>
								<p>
									{product.supportedInterestRefundTypes
										?.map((t) => t.value)
										.join(", ") || "—"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
