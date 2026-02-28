import { isValid, parse, parseISO, startOfDay } from "date-fns";
import type { ValidationFieldIssue } from "@/lib/fineract/api-error-response";
import type {
	GetLoanProductsProductIdResponse,
	GetLoanRescheduleRequestResponse,
	GetLoansLoanIdRepaymentPeriod,
	GetLoansLoanIdResponse,
	PostCreateRescheduleLoansRequest,
	PostLoansDisbursementData,
	PostUpdateRescheduleLoansRequest,
} from "@/lib/fineract/generated/types.gen";

const FINERACT_DATE_FORMAT = "dd MMMM yyyy";

export type TopupLoanPayload = {
	clientId?: number;
	disbursementData?: Array<PostLoansDisbursementData>;
	expectedDisbursementDate?: string;
	isTopup?: boolean;
	loanIdToClose?: number;
	principal?: number;
	productId?: number;
	submittedOnDate?: string;
};

export type RescheduleCreatePayload = PostCreateRescheduleLoansRequest & {
	emi?: number;
	endDate?: string;
	recalculateInterest?: boolean;
	rescheduleFromInstallment?: number;
};

export interface TopupValidationContext {
	loanToClose?: GetLoansLoanIdResponse | null;
	loanToCloseProduct?: GetLoanProductsProductIdResponse | null;
	newLoanProduct?: GetLoanProductsProductIdResponse | null;
	payload: TopupLoanPayload;
}

export interface RescheduleCreateValidationContext {
	loan?: GetLoansLoanIdResponse | null;
	loanProduct?: GetLoanProductsProductIdResponse | null;
	payload: RescheduleCreatePayload;
}

export interface RescheduleDecisionValidationContext {
	command?: string | null;
	loan?: GetLoansLoanIdResponse | null;
	payload: PostUpdateRescheduleLoansRequest;
	request?: GetLoanRescheduleRequestResponse | null;
}

function toPositiveNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function parseDateValue(value: unknown): Date | null {
	if (!value) return null;

	if (value instanceof Date && isValid(value)) {
		return startOfDay(value);
	}

	if (Array.isArray(value) && value.length >= 3) {
		const [year, month, day] = value;
		if (
			typeof year === "number" &&
			typeof month === "number" &&
			typeof day === "number"
		) {
			const date = new Date(year, month - 1, day);
			return isValid(date) ? startOfDay(date) : null;
		}
	}

	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	const parseAttempts = [
		() => parseISO(trimmed),
		() => parse(trimmed, FINERACT_DATE_FORMAT, new Date()),
		() => new Date(trimmed),
	];

	for (const parseAttempt of parseAttempts) {
		const date = parseAttempt();
		if (isValid(date)) {
			return startOfDay(date);
		}
	}

	return null;
}

function maxDate(dates: Array<Date | null | undefined>): Date | null {
	const valid = dates.filter((date): date is Date => Boolean(date));
	if (valid.length === 0) return null;
	return valid.reduce((latest, current) =>
		current.getTime() > latest.getTime() ? current : latest,
	);
}

function readLoanDisbursedOnDate(loan: GetLoansLoanIdResponse): Date | null {
	const timeline = (loan.timeline || {}) as Record<string, unknown>;
	const dynamicLoan = loan as Record<string, unknown>;
	const disbursementTxnDate = (loan.transactions || [])
		.filter((txn) => txn.type?.disbursement === true && !txn.manuallyReversed)
		.map((txn) =>
			parseDateValue(txn.transactionDate || txn.date || txn.submittedOnDate),
		)
		.find((date): date is Date => Boolean(date));

	return maxDate([
		parseDateValue(timeline.disbursedOnDate),
		parseDateValue(timeline.actualDisbursementDate),
		parseDateValue(dynamicLoan.disbursedOnDate),
		disbursementTxnDate,
		parseDateValue(loan.timeline?.expectedDisbursementDate),
	]);
}

function readLoanLastUserTransactionDate(
	loan: GetLoansLoanIdResponse,
): Date | null {
	const lastTxn = (loan.transactions || [])
		.filter((txn) => {
			if (txn.manuallyReversed) return false;
			if (txn.type?.accrual) return false;
			if (txn.type?.contra) return false;
			return true;
		})
		.map((txn) =>
			parseDateValue(txn.transactionDate || txn.date || txn.submittedOnDate),
		)
		.filter((date): date is Date => Boolean(date))
		.sort((a, b) => b.getTime() - a.getTime())[0];

	return lastTxn || readLoanDisbursedOnDate(loan);
}

function readLoanOutstandingAmount(loan: GetLoansLoanIdResponse): number {
	return (
		loan.summary?.totalOutstanding ??
		loan.summary?.principalOutstanding ??
		loan.summary?.totalExpectedRepayment ??
		0
	);
}

function readFirstDisbursalAmount(
	payload: TopupLoanPayload,
): number | undefined {
	const firstTranchePrincipal = payload.disbursementData
		?.map((item) => item.principal)
		.find((principal): principal is number => typeof principal === "number");

	return firstTranchePrincipal ?? payload.principal;
}

function readInstallmentOutstanding(
	installment: GetLoansLoanIdRepaymentPeriod,
): number {
	return (
		installment.totalOutstandingForPeriod ??
		(installment.principalOutstanding || 0) +
			(installment.interestOutstanding || 0) +
			(installment.feeChargesOutstanding || 0) +
			(installment.penaltyChargesOutstanding || 0)
	);
}

function readInstallments(loan?: GetLoansLoanIdResponse | null) {
	return loan?.repaymentSchedule?.periods || [];
}

function findInstallmentByDueDate(
	periods: Array<GetLoansLoanIdRepaymentPeriod>,
	dateValue: Date,
): GetLoansLoanIdRepaymentPeriod | undefined {
	return periods.find((period) => {
		const periodDate = parseDateValue(period.dueDate);
		return periodDate !== null && periodDate.getTime() === dateValue.getTime();
	});
}

function findInstallmentByNumber(
	periods: Array<GetLoansLoanIdRepaymentPeriod>,
	installmentNumber: number,
): GetLoansLoanIdRepaymentPeriod | undefined {
	return periods.find((period) => period.period === installmentNumber);
}

function isProgressiveLoan(loan?: GetLoansLoanIdResponse | null): boolean {
	const code = (
		loan?.loanScheduleType?.code ||
		loan?.loanScheduleType?.value ||
		""
	).toUpperCase();
	return code.includes("PROGRESSIVE");
}

export function validateTopupRules(
	context: TopupValidationContext,
): ValidationFieldIssue[] {
	const { payload, loanToClose, newLoanProduct, loanToCloseProduct } = context;
	const issues: ValidationFieldIssue[] = [];

	if (!payload.isTopup) {
		return issues;
	}

	if (!newLoanProduct?.canUseForTopup) {
		issues.push({
			field: "productId",
			message: "Selected loan product is not enabled for top-up.",
			code: "TOPUP_PRODUCT_NOT_ALLOWED",
		});
	}

	if (!payload.loanIdToClose || payload.loanIdToClose <= 0) {
		issues.push({
			field: "loanIdToClose",
			message: "loanIdToClose is required when isTopup is true.",
			code: "TOPUP_TARGET_REQUIRED",
		});
	}

	if (!loanToClose) {
		issues.push({
			field: "loanIdToClose",
			message: "Target loan to close was not found.",
			code: "TOPUP_TARGET_NOT_FOUND",
		});
		return issues;
	}

	if (
		typeof payload.clientId === "number" &&
		typeof loanToClose.clientId === "number" &&
		payload.clientId !== loanToClose.clientId
	) {
		issues.push({
			field: "loanIdToClose",
			message: "Top-up loan must belong to the same client as the new loan.",
			code: "TOPUP_CLIENT_MISMATCH",
		});
	}

	if (!loanToClose.status?.active) {
		issues.push({
			field: "loanIdToClose",
			message: "Only active loans can be selected for top-up closure.",
			code: "TOPUP_TARGET_NOT_ACTIVE",
		});
	}

	const newCurrency = newLoanProduct?.currency?.code;
	const oldCurrency = loanToClose.currency?.code;
	if (newCurrency && oldCurrency && newCurrency !== oldCurrency) {
		issues.push({
			field: "loanIdToClose",
			message: "Top-up loan currency must match the new loan currency.",
			code: "TOPUP_CURRENCY_MISMATCH",
		});
	}

	const submittedOn = parseDateValue(payload.submittedOnDate);
	const disbursementDate = parseDateValue(payload.expectedDisbursementDate);
	const disbursedOnOldLoan = readLoanDisbursedOnDate(loanToClose);
	const lastUserTxnDate = readLoanLastUserTransactionDate(loanToClose);

	if (
		submittedOn &&
		disbursedOnOldLoan &&
		submittedOn.getTime() <= disbursedOnOldLoan.getTime()
	) {
		issues.push({
			field: "submittedOnDate",
			message:
				"submittedOnDate must be later than the old loan disbursement date.",
			code: "TOPUP_SUBMISSION_DATE_INVALID",
		});
	}

	if (
		disbursementDate &&
		lastUserTxnDate &&
		disbursementDate.getTime() < lastUserTxnDate.getTime()
	) {
		issues.push({
			field: "expectedDisbursementDate",
			message:
				"expectedDisbursementDate must be on or after the old loan last transaction date.",
			code: "TOPUP_DISBURSAL_DATE_INVALID",
		});
	}

	const outstanding = readLoanOutstandingAmount(loanToClose);
	const firstDisbursalAmount = readFirstDisbursalAmount(payload);
	if (
		typeof firstDisbursalAmount === "number" &&
		outstanding > firstDisbursalAmount
	) {
		issues.push({
			field: "loanIdToClose",
			message:
				"Outstanding on target loan cannot exceed the first disbursal amount.",
			code: "TOPUP_OUTSTANDING_EXCEEDS_DISBURSAL",
		});
	}

	if (
		loanToCloseProduct?.multiDisburseLoan &&
		loanToCloseProduct?.isInterestRecalculationEnabled === false
	) {
		issues.push({
			field: "loanIdToClose",
			message:
				"Top-up is not supported for multi-tranche loans without interest recalculation.",
			code: "TOPUP_UNSUPPORTED_TARGET_SHAPE",
		});
	}

	if (
		typeof firstDisbursalAmount === "number" &&
		firstDisbursalAmount - outstanding < 0
	) {
		issues.push({
			field: "principal",
			message: "Net disbursal cannot be negative for a top-up loan.",
			code: "TOPUP_NEGATIVE_NET_DISBURSAL",
		});
	}

	return issues;
}

export function validateRescheduleCreateRules(
	context: RescheduleCreateValidationContext,
): ValidationFieldIssue[] {
	const { payload, loan, loanProduct } = context;
	const issues: ValidationFieldIssue[] = [];
	const isProgressive = isProgressiveLoan(loan);
	const periods = readInstallments(loan);

	if (!loan?.status?.active) {
		issues.push({
			field: "loanId",
			message: "Loan restructure is allowed only for active loans.",
			code: "RESCHEDULE_LOAN_NOT_ACTIVE",
		});
	}

	if (loan?.chargedOff) {
		issues.push({
			field: "loanId",
			message: "Loan restructure is not allowed on charged-off loans.",
			code: "RESCHEDULE_LOAN_CHARGED_OFF",
		});
	}

	if (!payload.submittedOnDate) {
		issues.push({
			field: "submittedOnDate",
			message: "submittedOnDate is required.",
			code: "RESCHEDULE_SUBMITTED_ON_REQUIRED",
		});
	}

	if (!payload.rescheduleFromDate) {
		issues.push({
			field: "rescheduleFromDate",
			message: "rescheduleFromDate is required.",
			code: "RESCHEDULE_FROM_DATE_REQUIRED",
		});
	}

	if (!payload.rescheduleReasonId || payload.rescheduleReasonId <= 0) {
		issues.push({
			field: "rescheduleReasonId",
			message: "rescheduleReasonId must be greater than zero.",
			code: "RESCHEDULE_REASON_REQUIRED",
		});
	}

	const submittedOn = parseDateValue(payload.submittedOnDate);
	const rescheduleFromDate = parseDateValue(payload.rescheduleFromDate);
	const adjustedDueDate = parseDateValue(payload.adjustedDueDate);
	const endDate = parseDateValue(payload.endDate);
	const disbursedOn = loan ? readLoanDisbursedOnDate(loan) : null;

	if (
		submittedOn &&
		disbursedOn &&
		submittedOn.getTime() < disbursedOn.getTime()
	) {
		issues.push({
			field: "submittedOnDate",
			message: "submittedOnDate must be on or after loan disbursement date.",
			code: "RESCHEDULE_SUBMITTED_BEFORE_DISBURSAL",
		});
	}

	if (rescheduleFromDate) {
		const anchorInstallment = findInstallmentByDueDate(
			periods,
			rescheduleFromDate,
		);
		if (!anchorInstallment) {
			issues.push({
				field: "rescheduleFromDate",
				message:
					"rescheduleFromDate must match an existing installment due date.",
				code: "RESCHEDULE_ANCHOR_INSTALLMENT_NOT_FOUND",
			});
		} else if (readInstallmentOutstanding(anchorInstallment) <= 0) {
			issues.push({
				field: "rescheduleFromDate",
				message:
					"Installment at rescheduleFromDate is fully paid and cannot be used as anchor.",
				code: "RESCHEDULE_ANCHOR_INSTALLMENT_PAID",
			});
		}
	}

	if (
		typeof payload.rescheduleFromInstallment === "number" &&
		payload.rescheduleFromInstallment > 0
	) {
		const anchorByInstallment = findInstallmentByNumber(
			periods,
			payload.rescheduleFromInstallment,
		);
		if (!anchorByInstallment) {
			issues.push({
				field: "rescheduleFromInstallment",
				message:
					"rescheduleFromInstallment must reference an existing installment.",
				code: "RESCHEDULE_ANCHOR_INSTALLMENT_NUMBER_NOT_FOUND",
			});
		} else if (readInstallmentOutstanding(anchorByInstallment) <= 0) {
			issues.push({
				field: "rescheduleFromInstallment",
				message:
					"rescheduleFromInstallment must reference an unpaid installment.",
				code: "RESCHEDULE_ANCHOR_INSTALLMENT_NUMBER_PAID",
			});
		}
	}

	const hasGraceOnPrincipal = payload.graceOnPrincipal !== undefined;
	const hasGraceOnInterest = payload.graceOnInterest !== undefined;
	const hasExtraTerms = payload.extraTerms !== undefined;
	const hasNewInterestRate = payload.newInterestRate !== undefined;
	const hasAdjustedDueDate = Boolean(payload.adjustedDueDate);
	const emiValue = toPositiveNumber(payload.emi);
	const hasEmi = payload.emi !== undefined;
	const hasEndDate = Boolean(payload.endDate);

	const changeCount = [
		hasGraceOnPrincipal,
		hasGraceOnInterest,
		hasExtraTerms,
		hasNewInterestRate,
		hasAdjustedDueDate,
		hasEmi,
	].filter(Boolean).length;

	if (changeCount < 1) {
		issues.push({
			field: "rescheduleFromDate",
			message:
				"At least one change is required (grace, extra terms, interest rate, adjusted due date, or EMI).",
			code: "RESCHEDULE_NO_CHANGES_PROVIDED",
		});
	}

	if (
		adjustedDueDate &&
		rescheduleFromDate &&
		adjustedDueDate.getTime() < rescheduleFromDate.getTime()
	) {
		issues.push({
			field: "adjustedDueDate",
			message: "adjustedDueDate must be on or after rescheduleFromDate.",
			code: "RESCHEDULE_ADJUSTED_DUE_DATE_INVALID",
		});
	}

	if (hasEmi !== hasEndDate) {
		issues.push({
			field: "emi",
			message: "EMI and endDate must be provided together.",
			code: "RESCHEDULE_EMI_ENDDATE_COUPLING",
		});
	}

	if (hasEmi && (!emiValue || emiValue <= 0)) {
		issues.push({
			field: "emi",
			message: "emi must be greater than zero.",
			code: "RESCHEDULE_EMI_INVALID",
		});
	}

	if (hasEndDate && endDate) {
		const endInstallment = findInstallmentByDueDate(periods, endDate);
		if (!endInstallment) {
			issues.push({
				field: "endDate",
				message: "endDate must match an existing installment due date.",
				code: "RESCHEDULE_END_DATE_INSTALLMENT_NOT_FOUND",
			});
		}
	}

	if (payload.graceOnPrincipal !== undefined && payload.graceOnPrincipal <= 0) {
		issues.push({
			field: "graceOnPrincipal",
			message: "graceOnPrincipal must be greater than zero.",
			code: "RESCHEDULE_GRACE_ON_PRINCIPAL_INVALID",
		});
	}

	if (payload.graceOnInterest !== undefined && payload.graceOnInterest <= 0) {
		issues.push({
			field: "graceOnInterest",
			message: "graceOnInterest must be greater than zero.",
			code: "RESCHEDULE_GRACE_ON_INTEREST_INVALID",
		});
	}

	if (payload.extraTerms !== undefined && payload.extraTerms <= 0) {
		issues.push({
			field: "extraTerms",
			message: "extraTerms must be greater than zero.",
			code: "RESCHEDULE_EXTRA_TERMS_INVALID",
		});
	}

	if (!isProgressive && payload.newInterestRate !== undefined) {
		const currentRate = loan?.interestRatePerPeriod ?? 0;
		if (currentRate === 0 && payload.newInterestRate !== 0) {
			issues.push({
				field: "newInterestRate",
				message:
					"Current interest rate is zero; non-zero newInterestRate is not allowed.",
				code: "RESCHEDULE_NEW_RATE_NOT_ALLOWED_FOR_ZERO_RATE_LOAN",
			});
		}
		if (currentRate !== 0 && payload.newInterestRate <= 0) {
			issues.push({
				field: "newInterestRate",
				message: "newInterestRate must be greater than zero.",
				code: "RESCHEDULE_NEW_RATE_INVALID",
			});
		}
	}

	if (rescheduleFromDate) {
		const hasOverdueBeforeAnchor = periods.some((period) => {
			const dueDate = parseDateValue(period.dueDate);
			if (!dueDate || dueDate.getTime() >= rescheduleFromDate.getTime()) {
				return false;
			}
			return (
				(period.feeChargesOutstanding || 0) > 0 ||
				(period.penaltyChargesOutstanding || 0) > 0
			);
		});
		if (hasOverdueBeforeAnchor) {
			issues.push({
				field: "rescheduleFromDate",
				message:
					"Overdue installment charges conflict with the selected reschedule boundary.",
				code: "RESCHEDULE_OVERDUE_CHARGE_CONFLICT",
			});
		}
	}

	if (
		loanProduct?.multiDisburseLoan &&
		loanProduct?.isInterestRecalculationEnabled === false
	) {
		issues.push({
			field: "loanId",
			message:
				"Unsupported multi-disbursement loan configuration for restructure.",
			code: "RESCHEDULE_MULTI_DISBURSE_UNSUPPORTED",
		});
	}

	if (isProgressive) {
		const progressiveOperationCount = [
			payload.newInterestRate !== undefined,
			Boolean(payload.adjustedDueDate),
			payload.extraTerms !== undefined,
		].filter(Boolean).length;

		if (progressiveOperationCount !== 1) {
			issues.push({
				field: "rescheduleFromDate",
				message:
					"Progressive loans require exactly one operation per request (interest rate change, adjusted due date, or extra terms).",
				code: "PROGRESSIVE_RESCHEDULE_SINGLE_OPERATION_REQUIRED",
			});
		}

		if (payload.graceOnPrincipal !== undefined) {
			issues.push({
				field: "graceOnPrincipal",
				message: "graceOnPrincipal is not supported for progressive loans.",
				code: "PROGRESSIVE_RESCHEDULE_UNSUPPORTED_FIELD",
			});
		}

		if (payload.graceOnInterest !== undefined) {
			issues.push({
				field: "graceOnInterest",
				message: "graceOnInterest is not supported for progressive loans.",
				code: "PROGRESSIVE_RESCHEDULE_UNSUPPORTED_FIELD",
			});
		}

		if (payload.emi !== undefined) {
			issues.push({
				field: "emi",
				message: "emi is not supported for progressive loans.",
				code: "PROGRESSIVE_RESCHEDULE_UNSUPPORTED_FIELD",
			});
		}

		if (payload.newInterestRate !== undefined) {
			if (payload.newInterestRate < 0) {
				issues.push({
					field: "newInterestRate",
					message: "newInterestRate must be greater than or equal to zero.",
					code: "PROGRESSIVE_RESCHEDULE_RATE_INVALID",
				});
			}

			if (
				typeof loanProduct?.minInterestRatePerPeriod === "number" &&
				payload.newInterestRate < loanProduct.minInterestRatePerPeriod
			) {
				issues.push({
					field: "newInterestRate",
					message: `newInterestRate must be at least ${loanProduct.minInterestRatePerPeriod}.`,
					code: "PROGRESSIVE_RESCHEDULE_RATE_BELOW_MIN",
				});
			}

			if (
				typeof loanProduct?.maxInterestRatePerPeriod === "number" &&
				payload.newInterestRate > loanProduct.maxInterestRatePerPeriod
			) {
				issues.push({
					field: "newInterestRate",
					message: `newInterestRate must not exceed ${loanProduct.maxInterestRatePerPeriod}.`,
					code: "PROGRESSIVE_RESCHEDULE_RATE_ABOVE_MAX",
				});
			}
		}

		if (
			typeof payload.extraTerms === "number" &&
			typeof loanProduct?.maxNumberOfRepayments === "number" &&
			typeof loan?.numberOfRepayments === "number"
		) {
			const allowedExtraTerms =
				loanProduct.maxNumberOfRepayments - loan.numberOfRepayments;
			if (payload.extraTerms > allowedExtraTerms) {
				issues.push({
					field: "extraTerms",
					message: `extraTerms cannot exceed ${allowedExtraTerms} for this progressive loan.`,
					code: "PROGRESSIVE_RESCHEDULE_EXTRA_TERMS_EXCEEDS_LIMIT",
				});
			}
		}
	}

	return issues;
}

export function validateRescheduleDecisionRules(
	context: RescheduleDecisionValidationContext,
): ValidationFieldIssue[] {
	const { command, payload, request, loan } = context;
	const issues: ValidationFieldIssue[] = [];
	const normalizedCommand = (command || "").toLowerCase();

	if (!request) {
		issues.push({
			field: "scheduleId",
			message: "Reschedule request was not found.",
			code: "RESCHEDULE_REQUEST_NOT_FOUND",
		});
		return issues;
	}

	if (!request.statusEnum?.pendingApproval) {
		issues.push({
			field: "scheduleId",
			message: "Reschedule request must be in pending approval state.",
			code: "RESCHEDULE_REQUEST_NOT_PENDING",
		});
	}

	const submittedOnRequest = parseDateValue(request.timeline?.submittedOnDate);

	if (normalizedCommand === "approve") {
		const approvedOn = parseDateValue(payload.approvedOnDate);
		if (!payload.approvedOnDate) {
			issues.push({
				field: "approvedOnDate",
				message: "approvedOnDate is required for approve command.",
				code: "RESCHEDULE_APPROVED_ON_REQUIRED",
			});
		} else if (
			approvedOn &&
			submittedOnRequest &&
			approvedOn.getTime() < submittedOnRequest.getTime()
		) {
			issues.push({
				field: "approvedOnDate",
				message:
					"approvedOnDate must be on or after the request submitted date.",
				code: "RESCHEDULE_APPROVED_ON_INVALID",
			});
		}
	}

	if (normalizedCommand === "reject") {
		const rejectedOn = parseDateValue(payload.rejectedOnDate);
		if (!payload.rejectedOnDate) {
			issues.push({
				field: "rejectedOnDate",
				message: "rejectedOnDate is required for reject command.",
				code: "RESCHEDULE_REJECTED_ON_REQUIRED",
			});
		} else if (
			rejectedOn &&
			submittedOnRequest &&
			rejectedOn.getTime() < submittedOnRequest.getTime()
		) {
			issues.push({
				field: "rejectedOnDate",
				message:
					"rejectedOnDate must be on or after the request submitted date.",
				code: "RESCHEDULE_REJECTED_ON_INVALID",
			});
		}
	}

	if (normalizedCommand === "approve" || normalizedCommand === "reject") {
		if (!loan?.status?.active) {
			issues.push({
				field: "loanId",
				message: "Loan must remain active at decision time.",
				code: "RESCHEDULE_LOAN_NOT_ACTIVE_AT_DECISION",
			});
		}

		if (loan?.chargedOff) {
			issues.push({
				field: "loanId",
				message:
					"Charged-off loans cannot be approved/rejected for restructure.",
				code: "RESCHEDULE_LOAN_CHARGED_OFF_AT_DECISION",
			});
		}

		const rescheduleFromDate = parseDateValue(request.rescheduleFromDate);
		if (rescheduleFromDate) {
			const anchorInstallment = findInstallmentByDueDate(
				readInstallments(loan),
				rescheduleFromDate,
			);
			if (!anchorInstallment) {
				issues.push({
					field: "scheduleId",
					message:
						"Revalidation failed: anchor installment no longer exists at approval time.",
					code: "RESCHEDULE_ANCHOR_NOT_FOUND_AT_DECISION",
				});
			} else if (readInstallmentOutstanding(anchorInstallment) <= 0) {
				issues.push({
					field: "scheduleId",
					message:
						"Revalidation failed: anchor installment is already fully paid.",
					code: "RESCHEDULE_ANCHOR_PAID_AT_DECISION",
				});
			}
		}
	}

	return issues;
}
