"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetLoanProductsProductIdResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import { loanProductsApi } from "@/lib/fineract/loan-products";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

// Simple permission check - in a real app this would check user roles
function useHasPermission(permission: string): boolean {
	// TODO: Implement proper permission checking based on user roles
	// For now, allow edit for all users in admin section
	return permission === "loan_product_edit";
}

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

	const [activeTab, setActiveTab] = useState("overview");
	const canEdit = useHasPermission("loan_product_edit");

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

	const tabs = [
		{
			id: "overview",
			label: "Overview",
			description: "Basic information and principal amounts",
		},
		{
			id: "terms",
			label: "Terms",
			description: "Repayment terms and scheduling",
		},
		{
			id: "interest",
			label: "Interest",
			description: "Interest configuration and rules",
		},
		{ id: "fees", label: "Fees", description: "Fees and penalties" },
		{
			id: "accounting",
			label: "Accounting",
			description: "GL mappings and accounting rules",
		},
		{
			id: "settings",
			label: "Settings",
			description: "Advanced settings and risk management",
		},
	];

	return (
		<PageShell
			title={`Loan Product: ${product.name}`}
			subtitle="Complete setup configuration"
			actions={
				canEdit ? (
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => {
								// Since Fineract doesn't support updating loan products directly,
								// we'll create a new version by duplicating the product
								alert(
									"Edit functionality will create a new version of this loan product. This feature is not yet implemented.",
								);
							}}
							disabled={!product}
						>
							Modify Product
						</Button>
					</div>
				) : null
			}
		>
			{/* Mobile Tab Selector */}
			<div className="md:hidden mb-4">
				<Select value={activeTab} onValueChange={setActiveTab}>
					<SelectTrigger>
						<SelectValue placeholder="Select section" />
					</SelectTrigger>
					<SelectContent>
						{tabs.map((tab) => (
							<SelectItem key={tab.id} value={tab.id}>
								{tab.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Desktop Tab Navigation */}
			<div className="hidden md:block mb-6">
				<div className="border-b border-border">
					<nav className="flex space-x-8">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"py-2 px-1 border-b-2 font-medium text-sm",
									activeTab === tab.id
										? "border-primary text-primary"
										: "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
								)}
							>
								{tab.label}
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Tab Content */}
			<div className="space-y-6">
				{/* Overview Tab */}
				{activeTab === "overview" && (
					<>
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

						<Card>
							<CardHeader>
								<CardTitle>Version Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<label className="text-sm font-medium">
											Current Version
										</label>
										<p className="font-mono">v1</p>
									</div>
									<div>
										<label className="text-sm font-medium">Created</label>
										<p className="font-mono">
											{new Date().toLocaleDateString()}{" "}
											{new Date().toLocaleTimeString()}
										</p>
									</div>
									<div className="md:col-span-2">
										<label className="text-sm font-medium">
											Version History
										</label>
										<div className="mt-2 space-y-2">
											<div className="flex justify-between items-center p-2 bg-muted rounded">
												<span className="font-mono">v1</span>
												<span className="text-sm text-muted-foreground">
													{new Date().toLocaleDateString()}{" "}
													{new Date().toLocaleTimeString()}
												</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Currency & Principal Amounts</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<label className="text-sm font-medium">Currency</label>
										<p>
											{product.currency?.displaySymbol} (
											{product.currency?.code})
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
										<label className="text-sm font-medium">
											Default Principal
										</label>
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
					</>
				)}

				{/* Terms Tab */}
				{activeTab === "terms" && (
					<>
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
										<label className="text-sm font-medium">
											Amortization Type
										</label>
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
										<label className="text-sm font-medium">
											Days in Year Type
										</label>
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
					</>
				)}

				{/* Interest Tab */}
				{activeTab === "interest" && (
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
										{formatPercentage(product.maxInterestRatePerPeriod)}{" "}
										(default: {formatPercentage(product.interestRatePerPeriod)})
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
										{formatBoolean(
											product.interestRecognitionOnDisbursementDate,
										)}
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
									<p>
										{formatBoolean(product.isLinkedToFloatingInterestRates)}
									</p>
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
						</CardContent>
					</Card>
				)}

				{/* Fees Tab */}
				{activeTab === "fees" && (
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
				)}

				{/* Accounting Tab */}
				{activeTab === "accounting" && (
					<>
						<Card>
							<CardHeader>
								<CardTitle>Accounting Setup</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<label className="text-sm font-medium">
											Accounting Rule
										</label>
										<p>{product.accountingRule?.description}</p>
									</div>
								</div>
							</CardContent>
						</Card>

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
											{formatBoolean(
												product.allowPartialPeriodInterestCalculation,
											)}
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
										<label className="text-sm font-medium">
											Can Use for Topup
										</label>
										<p>{formatBoolean(product.canUseForTopup)}</p>
									</div>
									<div>
										<label className="text-sm font-medium">
											Multi Disburse Loan
										</label>
										<p>{formatBoolean(product.multiDisburseLoan)}</p>
									</div>
									<div>
										<label className="text-sm font-medium">
											Max Tranche Count
										</label>
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
										<p>
											{formatBoolean(product.disallowExpectedDisbursements)}
										</p>
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
					</>
				)}

				{/* Settings Tab */}
				{activeTab === "settings" && (
					<>
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
												{formatBoolean(
													product.enableAutoRepaymentForDownPayment,
												)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

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
					</>
				)}
			</div>
		</PageShell>
	);
}
