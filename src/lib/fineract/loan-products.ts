import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	ChargeRequest,
	GetLoanProductsTemplateResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import type {
	CreateLoanProductFormData,
	FeeFormData,
	PenaltyFormData,
} from "@/lib/schemas/loan-product";

const LOAN_CHARGE_APPLIES_TO = 1;
const CHARGE_CALCULATION = {
	flat: 1,
	percent: 2,
	percentOfInterest: 3,
	percentOfPrincipal: 4,
} as const;

const CHARGE_TIME_TYPE = {
	disbursement: 1,
	specifiedDueDate: 2,
	approval: 5, // Adjust if your instance maps approval charges to a different ID.
	overdue: 4,
} as const;

const CHARGE_PAYMENT_MODE = {
	payable: 0,
	deduct: 1,
} as const;

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const rawPayload = await response.text();
	const payload = rawPayload ? (JSON.parse(rawPayload) as unknown) : null;

	if (!response.ok) {
		throw (
			payload ?? {
				message: response.statusText || "Request failed",
				statusCode: response.status,
			}
		);
	}

	return (payload ?? {}) as T;
}

export const loanProductsApi = {
	async getTemplate(
		tenantId: string,
	): Promise<GetLoanProductsTemplateResponse> {
		const response = await fetch(BFF_ROUTES.loanProductTemplate, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
	async create(
		tenantId: string,
		payload: PostLoanProductsRequest,
	): Promise<unknown> {
		const response = await fetch(BFF_ROUTES.loanProducts, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async update(tenantId: string, id: string, payload: PostLoanProductsRequest) {
		const response = await fetch(`${BFF_ROUTES.loanProducts}/${id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async list(tenantId: string): Promise<unknown> {
		const response = await fetch(BFF_ROUTES.loanProducts, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
};

export const chargesApi = {
	async list(tenantId: string) {
		const response = await fetch(BFF_ROUTES.charges, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
	async create(tenantId: string, payload: ChargeRequest) {
		const response = await fetch(BFF_ROUTES.charges, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
};

export function mapFeeUiToChargeRequest(fee: FeeFormData): ChargeRequest {
	return {
		name: fee.name,
		amount: fee.amount,
		currencyCode: fee.currencyCode,
		chargeAppliesTo: LOAN_CHARGE_APPLIES_TO,
		chargeCalculationType:
			fee.calculationMethod === "flat"
				? CHARGE_CALCULATION.flat
				: CHARGE_CALCULATION.percent,
		chargeTimeType: CHARGE_TIME_TYPE[fee.chargeTimeType],
		chargePaymentMode: CHARGE_PAYMENT_MODE[fee.paymentMode],
		penalty: false,
		locale: "en",
	};
}

export function mapPenaltyUiToChargeRequest(
	penalty: PenaltyFormData,
): ChargeRequest {
	const calculationType =
		penalty.calculationMethod === "flat"
			? CHARGE_CALCULATION.flat
			: penalty.penaltyBasis === "overduePrincipal"
				? CHARGE_CALCULATION.percentOfPrincipal
				: penalty.penaltyBasis === "overdueInterest"
					? CHARGE_CALCULATION.percentOfInterest
					: CHARGE_CALCULATION.percent;

	return {
		name: penalty.name,
		amount: penalty.amount,
		currencyCode: penalty.currencyCode,
		chargeAppliesTo: LOAN_CHARGE_APPLIES_TO,
		chargeCalculationType: calculationType,
		chargeTimeType: CHARGE_TIME_TYPE.overdue,
		penalty: true,
		chargePaymentMode: 1, // Payable separately (penalties are paid explicitly)
		active: true, // Penalties should be active by default
		locale: "en",
	};
}

export function buildLoanProductRequest(
	data: CreateLoanProductFormData,
): PostLoanProductsRequest {
	const chargeIds = [...data.fees, ...data.penalties]
		.map((charge) => charge.id)
		.filter((id, index, all) => all.indexOf(id) === index);

	// Only include minimumDaysBetweenDisbursalAndFirstRepayment if it's greater than 0
	const minimumDaysBetweenDisbursalAndFirstRepayment =
		data.minimumDaysBetweenDisbursalAndFirstRepayment &&
		data.minimumDaysBetweenDisbursalAndFirstRepayment > 0
			? data.minimumDaysBetweenDisbursalAndFirstRepayment
			: undefined;

	const usesAdvancedPaymentAllocationStrategy = Boolean(
		data.transactionProcessingStrategyCode?.includes(
			"advanced-payment-allocation",
		),
	);

	const paymentAllocation =
		usesAdvancedPaymentAllocationStrategy &&
		data.paymentAllocationTransactionTypes.length > 0 &&
		data.paymentAllocationRules.length > 0
			? data.paymentAllocationTransactionTypes.map((transactionType) => ({
					transactionType,
					futureInstallmentAllocationRule:
						data.paymentAllocationFutureInstallmentAllocationRule,
					paymentAllocationOrder: data.paymentAllocationRules.map(
						(paymentAllocationRule, index) => ({
							order: index + 1,
							paymentAllocationRule,
						}),
					),
				}))
			: undefined;

	const creditAllocation =
		usesAdvancedPaymentAllocationStrategy &&
		data.creditAllocationTransactionTypes.length > 0 &&
		data.creditAllocationRules.length > 0
			? data.creditAllocationTransactionTypes.map((transactionType) => ({
					transactionType,
					creditAllocationOrder: data.creditAllocationRules.map(
						(creditAllocationRule, index) => ({
							order: index + 1,
							creditAllocationRule,
						}),
					),
				}))
			: undefined;

	const supportedInterestRefundTypes =
		usesAdvancedPaymentAllocationStrategy &&
		data.supportedInterestRefundTypes.length > 0
			? data.supportedInterestRefundTypes
			: undefined;

	const chargeOffReasonToExpenseAccountMappings =
		data.chargeOffReasonToExpenseMappings.length > 0
			? data.chargeOffReasonToExpenseMappings.map((mapping) => ({
					chargeOffReasonCodeValueId: mapping.reasonCodeValueId,
					expenseAccountId: mapping.expenseAccountId,
				}))
			: undefined;

	const writeOffReasonsToExpenseMappings =
		data.writeOffReasonToExpenseMappings.length > 0
			? data.writeOffReasonToExpenseMappings.map((mapping) => ({
					writeOffReasonCodeValueId: String(mapping.reasonCodeValueId),
					expenseAccountId: String(mapping.expenseAccountId),
				}))
			: undefined;

	return {
		locale: "en",
		name: data.name,
		shortName: data.shortName,
		description: data.description,
		includeInBorrowerCycle: data.includeInBorrowerCycle,
		useBorrowerCycle: data.useBorrowerCycle,
		currencyCode: data.currencyCode,
		digitsAfterDecimal: data.digitsAfterDecimal,
		principal: data.principal,
		minPrincipal: data.minPrincipal,
		maxPrincipal: data.maxPrincipal,
		inMultiplesOf: data.inMultiplesOf ?? 1,
		numberOfRepayments: data.numberOfRepayments,
		minNumberOfRepayments: data.minNumberOfRepayments,
		maxNumberOfRepayments: data.maxNumberOfRepayments,
		loanScheduleType: data.loanScheduleType,
		loanScheduleProcessingType: data.loanScheduleProcessingType,
		multiDisburseLoan: data.multiDisburseLoan,
		maxTrancheCount: data.maxTrancheCount,
		disallowExpectedDisbursements: data.disallowExpectedDisbursements,
		allowFullTermForTranche: data.allowFullTermForTranche,
		syncExpectedWithDisbursementDate: data.syncExpectedWithDisbursementDate,
		allowApprovedDisbursedAmountsOverApplied:
			data.allowApprovedDisbursedAmountsOverApplied,
		overAppliedCalculationType: data.overAppliedCalculationType,
		overAppliedNumber: data.overAppliedNumber,
		repaymentEvery: data.repaymentEvery,
		repaymentFrequencyType: data.repaymentFrequencyType,
		repaymentStartDateType: data.repaymentStartDateType,
		graceOnPrincipalPayment: data.graceOnPrincipalPayment,
		graceOnInterestPayment: data.graceOnInterestPayment,
		principalThresholdForLastInstallment:
			data.principalThresholdForLastInstallment,
		minimumDaysBetweenDisbursalAndFirstRepayment,
		interestType: data.interestType,
		amortizationType: data.amortizationType,
		interestRatePerPeriod: data.interestRatePerPeriod,
		interestRateFrequencyType: data.interestRateFrequencyType,
		interestCalculationPeriodType: data.interestCalculationPeriodType,
		allowPartialPeriodInterestCalculation:
			data.allowPartialPeriodInterestCalculation,
		// Required fields for Fineract
		daysInYearType: data.daysInYearType,
		daysInMonthType: data.daysInMonthType,
		isInterestRecalculationEnabled: data.isInterestRecalculationEnabled,
		interestRecalculationCompoundingMethod: data.isInterestRecalculationEnabled
			? data.interestRecalculationCompoundingMethod
			: undefined,
		rescheduleStrategyMethod: data.isInterestRecalculationEnabled
			? data.rescheduleStrategyMethod
			: undefined,
		preClosureInterestCalculationStrategy: data.isInterestRecalculationEnabled
			? data.preClosureInterestCalculationStrategy
			: undefined,
		isArrearsBasedOnOriginalSchedule: data.isInterestRecalculationEnabled
			? data.isArrearsBasedOnOriginalSchedule
			: undefined,
		disallowInterestCalculationOnPastDue: data.isInterestRecalculationEnabled
			? data.disallowInterestCalculationOnPastDue
			: undefined,
		recalculationCompoundingFrequencyType: data.isInterestRecalculationEnabled
			? data.recalculationCompoundingFrequencyType
			: undefined,
		recalculationCompoundingFrequencyInterval:
			data.isInterestRecalculationEnabled
				? data.recalculationCompoundingFrequencyInterval
				: undefined,
		recalculationCompoundingFrequencyOnDayType:
			data.isInterestRecalculationEnabled
				? data.recalculationCompoundingFrequencyOnDayType
				: undefined,
		recalculationRestFrequencyType: data.isInterestRecalculationEnabled
			? data.recalculationRestFrequencyType
			: undefined,
		recalculationRestFrequencyInterval: data.isInterestRecalculationEnabled
			? data.recalculationRestFrequencyInterval
			: undefined,
		transactionProcessingStrategyCode: data.transactionProcessingStrategyCode,
		graceOnArrearsAgeing: data.graceOnArrearsAgeing,
		inArrearsTolerance: data.inArrearsTolerance,
		overdueDaysForNPA: data.overdueDaysForNPA,
		delinquencyBucketId: data.delinquencyBucketId,
		accountMovesOutOfNPAOnlyOnArrearsCompletion:
			data.accountMovesOutOfNPAOnlyOnArrearsCompletion,
		enableIncomeCapitalization: data.enableIncomeCapitalization,
		capitalizedIncomeType: data.enableIncomeCapitalization
			? data.capitalizedIncomeType
			: undefined,
		capitalizedIncomeCalculationType: data.enableIncomeCapitalization
			? data.capitalizedIncomeCalculationType
			: undefined,
		capitalizedIncomeStrategy: data.enableIncomeCapitalization
			? data.capitalizedIncomeStrategy
			: undefined,
		enableBuyDownFee: data.enableBuyDownFee,
		buyDownFeeIncomeType: data.enableBuyDownFee
			? data.buyDownFeeIncomeType
			: undefined,
		buyDownFeeCalculationType: data.enableBuyDownFee
			? data.buyDownFeeCalculationType
			: undefined,
		buyDownFeeStrategy: data.enableBuyDownFee
			? data.buyDownFeeStrategy
			: undefined,
		merchantBuyDownFee: data.enableBuyDownFee ? data.merchantBuyDownFee : false,
		chargeOffBehaviour: data.chargeOffBehaviour,
		chargeOffReasonToExpenseAccountMappings,
		writeOffReasonsToExpenseMappings,
		supportedInterestRefundTypes,
		paymentAllocation,
		creditAllocation,
		accountingRule: data.accountingRule,
		fundSourceAccountId: data.fundSourceAccountId,
		loanPortfolioAccountId: data.loanPortfolioAccountId,
		interestOnLoanAccountId: data.interestOnLoanAccountId,
		incomeFromFeeAccountId: data.incomeFromFeeAccountId,
		incomeFromPenaltyAccountId: data.incomeFromPenaltyAccountId,
		writeOffAccountId: data.writeOffAccountId,
		receivableInterestAccountId: data.receivableInterestAccountId,
		receivableFeeAccountId: data.receivableFeeAccountId,
		receivablePenaltyAccountId: data.receivablePenaltyAccountId,
		incomeFromRecoveryAccountId: data.incomeFromRecoveryAccountId,
		overpaymentLiabilityAccountId: data.overpaymentLiabilityAccountId,
		transfersInSuspenseAccountId: data.transfersInSuspenseAccountId,
		charges: chargeIds.map((id) => ({ id })),
	};
}
