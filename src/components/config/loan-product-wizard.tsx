"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
	GetLoanProductsInterestRecalculationData,
	GetLoanProductsProductIdResponse,
	GetLoanProductsTemplateResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	buildLoanProductRequest,
	loanProductsApi,
} from "@/lib/fineract/loan-products";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import {
	type CreateLoanProductFormData,
	createLoanProductSchema,
	type FeeSelection,
	type PenaltySelection,
} from "@/lib/schemas/loan-product";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";
import { LoanProductAccountingStep } from "./loan-product-steps/LoanProductAccountingStep";
import { LoanProductAmountStep } from "./loan-product-steps/LoanProductAmountStep";
import { LoanProductFeesStep } from "./loan-product-steps/LoanProductFeesStep";
import { LoanProductIdentityStep } from "./loan-product-steps/LoanProductIdentityStep";
import { LoanProductInterestStep } from "./loan-product-steps/LoanProductInterestStep";
import { LoanProductPenaltiesStep } from "./loan-product-steps/LoanProductPenaltiesStep";
import { LoanProductScheduleStep } from "./loan-product-steps/LoanProductScheduleStep";

interface LoanProductWizardProps {
	currencies: string[];
	isOpen: boolean;
	onSubmit: (data: PostLoanProductsRequest) => Promise<void>;
	onCancel: () => void;
	isEditMode?: boolean;
	initialData?: Partial<CreateLoanProductFormData>;
	onUpdate?: (data: PostLoanProductsRequest) => Promise<void>;
}

const steps = [
	{ id: 1, name: "Identity & Currency" },
	{ id: 2, name: "Loan Amount Rules" },
	{ id: 3, name: "Tenure & Schedule" },
	{ id: 4, name: "Interest & Calculation" },
	{ id: 5, name: "Fees" },
	{ id: 6, name: "Penalties" },
	{ id: 7, name: "Delinquency, Accounting & Review" },
];

// Field names for each step - used for partial validation on Next click
const STEP_FIELDS: Record<number, (keyof CreateLoanProductFormData)[]> = {
	1: [
		"name",
		"shortName",
		"description",
		"currencyCode",
		"digitsAfterDecimal",
		"includeInBorrowerCycle",
		"useBorrowerCycle",
	],
	2: ["minPrincipal", "principal", "maxPrincipal", "inMultiplesOf"],
	3: [
		"minNumberOfRepayments",
		"numberOfRepayments",
		"maxNumberOfRepayments",
		"repaymentEvery",
		"repaymentFrequencyType",
		"repaymentStartDateType",
		"loanScheduleType",
		"loanScheduleProcessingType",
		"multiDisburseLoan",
		"maxTrancheCount",
		"disallowExpectedDisbursements",
		"allowFullTermForTranche",
		"syncExpectedWithDisbursementDate",
		"allowApprovedDisbursedAmountsOverApplied",
		"overAppliedCalculationType",
		"overAppliedNumber",
		"graceOnPrincipalPayment",
		"graceOnInterestPayment",
		"principalThresholdForLastInstallment",
		"minimumDaysBetweenDisbursalAndFirstRepayment",
	],
	4: [
		"interestType",
		"amortizationType",
		"interestRatePerPeriod",
		"interestRateFrequencyType",
		"interestCalculationPeriodType",
		"allowPartialPeriodInterestCalculation",
		"daysInYearType",
		"daysInMonthType",
		"isInterestRecalculationEnabled",
		"interestRecalculationCompoundingMethod",
		"rescheduleStrategyMethod",
		"preClosureInterestCalculationStrategy",
		"isArrearsBasedOnOriginalSchedule",
		"disallowInterestCalculationOnPastDue",
		"recalculationCompoundingFrequencyType",
		"recalculationCompoundingFrequencyInterval",
		"recalculationCompoundingFrequencyOnDayType",
		"recalculationRestFrequencyType",
		"recalculationRestFrequencyInterval",
	],
	5: ["fees"],
	6: ["penalties"],
	7: [
		"transactionProcessingStrategyCode",
		"graceOnArrearsAgeing",
		"inArrearsTolerance",
		"overdueDaysForNPA",
		"delinquencyBucketId",
		"accountMovesOutOfNPAOnlyOnArrearsCompletion",
		"enableIncomeCapitalization",
		"capitalizedIncomeType",
		"capitalizedIncomeCalculationType",
		"capitalizedIncomeStrategy",
		"enableBuyDownFee",
		"buyDownFeeIncomeType",
		"buyDownFeeCalculationType",
		"buyDownFeeStrategy",
		"merchantBuyDownFee",
		"chargeOffBehaviour",
		"chargeOffReasonToExpenseMappings",
		"writeOffReasonToExpenseMappings",
		"supportedInterestRefundTypes",
		"paymentAllocationTransactionTypes",
		"paymentAllocationRules",
		"paymentAllocationFutureInstallmentAllocationRule",
		"creditAllocationTransactionTypes",
		"creditAllocationRules",
		"accountingRule",
		"fundSourceAccountId",
		"loanPortfolioAccountId",
		"interestOnLoanAccountId",
		"incomeFromFeeAccountId",
		"incomeFromPenaltyAccountId",
		"writeOffAccountId",
		"receivableInterestAccountId",
		"receivableFeeAccountId",
		"receivablePenaltyAccountId",
		"incomeFromRecoveryAccountId",
		"overpaymentLiabilityAccountId",
		"transfersInSuspenseAccountId",
	],
};

function getTemplateCurrencyOptions(
	template?: GetLoanProductsTemplateResponse,
	allowedCurrencies?: string[],
) {
	const options = template?.currencyOptions || [];
	if (!allowedCurrencies?.length) return options;

	return options.filter(
		(option) => option.code && allowedCurrencies.includes(option.code),
	);
}

function isChargeOffBehaviour(
	value: string | undefined,
): value is "REGULAR" | "ZERO_INTEREST" | "ACCELERATE_MATURITY" {
	return (
		value === "REGULAR" ||
		value === "ZERO_INTEREST" ||
		value === "ACCELERATE_MATURITY"
	);
}

type LoanProductTemplateAdvanced = GetLoanProductsTemplateResponse &
	Partial<GetLoanProductsProductIdResponse> & {
		overAppliedNumber?: number;
		syncExpectedWithDisbursementDate?: boolean;
		graceOnPrincipalPayment?: number;
		graceOnInterestPayment?: number;
		principalThresholdForLastInstallment?: number;
		accountMovesOutOfNPAOnlyOnArrearsCompletion?: boolean;
		chargeOffBehaviour?: {
			id?: string;
		};
		chargeOffReasonToExpenseAccountMappings?: Array<{
			reasonCodeValue?: { id?: number };
			expenseAccount?: { id?: number };
		}>;
		writeOffReasonsToExpenseMappings?: Array<{
			reasonCodeValue?: { id?: number };
			expenseAccount?: { id?: number };
		}>;
		supportedInterestRefundTypes?: Array<{
			id?: string;
			code?: string;
			value?: string;
		}>;
		paymentAllocation?: Array<{
			transactionType?: string;
			futureInstallmentAllocationRule?: string;
			paymentAllocationOrder?: Array<{
				order?: number;
				paymentAllocationRule?: string;
			}>;
		}>;
		creditAllocation?: Array<{
			transactionType?: string;
			creditAllocationOrder?: Array<{
				order?: number;
				creditAllocationRule?: string;
			}>;
		}>;
		interestRecalculationData?: GetLoanProductsInterestRecalculationData;
	};

export function LoanProductWizard({
	currencies,
	isOpen,
	onSubmit,
	onCancel,
	isEditMode = false,
	initialData,
	onUpdate,
}: LoanProductWizardProps) {
	const { tenantId } = useTenantStore();
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [draftMessage, setDraftMessage] = useState<string | null>(null);

	const templateQuery = useQuery({
		queryKey: ["loanProductTemplate", tenantId],
		queryFn: () => loanProductsApi.getTemplate(tenantId),
		enabled: isOpen,
		staleTime: 1000 * 60 * 5,
	});

	const template = templateQuery.data;
	const currencyOptions = useMemo(
		() => getTemplateCurrencyOptions(template, currencies),
		[template, currencies],
	);

	// Build safe default values ensuring no undefined arrays
	const baseDefaults = {
		fees: [] as FeeSelection[],
		penalties: [] as PenaltySelection[],
		inMultiplesOf: 1,
		includeInBorrowerCycle: false,
		useBorrowerCycle: false,
		multiDisburseLoan: false,
		disallowExpectedDisbursements: false,
		allowFullTermForTranche: false,
		syncExpectedWithDisbursementDate: false,
		allowApprovedDisbursedAmountsOverApplied: false,
		allowPartialPeriodInterestCalculation: false,
		graceOnArrearsAgeing: 0,
		inArrearsTolerance: 0,
		overdueDaysForNPA: 0,
		daysInYearType: 365,
		daysInMonthType: 30,
		isInterestRecalculationEnabled: false,
		isArrearsBasedOnOriginalSchedule: false,
		disallowInterestCalculationOnPastDue: false,
		accountMovesOutOfNPAOnlyOnArrearsCompletion: false,
		enableIncomeCapitalization: false,
		enableBuyDownFee: false,
		merchantBuyDownFee: false,
		chargeOffReasonToExpenseMappings: [] as Array<{
			reasonCodeValueId: number;
			expenseAccountId: number;
		}>,
		writeOffReasonToExpenseMappings: [] as Array<{
			reasonCodeValueId: number;
			expenseAccountId: number;
		}>,
		supportedInterestRefundTypes: [] as string[],
		paymentAllocationTransactionTypes: [] as string[],
		paymentAllocationRules: [] as string[],
		creditAllocationTransactionTypes: [] as string[],
		creditAllocationRules: [] as string[],
	};

	const defaultFormValues = {
		...baseDefaults,
		...(initialData ?? {}),
		// Ensure arrays are never undefined
		fees: initialData?.fees ?? [],
		penalties: initialData?.penalties ?? [],
	} as unknown as CreateLoanProductFormData;

	// Single form instance for the entire wizard
	const form = useForm<CreateLoanProductFormData>({
		// @ts-expect-error - Resolver type incompatibility due to optional arrays with .default() in merged schema
		resolver: zodResolver(createLoanProductSchema),
		mode: "onChange",
		shouldUnregister: false, // Preserve values when fields unmount
		defaultValues: defaultFormValues,
	});

	const { setValue, getValues, trigger } = form;
	const submitActionLabel = isEditMode
		? "Update Loan Product"
		: "Submit Loan Product";
	const submittingLabel = isEditMode ? "Updating..." : "Submitting...";
	const submitErrorTitle = isEditMode
		? "Failed to update loan product"
		: "Failed to create loan product";

	const currencyCode = form.watch("currencyCode");

	// Set template defaults when template loads
	useEffect(() => {
		if (!template) return;
		const templateAdvanced = template as LoanProductTemplateAdvanced;

		if (!getValues("currencyCode") && currencyOptions[0]?.code) {
			setValue("currencyCode", currencyOptions[0]?.code);
		}

		if (
			getValues("digitsAfterDecimal") === undefined &&
			currencyOptions[0]?.decimalPlaces !== undefined
		) {
			setValue("digitsAfterDecimal", currencyOptions[0].decimalPlaces);
		}

		if (
			getValues("repaymentFrequencyType") === undefined &&
			template.repaymentFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"repaymentFrequencyType",
				template.repaymentFrequencyTypeOptions[0].id,
			);
		}

		if (
			getValues("repaymentStartDateType") === undefined &&
			templateAdvanced.repaymentStartDateType?.id !== undefined
		) {
			setValue(
				"repaymentStartDateType",
				templateAdvanced.repaymentStartDateType.id,
			);
		}

		if (
			getValues("repaymentStartDateType") === undefined &&
			template.repaymentStartDateTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"repaymentStartDateType",
				template.repaymentStartDateTypeOptions[0].id,
			);
		}

		if (
			!getValues("loanScheduleType") &&
			template.loanScheduleTypeOptions?.[0]?.code
		) {
			setValue("loanScheduleType", template.loanScheduleTypeOptions[0].code);
		}

		if (
			!getValues("loanScheduleProcessingType") &&
			template.loanScheduleProcessingTypeOptions?.[0]?.code
		) {
			setValue(
				"loanScheduleProcessingType",
				template.loanScheduleProcessingTypeOptions[0].code,
			);
		}

		if (getValues("multiDisburseLoan") === undefined) {
			setValue(
				"multiDisburseLoan",
				Boolean(templateAdvanced.multiDisburseLoan),
			);
		}

		if (getValues("disallowExpectedDisbursements") === undefined) {
			setValue(
				"disallowExpectedDisbursements",
				Boolean(templateAdvanced.disallowExpectedDisbursements),
			);
		}

		if (getValues("allowFullTermForTranche") === undefined) {
			setValue(
				"allowFullTermForTranche",
				Boolean(templateAdvanced.allowFullTermForTranche),
			);
		}

		if (getValues("syncExpectedWithDisbursementDate") === undefined) {
			setValue(
				"syncExpectedWithDisbursementDate",
				Boolean(templateAdvanced.syncExpectedWithDisbursementDate),
			);
		}

		if (getValues("allowApprovedDisbursedAmountsOverApplied") === undefined) {
			setValue(
				"allowApprovedDisbursedAmountsOverApplied",
				Boolean(templateAdvanced.allowApprovedDisbursedAmountsOverApplied),
			);
		}

		if (
			Boolean(templateAdvanced.allowApprovedDisbursedAmountsOverApplied) &&
			!getValues("overAppliedCalculationType")
		) {
			const templateValue = (templateAdvanced.overAppliedCalculationType || "")
				.toLowerCase()
				.trim();
			if (templateValue === "flat" || templateValue === "percentage") {
				setValue("overAppliedCalculationType", templateValue);
			}
		}

		if (
			getValues("overAppliedNumber") === undefined &&
			templateAdvanced.overAppliedNumber !== undefined
		) {
			setValue("overAppliedNumber", templateAdvanced.overAppliedNumber);
		}

		if (
			getValues("graceOnPrincipalPayment") === undefined &&
			templateAdvanced.graceOnPrincipalPayment !== undefined
		) {
			setValue(
				"graceOnPrincipalPayment",
				templateAdvanced.graceOnPrincipalPayment,
			);
		}

		if (
			getValues("graceOnInterestPayment") === undefined &&
			templateAdvanced.graceOnInterestPayment !== undefined
		) {
			setValue(
				"graceOnInterestPayment",
				templateAdvanced.graceOnInterestPayment,
			);
		}

		if (
			getValues("principalThresholdForLastInstallment") === undefined &&
			templateAdvanced.principalThresholdForLastInstallment !== undefined
		) {
			setValue(
				"principalThresholdForLastInstallment",
				templateAdvanced.principalThresholdForLastInstallment,
			);
		}

		if (
			getValues("interestType") === undefined &&
			template.interestTypeOptions?.[0]?.id !== undefined
		) {
			setValue("interestType", template.interestTypeOptions[0].id);
		}

		if (
			getValues("amortizationType") === undefined &&
			template.amortizationTypeOptions?.[0]?.id !== undefined
		) {
			setValue("amortizationType", template.amortizationTypeOptions[0].id);
		}

		if (
			getValues("interestRateFrequencyType") === undefined &&
			template.interestRateFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"interestRateFrequencyType",
				template.interestRateFrequencyTypeOptions[0].id,
			);
		}

		if (
			getValues("interestCalculationPeriodType") === undefined &&
			template.interestCalculationPeriodTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"interestCalculationPeriodType",
				template.interestCalculationPeriodTypeOptions[0].id,
			);
		}

		// Set daysInYearType default - prefer 365 if available
		if (getValues("daysInYearType") === undefined) {
			const yearOptions = template.daysInYearTypeOptions || [];
			const preferred = yearOptions.find((o) => o.id === 365);
			if (preferred?.id !== undefined) {
				setValue("daysInYearType", preferred.id);
			} else if (yearOptions[0]?.id !== undefined) {
				setValue("daysInYearType", yearOptions[0].id);
			}
		}

		// Set daysInMonthType default - prefer 30 if available
		if (getValues("daysInMonthType") === undefined) {
			const monthOptions = template.daysInMonthTypeOptions || [];
			const preferred = monthOptions.find((o) => o.id === "30");
			if (preferred?.id !== undefined) {
				setValue("daysInMonthType", Number(preferred.id));
			} else if (monthOptions[0]?.id !== undefined) {
				setValue("daysInMonthType", Number(monthOptions[0].id));
			}
		}

		if (getValues("isInterestRecalculationEnabled") === undefined) {
			setValue(
				"isInterestRecalculationEnabled",
				Boolean(template.isInterestRecalculationEnabled),
			);
		}

		const templateRecalculation = templateAdvanced.interestRecalculationData;

		if (
			getValues("interestRecalculationCompoundingMethod") === undefined &&
			templateRecalculation?.interestRecalculationCompoundingType?.id !==
				undefined
		) {
			setValue(
				"interestRecalculationCompoundingMethod",
				templateRecalculation.interestRecalculationCompoundingType.id,
			);
		}

		if (
			getValues("interestRecalculationCompoundingMethod") === undefined &&
			template.interestRecalculationCompoundingTypeOptions?.[0]?.id !==
				undefined
		) {
			setValue(
				"interestRecalculationCompoundingMethod",
				template.interestRecalculationCompoundingTypeOptions[0].id,
			);
		}

		if (
			getValues("rescheduleStrategyMethod") === undefined &&
			templateRecalculation?.rescheduleStrategyType?.id !== undefined
		) {
			setValue(
				"rescheduleStrategyMethod",
				templateRecalculation.rescheduleStrategyType.id,
			);
		}

		if (
			getValues("rescheduleStrategyMethod") === undefined &&
			template.rescheduleStrategyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"rescheduleStrategyMethod",
				template.rescheduleStrategyTypeOptions[0].id,
			);
		}

		if (
			getValues("preClosureInterestCalculationStrategy") === undefined &&
			templateRecalculation?.preClosureInterestCalculationStrategy?.id !==
				undefined
		) {
			setValue(
				"preClosureInterestCalculationStrategy",
				templateRecalculation.preClosureInterestCalculationStrategy.id,
			);
		}

		if (
			getValues("preClosureInterestCalculationStrategy") === undefined &&
			template.preClosureInterestCalculationStrategyOptions?.[0]?.id !==
				undefined
		) {
			setValue(
				"preClosureInterestCalculationStrategy",
				template.preClosureInterestCalculationStrategyOptions[0].id,
			);
		}

		if (getValues("isArrearsBasedOnOriginalSchedule") === undefined) {
			setValue(
				"isArrearsBasedOnOriginalSchedule",
				Boolean(templateRecalculation?.isArrearsBasedOnOriginalSchedule),
			);
		}

		if (getValues("disallowInterestCalculationOnPastDue") === undefined) {
			setValue(
				"disallowInterestCalculationOnPastDue",
				Boolean(templateRecalculation?.disallowInterestCalculationOnPastDue),
			);
		}

		if (
			getValues("accountMovesOutOfNPAOnlyOnArrearsCompletion") === undefined
		) {
			setValue(
				"accountMovesOutOfNPAOnlyOnArrearsCompletion",
				Boolean(templateAdvanced.accountMovesOutOfNPAOnlyOnArrearsCompletion),
			);
		}

		if (
			getValues("delinquencyBucketId") === undefined &&
			templateAdvanced.delinquencyBucketOptions?.[0]?.id !== undefined
		) {
			setValue(
				"delinquencyBucketId",
				templateAdvanced.delinquencyBucketOptions[0].id,
			);
		}

		if (getValues("enableIncomeCapitalization") === undefined) {
			setValue(
				"enableIncomeCapitalization",
				Boolean(templateAdvanced.enableIncomeCapitalization),
			);
		}

		if (
			getValues("capitalizedIncomeType") === undefined &&
			template.capitalizedIncomeType?.id !== undefined
		) {
			if (
				template.capitalizedIncomeType.id === "FEE" ||
				template.capitalizedIncomeType.id === "INTEREST"
			) {
				setValue("capitalizedIncomeType", template.capitalizedIncomeType.id);
			}
		}

		if (
			getValues("capitalizedIncomeType") === undefined &&
			template.capitalizedIncomeTypeOptions?.[0]?.id !== undefined
		) {
			const templateValue = template.capitalizedIncomeTypeOptions[0].id;
			if (templateValue === "FEE" || templateValue === "INTEREST") {
				setValue("capitalizedIncomeType", templateValue);
			}
		}

		if (
			getValues("capitalizedIncomeCalculationType") === undefined &&
			template.capitalizedIncomeCalculationType?.id !== undefined
		) {
			if (template.capitalizedIncomeCalculationType.id === "FLAT") {
				setValue(
					"capitalizedIncomeCalculationType",
					template.capitalizedIncomeCalculationType.id,
				);
			}
		}

		if (
			getValues("capitalizedIncomeCalculationType") === undefined &&
			template.capitalizedIncomeCalculationTypeOptions?.[0]?.id !== undefined
		) {
			if (template.capitalizedIncomeCalculationTypeOptions[0].id === "FLAT") {
				setValue(
					"capitalizedIncomeCalculationType",
					template.capitalizedIncomeCalculationTypeOptions[0].id,
				);
			}
		}

		if (
			getValues("capitalizedIncomeStrategy") === undefined &&
			template.capitalizedIncomeStrategy?.id !== undefined
		) {
			if (template.capitalizedIncomeStrategy.id === "EQUAL_AMORTIZATION") {
				setValue(
					"capitalizedIncomeStrategy",
					template.capitalizedIncomeStrategy.id,
				);
			}
		}

		if (
			getValues("capitalizedIncomeStrategy") === undefined &&
			template.capitalizedIncomeStrategyOptions?.[0]?.id !== undefined
		) {
			if (
				template.capitalizedIncomeStrategyOptions[0].id === "EQUAL_AMORTIZATION"
			) {
				setValue(
					"capitalizedIncomeStrategy",
					template.capitalizedIncomeStrategyOptions[0].id,
				);
			}
		}

		if (getValues("enableBuyDownFee") === undefined) {
			setValue("enableBuyDownFee", Boolean(templateAdvanced.enableBuyDownFee));
		}

		if (
			getValues("buyDownFeeIncomeType") === undefined &&
			template.buyDownFeeIncomeType?.id !== undefined
		) {
			if (
				template.buyDownFeeIncomeType.id === "FEE" ||
				template.buyDownFeeIncomeType.id === "INTEREST"
			) {
				setValue("buyDownFeeIncomeType", template.buyDownFeeIncomeType.id);
			}
		}

		if (
			getValues("buyDownFeeIncomeType") === undefined &&
			template.buyDownFeeIncomeTypeOptions?.[0]?.id !== undefined
		) {
			const templateValue = template.buyDownFeeIncomeTypeOptions[0].id;
			if (templateValue === "FEE" || templateValue === "INTEREST") {
				setValue("buyDownFeeIncomeType", templateValue);
			}
		}

		if (
			getValues("buyDownFeeCalculationType") === undefined &&
			template.buyDownFeeCalculationType?.id !== undefined
		) {
			if (template.buyDownFeeCalculationType.id === "FLAT") {
				setValue(
					"buyDownFeeCalculationType",
					template.buyDownFeeCalculationType.id,
				);
			}
		}

		if (
			getValues("buyDownFeeCalculationType") === undefined &&
			template.buyDownFeeCalculationTypeOptions?.[0]?.id !== undefined
		) {
			if (template.buyDownFeeCalculationTypeOptions[0].id === "FLAT") {
				setValue(
					"buyDownFeeCalculationType",
					template.buyDownFeeCalculationTypeOptions[0].id,
				);
			}
		}

		if (
			getValues("buyDownFeeStrategy") === undefined &&
			template.buyDownFeeStrategy?.id !== undefined
		) {
			if (template.buyDownFeeStrategy.id === "EQUAL_AMORTIZATION") {
				setValue("buyDownFeeStrategy", template.buyDownFeeStrategy.id);
			}
		}

		if (
			getValues("buyDownFeeStrategy") === undefined &&
			template.buyDownFeeStrategyOptions?.[0]?.id !== undefined
		) {
			if (template.buyDownFeeStrategyOptions[0].id === "EQUAL_AMORTIZATION") {
				setValue(
					"buyDownFeeStrategy",
					template.buyDownFeeStrategyOptions[0].id,
				);
			}
		}

		if (getValues("merchantBuyDownFee") === undefined) {
			setValue(
				"merchantBuyDownFee",
				Boolean(templateAdvanced.merchantBuyDownFee),
			);
		}

		if (getValues("chargeOffBehaviour") === undefined) {
			const configuredBehaviour = templateAdvanced.chargeOffBehaviour?.id;
			if (isChargeOffBehaviour(configuredBehaviour)) {
				setValue("chargeOffBehaviour", configuredBehaviour);
			} else {
				const defaultBehaviour = template.chargeOffBehaviourOptions?.[0]?.id;
				if (isChargeOffBehaviour(defaultBehaviour)) {
					setValue("chargeOffBehaviour", defaultBehaviour);
				}
			}
		}

		if (getValues("chargeOffReasonToExpenseMappings").length === 0) {
			const configuredMappings =
				templateAdvanced.chargeOffReasonToExpenseAccountMappings
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
					) || [];

			if (configuredMappings.length > 0) {
				setValue("chargeOffReasonToExpenseMappings", configuredMappings);
			}
		}

		if (getValues("writeOffReasonToExpenseMappings").length === 0) {
			const configuredMappings =
				templateAdvanced.writeOffReasonsToExpenseMappings
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
					) || [];

			if (configuredMappings.length > 0) {
				setValue("writeOffReasonToExpenseMappings", configuredMappings);
			}
		}

		if (getValues("supportedInterestRefundTypes").length === 0) {
			const supportedRefunds =
				templateAdvanced.supportedInterestRefundTypes
					?.map((option) => option.id || option.code)
					.filter((value): value is string => Boolean(value)) || [];
			if (supportedRefunds.length > 0) {
				setValue("supportedInterestRefundTypes", supportedRefunds);
			}
		}

		if (getValues("paymentAllocationTransactionTypes").length === 0) {
			const configuredTypes =
				templateAdvanced.paymentAllocation
					?.map((entry) => entry.transactionType)
					.filter((value): value is string => Boolean(value)) || [];
			if (configuredTypes.length > 0) {
				setValue("paymentAllocationTransactionTypes", configuredTypes);
			} else {
				const defaultType =
					template.advancedPaymentAllocationTransactionTypes?.find(
						(option) => option.code === "DEFAULT",
					)?.code ||
					template.advancedPaymentAllocationTransactionTypes?.[0]?.code;
				if (defaultType) {
					setValue("paymentAllocationTransactionTypes", [defaultType]);
				}
			}
		}

		if (getValues("paymentAllocationRules").length === 0) {
			const configuredRules =
				templateAdvanced.paymentAllocation?.[0]?.paymentAllocationOrder
					?.slice()
					.sort((a, b) => (a.order || 0) - (b.order || 0))
					.map((entry) => entry.paymentAllocationRule)
					.filter((value): value is string => Boolean(value)) || [];
			if (configuredRules.length > 0) {
				setValue("paymentAllocationRules", configuredRules);
			} else {
				const defaultRules =
					template.advancedPaymentAllocationTypes
						?.map((option) => option.code)
						.filter((value): value is string => Boolean(value)) || [];
				if (defaultRules.length > 0) {
					setValue("paymentAllocationRules", defaultRules);
				}
			}
		}

		if (
			getValues("paymentAllocationFutureInstallmentAllocationRule") ===
			undefined
		) {
			const configuredRule =
				templateAdvanced.paymentAllocation?.[0]
					?.futureInstallmentAllocationRule;
			if (configuredRule) {
				setValue(
					"paymentAllocationFutureInstallmentAllocationRule",
					configuredRule,
				);
			} else {
				const defaultRule =
					template
						.advancedPaymentAllocationFutureInstallmentAllocationRules?.[0]
						?.code;
				if (defaultRule) {
					setValue(
						"paymentAllocationFutureInstallmentAllocationRule",
						defaultRule,
					);
				}
			}
		}

		if (getValues("creditAllocationTransactionTypes").length === 0) {
			const configuredTypes =
				templateAdvanced.creditAllocation
					?.map((entry) => entry.transactionType)
					.filter((value): value is string => Boolean(value)) || [];
			if (configuredTypes.length > 0) {
				setValue("creditAllocationTransactionTypes", configuredTypes);
			} else {
				const defaultType =
					template.creditAllocationTransactionTypes?.[0]?.code;
				if (defaultType) {
					setValue("creditAllocationTransactionTypes", [defaultType]);
				}
			}
		}

		if (getValues("creditAllocationRules").length === 0) {
			const configuredRules =
				templateAdvanced.creditAllocation?.[0]?.creditAllocationOrder
					?.slice()
					.sort((a, b) => (a.order || 0) - (b.order || 0))
					.map((entry) => entry.creditAllocationRule)
					.filter((value): value is string => Boolean(value)) || [];
			if (configuredRules.length > 0) {
				setValue("creditAllocationRules", configuredRules);
			} else {
				const defaultRules =
					template.creditAllocationAllocationTypes
						?.map((option) => option.code)
						.filter((value): value is string => Boolean(value)) || [];
				if (defaultRules.length > 0) {
					setValue("creditAllocationRules", defaultRules);
				}
			}
		}

		if (
			getValues("recalculationCompoundingFrequencyType") === undefined &&
			templateRecalculation?.interestRecalculationCompoundingFrequencyType
				?.id !== undefined
		) {
			setValue(
				"recalculationCompoundingFrequencyType",
				templateRecalculation.interestRecalculationCompoundingFrequencyType.id,
			);
		}

		if (
			getValues("recalculationCompoundingFrequencyType") === undefined &&
			template.interestRecalculationFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"recalculationCompoundingFrequencyType",
				template.interestRecalculationFrequencyTypeOptions[0].id,
			);
		}

		if (
			getValues("recalculationCompoundingFrequencyInterval") === undefined &&
			templateRecalculation?.recalculationCompoundingFrequencyInterval !==
				undefined
		) {
			setValue(
				"recalculationCompoundingFrequencyInterval",
				templateRecalculation.recalculationCompoundingFrequencyInterval,
			);
		}

		if (
			getValues("recalculationCompoundingFrequencyOnDayType") === undefined &&
			templateRecalculation?.recalculationCompoundingFrequencyOnDayType !==
				undefined
		) {
			setValue(
				"recalculationCompoundingFrequencyOnDayType",
				templateRecalculation.recalculationCompoundingFrequencyOnDayType,
			);
		}

		if (
			getValues("recalculationRestFrequencyType") === undefined &&
			templateRecalculation?.recalculationRestFrequencyType?.id !== undefined
		) {
			setValue(
				"recalculationRestFrequencyType",
				templateRecalculation.recalculationRestFrequencyType.id,
			);
		}

		if (
			getValues("recalculationRestFrequencyType") === undefined &&
			template.interestRecalculationFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"recalculationRestFrequencyType",
				template.interestRecalculationFrequencyTypeOptions[0].id,
			);
		}

		if (
			getValues("recalculationRestFrequencyInterval") === undefined &&
			templateRecalculation?.recalculationRestFrequencyInterval !== undefined
		) {
			setValue(
				"recalculationRestFrequencyInterval",
				templateRecalculation.recalculationRestFrequencyInterval,
			);
		}

		if (
			!getValues("transactionProcessingStrategyCode") &&
			template.transactionProcessingStrategyOptions?.[0]?.code
		) {
			setValue(
				"transactionProcessingStrategyCode",
				template.transactionProcessingStrategyOptions[0].code,
			);
		}

		if (
			getValues("accountingRule") === undefined &&
			template.accountingRuleOptions?.[0]?.id !== undefined
		) {
			setValue("accountingRule", template.accountingRuleOptions[0].id);
		}

		if (getValues("includeInBorrowerCycle") === undefined) {
			setValue(
				"includeInBorrowerCycle",
				Boolean(template.includeInBorrowerCycle),
			);
		}

		if (getValues("useBorrowerCycle") === undefined) {
			setValue("useBorrowerCycle", Boolean(template.useBorrowerCycle));
		}

		// Set default numeric values
		if (getValues("minPrincipal") === undefined) {
			setValue("minPrincipal", 1000);
			setValue("principal", 10000);
			setValue("maxPrincipal", 20000);
			setValue("minNumberOfRepayments", 1);
			setValue("numberOfRepayments", 12);
			setValue("maxNumberOfRepayments", 24);
			setValue("repaymentEvery", 1);
			setValue("interestRatePerPeriod", 10);
		}
	}, [template, currencyOptions, getValues, setValue]);

	// Update decimal places when currency changes
	useEffect(() => {
		if (!currencyCode) return;
		const match = currencyOptions.find(
			(option) => option.code === currencyCode,
		);
		if (match?.decimalPlaces !== undefined) {
			setValue("digitsAfterDecimal", match.decimalPlaces);
		}
	}, [currencyCode, currencyOptions, setValue]);

	useEffect(() => {
		if (!draftMessage) return;
		const timeout = setTimeout(() => setDraftMessage(null), 2500);
		return () => clearTimeout(timeout);
	}, [draftMessage]);

	// Validate current step fields and advance if valid
	const handleNext = async () => {
		const fields = STEP_FIELDS[currentStep];
		const isValid = await trigger(fields, { shouldFocus: true });
		if (isValid && currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleSaveDraft = () => {
		try {
			const draft = getValues();
			localStorage.setItem("loanProductDraft", JSON.stringify(draft));
			setDraftMessage("Draft saved locally");
		} catch (_error) {
			setDraftMessage("Unable to save draft");
		}
	};

	const handleFinalSubmit = async () => {
		setSubmitError(null);
		setIsSubmitting(true);

		try {
			// Validate entire form before submission
			const isValid = await trigger();
			if (!isValid) {
				const errors = form.formState.errors;
				const errorMessages = Object.entries(errors)
					.map(([key, error]) => `${key}: ${error?.message || "Invalid"}`)
					.join(", ");
				setSubmitError(
					toSubmitActionError(
						{
							code: "VALIDATION_ERROR",
							message: `Validation failed: ${errorMessages}`,
							status: 400,
						},
						{
							action: isEditMode ? "updateLoanProduct" : "createLoanProduct",
							endpoint: "/api/fineract/loanproducts",
							method: isEditMode ? "PUT" : "POST",
							tenantId,
						},
					),
				);
				setIsSubmitting(false);
				return;
			}

			const formData = getValues();
			const payload = buildLoanProductRequest(formData);

			if (isEditMode && onUpdate) {
				await onUpdate(payload);
			} else {
				await onSubmit(payload);
			}

			localStorage.removeItem("loanProductDraft");
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: isEditMode ? "updateLoanProduct" : "createLoanProduct",
					endpoint: "/api/fineract/loanproducts",
					method: isEditMode ? "PUT" : "POST",
					tenantId,
				}),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<TooltipProvider>
			<div className="space-y-6">
				{/* Step indicator */}
				<div className="flex items-center justify-between">
					{steps.map((step, index) => (
						<div key={step.id} className="flex items-center flex-1">
							<div className="flex flex-col items-center">
								<div
									className={cn(
										"flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
										currentStep > step.id
											? "bg-primary border-primary text-primary-foreground"
											: currentStep === step.id
												? "border-primary text-primary"
												: "border-muted text-muted-foreground",
									)}
								>
									{currentStep > step.id ? (
										<Check className="h-5 w-5" />
									) : (
										<span>{step.id}</span>
									)}
								</div>
								<span
									className={cn(
										"mt-2 text-xs font-medium text-center",
										currentStep >= step.id
											? "text-foreground"
											: "text-muted-foreground",
									)}
								>
									{step.name}
								</span>
							</div>
							{index < steps.length - 1 && (
								<div
									className={cn(
										"h-[2px] flex-1 mx-2",
										currentStep > step.id ? "bg-primary" : "bg-muted",
									)}
								/>
							)}
						</div>
					))}
				</div>

				{/* Loading skeleton */}
				{templateQuery.isLoading && (
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-72 mt-2" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{templateQuery.error && (
					<Alert variant="destructive">
						<AlertTitle>Unable to load template</AlertTitle>
						<AlertDescription>Please refresh and try again.</AlertDescription>
					</Alert>
				)}

				{!templateQuery.isLoading && !templateQuery.error && (
					<FormProvider {...form}>
						<div>
							{currentStep === 1 && (
								<LoanProductIdentityStep
									template={template}
									currencies={currencies}
								/>
							)}
							{currentStep === 2 && <LoanProductAmountStep />}
							{currentStep === 3 && (
								<LoanProductScheduleStep template={template} />
							)}
							{currentStep === 4 && (
								<LoanProductInterestStep template={template} />
							)}
							{currentStep === 5 && (
								<LoanProductFeesStep
									template={template}
									currencyCode={currencyCode}
								/>
							)}
							{currentStep === 6 && (
								<LoanProductPenaltiesStep
									template={template}
									currencyCode={currencyCode}
								/>
							)}
							{currentStep === 7 && (
								<LoanProductAccountingStep template={template} />
							)}

							<div className="mt-4">
								<SubmitErrorAlert
									error={submitError}
									title={submitErrorTitle}
								/>
							</div>

							{draftMessage && (
								<Alert variant="default" className="mt-4">
									<AlertTitle>Draft status</AlertTitle>
									<AlertDescription>{draftMessage}</AlertDescription>
								</Alert>
							)}

							<div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={currentStep === 1 ? onCancel : handleBack}
								>
									<ChevronLeft className="h-4 w-4 mr-2" />
									{currentStep === 1 ? "Cancel" : "Back"}
								</Button>

								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={handleSaveDraft}
									>
										Save Draft
									</Button>
									<Button
										type="button"
										disabled={isSubmitting}
										onClick={
											currentStep === steps.length
												? handleFinalSubmit
												: handleNext
										}
									>
										{currentStep === steps.length ? (
											isSubmitting ? (
												submittingLabel
											) : (
												submitActionLabel
											)
										) : (
											<>
												Next
												<ChevronRight className="h-4 w-4 ml-2" />
											</>
										)}
									</Button>
								</div>
							</div>
						</div>
					</FormProvider>
				)}
			</div>
		</TooltipProvider>
	);
}
