"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	Banknote,
	Calculator,
	Calendar,
	CreditCard,
	FileText,
	Percent,
	Settings,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { LoanProductWizard } from "@/components/config/loan-product-wizard";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetChargesResponse,
	GetLoanProductsProductIdResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import { chargesApi, loanProductsApi } from "@/lib/fineract/loan-products";
import type { CreateLoanProductFormData } from "@/lib/schemas/loan-product";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

type TabValue =
	| "overview"
	| "terms"
	| "interest"
	| "fees"
	| "accounting"
	| "settings";

async function fetchLoanProduct(
	tenantId: string,
	id: string,
): Promise<GetLoanProductsProductIdResponse> {
	const response = await fetch(
		`${BFF_ROUTES.loanProducts}/${id}?template=true`,
		{
			headers: { "x-tenant-id": tenantId },
		},
	);
	if (!response.ok) throw new Error("Failed to fetch loan product");
	return response.json();
}

async function fetchDetailedCharges(
	tenantId: string,
	chargeIds: number[],
): Promise<GetChargesResponse[]> {
	if (chargeIds.length === 0) return [];
	try {
		const allCharges = (await chargesApi.list(
			tenantId,
		)) as GetChargesResponse[];
		return allCharges.filter((charge) => chargeIds.includes(charge.id || 0));
	} catch {
		return [];
	}
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}`;
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

function readUnknownBooleanProperty(
	source: object,
	property: string,
	fallback = false,
) {
	const record = source as Record<string, unknown>;
	const value = record[property];
	return typeof value === "boolean" ? value : fallback;
}

function readUnknownProperty(source: object, property: string) {
	const record = source as Record<string, unknown>;
	return record[property];
}

function readUnknownNumberProperty(source: object, property: string) {
	const value = readUnknownProperty(source, property);
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function mapApiPenaltyFrequencyToUi(
	value: unknown,
): "days" | "weeks" | "months" | "years" | undefined {
	if (typeof value === "number") {
		return mapApiPenaltyFrequencyToUi(String(value));
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "0" || normalized.includes("day")) return "days";
		if (normalized === "1" || normalized.includes("week")) return "weeks";
		if (normalized === "2" || normalized.includes("month")) return "months";
		if (normalized === "3" || normalized.includes("year")) return "years";
		return undefined;
	}

	if (value && typeof value === "object") {
		const objectValue = value as Record<string, unknown>;
		return (
			mapApiPenaltyFrequencyToUi(objectValue.id) ||
			mapApiPenaltyFrequencyToUi(objectValue.code) ||
			mapApiPenaltyFrequencyToUi(objectValue.value) ||
			mapApiPenaltyFrequencyToUi(objectValue.description)
		);
	}

	return undefined;
}

function transformProductToFormData(
	product: GetLoanProductsProductIdResponse,
	detailedCharges: GetChargesResponse[],
): Partial<CreateLoanProductFormData> {
	const principal = product.principal ?? 10000;
	const minPrincipal = product.minPrincipal ?? principal;
	const maxPrincipal = product.maxPrincipal ?? principal;
	const numberOfRepayments = product.numberOfRepayments ?? 1;
	const minNumberOfRepayments =
		product.minNumberOfRepayments ?? numberOfRepayments;
	const maxNumberOfRepayments =
		product.maxNumberOfRepayments ?? numberOfRepayments;
	const repaymentEvery = product.repaymentEvery ?? 1;
	const interestRatePerPeriod = product.interestRatePerPeriod ?? 10;
	const overAppliedCalculationType = product.overAppliedCalculationType
		?.toLowerCase()
		.trim();

	// Transform detailed charges into fees and penalties arrays
	const fees = detailedCharges
		.filter((charge) => !charge.penalty)
		.map((charge) => ({
			id: charge.id!,
			name: charge.name || "",
			amount: charge.amount,
			currencyCode: charge.currency?.code,
			calculationMethod:
				charge.chargeCalculationType?.id === 1
					? "flat"
					: ("percent" as "flat" | "percent"),
			chargeTimeType: (charge.chargeTimeType?.id === 1
				? "disbursement"
				: charge.chargeTimeType?.id === 2
					? "specifiedDueDate"
					: charge.chargeTimeType?.id === 5
						? "approval"
						: "disbursement") as
				| "disbursement"
				| "specifiedDueDate"
				| "approval",
			paymentMode:
				charge.chargePaymentMode?.id === 1
					? "deduct"
					: ("payable" as "deduct" | "payable"),
		}));

	const penalties = detailedCharges
		.filter((charge) => charge.penalty)
		.map((charge) => {
			const frequencyType = mapApiPenaltyFrequencyToUi(
				readUnknownProperty(charge, "feeFrequency"),
			);

			return {
				id: charge.id!,
				name: charge.name || "",
				amount: charge.amount,
				currencyCode: charge.currency?.code,
				calculationMethod:
					charge.chargeCalculationType?.id === 1
						? "flat"
						: ("percent" as "flat" | "percent"),
				penaltyBasis:
					charge.chargeCalculationType?.id === 3
						? "overdueInterest"
						: charge.chargeCalculationType?.id === 4
							? "overduePrincipal"
							: ("totalOverdue" as
									| "totalOverdue"
									| "overduePrincipal"
									| "overdueInterest"),
				frequencyType,
				frequencyInterval: readUnknownNumberProperty(charge, "feeInterval"),
			};
		});

	return {
		name: product.name || "",
		shortName: product.shortName || "",
		description: product.description || "",
		includeInBorrowerCycle: Boolean(product.includeInBorrowerCycle),
		useBorrowerCycle: Boolean(product.useBorrowerCycle),
		currencyCode: product.currency?.code || "",
		digitsAfterDecimal: product.currency?.decimalPlaces || 2,
		minPrincipal,
		principal,
		maxPrincipal,
		numberOfRepayments,
		minNumberOfRepayments,
		maxNumberOfRepayments,
		loanScheduleType: product.loanScheduleType?.code,
		loanScheduleProcessingType: product.loanScheduleProcessingType?.code,
		multiDisburseLoan: Boolean(product.multiDisburseLoan),
		maxTrancheCount: product.maxTrancheCount,
		disallowExpectedDisbursements: Boolean(
			product.disallowExpectedDisbursements,
		),
		allowFullTermForTranche: Boolean(product.allowFullTermForTranche),
		syncExpectedWithDisbursementDate: readUnknownBooleanProperty(
			product,
			"syncExpectedWithDisbursementDate",
		),
		allowApprovedDisbursedAmountsOverApplied: Boolean(
			product.allowApprovedDisbursedAmountsOverApplied,
		),
		overAppliedCalculationType: (overAppliedCalculationType === "percentage"
			? "percentage"
			: overAppliedCalculationType === "flat"
				? "flat"
				: undefined) as "flat" | "percentage" | undefined,
		overAppliedNumber: readUnknownNumberProperty(product, "overAppliedNumber"),
		repaymentEvery,
		repaymentFrequencyType: product.repaymentFrequencyType?.id,
		repaymentStartDateType: product.repaymentStartDateType?.id,
		graceOnPrincipalPayment: readUnknownNumberProperty(
			product,
			"graceOnPrincipalPayment",
		),
		graceOnInterestPayment: readUnknownNumberProperty(
			product,
			"graceOnInterestPayment",
		),
		principalThresholdForLastInstallment:
			product.principalThresholdForLastInstalment,
		interestType: product.interestType?.id,
		amortizationType: product.amortizationType?.id,
		interestRatePerPeriod,
		interestRateFrequencyType: product.interestRateFrequencyType?.id,
		interestCalculationPeriodType: product.interestCalculationPeriodType?.id,
		allowPartialPeriodInterestCalculation:
			product.allowPartialPeriodInterestCalculation,
		daysInYearType: product.daysInYearType?.id,
		daysInMonthType:
			product.daysInMonthType?.id !== undefined
				? Number(product.daysInMonthType.id)
				: undefined,
		isInterestRecalculationEnabled: Boolean(
			product.isInterestRecalculationEnabled,
		),
		interestRecalculationCompoundingMethod:
			product.interestRecalculationData?.interestRecalculationCompoundingType
				?.id,
		rescheduleStrategyMethod:
			product.interestRecalculationData?.rescheduleStrategyType?.id,
		preClosureInterestCalculationStrategy:
			product.interestRecalculationData?.preClosureInterestCalculationStrategy
				?.id,
		isArrearsBasedOnOriginalSchedule: Boolean(
			product.interestRecalculationData?.isArrearsBasedOnOriginalSchedule,
		),
		disallowInterestCalculationOnPastDue: Boolean(
			product.interestRecalculationData?.disallowInterestCalculationOnPastDue,
		),
		recalculationCompoundingFrequencyType:
			product.interestRecalculationData
				?.interestRecalculationCompoundingFrequencyType?.id,
		recalculationCompoundingFrequencyInterval:
			product.interestRecalculationData
				?.recalculationCompoundingFrequencyInterval,
		recalculationCompoundingFrequencyOnDayType:
			product.interestRecalculationData
				?.recalculationCompoundingFrequencyOnDayType,
		recalculationRestFrequencyType:
			product.interestRecalculationData?.recalculationRestFrequencyType?.id,
		recalculationRestFrequencyInterval:
			product.interestRecalculationData?.recalculationRestFrequencyInterval,
		transactionProcessingStrategyCode:
			product.transactionProcessingStrategyCode,
		graceOnArrearsAgeing: readUnknownNumberProperty(
			product,
			"graceOnArrearsAgeing",
		),
		inArrearsTolerance: product.inArrearsTolerance,
		overdueDaysForNPA: product.overdueDaysForNPA,
		delinquencyBucketId: product.delinquencyBucket?.id,
		accountMovesOutOfNPAOnlyOnArrearsCompletion: Boolean(
			readUnknownBooleanProperty(
				product,
				"accountMovesOutOfNPAOnlyOnArrearsCompletion",
			),
		),
		enableIncomeCapitalization: Boolean(product.enableIncomeCapitalization),
		capitalizedIncomeType:
			product.capitalizedIncomeType?.id === "FEE"
				? "FEE"
				: product.capitalizedIncomeType?.id === "INTEREST"
					? "INTEREST"
					: undefined,
		capitalizedIncomeCalculationType:
			product.capitalizedIncomeCalculationType?.id === "FLAT"
				? "FLAT"
				: undefined,
		capitalizedIncomeStrategy:
			product.capitalizedIncomeStrategy?.id === "EQUAL_AMORTIZATION"
				? "EQUAL_AMORTIZATION"
				: undefined,
		enableBuyDownFee: Boolean(product.enableBuyDownFee),
		buyDownFeeIncomeType:
			product.buyDownFeeIncomeType?.id === "FEE"
				? "FEE"
				: product.buyDownFeeIncomeType?.id === "INTEREST"
					? "INTEREST"
					: undefined,
		buyDownFeeCalculationType:
			product.buyDownFeeCalculationType?.id === "FLAT" ? "FLAT" : undefined,
		buyDownFeeStrategy:
			product.buyDownFeeStrategy?.id === "EQUAL_AMORTIZATION"
				? "EQUAL_AMORTIZATION"
				: undefined,
		merchantBuyDownFee: Boolean(product.merchantBuyDownFee),
		chargeOffBehaviour:
			product.chargeOffBehaviour?.id === "REGULAR"
				? "REGULAR"
				: product.chargeOffBehaviour?.id === "ZERO_INTEREST"
					? "ZERO_INTEREST"
					: product.chargeOffBehaviour?.id === "ACCELERATE_MATURITY"
						? "ACCELERATE_MATURITY"
						: undefined,
		chargeOffReasonToExpenseMappings:
			product.chargeOffReasonToExpenseAccountMappings
				?.map((mapping) => ({
					reasonCodeValueId: mapping.reasonCodeValue?.id,
					expenseAccountId: mapping.expenseAccount?.id,
				}))
				.filter(
					(
						mapping,
					): mapping is {
						reasonCodeValueId: number;
						expenseAccountId: number;
					} =>
						typeof mapping.reasonCodeValueId === "number" &&
						mapping.reasonCodeValueId > 0 &&
						typeof mapping.expenseAccountId === "number" &&
						mapping.expenseAccountId > 0,
				) || [],
		writeOffReasonToExpenseMappings:
			product.writeOffReasonsToExpenseMappings
				?.map((mapping) => ({
					reasonCodeValueId: mapping.reasonCodeValue?.id,
					expenseAccountId: mapping.expenseAccount?.id,
				}))
				.filter(
					(
						mapping,
					): mapping is {
						reasonCodeValueId: number;
						expenseAccountId: number;
					} =>
						typeof mapping.reasonCodeValueId === "number" &&
						mapping.reasonCodeValueId > 0 &&
						typeof mapping.expenseAccountId === "number" &&
						mapping.expenseAccountId > 0,
				) || [],
		supportedInterestRefundTypes:
			product.supportedInterestRefundTypes
				?.map((entry) => entry.id || entry.code)
				.filter((value): value is string => Boolean(value)) || [],
		paymentAllocationTransactionTypes:
			product.paymentAllocation
				?.map((entry) => entry.transactionType)
				.filter((value): value is string => Boolean(value)) || [],
		paymentAllocationRules:
			product.paymentAllocation?.[0]?.paymentAllocationOrder
				?.slice()
				.sort((a, b) => (a.order || 0) - (b.order || 0))
				.map((entry) => entry.paymentAllocationRule)
				.filter((value): value is string => Boolean(value)) || [],
		paymentAllocationFutureInstallmentAllocationRule:
			product.paymentAllocation?.[0]?.futureInstallmentAllocationRule,
		creditAllocationTransactionTypes:
			product.creditAllocation
				?.map((entry) => entry.transactionType)
				.filter((value): value is string => Boolean(value)) || [],
		creditAllocationRules:
			product.creditAllocation?.[0]?.creditAllocationOrder
				?.slice()
				.sort((a, b) => (a.order || 0) - (b.order || 0))
				.map((entry) => entry.creditAllocationRule)
				.filter((value): value is string => Boolean(value)) || [],
		paymentChannelToFundSourceMappings:
			product.paymentChannelToFundSourceMappings
				?.map((mapping) => ({
					paymentTypeId:
						typeof mapping.paymentTypeId === "number"
							? mapping.paymentTypeId
							: undefined,
					fundSourceAccountId:
						typeof mapping.fundSourceAccountId === "number"
							? mapping.fundSourceAccountId
							: undefined,
				}))
				.filter(
					(
						mapping,
					): mapping is {
						paymentTypeId: number;
						fundSourceAccountId: number;
					} =>
						typeof mapping.paymentTypeId === "number" &&
						mapping.paymentTypeId > 0 &&
						typeof mapping.fundSourceAccountId === "number" &&
						mapping.fundSourceAccountId > 0,
				) || [],
		accountingRule: product.accountingRule?.id,
		fundSourceAccountId: product.accountingMappings?.fundSourceAccount?.id,
		loanPortfolioAccountId:
			product.accountingMappings?.loanPortfolioAccount?.id,
		interestOnLoanAccountId:
			product.accountingMappings?.interestOnLoanAccount?.id,
		incomeFromFeeAccountId:
			product.accountingMappings?.incomeFromFeeAccount?.id,
		incomeFromPenaltyAccountId:
			product.accountingMappings?.incomeFromPenaltyAccount?.id,
		writeOffAccountId: product.accountingMappings?.writeOffAccount?.id,
		receivableInterestAccountId:
			product.accountingMappings?.receivableInterestAccount?.id,
		receivableFeeAccountId:
			product.accountingMappings?.receivableFeeAccount?.id,
		receivablePenaltyAccountId:
			product.accountingMappings?.receivablePenaltyAccount?.id,
		incomeFromRecoveryAccountId:
			product.accountingMappings?.incomeFromRecoveryAccount?.id,
		overpaymentLiabilityAccountId:
			product.accountingMappings?.overpaymentLiabilityAccount?.id,
		transfersInSuspenseAccountId:
			product.accountingMappings?.transfersInSuspenseAccount?.id,
		fees,
		penalties,
	};
}

function mapClassificationToIncomeAccountMappings(
	mappings: GetLoanProductsProductIdResponse["buydownFeeClassificationToIncomeAccountMappings"],
) {
	if (!mappings?.length) return undefined;

	const normalized = mappings
		.map((mapping) => {
			const classificationCodeValueId = mapping.classificationCodeValue?.id;
			const incomeAccountId = mapping.incomeAccount?.id;
			if (
				typeof classificationCodeValueId !== "number" ||
				typeof incomeAccountId !== "number"
			) {
				return null;
			}
			return {
				classificationCodeValueId,
				incomeAccountId,
			};
		})
		.filter(
			(
				item,
			): item is {
				classificationCodeValueId: number;
				incomeAccountId: number;
			} => item !== null,
		);

	return normalized.length > 0 ? normalized : undefined;
}

function mapFeeToIncomeAccountMappings(
	mappings: GetLoanProductsProductIdResponse["feeToIncomeAccountMappings"],
) {
	if (!mappings?.length) return undefined;

	const normalized = mappings
		.map((mapping) => {
			const chargeId = mapping.chargeId ?? mapping.charge?.id;
			const incomeAccountId =
				mapping.incomeAccountId ?? mapping.incomeAccount?.id;
			if (typeof chargeId !== "number" || typeof incomeAccountId !== "number") {
				return null;
			}
			return {
				charge: { id: chargeId },
				incomeAccount: { id: incomeAccountId },
			};
		})
		.filter(
			(
				item,
			): item is { charge: { id: number }; incomeAccount: { id: number } } =>
				item !== null,
		);

	return normalized.length > 0 ? normalized : undefined;
}

function buildPreservedLoanProductUpdatePayload(
	product: GetLoanProductsProductIdResponse,
): Partial<PostLoanProductsRequest> {
	const enableDownPayment = Boolean(product.enableDownPayment);
	const daysInYearCustomStrategy =
		product.daysInYearCustomStrategy?.id ||
		product.daysInYearCustomStrategy?.code;
	const preservedPaymentChannelMappings = product
		.paymentChannelToFundSourceMappings?.length
		? product.paymentChannelToFundSourceMappings
		: undefined;

	return {
		allowVariableInstallments: product.allowVariableInstallments,
		canDefineInstallmentAmount: product.canDefineInstallmentAmount,
		canUseForTopup: product.canUseForTopup,
		daysInYearCustomStrategy,
		disbursedAmountPercentageForDownPayment: enableDownPayment
			? product.disbursedAmountPercentageForDownPayment
			: undefined,
		dueDaysForRepaymentEvent: product.dueDaysForRepaymentEvent,
		enableAccrualActivityPosting: product.enableAccrualActivityPosting,
		enableAutoRepaymentForDownPayment: enableDownPayment
			? product.enableAutoRepaymentForDownPayment
			: undefined,
		enableDownPayment,
		enableInstallmentLevelDelinquency:
			product.enableInstallmentLevelDelinquency,
		fixedLength: product.fixedLength,
		fixedPrincipalPercentagePerInstallment:
			product.fixedPrincipalPercentagePerInstallment,
		interestRateVariationsForBorrowerCycle:
			product.interestRateVariationsForBorrowerCycle,
		interestRecognitionOnDisbursementDate:
			product.interestRecognitionOnDisbursementDate,
		isLinkedToFloatingInterestRates: product.isLinkedToFloatingInterestRates,
		maxInterestRatePerPeriod: product.maxInterestRatePerPeriod,
		minInterestRatePerPeriod: product.minInterestRatePerPeriod,
		numberOfRepaymentVariationsForBorrowerCycle:
			product.numberOfRepaymentVariationsForBorrowerCycle,
		outstandingLoanBalance: product.outstandingLoanBalance,
		overDueDaysForRepaymentEvent: product.overDueDaysForRepaymentEvent,
		buydownfeeClassificationToIncomeAccountMappings:
			mapClassificationToIncomeAccountMappings(
				product.buydownFeeClassificationToIncomeAccountMappings,
			),
		capitalizedIncomeClassificationToIncomeAccountMappings:
			mapClassificationToIncomeAccountMappings(
				product.capitalizedIncomeClassificationToIncomeAccountMappings,
			),
		feeToIncomeAccountMappings: mapFeeToIncomeAccountMappings(
			product.feeToIncomeAccountMappings,
		),
		paymentChannelToFundSourceMappings: preservedPaymentChannelMappings,
		buyDownExpenseAccountId:
			product.accountingMappings?.buyDownExpenseAccount?.id,
		chargeOffExpenseAccountId:
			product.accountingMappings?.chargeOffExpenseAccount?.id,
		chargeOffFraudExpenseAccountId:
			product.accountingMappings?.chargeOffFraudExpenseAccount?.id,
		deferredIncomeLiabilityAccountId:
			product.accountingMappings?.deferredIncomeLiabilityAccount?.id,
		goodwillCreditAccountId:
			product.accountingMappings?.goodwillCreditAccount?.id,
		incomeFromBuyDownAccountId:
			product.accountingMappings?.incomeFromBuyDownAccount?.id,
		incomeFromCapitalizationAccountId:
			product.accountingMappings?.incomeFromCapitalizationAccount?.id,
		incomeFromChargeOffFeesAccountId:
			product.accountingMappings?.incomeFromChargeOffFeesAccount?.id,
		incomeFromChargeOffInterestAccountId:
			product.accountingMappings?.incomeFromChargeOffInterestAccount?.id,
		incomeFromChargeOffPenaltyAccountId:
			product.accountingMappings?.incomeFromChargeOffPenaltyAccount?.id,
		incomeFromGoodwillCreditFeesAccountId:
			product.accountingMappings?.incomeFromGoodwillCreditFeesAccount?.id,
		incomeFromGoodwillCreditInterestAccountId:
			product.accountingMappings?.incomeFromGoodwillCreditInterestAccount?.id,
		incomeFromGoodwillCreditPenaltyAccountId:
			product.accountingMappings?.incomeFromGoodwillCreditPenaltyAccount?.id,
	};
}

function mergeLoanProductUpdatePayload(
	product: GetLoanProductsProductIdResponse,
	payload: PostLoanProductsRequest,
): PostLoanProductsRequest {
	const preserved = buildPreservedLoanProductUpdatePayload(product);

	return {
		...preserved,
		...payload,
		charges: payload.charges ?? product.charges,
	};
}

function InfoRow({
	label,
	value,
	className,
}: {
	label: string;
	value: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex justify-between py-2", className)}>
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-right">{value}</span>
		</div>
	);
}

function KpiCard({
	label,
	value,
	icon: Icon,
	variant = "default",
}: {
	label: string;
	value: React.ReactNode;
	icon?: React.ElementType;
	variant?: "default" | "primary" | "success" | "warning";
}) {
	const variantStyles = {
		default: "border-l-4 border-l-border",
		primary: "border-l-4 border-l-blue-500 bg-blue-50/50",
		success: "border-l-4 border-l-green-500 bg-green-50/50",
		warning: "border-l-4 border-l-yellow-500 bg-yellow-50/50",
	};

	const iconStyles = {
		default: "text-muted-foreground",
		primary: "text-blue-600",
		success: "text-green-600",
		warning: "text-yellow-600",
	};

	return (
		<Card className={variantStyles[variant]}>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</p>
						<p className="text-lg font-semibold font-mono">{value}</p>
					</div>
					{Icon && <Icon className={cn("h-5 w-5", iconStyles[variant])} />}
				</div>
			</CardContent>
		</Card>
	);
}

function getChargeAmountDisplay(
	charge: GetChargesResponse,
	currencySymbol = "KES",
) {
	if (!charge.amount) return "—";
	const calculationType = charge.chargeCalculationType?.id;

	switch (calculationType) {
		case 1:
			return `${currencySymbol} ${charge.amount.toLocaleString()}`;
		case 2:
			return `${charge.amount}%`;
		case 3:
			return `${charge.amount}% of Interest`;
		case 4:
			return `${charge.amount}% of Principal`;
		default:
			return `${currencySymbol} ${charge.amount.toLocaleString()}`;
	}
}

function getChargeTimingLabel(charge: GetChargesResponse) {
	const timeTypeId = charge.chargeTimeType?.id;
	switch (timeTypeId) {
		case 1:
			return "Disbursement";
		case 2:
		case 3:
		case 4:
		case 5:
		case 6:
		case 7:
		case 8:
		case 9:
			return "Repayment";
		default:
			return charge.chargeTimeType?.description || "Unknown";
	}
}

function getChargeApplicationLabel(charge: GetChargesResponse) {
	const calculationType = charge.chargeCalculationType?.id;
	switch (calculationType) {
		case 1:
			return "Fixed Amount";
		case 2:
			return "Principal + Interest";
		case 3:
			return "Interest";
		case 4:
			return "Principal";
		default:
			return "Unknown";
	}
}

export default function LoanProductDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const [activeTab, setActiveTab] = useState<TabValue>("overview");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const queryClient = useQueryClient();

	const {
		data: product,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["loanProduct", tenantId, id],
		queryFn: () => fetchLoanProduct(tenantId, id),
	});

	const chargeIds =
		(product?.charges
			?.map((charge) => charge.id)
			.filter(Boolean) as number[]) || [];

	const { data: detailedCharges = [] } = useQuery({
		queryKey: ["charges", tenantId, chargeIds],
		queryFn: () => fetchDetailedCharges(tenantId, chargeIds),
		enabled: !!product && chargeIds.length > 0,
	});

	const { data: currencies = [] } = useQuery({
		queryKey: ["currencies", tenantId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.currencies}`, {
				headers: { "x-tenant-id": tenantId },
			});
			const data = await response.json();
			return (
				data.selectedCurrencyOptions?.map((c: { code: string }) => c.code) || []
			);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: PostLoanProductsRequest) =>
			loanProductsApi.update(tenantId, id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["loanProduct", tenantId, id],
			});
			queryClient.invalidateQueries({ queryKey: ["loanProducts", tenantId] });
			setIsDrawerOpen(false);
		},
	});

	if (isLoading) {
		return (
			<PageShell
				title="Loan Product Details"
				subtitle="Review loan product configuration and accounting mappings"
			>
				<LoadingSkeleton />
			</PageShell>
		);
	}

	if (error || !product) {
		return (
			<PageShell title="Loan Product Details" subtitle="Error loading product">
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-red-600">
							Failed to load loan product details. Please try again.
						</p>
					</CardContent>
				</Card>
			</PageShell>
		);
	}

	const currency = product.currency?.displaySymbol || "KES";
	const fees = detailedCharges.filter((c) => !c.penalty);
	const penalties = detailedCharges.filter((c) => c.penalty);
	const accountingMappings = product.accountingMappings;
	const paymentTypeOptions =
		(readUnknownProperty(product, "paymentTypeOptions") as
			| Array<{ id?: number; name?: string }>
			| undefined) || [];
	const paymentTypeNameById = new Map<number, string>(
		paymentTypeOptions
			.filter(
				(option): option is { id: number; name: string } =>
					typeof option.id === "number" && typeof option.name === "string",
			)
			.map((option) => [option.id, option.name]),
	);
	const coreAccountMappings = [
		{ label: "Fund Source", account: accountingMappings?.fundSourceAccount },
		{
			label: "Loan Portfolio",
			account: accountingMappings?.loanPortfolioAccount,
		},
		{
			label: "Interest on Loan",
			account: accountingMappings?.interestOnLoanAccount,
		},
		{
			label: "Income from Fee",
			account: accountingMappings?.incomeFromFeeAccount,
		},
		{
			label: "Income from Penalty",
			account: accountingMappings?.incomeFromPenaltyAccount,
		},
		{
			label: "Receivable Interest",
			account: accountingMappings?.receivableInterestAccount,
		},
		{
			label: "Receivable Fee",
			account: accountingMappings?.receivableFeeAccount,
		},
		{
			label: "Receivable Penalty",
			account: accountingMappings?.receivablePenaltyAccount,
		},
		{
			label: "Write-off",
			account: accountingMappings?.writeOffAccount,
		},
		{
			label: "Overpayment Liability",
			account: accountingMappings?.overpaymentLiabilityAccount,
		},
		{
			label: "Transfers in Suspense",
			account: accountingMappings?.transfersInSuspenseAccount,
		},
	] as const;
	const configuredCoreAccountCount = coreAccountMappings.filter(
		(mapping) => !!mapping.account,
	).length;
	const extendedAccountMappings = [
		{
			label: "Income from Recovery",
			account: accountingMappings?.incomeFromRecoveryAccount,
		},
		{
			label: "Buy Down Expense",
			account: accountingMappings?.buyDownExpenseAccount,
		},
		{
			label: "Income from Buy Down",
			account: accountingMappings?.incomeFromBuyDownAccount,
		},
		{
			label: "Income from Capitalization",
			account: accountingMappings?.incomeFromCapitalizationAccount,
		},
		{
			label: "Charge-off Expense",
			account: accountingMappings?.chargeOffExpenseAccount,
		},
		{
			label: "Charge-off Fraud Expense",
			account: accountingMappings?.chargeOffFraudExpenseAccount,
		},
		{
			label: "Deferred Income Liability",
			account: accountingMappings?.deferredIncomeLiabilityAccount,
		},
		{
			label: "Goodwill Credit",
			account: accountingMappings?.goodwillCreditAccount,
		},
		{
			label: "Charge-off Fee Income",
			account: accountingMappings?.incomeFromChargeOffFeesAccount,
		},
		{
			label: "Charge-off Interest Income",
			account: accountingMappings?.incomeFromChargeOffInterestAccount,
		},
		{
			label: "Charge-off Penalty Income",
			account: accountingMappings?.incomeFromChargeOffPenaltyAccount,
		},
		{
			label: "Goodwill Fee Income",
			account: accountingMappings?.incomeFromGoodwillCreditFeesAccount,
		},
		{
			label: "Goodwill Interest Income",
			account: accountingMappings?.incomeFromGoodwillCreditInterestAccount,
		},
		{
			label: "Goodwill Penalty Income",
			account: accountingMappings?.incomeFromGoodwillCreditPenaltyAccount,
		},
	].filter((mapping) => !!mapping.account);
	const feeToIncomeMappings = product.feeToIncomeAccountMappings || [];
	const penaltyToIncomeMappings =
		(readUnknownProperty(product, "penaltyToIncomeAccountMappings") as
			| Array<{
					charge?: { id?: number; name?: string };
					chargeId?: number;
					incomeAccount?: { id?: number; name?: string; glCode?: string };
					incomeAccountId?: number;
			  }>
			| undefined) || [];
	const paymentChannelMappings =
		product.paymentChannelToFundSourceMappings || [];
	const chargeOffReasonMappings =
		product.chargeOffReasonToExpenseAccountMappings || [];
	const writeOffReasonMappings = product.writeOffReasonsToExpenseMappings || [];
	const selfServiceApplicationEnabled = readUnknownBooleanProperty(
		product,
		"allowSelfService",
		false,
	);
	const buyDownClassificationMappings =
		product.buydownFeeClassificationToIncomeAccountMappings || [];
	const capitalizedIncomeClassificationMappings =
		product.capitalizedIncomeClassificationToIncomeAccountMappings || [];
	const accountingMappingOptions = readUnknownProperty(
		product,
		"accountingMappingOptions",
	) as
		| {
				assetAccountOptions?: Array<{
					id?: number;
					name?: string;
					glCode?: string;
				}>;
				liabilityAccountOptions?: Array<{
					id?: number;
					name?: string;
					glCode?: string;
				}>;
				incomeAccountOptions?: Array<{
					id?: number;
					name?: string;
					glCode?: string;
				}>;
				expenseAccountOptions?: Array<{
					id?: number;
					name?: string;
					glCode?: string;
				}>;
		  }
		| undefined;
	const availableAccountingOptionCounts = {
		asset: accountingMappingOptions?.assetAccountOptions?.length || 0,
		liability: accountingMappingOptions?.liabilityAccountOptions?.length || 0,
		income: accountingMappingOptions?.incomeAccountOptions?.length || 0,
		expense: accountingMappingOptions?.expenseAccountOptions?.length || 0,
	};
	const accountLookupById = new Map<
		number,
		{ id?: number; name?: string; glCode?: string }
	>();
	for (const mapping of [...coreAccountMappings, ...extendedAccountMappings]) {
		const account = mapping.account;
		if (account?.id && !accountLookupById.has(account.id)) {
			accountLookupById.set(account.id, account);
		}
	}
	for (const account of accountingMappingOptions?.assetAccountOptions || []) {
		if (account.id && !accountLookupById.has(account.id)) {
			accountLookupById.set(account.id, account);
		}
	}
	for (const account of accountingMappingOptions?.liabilityAccountOptions ||
		[]) {
		if (account.id && !accountLookupById.has(account.id)) {
			accountLookupById.set(account.id, account);
		}
	}
	for (const account of accountingMappingOptions?.incomeAccountOptions || []) {
		if (account.id && !accountLookupById.has(account.id)) {
			accountLookupById.set(account.id, account);
		}
	}
	for (const account of accountingMappingOptions?.expenseAccountOptions || []) {
		if (account.id && !accountLookupById.has(account.id)) {
			accountLookupById.set(account.id, account);
		}
	}

	return (
		<PageShell
			title={`${product.name}${product.status === "loanProduct.active" ? " (Active)" : ""}`}
			subtitle={`${product.shortName} | ${currency} (${product.currency?.code})`}
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" asChild>
						<Link href="/config/products/loans">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Loan Products
						</Link>
					</Button>
					<Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
						Modify Product
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{/* KPI Strip */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<KpiCard
						label="Principal Range"
						value={`${formatCurrency(product.minPrincipal, currency)} - ${formatCurrency(product.maxPrincipal, currency)}`}
						icon={Banknote}
						variant="primary"
					/>
					<KpiCard
						label="Interest Rate"
						value={
							product.interestRatePerPeriod !== undefined
								? `${product.interestRatePerPeriod}% ${formatEnum(product.interestRateFrequencyType)?.toLowerCase()}`
								: "—"
						}
						icon={Percent}
						variant="success"
					/>
					<KpiCard
						label="Repayments"
						value={`${product.minNumberOfRepayments || "—"} - ${product.maxNumberOfRepayments || "—"}`}
						icon={Calendar}
					/>
					<KpiCard
						label="Charges"
						value={`${detailedCharges.length} (${fees.length} fees, ${penalties.length} penalties)`}
						icon={CreditCard}
						variant={detailedCharges.length > 0 ? "warning" : "default"}
					/>
				</div>

				{/* Tabs */}
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as TabValue)}
				>
					{/* Mobile Tab Selector */}
					<div className="md:hidden mb-4">
						<Select
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as TabValue)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select section" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="overview">Overview</SelectItem>
								<SelectItem value="terms">Terms</SelectItem>
								<SelectItem value="interest">Interest</SelectItem>
								<SelectItem value="fees">Fees</SelectItem>
								<SelectItem value="accounting">Accounting</SelectItem>
								<SelectItem value="settings">Settings</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Desktop Tab Navigation */}
					<TabsList
						variant="line"
						className="hidden md:flex w-full justify-start border-b"
					>
						<TabsTrigger value="overview">
							<FileText className="w-4 h-4 mr-1.5" />
							Overview
						</TabsTrigger>
						<TabsTrigger value="terms">
							<Calendar className="w-4 h-4 mr-1.5" />
							Terms
						</TabsTrigger>
						<TabsTrigger value="interest">
							<TrendingUp className="w-4 h-4 mr-1.5" />
							Interest
						</TabsTrigger>
						<TabsTrigger value="fees">
							<CreditCard className="w-4 h-4 mr-1.5" />
							Fees
							{detailedCharges.length > 0 && (
								<Badge variant="secondary" className="ml-1.5 text-xs">
									{detailedCharges.length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="accounting">
							<Calculator className="w-4 h-4 mr-1.5" />
							Accounting
						</TabsTrigger>
						<TabsTrigger value="settings">
							<Settings className="w-4 h-4 mr-1.5" />
							Settings
						</TabsTrigger>
					</TabsList>

					<div className="mt-4">
						{/* Overview Tab */}
						<TabsContent value="overview">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Banknote className="h-4 w-4" />
											Principal Configuration
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Minimum Principal"
											value={formatCurrency(product.minPrincipal, currency)}
										/>
										<InfoRow
											label="Default Principal"
											value={formatCurrency(product.principal, currency)}
										/>
										<InfoRow
											label="Maximum Principal"
											value={formatCurrency(product.maxPrincipal, currency)}
										/>
										<InfoRow
											label="Last Installment Threshold"
											value={formatCurrency(
												product.principalThresholdForLastInstalment,
												currency,
											)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<FileText className="h-4 w-4" />
											Product Details
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow label="Product Name" value={product.name} />
										<InfoRow label="Short Name" value={product.shortName} />
										<InfoRow
											label="Currency"
											value={`${currency} (${product.currency?.code})`}
										/>
										<InfoRow
											label="Decimal Places"
											value={product.currency?.decimalPlaces}
										/>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Settings className="h-4 w-4" />
											Additional Configuration
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Multi Disburse
												</p>
												<Badge
													variant={
														product.multiDisburseLoan ? "default" : "secondary"
													}
												>
													{formatBoolean(product.multiDisburseLoan)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Topup Enabled
												</p>
												<Badge
													variant={
														product.canUseForTopup ? "default" : "secondary"
													}
												>
													{formatBoolean(product.canUseForTopup)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Variable Installments
												</p>
												<Badge
													variant={
														product.allowVariableInstallments
															? "default"
															: "secondary"
													}
												>
													{formatBoolean(product.allowVariableInstallments)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Down Payment
												</p>
												<Badge
													variant={
														product.enableDownPayment ? "default" : "secondary"
													}
												>
													{formatBoolean(product.enableDownPayment)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Self-Service Apply
												</p>
												<Badge
													variant={
														selfServiceApplicationEnabled
															? "success"
															: "secondary"
													}
												>
													{selfServiceApplicationEnabled
														? "Enabled"
														: "Disabled"}
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Terms Tab */}
						<TabsContent value="terms">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Calendar className="h-4 w-4" />
											Repayment Terms
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Number of Repayments"
											value={`${product.minNumberOfRepayments || "—"} - ${product.maxNumberOfRepayments || "—"} (default: ${product.numberOfRepayments || "—"})`}
										/>
										<InfoRow
											label="Repayment Frequency"
											value={`Every ${product.repaymentEvery} ${formatEnum(product.repaymentFrequencyType)}`}
										/>
										<InfoRow
											label="Start Date Type"
											value={formatEnum(product.repaymentStartDateType)}
										/>
										<InfoRow
											label="Amortization"
											value={formatEnum(product.amortizationType)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Settings className="h-4 w-4" />
											Processing Strategy
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Transaction Strategy"
											value={
												product.transactionProcessingStrategyName ||
												product.transactionProcessingStrategyCode ||
												"—"
											}
										/>
										<InfoRow
											label="Schedule Type"
											value={formatEnum(product.loanScheduleType)}
										/>
										<InfoRow
											label="Processing Type"
											value={formatEnum(product.loanScheduleProcessingType)}
										/>
										<InfoRow
											label="Interest Type"
											value={formatEnum(product.interestType)}
										/>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Calendar className="h-4 w-4" />
											Date Calculations
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div className="p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Days in Month
												</p>
												<p className="font-medium text-sm">
													{formatEnum(product.daysInMonthType)}
												</p>
											</div>
											<div className="p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Days in Year
												</p>
												<p className="font-medium text-sm">
													{formatEnum(product.daysInYearType)}
												</p>
											</div>
											<div className="p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Fixed Length
												</p>
												<p className="font-medium text-sm">
													{product.fixedLength || "—"}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Interest Tab */}
						<TabsContent value="interest">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Percent className="h-4 w-4" />
											Interest Rate
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Rate Range"
											value={`${formatPercentage(product.minInterestRatePerPeriod)} - ${formatPercentage(product.maxInterestRatePerPeriod)}`}
										/>
										<InfoRow
											label="Default Rate"
											value={formatPercentage(product.interestRatePerPeriod)}
										/>
										<InfoRow
											label="Rate Frequency"
											value={formatEnum(product.interestRateFrequencyType)}
										/>
										<InfoRow
											label="Annual Rate"
											value={formatPercentage(product.annualInterestRate)}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Calculator className="h-4 w-4" />
											Calculation Settings
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Calculation Period"
											value={formatEnum(product.interestCalculationPeriodType)}
										/>
										<InfoRow
											label="Recognition on Disbursement"
											value={formatBoolean(
												product.interestRecognitionOnDisbursementDate,
											)}
										/>
										<InfoRow
											label="Recalculation Enabled"
											value={formatBoolean(
												product.isInterestRecalculationEnabled,
											)}
										/>
										<InfoRow
											label="Floating Rate Allowed"
											value={formatBoolean(
												product.isFloatingInterestRateCalculationAllowed,
											)}
										/>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<TrendingUp className="h-4 w-4" />
											Advanced Interest Options
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Linked to Floating
												</p>
												<Badge
													variant={
														product.isLinkedToFloatingInterestRates
															? "default"
															: "secondary"
													}
												>
													{formatBoolean(
														product.isLinkedToFloatingInterestRates,
													)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Rates Enabled
												</p>
												<Badge
													variant={
														product.isRatesEnabled ? "default" : "secondary"
													}
												>
													{formatBoolean(product.isRatesEnabled)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Use Borrower Cycle
												</p>
												<Badge
													variant={
														product.useBorrowerCycle ? "default" : "secondary"
													}
												>
													{formatBoolean(product.useBorrowerCycle)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Partial Period Calc
												</p>
												<Badge
													variant={
														product.allowPartialPeriodInterestCalculation
															? "default"
															: "secondary"
													}
												>
													{formatBoolean(
														product.allowPartialPeriodInterestCalculation,
													)}
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Fees Tab */}
						<TabsContent value="fees">
							<div className="space-y-4">
								{/* Summary Cards */}
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
										<CardContent className="p-4">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-xs text-muted-foreground uppercase tracking-wide">
														Total Charges
													</p>
													<p className="text-2xl font-bold">
														{detailedCharges.length}
													</p>
												</div>
												<CreditCard className="h-8 w-8 text-blue-600" />
											</div>
										</CardContent>
									</Card>

									<Card
										className={cn(
											"border-l-4",
											fees.length > 0
												? "border-l-green-500 bg-green-50/50"
												: "border-l-gray-300",
										)}
									>
										<CardContent className="p-4">
											<p className="text-xs text-muted-foreground uppercase tracking-wide">
												Fees
											</p>
											<p className="text-2xl font-bold">{fees.length}</p>
										</CardContent>
									</Card>

									<Card
										className={cn(
											"border-l-4",
											penalties.length > 0
												? "border-l-red-500 bg-red-50/50"
												: "border-l-gray-300",
										)}
									>
										<CardContent className="p-4">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-xs text-muted-foreground uppercase tracking-wide">
														Penalties
													</p>
													<p className="text-2xl font-bold">
														{penalties.length}
													</p>
												</div>
												{penalties.length > 0 && (
													<AlertTriangle className="h-6 w-6 text-red-600" />
												)}
											</div>
										</CardContent>
									</Card>
								</div>

								{/* Charges Table */}
								{detailedCharges.length > 0 ? (
									<Card>
										<CardHeader className="pb-3">
											<CardTitle className="flex items-center gap-2 text-base">
												<CreditCard className="h-4 w-4" />
												Fees & Penalties
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="rounded-md border overflow-hidden">
												<Table>
													<TableHeader>
														<TableRow className="bg-muted/50">
															<TableHead>Charge Name</TableHead>
															<TableHead className="text-right">
																Amount
															</TableHead>
															<TableHead>When Charged</TableHead>
															<TableHead>Applied To</TableHead>
															<TableHead>Type</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{detailedCharges.map((charge) => (
															<TableRow key={charge.id}>
																<TableCell>
																	<div>
																		<p className="font-medium">{charge.name}</p>
																		{charge.chargeTimeType?.description && (
																			<p className="text-xs text-muted-foreground">
																				{charge.chargeTimeType.description}
																			</p>
																		)}
																	</div>
																</TableCell>
																<TableCell className="text-right font-mono">
																	{getChargeAmountDisplay(charge, currency)}
																</TableCell>
																<TableCell>
																	{getChargeTimingLabel(charge)}
																</TableCell>
																<TableCell>
																	{getChargeApplicationLabel(charge)}
																</TableCell>
																<TableCell>
																	<Badge
																		variant={
																			charge.penalty
																				? "destructive"
																				: "secondary"
																		}
																		className="text-xs"
																	>
																		{charge.penalty ? "Penalty" : "Fee"}
																	</Badge>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										</CardContent>
									</Card>
								) : (
									<Card>
										<CardContent className="py-8 text-center">
											<CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
											<p className="text-lg font-medium text-muted-foreground mb-2">
												No Charges Configured
											</p>
											<p className="text-sm text-muted-foreground">
												This loan product has no fees or penalties attached.
											</p>
										</CardContent>
									</Card>
								)}
							</div>
						</TabsContent>

						{/* Accounting Tab */}
						<TabsContent value="accounting">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Calculator className="h-4 w-4" />
											Accounting Configuration
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Accounting Rule"
											value={formatEnum(product.accountingRule)}
										/>
										<InfoRow
											label="Accounting Rule Code"
											value={product.accountingRule?.code || "—"}
										/>
										<InfoRow
											label="Configured Core GL Accounts"
											value={`${configuredCoreAccountCount}/${coreAccountMappings.length}`}
										/>
										<InfoRow
											label="Accrual Activity Posting"
											value={formatBoolean(
												product.enableAccrualActivityPosting,
											)}
										/>
										<InfoRow
											label="Available GL Option Pools"
											value={`A:${availableAccountingOptionCounts.asset} L:${availableAccountingOptionCounts.liability} I:${availableAccountingOptionCounts.income} E:${availableAccountingOptionCounts.expense}`}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Settings className="h-4 w-4" />
											Disbursement Settings
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Multi Disburse"
											value={formatBoolean(product.multiDisburseLoan)}
										/>
										<InfoRow
											label="Max Tranche Count"
											value={product.maxTrancheCount || "—"}
										/>
										<InfoRow
											label="Disallow Expected Disbursements"
											value={formatBoolean(
												product.disallowExpectedDisbursements,
											)}
										/>
										<InfoRow
											label="Allow Full Term for Tranche"
											value={formatBoolean(product.allowFullTermForTranche)}
										/>
										<InfoRow
											label="Payment Type Options"
											value={paymentTypeOptions.length}
										/>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<CreditCard className="h-4 w-4" />
											Core GL Mappings
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="rounded-md border overflow-hidden">
											<Table>
												<TableHeader>
													<TableRow className="bg-muted/50">
														<TableHead>Mapping</TableHead>
														<TableHead>Account</TableHead>
														<TableHead>GL Code</TableHead>
														<TableHead className="text-right">Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{coreAccountMappings.map((mapping) => (
														<TableRow key={mapping.label}>
															<TableCell className="font-medium">
																{mapping.label}
															</TableCell>
															<TableCell>
																{mapping.account?.name || "Not mapped"}
															</TableCell>
															<TableCell className="font-mono">
																{mapping.account?.glCode || "—"}
															</TableCell>
															<TableCell className="text-right">
																<Badge
																	variant={
																		mapping.account ? "success" : "secondary"
																	}
																>
																	{mapping.account ? "Mapped" : "Missing"}
																</Badge>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</CardContent>
								</Card>

								{extendedAccountMappings.length > 0 && (
									<Card className="lg:col-span-2">
										<CardHeader className="pb-3">
											<CardTitle className="flex items-center gap-2 text-base">
												<Calculator className="h-4 w-4" />
												Extended GL Mappings
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												{extendedAccountMappings.map((mapping) => (
													<div
														key={mapping.label}
														className="rounded-md border p-3"
													>
														<p className="text-xs text-muted-foreground">
															{mapping.label}
														</p>
														<p className="text-sm font-medium mt-1">
															{mapping.account?.name || "—"}
															{mapping.account?.glCode
																? ` (${mapping.account.glCode})`
																: ""}
														</p>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								)}

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<FileText className="h-4 w-4" />
											Accounting Mapping Rules
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<p className="text-sm font-medium">Fee to Income</p>
												{feeToIncomeMappings.length === 0 ? (
													<p className="text-sm text-muted-foreground">
														No fee income mappings configured.
													</p>
												) : (
													<div className="space-y-1">
														{feeToIncomeMappings.map((mapping, index) => (
															<p
																key={`${mapping.chargeId || mapping.charge?.id || index}`}
																className="text-sm"
															>
																{mapping.charge?.name ||
																	`Charge #${mapping.chargeId || mapping.charge?.id || "—"}`}{" "}
																{"→"}{" "}
																{mapping.incomeAccount?.name || "Unmapped"}
															</p>
														))}
													</div>
												)}
											</div>

											<div className="space-y-2">
												<p className="text-sm font-medium">Penalty to Income</p>
												{penaltyToIncomeMappings.length === 0 ? (
													<p className="text-sm text-muted-foreground">
														No penalty income mappings configured.
													</p>
												) : (
													<div className="space-y-1">
														{penaltyToIncomeMappings.map((mapping, index) => (
															<p
																key={`${mapping.chargeId || mapping.charge?.id || index}`}
																className="text-sm"
															>
																{mapping.charge?.name ||
																	`Penalty #${mapping.chargeId || mapping.charge?.id || "—"}`}{" "}
																{"→"}{" "}
																{mapping.incomeAccount?.name || "Unmapped"}
															</p>
														))}
													</div>
												)}
											</div>

											<div className="space-y-2">
												<p className="text-sm font-medium">
													Payment Channel to Fund Source
												</p>
												{paymentChannelMappings.length === 0 ? (
													<p className="text-sm text-muted-foreground">
														No payment channel mappings configured.
													</p>
												) : (
													<div className="space-y-1">
														{paymentChannelMappings.map((mapping, index) => {
															const fundSource =
																typeof mapping.fundSourceAccountId === "number"
																	? accountLookupById.get(
																			mapping.fundSourceAccountId,
																		)
																	: undefined;
															const paymentTypeLabel =
																typeof mapping.paymentTypeId === "number"
																	? paymentTypeNameById.get(
																			mapping.paymentTypeId,
																		)
																	: undefined;

															return (
																<p
																	key={`${mapping.paymentTypeId || "pt"}-${mapping.fundSourceAccountId || index}`}
																	className="text-sm"
																>
																	{paymentTypeLabel ||
																		`Payment Type #${mapping.paymentTypeId || "—"}`}{" "}
																	{"→"}{" "}
																	{fundSource?.name ||
																		`Fund Source #${mapping.fundSourceAccountId || "—"}`}
																</p>
															);
														})}
													</div>
												)}
											</div>

											<div className="space-y-2">
												<p className="text-sm font-medium">
													Reason & Classification Mapping Counts
												</p>
												<div className="space-y-1">
													<p className="text-sm">
														Charge-off reasons: {chargeOffReasonMappings.length}
													</p>
													<p className="text-sm">
														Write-off reasons: {writeOffReasonMappings.length}
													</p>
													<p className="text-sm">
														Buy-down classifications:{" "}
														{buyDownClassificationMappings.length}
													</p>
													<p className="text-sm">
														Capitalized-income classifications:{" "}
														{capitalizedIncomeClassificationMappings.length}
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="lg:col-span-2">
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<CreditCard className="h-4 w-4" />
											Advanced Loan Options
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Over Applied Allowed
												</p>
												<Badge
													variant={
														product.allowApprovedDisbursedAmountsOverApplied
															? "default"
															: "secondary"
													}
												>
													{formatBoolean(
														product.allowApprovedDisbursedAmountsOverApplied,
													)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Define Installment
												</p>
												<Badge
													variant={
														product.canDefineInstallmentAmount
															? "default"
															: "secondary"
													}
												>
													{formatBoolean(product.canDefineInstallmentAmount)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Can Use for Topup
												</p>
												<Badge
													variant={
														product.canUseForTopup ? "default" : "secondary"
													}
												>
													{formatBoolean(product.canUseForTopup)}
												</Badge>
											</div>
											<div className="text-center p-3 bg-muted/50 rounded-lg">
												<p className="text-xs text-muted-foreground mb-1">
													Gap Settings
												</p>
												<p className="font-medium text-sm">
													{product.minimumGap || "—"} /{" "}
													{product.maximumGap || "—"}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Settings Tab */}
						<TabsContent value="settings">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<AlertTriangle className="h-4 w-4" />
											Tolerance & Delinquency
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="In Arrears Tolerance"
											value={formatCurrency(
												product.inArrearsTolerance,
												currency,
											)}
										/>
										<InfoRow
											label="Overdue Days for NPA"
											value={
												product.overdueDaysForNPA
													? `${product.overdueDaysForNPA} days`
													: "—"
											}
										/>
										<InfoRow
											label="Due Days for Repayment Event"
											value={
												product.dueDaysForRepaymentEvent
													? `${product.dueDaysForRepaymentEvent} days`
													: "—"
											}
										/>
										<InfoRow
											label="Overdue Days for Repayment Event"
											value={
												product.overDueDaysForRepaymentEvent
													? `${product.overDueDaysForRepaymentEvent} days`
													: "—"
											}
										/>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<Settings className="h-4 w-4" />
											Delinquency Settings
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Delinquency Bucket"
											value={product.delinquencyBucket?.name || "Not Set"}
										/>
										<InfoRow
											label="Installment Level Delinquency"
											value={formatBoolean(
												product.enableInstallmentLevelDelinquency,
											)}
										/>
									</CardContent>
								</Card>

								{(product.enableDownPayment !== undefined ||
									product.enableAutoRepaymentForDownPayment !== undefined) && (
									<Card>
										<CardHeader className="pb-3">
											<CardTitle className="flex items-center gap-2 text-base">
												<Banknote className="h-4 w-4" />
												Down Payment
											</CardTitle>
										</CardHeader>
										<CardContent className="divide-y">
											<InfoRow
												label="Enable Down Payment"
												value={formatBoolean(product.enableDownPayment)}
											/>
											<InfoRow
												label="Auto Repayment for Down Payment"
												value={formatBoolean(
													product.enableAutoRepaymentForDownPayment,
												)}
											/>
											<InfoRow
												label="Down Payment Percentage"
												value={formatPercentage(
													product.disbursedAmountPercentageForDownPayment,
												)}
											/>
										</CardContent>
									</Card>
								)}

								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-base">
											<FileText className="h-4 w-4" />
											Additional Settings
										</CardTitle>
									</CardHeader>
									<CardContent className="divide-y">
										<InfoRow
											label="Over Applied Calculation Type"
											value={product.overAppliedCalculationType || "—"}
										/>
										<InfoRow
											label="Supported Interest Refund Types"
											value={
												product.supportedInterestRefundTypes
													?.map((t) => t.value)
													.join(", ") || "—"
											}
										/>
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>

			{/* Modify Loan Product Sheet */}
			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-[80vw] overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Modify Loan Product</SheetTitle>
						<SheetDescription>
							Update loan product configuration with a multi-step wizard
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<LoanProductWizard
							currencies={currencies}
							isOpen={isDrawerOpen}
							onSubmit={async (data) => {}} // Not used in edit mode
							onCancel={() => setIsDrawerOpen(false)}
							isEditMode={true}
							initialData={transformProductToFormData(product, detailedCharges)}
							onUpdate={async (data) => {
								const mergedPayload = mergeLoanProductUpdatePayload(
									product,
									data,
								);
								await updateMutation.mutateAsync(mergedPayload);
							}}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			{/* KPI Strip Skeleton */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i} className="border-l-4 border-l-border">
						<CardContent className="p-4">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-6 w-32" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Tabs Skeleton */}
			<div className="space-y-4">
				<div className="flex gap-2 border-b pb-2">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<Skeleton key={i} className="h-8 w-24" />
					))}
				</div>

				{/* Content Skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Card key={i}>
							<CardHeader className="pb-3">
								<Skeleton className="h-5 w-32" />
							</CardHeader>
							<CardContent className="space-y-3">
								{[1, 2, 3, 4].map((j) => (
									<div key={j} className="flex justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-32" />
									</div>
								))}
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
