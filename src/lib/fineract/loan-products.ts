import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	ChargeRequest,
	GetLoanProductsTemplateResponse,
	PostLoanProductsRequest,
	PutChargesChargeIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";
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

interface LoanProductsListQuery {
	offset?: number;
	limit?: number;
	orderBy?: string;
	sortOrder?: "ASC" | "DESC";
	fields?: string;
}

interface LoanProductsPagedResponse<T> {
	pageItems?: T[];
	totalFilteredRecords?: number;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const rawPayload = await response.text();
	let payload: unknown = null;
	if (rawPayload) {
		try {
			payload = JSON.parse(rawPayload) as unknown;
		} catch {
			payload = rawPayload;
		}
	}

	if (!response.ok) {
		throw normalizeApiError({
			status: response.status,
			data: payload ?? response.statusText,
			headers: response.headers,
			message: response.statusText || "Request failed",
		});
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
	async list<T = unknown>(
		tenantId: string,
		query?: LoanProductsListQuery,
	): Promise<T[] | LoanProductsPagedResponse<T>> {
		const params = new URLSearchParams();
		if (query?.offset !== undefined) {
			params.set("offset", String(query.offset));
		}
		if (query?.limit !== undefined) {
			params.set("limit", String(query.limit));
		}
		if (query?.orderBy) {
			params.set("orderBy", query.orderBy);
		}
		if (query?.sortOrder) {
			params.set("sortOrder", query.sortOrder);
		}
		if (query?.fields) {
			params.set("fields", query.fields);
		}

		const url = params.size
			? `${BFF_ROUTES.loanProducts}?${params.toString()}`
			: BFF_ROUTES.loanProducts;

		const response = await fetch(url, {
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
	async update(
		tenantId: string,
		chargeId: number,
		payload: PutChargesChargeIdRequest,
	) {
		const response = await fetch(BFF_ROUTES.chargeById(chargeId), {
			method: "PUT",
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

	const paymentChannelToFundSourceMappings =
		data.accountingRule >= 2 &&
		data.paymentChannelToFundSourceMappings.length > 0
			? data.paymentChannelToFundSourceMappings.map((mapping) => ({
					paymentTypeId: mapping.paymentTypeId,
					fundSourceAccountId: mapping.fundSourceAccountId,
				}))
			: undefined;

	const supportsChargeOffBehaviour = data.loanScheduleType === "PROGRESSIVE";

	const chargeOffReasonToExpenseAccountMappings =
		supportsChargeOffBehaviour &&
		data.chargeOffReasonToExpenseMappings.length > 0
			? data.chargeOffReasonToExpenseMappings.map((mapping) => ({
					chargeOffReasonCodeValueId: mapping.reasonCodeValueId,
					expenseAccountId: mapping.expenseAccountId,
				}))
			: undefined;

	const writeOffReasonsToExpenseMappings =
		supportsChargeOffBehaviour &&
		data.writeOffReasonToExpenseMappings.length > 0
			? data.writeOffReasonToExpenseMappings.map((mapping) => ({
					writeOffReasonCodeValueId: String(mapping.reasonCodeValueId),
					expenseAccountId: String(mapping.expenseAccountId),
				}))
			: undefined;

	const request: PostLoanProductsRequest = {
		locale: "en",
		name: data.name,
		shortName: data.shortName,
		description: data.description,
		includeInBorrowerCycle: data.includeInBorrowerCycle,
		useBorrowerCycle: data.useBorrowerCycle,
		canUseForTopup: data.canUseForTopup,
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
		chargeOffBehaviour: supportsChargeOffBehaviour
			? data.chargeOffBehaviour
			: undefined,
		chargeOffReasonToExpenseAccountMappings,
		writeOffReasonsToExpenseMappings,
		supportedInterestRefundTypes,
		paymentAllocation,
		creditAllocation,
		paymentChannelToFundSourceMappings,
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

	if (data.syncExpectedWithDisbursementDate !== undefined) {
		(
			request as PostLoanProductsRequest & {
				syncExpectedWithDisbursementDate?: boolean;
			}
		).syncExpectedWithDisbursementDate = data.syncExpectedWithDisbursementDate;
	}

	return request;
}
