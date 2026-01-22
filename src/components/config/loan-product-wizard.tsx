"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Copy,
	Info,
	Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import { z } from "zod";
import { LoanProductAccountingFormSection } from "@/components/sections/LoanProductAccountingFormSection";
import { LoanProductAmountFormSection } from "@/components/sections/LoanProductAmountFormSection";
import { LoanProductFeesFormSection } from "@/components/sections/LoanProductFeesFormSection";
import { LoanProductIdentityFormSection } from "@/components/sections/LoanProductIdentityFormSection";
import { LoanProductInterestFormSection } from "@/components/sections/LoanProductInterestFormSection";
import { LoanProductPenaltiesFormSection } from "@/components/sections/LoanProductPenaltiesFormSection";
import { LoanProductScheduleFormSection } from "@/components/sections/LoanProductScheduleFormSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	PostLoanProductsRequest,
	PutLoanProductsProductIdRequest,
} from "@/lib/fineract/generated";
import {
	buildLoanProductRequest,
	chargesApi,
	loanProductsApi,
	mapFeeUiToChargeRequest,
	mapPenaltyUiToChargeRequest,
} from "@/lib/fineract/loan-products";
import {
	type CreateLoanProductFormData,
	createLoanProductSchema,
	type FeeFormData,
	type FeeSelection,
	feeChargeFormSchema,
	loanProductAccountingSchema,
	loanProductAmountSchema,
	loanProductFeesSchema,
	loanProductIdentitySchema,
	loanProductInterestSchema,
	loanProductPenaltiesSchema,
	loanProductScheduleSchema,
	type PenaltyFormData,
	type PenaltySelection,
	penaltyChargeFormSchema,
} from "@/lib/schemas/loan-product";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

interface LoanProductWizardProps {
	currencies: string[];
	isOpen: boolean;
	onSubmit: (
		data: PostLoanProductsRequest | PutLoanProductsProductIdRequest,
	) => Promise<void>;
	onCancel: () => void;
	isEdit?: boolean;
	productId?: number | null;
}

type FeeItem = FeeSelection & { summary?: string };

type PenaltyItem = PenaltySelection & {
	summary?: string;
	gracePeriodOverride?: number;
};

const steps = [
	{
		id: 1,
		name: "Identity & Currency",
		schema: loanProductIdentitySchema,
		fields: [
			"name",
			"shortName",
			"description",
			"currencyCode",
			"digitsAfterDecimal",
		] as const,
	},
	{
		id: 2,
		name: "Loan Amount Rules",
		schema: loanProductAmountSchema,
		fields: [
			"minPrincipal",
			"principal",
			"maxPrincipal",
			"inMultiplesOf",
		] as const,
	},
	{
		id: 3,
		name: "Tenure & Schedule",
		schema: loanProductScheduleSchema,
		fields: [
			"minNumberOfRepayments",
			"numberOfRepayments",
			"maxNumberOfRepayments",
			"repaymentEvery",
			"repaymentFrequencyType",
			"minimumDaysBetweenDisbursalAndFirstRepayment",
		] as const,
	},
	{
		id: 4,
		name: "Interest & Calculation",
		schema: loanProductInterestSchema,
		fields: [
			"interestType",
			"amortizationType",
			"interestRatePerPeriod",
			"interestRateFrequencyType",
			"interestCalculationPeriodType",
			"allowPartialPeriodInterestCalculation",
		] as const,
	},
	{
		id: 5,
		name: "Fees",
		schema: loanProductFeesSchema,
		fields: ["fees"] as const,
	},
	{
		id: 6,
		name: "Penalties",
		schema: loanProductPenaltiesSchema,
		fields: ["penalties"] as const,
	},
	{
		id: 7,
		name: "Delinquency, Accounting & Review",
		schema: loanProductAccountingSchema,
		fields: [
			"transactionProcessingStrategyCode",
			"graceOnArrearsAgeing",
			"inArrearsTolerance",
			"overdueDaysForNPA",
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
		] as const,
	},
];

function getStepSchema(stepId: number): z.ZodSchema {
	switch (stepId) {
		case 1:
			return loanProductIdentitySchema;
		case 2:
			return loanProductIdentitySchema.merge(loanProductAmountSchema);
		case 3:
			return loanProductIdentitySchema
				.merge(loanProductAmountSchema)
				.merge(loanProductScheduleSchema);
		case 4:
			return loanProductIdentitySchema
				.merge(loanProductAmountSchema)
				.merge(loanProductScheduleSchema)
				.merge(loanProductInterestSchema);
		case 5:
			return loanProductIdentitySchema
				.merge(loanProductAmountSchema)
				.merge(loanProductScheduleSchema)
				.merge(loanProductInterestSchema)
				.merge(loanProductFeesSchema);
		case 6:
			return loanProductIdentitySchema
				.merge(loanProductAmountSchema)
				.merge(loanProductScheduleSchema)
				.merge(loanProductInterestSchema)
				.merge(loanProductFeesSchema)
				.merge(loanProductPenaltiesSchema);
		case 7:
			return loanProductIdentitySchema
				.merge(loanProductAmountSchema)
				.merge(loanProductScheduleSchema)
				.merge(loanProductInterestSchema)
				.merge(loanProductFeesSchema)
				.merge(loanProductPenaltiesSchema)
				.merge(loanProductAccountingSchema);
		default:
			return loanProductIdentitySchema;
	}
}

function optionLabel(option?: {
	code?: string;
	description?: string;
	value?: string;
	name?: string;
}) {
	return (
		option?.description ||
		option?.value ||
		option?.name ||
		option?.code ||
		"Unknown"
	);
}

function toAmountLabel(
	amount?: number,
	currencyCode?: string,
	calculation?: "flat" | "percent",
) {
	if (amount === undefined) return "Amount not set";

	if (calculation === "percent") {
		return `${amount}%`;
	}

	if (!currencyCode) {
		return `${amount}`;
	}

	return `${currencyCode} ${amount}`;
}

function formatFeeSummary(fee: FeeItem, currencyCode?: string) {
	if (fee.summary) return fee.summary;

	const amountLabel = toAmountLabel(
		fee.amount,
		fee.currencyCode || currencyCode,
		fee.calculationMethod,
	);
	const chargeTimeLabel =
		fee.chargeTimeType === "disbursement"
			? "at disbursement"
			: fee.chargeTimeType === "approval"
				? "on approval"
				: "on specified due date";
	const paymentModeLabel =
		fee.paymentMode === "deduct"
			? "deducted from disbursement"
			: "payable separately";

	return `${fee.name} - ${amountLabel} - ${chargeTimeLabel}, ${paymentModeLabel}`;
}

function formatPenaltySummary(penalty: PenaltyItem, currencyCode?: string) {
	if (penalty.summary) return penalty.summary;

	const amountLabel = toAmountLabel(
		penalty.amount,
		penalty.currencyCode || currencyCode,
		penalty.calculationMethod,
	);
	const basisLabel =
		penalty.penaltyBasis === "overduePrincipal"
			? "overdue principal"
			: penalty.penaltyBasis === "overdueInterest"
				? "overdue interest"
				: "entire overdue amount";

	const graceLabel = penalty.gracePeriodOverride
		? ` after ${penalty.gracePeriodOverride} grace days`
		: "";

	return `${penalty.name} - ${amountLabel} on ${basisLabel}${graceLabel}`;
}

function waterfallLabel(option?: { code?: string; name?: string }) {
	if (!option?.code) return option?.name || "Strategy";

	const mapping: Record<string, string> = {
		"mifos-standard-strategy":
			"Standard (Penalties -> Fees -> Interest -> Principal)",
		"principal-interest-penalties-fees-order-strategy":
			"Principal -> Interest -> Penalties -> Fees",
		"interest-principal-penalties-fees-order-strategy":
			"Interest -> Principal -> Penalties -> Fees",
	};

	return mapping[option.code] || option?.name || option.code;
}

function isUnsetValue(value: unknown) {
	return value === undefined || value === null || value === "";
}

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

export function LoanProductWizard({
	currencies,
	isOpen,
	onSubmit,
	onCancel,
	isEdit = false,
	productId,
}: LoanProductWizardProps) {
	const { tenantId } = useTenantStore();
	const [currentStep, setCurrentStep] = useState(1);
	const [fees, setFees] = useState<FeeItem[]>([]);
	const [penalties, setPenalties] = useState<PenaltyItem[]>([]);

	const productQuery = useQuery({
		queryKey: ["loanProduct", tenantId, productId],
		queryFn: () => loanProductsApi.getById(tenantId, productId!),
		enabled: isEdit && !!productId,
	});

	const [isFeeDrawerOpen, setIsFeeDrawerOpen] = useState(false);
	const [isPenaltyDrawerOpen, setIsPenaltyDrawerOpen] = useState(false);
	const [isFeeSelectOpen, setIsFeeSelectOpen] = useState(false);
	const [isPenaltySelectOpen, setIsPenaltySelectOpen] = useState(false);
	const [feeSubmitError, setFeeSubmitError] = useState<string | null>(null);
	const [penaltySubmitError, setPenaltySubmitError] = useState<string | null>(
		null,
	);
	const [isCreatingFee, setIsCreatingFee] = useState(false);
	const [isCreatingPenalty, setIsCreatingPenalty] = useState(false);
	const [isWizardSubmitting, setIsWizardSubmitting] = useState(false);
	const [submissionErrors, setSubmissionErrors] = useState<Record<
		string,
		string[]
	> | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [copyMessage, setCopyMessage] = useState<string | null>(null);
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
	const repaymentFrequencyTypeOptions =
		template?.repaymentFrequencyTypeOptions || [];
	const interestTypeOptions = template?.interestTypeOptions || [];
	const amortizationTypeOptions = template?.amortizationTypeOptions || [];
	const interestRateFrequencyTypeOptions =
		template?.interestRateFrequencyTypeOptions || [];
	const interestCalculationPeriodTypeOptions =
		template?.interestCalculationPeriodTypeOptions || [];
	const transactionProcessingStrategyOptions =
		template?.transactionProcessingStrategyOptions || [];
	const accountingRuleOptions = template?.accountingRuleOptions || [];
	const assetOptions =
		template?.accountingMappingOptions?.assetAccountOptions || [];
	const incomeOptions =
		template?.accountingMappingOptions?.incomeAccountOptions || [];
	const expenseOptions =
		template?.accountingMappingOptions?.expenseAccountOptions || [];
	const liabilityOptions =
		template?.accountingMappingOptions?.liabilityAccountOptions || [];

	const hasCurrencyOptions = currencyOptions.length > 0;
	const hasRepaymentFrequencyTypeOptions =
		repaymentFrequencyTypeOptions.length > 0;
	const hasInterestTypeOptions = interestTypeOptions.length > 0;
	const hasAmortizationTypeOptions = amortizationTypeOptions.length > 0;
	const hasInterestRateFrequencyTypeOptions =
		interestRateFrequencyTypeOptions.length > 0;
	const hasInterestCalculationPeriodTypeOptions =
		interestCalculationPeriodTypeOptions.length > 0;
	const hasTransactionProcessingStrategyOptions =
		transactionProcessingStrategyOptions.length > 0;
	const hasAccountingRuleOptions = accountingRuleOptions.length > 0;
	const hasAssetOptions = assetOptions.length > 0;
	const hasIncomeOptions = incomeOptions.length > 0;
	const hasExpenseOptions = expenseOptions.length > 0;
	const hasLiabilityOptions = liabilityOptions.length > 0;

	const form = useForm<CreateLoanProductFormData>({
		resolver: zodResolver(createLoanProductSchema),
		mode: "onChange",
		defaultValues: {
			fees: [],
			penalties: [],
			inMultiplesOf: 1,
			allowPartialPeriodInterestCalculation: false,
			graceOnArrearsAgeing: 0,
			inArrearsTolerance: 0,
			overdueDaysForNPA: 0,
		},
	});

	useEffect(() => {
		form.clearErrors();
	}, [currentStep]);

	const {
		register,
		handleSubmit,
		control,
		trigger,
		setValue,
		getValues,
		setError,
		watch,
		formState: { errors, isSubmitting: isFormSubmitting },
	} = form;

	useEffect(() => {
		if (isEdit && productQuery.data) {
			const data = productQuery.data;
			if (data.name) setValue("name", data.name);
			if (data.shortName) setValue("shortName", data.shortName);
			setValue("description", data.description || "");
			if (data.currency?.code) setValue("currencyCode", data.currency.code);
			if (data.currency?.decimalPlaces !== undefined)
				setValue("digitsAfterDecimal", data.currency.decimalPlaces);
			if (data.principal !== undefined) setValue("principal", data.principal);
			if (data.minPrincipal !== undefined)
				setValue("minPrincipal", data.minPrincipal);
			if (data.maxPrincipal !== undefined)
				setValue("maxPrincipal", data.maxPrincipal);
			if (data.numberOfRepayments !== undefined)
				setValue("numberOfRepayments", data.numberOfRepayments);
			if (data.minNumberOfRepayments !== undefined)
				setValue("minNumberOfRepayments", data.minNumberOfRepayments);
			if (data.maxNumberOfRepayments !== undefined)
				setValue("maxNumberOfRepayments", data.maxNumberOfRepayments);
			// Add more fields as needed
		} else if (!isEdit) {
			// Set defaults for new products
			setValue("daysInYearType", 360);
			setValue("daysInMonthType", 30);
			setValue("isInterestRecalculationEnabled", false);
		}
	}, [isEdit, productQuery.data, setValue]);

	const feeForm = useForm<FeeFormData>({
		resolver: zodResolver(feeChargeFormSchema),
		mode: "onChange",
		defaultValues: {
			calculationMethod: "flat",
			chargeTimeType: "disbursement",
			paymentMode: "deduct",
			currencyCode: currencyOptions[0]?.code || "KES",
		},
	});

	const penaltyForm = useForm<PenaltyFormData>({
		resolver: zodResolver(penaltyChargeFormSchema),
		mode: "onChange",
		defaultValues: {
			calculationMethod: "percent",
			penaltyBasis: "totalOverdue",
			currencyCode: currencyOptions[0]?.code || "KES",
		},
	});

	const shortNameValue = watch("shortName");
	const currencyCode = watch("currencyCode");
	const accountingRule = watch("accountingRule");
	const watchedValues = watch();

	useEffect(() => {
		if (!template) return;

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
			repaymentFrequencyTypeOptions[0]?.id !== undefined
		) {
			setValue("repaymentFrequencyType", repaymentFrequencyTypeOptions[0].id);
		}

		if (
			getValues("interestType") === undefined &&
			interestTypeOptions[0]?.id !== undefined
		) {
			setValue("interestType", interestTypeOptions[0].id);
		}

		if (
			getValues("amortizationType") === undefined &&
			amortizationTypeOptions[0]?.id !== undefined
		) {
			setValue("amortizationType", amortizationTypeOptions[0].id);
		}

		if (
			getValues("interestRateFrequencyType") === undefined &&
			interestRateFrequencyTypeOptions[0]?.id !== undefined
		) {
			setValue(
				"interestRateFrequencyType",
				interestRateFrequencyTypeOptions[0].id,
			);
		}

		if (
			getValues("interestCalculationPeriodType") === undefined &&
			interestCalculationPeriodTypeOptions[0]?.id !== undefined
		) {
			setValue(
				"interestCalculationPeriodType",
				interestCalculationPeriodTypeOptions[0].id,
			);
		}

		if (
			!getValues("transactionProcessingStrategyCode") &&
			transactionProcessingStrategyOptions[0]?.code
		) {
			setValue(
				"transactionProcessingStrategyCode",
				transactionProcessingStrategyOptions[0].code,
			);
		}

		if (
			getValues("accountingRule") === undefined &&
			accountingRuleOptions[0]?.id !== undefined
		) {
			setValue("accountingRule", accountingRuleOptions[0].id);
		}
	}, [
		template,
		currencyOptions,
		repaymentFrequencyTypeOptions,
		interestTypeOptions,
		amortizationTypeOptions,
		interestRateFrequencyTypeOptions,
		interestCalculationPeriodTypeOptions,
		transactionProcessingStrategyOptions,
		accountingRuleOptions,
		getValues,
		setValue,
	]);

	useEffect(() => {
		if (!currencyCode) return;
		const match = currencyOptions.find(
			(option) => option.code === currencyCode,
		);
		if (match?.decimalPlaces !== undefined) {
			setValue("digitsAfterDecimal", match.decimalPlaces);
		}

		feeForm.setValue("currencyCode", currencyCode);
		penaltyForm.setValue("currencyCode", currencyCode);
	}, [currencyCode, currencyOptions, setValue, feeForm, penaltyForm]);

	useEffect(() => {
		setValue(
			"fees",
			fees.map(({ summary, ...fee }) => fee),
		);
	}, [fees, setValue]);

	useEffect(() => {
		setValue(
			"penalties",
			penalties.map(({ summary, gracePeriodOverride, ...penalty }) => penalty),
		);
	}, [penalties, setValue]);

	useEffect(() => {
		if (!draftMessage) return;
		const timeout = setTimeout(() => setDraftMessage(null), 2500);
		return () => clearTimeout(timeout);
	}, [draftMessage]);

	useEffect(() => {
		if (!copyMessage) return;
		const timeout = setTimeout(() => setCopyMessage(null), 2000);
		return () => clearTimeout(timeout);
	}, [copyMessage]);

	useEffect(() => {
		if (isFeeDrawerOpen) {
			setFeeSubmitError(null);
		}
	}, [isFeeDrawerOpen]);

	useEffect(() => {
		if (isPenaltyDrawerOpen) {
			setPenaltySubmitError(null);
		}
	}, [isPenaltyDrawerOpen]);

	const missingTemplateLabels = useMemo(() => {
		const missing: string[] = [];
		if (!hasCurrencyOptions) missing.push("currencies");
		if (!hasRepaymentFrequencyTypeOptions)
			missing.push("repayment frequencies");
		if (!hasInterestTypeOptions) missing.push("interest types");
		if (!hasAmortizationTypeOptions) missing.push("amortization types");
		if (!hasInterestRateFrequencyTypeOptions)
			missing.push("interest rate frequencies");
		if (!hasInterestCalculationPeriodTypeOptions)
			missing.push("interest calculation periods");
		if (!hasTransactionProcessingStrategyOptions)
			missing.push("repayment strategies");
		if (!hasAccountingRuleOptions) missing.push("accounting rules");
		return missing;
	}, [
		hasCurrencyOptions,
		hasRepaymentFrequencyTypeOptions,
		hasInterestTypeOptions,
		hasAmortizationTypeOptions,
		hasInterestRateFrequencyTypeOptions,
		hasInterestCalculationPeriodTypeOptions,
		hasTransactionProcessingStrategyOptions,
		hasAccountingRuleOptions,
	]);

	const validateTemplateRequirements = (stepId?: number) => {
		let hasError = false;
		const values = getValues();
		const stepsToCheck = stepId ? [stepId] : steps.map((step) => step.id);

		const requireSelect = (
			field: FieldPath<CreateLoanProductFormData>,
			optionsAvailable: boolean,
			label: string,
			missingMessage: string,
		) => {
			if (!optionsAvailable) {
				setError(field, { message: missingMessage });
				hasError = true;
				return;
			}
			const value = getValues(field);
			if (isUnsetValue(value)) {
				setError(field, { message: `${label} is required` });
				hasError = true;
			}
		};

		if (stepsToCheck.includes(1)) {
			requireSelect(
				"currencyCode",
				hasCurrencyOptions,
				"Currency",
				"No currency options configured",
			);
			if (
				hasCurrencyOptions &&
				(values.digitsAfterDecimal === undefined ||
					values.digitsAfterDecimal === null)
			) {
				setError("digitsAfterDecimal", {
					message: "Decimal places are required",
				});
				hasError = true;
			}
		}

		if (stepsToCheck.includes(3)) {
			requireSelect(
				"repaymentFrequencyType",
				hasRepaymentFrequencyTypeOptions,
				"Repayment frequency",
				"No repayment frequency options configured",
			);
		}

		if (stepsToCheck.includes(4)) {
			requireSelect(
				"interestType",
				hasInterestTypeOptions,
				"Interest type",
				"No interest type options configured",
			);
			requireSelect(
				"amortizationType",
				hasAmortizationTypeOptions,
				"Amortization type",
				"No amortization options configured",
			);
			requireSelect(
				"interestRateFrequencyType",
				hasInterestRateFrequencyTypeOptions,
				"Interest rate frequency",
				"No interest rate frequency options configured",
			);
			requireSelect(
				"interestCalculationPeriodType",
				hasInterestCalculationPeriodTypeOptions,
				"Interest calculation period",
				"No interest calculation period options configured",
			);
		}

		if (stepsToCheck.includes(7)) {
			requireSelect(
				"transactionProcessingStrategyCode",
				hasTransactionProcessingStrategyOptions,
				"Repayment strategy",
				"No repayment strategy options configured",
			);
			requireSelect(
				"accountingRule",
				hasAccountingRuleOptions,
				"Accounting rule",
				"No accounting rule options configured",
			);

			if (values.accountingRule && values.accountingRule !== 1) {
				if (!hasAssetOptions) {
					setError("fundSourceAccountId", {
						message: "No asset accounts configured",
					});
					hasError = true;
				}
				if (!hasIncomeOptions) {
					setError("interestOnLoanAccountId", {
						message: "No income accounts configured",
					});
					hasError = true;
				}
				if (!hasExpenseOptions) {
					setError("writeOffAccountId", {
						message: "No expense accounts configured",
					});
					hasError = true;
				}

				if (
					(values.accountingRule === 3 || values.accountingRule === 4) &&
					!hasLiabilityOptions
				) {
					setError("overpaymentLiabilityAccountId", {
						message: "No liability accounts configured",
					});
					hasError = true;
				}
			}
		}

		return !hasError;
	};

	const handleNext = async () => {
		console.log("handleNext called for step", currentStep);
		const step = steps[currentStep - 1];
		const fields = step.fields as FieldPath<CreateLoanProductFormData>[];
		const templateValid = validateTemplateRequirements(currentStep);
		console.log("templateValid", templateValid);
		if (!templateValid) {
			console.log("Template validation failed");
			return;
		}

		const isValid = await trigger(fields);
		console.log("isValid", isValid, "errors", errors);
		if (!isValid) {
			console.log("Validation failed for fields:", fields);
			// For now, use console.log, later add toast
			console.error(
				"Validation errors:",
				Object.values(errors)
					.map((e) => e.message)
					.join(", "),
			);
			return;
		}

		if (currentStep < steps.length) {
			console.log("advancing to step", currentStep + 1);
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
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

	const handleFinalSubmit = async (data: CreateLoanProductFormData) => {
		setSubmitError(null);
		setIsWizardSubmitting(true);
		const templateValid = validateTemplateRequirements();
		if (!templateValid) {
			setIsWizardSubmitting(false);
			return;
		}

		try {
			const payload = buildLoanProductRequest(data);
			await onSubmit(payload);
			localStorage.removeItem("loanProductDraft");
		} catch (error: any) {
			console.error(
				"Submission failed:",
				JSON.stringify(error.response?.data) || error,
			);
			setSubmissionErrors(error.response?.data.details || null);
			setIsWizardSubmitting(false);
		}
	};

	const handleCopyPayload = async () => {
		try {
			const payload = buildLoanProductRequest(
				getValues() as CreateLoanProductFormData,
			);
			await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
			setCopyMessage("Copied");
		} catch (_error) {
			setCopyMessage("Copy failed");
		}
	};

	const handleAddExistingFee = (option: GetLoanProductsChargeOptions) => {
		if (!option?.id) return;
		if (fees.some((fee) => fee.id === option.id)) return;

		const summary =
			`${option.name || "Fee"} - ${option.currency?.code || ""} ${option.amount || ""} - ${option.chargeTimeType?.description || "Configured"}`.trim();

		setFees((prev) => [
			...prev,
			{
				id: option.id,
				name: option.name || "Fee",
				amount: option.amount,
				currencyCode: option.currency?.code,
				summary,
			},
		]);
	};

	const handleAddExistingPenalty = (option: GetLoanProductsChargeOptions) => {
		if (!option?.id) return;
		if (penalties.some((penalty) => penalty.id === option.id)) return;

		const summary =
			`${option.name || "Penalty"} - ${option.currency?.code || ""} ${option.amount || ""} - ${option.chargeTimeType?.description || "Configured"}`.trim();

		setPenalties((prev) => [
			...prev,
			{
				id: option.id,
				name: option.name || "Penalty",
				amount: option.amount,
				currencyCode: option.currency?.code,
				summary,
			},
		]);
	};

	const handleCreateFee = feeForm.handleSubmit(async (values) => {
		setFeeSubmitError(null);
		setIsCreatingFee(true);
		try {
			const payload = mapFeeUiToChargeRequest(values);
			const response = await chargesApi.create(tenantId, payload);
			const chargeId = response.resourceId;

			if (!chargeId) {
				throw new Error("Charge ID missing from response");
			}

			setFees((prev) => [
				...prev,
				{
					id: chargeId,
					name: values.name,
					amount: values.amount,
					currencyCode: values.currencyCode,
					calculationMethod: values.calculationMethod,
					chargeTimeType: values.chargeTimeType,
					paymentMode: values.paymentMode,
				},
			]);

			feeForm.reset({
				calculationMethod: "flat",
				chargeTimeType: "disbursement",
				paymentMode: "deduct",
				currencyCode: values.currencyCode,
				amount: undefined,
				name: "",
			});
			setIsFeeDrawerOpen(false);
		} catch (error) {
			const mapped = mapFineractError(error);
			setFeeSubmitError(mapped.message);
		} finally {
			setIsCreatingFee(false);
		}
	});

	const handleCreatePenalty = penaltyForm.handleSubmit(async (values) => {
		setPenaltySubmitError(null);
		setIsCreatingPenalty(true);
		try {
			const payload = mapPenaltyUiToChargeRequest(values);
			const response = await chargesApi.create(tenantId, payload);
			const chargeId = response.resourceId;

			if (!chargeId) {
				throw new Error("Charge ID missing from response");
			}

			setPenalties((prev) => [
				...prev,
				{
					id: chargeId,
					name: values.name,
					amount: values.amount,
					currencyCode: values.currencyCode,
					calculationMethod: values.calculationMethod,
					penaltyBasis: values.penaltyBasis,
					gracePeriodOverride: values.gracePeriodOverride,
				},
			]);

			penaltyForm.reset({
				calculationMethod: "percent",
				penaltyBasis: "totalOverdue",
				currencyCode: values.currencyCode,
				amount: undefined,
				name: "",
				gracePeriodOverride: undefined,
			});
			setIsPenaltyDrawerOpen(false);
		} catch (error) {
			const mapped = mapFineractError(error);
			setPenaltySubmitError(mapped.message);
		} finally {
			setIsCreatingPenalty(false);
		}
	});

	const payloadPreview = buildLoanProductRequest(
		watchedValues as CreateLoanProductFormData,
	);

	const chargeOptions = template?.chargeOptions || [];
	const feeOptions = chargeOptions.filter(
		(option) => option.penalty === false && option.active !== false,
	);
	const penaltyOptions = chargeOptions.filter(
		(option) => option.penalty === true && option.active !== false,
	);

	return (
		<TooltipProvider>
			<div className="space-y-6">
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

				{templateQuery.isLoading && (
					<Card>
						<CardContent className="py-6 text-sm text-muted-foreground">
							Loading loan product template...
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
					<form
						onSubmit={
							currentStep === steps.length
								? handleSubmit(handleFinalSubmit)
								: (e) => {
										e.preventDefault();
										handleNext();
									}
						}
					>
						{missingTemplateLabels.length > 0 && (
							<Alert variant="warning" className="mb-4">
								<AlertTitle>Missing template configuration</AlertTitle>
								<AlertDescription>
									Configure {missingTemplateLabels.join(", ")} before creating a
									loan product.
								</AlertDescription>
							</Alert>
						)}
						{currentStep === 1 && (
							<Card>
								<CardHeader>
									<CardTitle>Identity & Currency</CardTitle>
									<CardDescription>
										Set the core product identity and currency defaults.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<LoanProductIdentityFormSection
										control={control}
										register={register}
										errors={errors}
										shortNameValue={shortNameValue}
										template={template}
									/>
								</CardContent>
							</Card>
						)}

						{currentStep === 2 && (
							<Card>
								<CardHeader>
									<CardTitle>Loan Amount Rules</CardTitle>
									<CardDescription>
										Define the minimum, typical, and maximum loan sizes.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<LoanProductAmountFormSection
										register={register}
										errors={errors}
									/>
								</CardContent>
							</Card>
						)}

						{currentStep === 3 && (
							<Card>
								<CardHeader>
									<CardTitle>Tenure & Repayment Schedule</CardTitle>
									<CardDescription>
										Define repayment counts and frequency.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<p className="text-xs text-muted-foreground">
										6 repayments + monthly = a 6-month loan.
									</p>
									<div className="grid gap-4 md:grid-cols-3">
										<div className="space-y-2">
											<Label htmlFor="minNumberOfRepayments">
												Min Repayments{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="minNumberOfRepayments"
												type="number"
												{...register("minNumberOfRepayments", {
													valueAsNumber: true,
												})}
												placeholder="6"
											/>
											<p className="text-xs text-muted-foreground">
												Minimum installments allowed. Example: 6 months if
												monthly.
											</p>
											{errors.minNumberOfRepayments && (
												<p className="text-sm text-destructive">
													{String(errors.minNumberOfRepayments.message)}
												</p>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="numberOfRepayments">
												Default Repayments{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="numberOfRepayments"
												type="number"
												{...register("numberOfRepayments", {
													valueAsNumber: true,
												})}
												placeholder="12"
											/>
											<p className="text-xs text-muted-foreground">
												Default schedule length. Example: 12 monthly repayments.
											</p>
											{errors.numberOfRepayments && (
												<p className="text-sm text-destructive">
													{String(errors.numberOfRepayments.message)}
												</p>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="maxNumberOfRepayments">
												Max Repayments{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="maxNumberOfRepayments"
												type="number"
												{...register("maxNumberOfRepayments", {
													valueAsNumber: true,
												})}
												placeholder="24"
											/>
											<p className="text-xs text-muted-foreground">
												Maximum installments allowed. Example: 24 monthly
												repayments.
											</p>
											{errors.maxNumberOfRepayments && (
												<p className="text-sm text-destructive">
													{String(errors.maxNumberOfRepayments.message)}
												</p>
											)}
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="repaymentEvery">
												Repayment Every{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="repaymentEvery"
												type="number"
												{...register("repaymentEvery", { valueAsNumber: true })}
												placeholder="1"
											/>
											{errors.repaymentEvery && (
												<p className="text-sm text-destructive">
													{String(errors.repaymentEvery.message)}
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												How often the borrower pays. Example: 1 with Months =
												monthly.
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="repaymentFrequencyType">
												Frequency
												{hasRepaymentFrequencyTypeOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="repaymentFrequencyType"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasRepaymentFrequencyTypeOptions}
													>
														<SelectTrigger id="repaymentFrequencyType">
															<SelectValue placeholder="Select frequency" />
														</SelectTrigger>
														<SelectContent>
															{repaymentFrequencyTypeOptions.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{optionLabel(option)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.repaymentFrequencyType && (
												<p className="text-sm text-destructive">
													{String(errors.repaymentFrequencyType.message)}
												</p>
											)}
											{!hasRepaymentFrequencyTypeOptions && (
												<p className="text-xs text-muted-foreground">
													No repayment frequency options configured.
												</p>
											)}
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="minimumDaysBetweenDisbursalAndFirstRepayment">
											Minimum Days Before First Repayment
										</Label>
										<Input
											id="minimumDaysBetweenDisbursalAndFirstRepayment"
											type="number"
											{...register(
												"minimumDaysBetweenDisbursalAndFirstRepayment",
												{ valueAsNumber: true },
											)}
											placeholder="0"
										/>
										<p className="text-xs text-muted-foreground">
											Buffer before first due date. Example: 7 days after
											disbursement.
										</p>
									</div>
								</CardContent>
							</Card>
						)}

						{currentStep === 4 && (
							<Card>
								<CardHeader>
									<CardTitle>Interest & Calculation Rules</CardTitle>
									<CardDescription>
										Control how interest is calculated and amortized.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 md:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="interestType">
												Interest Type
												{hasInterestTypeOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="interestType"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasInterestTypeOptions}
													>
														<SelectTrigger id="interestType">
															<SelectValue placeholder="Select type" />
														</SelectTrigger>
														<SelectContent>
															{interestTypeOptions.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{optionLabel(option)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.interestType && (
												<p className="text-sm text-destructive">
													{String(errors.interestType.message)}
												</p>
											)}
											{!hasInterestTypeOptions && (
												<p className="text-xs text-muted-foreground">
													No interest type options configured.
												</p>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="amortizationType">
												Amortization
												{hasAmortizationTypeOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="amortizationType"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasAmortizationTypeOptions}
													>
														<SelectTrigger id="amortizationType">
															<SelectValue placeholder="Select amortization" />
														</SelectTrigger>
														<SelectContent>
															{amortizationTypeOptions.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{optionLabel(option)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.amortizationType && (
												<p className="text-sm text-destructive">
													{String(errors.amortizationType.message)}
												</p>
											)}
											{!hasAmortizationTypeOptions && (
												<p className="text-xs text-muted-foreground">
													No amortization options configured.
												</p>
											)}
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-3">
										<div className="space-y-2">
											<Label htmlFor="interestRatePerPeriod">
												Interest Rate{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="interestRatePerPeriod"
												type="number"
												step="0.01"
												{...register("interestRatePerPeriod", {
													valueAsNumber: true,
												})}
												placeholder="15"
											/>
											{errors.interestRatePerPeriod && (
												<p className="text-sm text-destructive">
													{String(errors.interestRatePerPeriod.message)}
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												Rate applied per selected frequency. Example: 15% per
												year.
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="interestRateFrequencyType">
												Rate Frequency
												{hasInterestRateFrequencyTypeOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="interestRateFrequencyType"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasInterestRateFrequencyTypeOptions}
													>
														<SelectTrigger id="interestRateFrequencyType">
															<SelectValue placeholder="Select frequency" />
														</SelectTrigger>
														<SelectContent>
															{interestRateFrequencyTypeOptions.map(
																(option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{optionLabel(option)}
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.interestRateFrequencyType && (
												<p className="text-sm text-destructive">
													{String(errors.interestRateFrequencyType.message)}
												</p>
											)}
											{!hasInterestRateFrequencyTypeOptions && (
												<p className="text-xs text-muted-foreground">
													No interest rate frequency options configured.
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												15% per year ~ 1.25% per month (approx).
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="interestCalculationPeriodType">
												Calculation Period
												{hasInterestCalculationPeriodTypeOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="interestCalculationPeriodType"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasInterestCalculationPeriodTypeOptions}
													>
														<SelectTrigger id="interestCalculationPeriodType">
															<SelectValue placeholder="Select period" />
														</SelectTrigger>
														<SelectContent>
															{interestCalculationPeriodTypeOptions.map(
																(option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{optionLabel(option)}
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.interestCalculationPeriodType && (
												<p className="text-sm text-destructive">
													{String(errors.interestCalculationPeriodType.message)}
												</p>
											)}
											{!hasInterestCalculationPeriodTypeOptions && (
												<p className="text-xs text-muted-foreground">
													No interest calculation period options configured.
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												Controls whether interest is computed daily or per
												installment.
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Controller
											control={control}
											name="allowPartialPeriodInterestCalculation"
											render={({ field }) => (
												<Checkbox
													id="allowPartialPeriodInterestCalculation"
													checked={field.value ?? false}
													onCheckedChange={(value) =>
														field.onChange(Boolean(value))
													}
												/>
											)}
										/>
										<Label
											htmlFor="allowPartialPeriodInterestCalculation"
											className="cursor-pointer"
										>
											Allow partial period interest calculation
										</Label>
									</div>
								</CardContent>
							</Card>
						)}

						{currentStep === 5 && (
							<Card>
								<CardHeader>
									<CardTitle>Fees</CardTitle>
									<CardDescription>
										Fees charged before or at disbursement.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<p className="text-xs text-muted-foreground">
										Fees can be deducted immediately when the loan is disbursed
										or billed separately depending on configuration.
									</p>

									<div className="flex flex-wrap gap-2">
										{fees.length === 0 && (
											<span className="text-xs text-muted-foreground">
												No fees selected yet.
											</span>
										)}
										{fees.map((fee) => (
											<Badge
												key={fee.id}
												variant="outline"
												className="flex items-center gap-2"
											>
												<span>{formatFeeSummary(fee, currencyCode)}</span>
												<button
													type="button"
													onClick={() =>
														setFees((prev) =>
															prev.filter((item) => item.id !== fee.id),
														)
													}
												>
													<X className="h-3 w-3" />
												</button>
											</Badge>
										))}
									</div>

									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsFeeDrawerOpen(true)}
										>
											<Plus className="h-4 w-4 mr-2" />
											Add Fee
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsFeeSelectOpen(true)}
										>
											Select Existing Fee
										</Button>
									</div>
								</CardContent>
							</Card>
						)}

						{currentStep === 6 && (
							<Card>
								<CardHeader>
									<CardTitle>Penalties</CardTitle>
									<CardDescription>
										Late payment penalties based on overdue balances.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<p className="text-xs text-muted-foreground">
										Penalties are charged when installments become overdue and
										are marked as penalties in Fineract.
									</p>

									<div className="flex flex-wrap gap-2">
										{penalties.length === 0 && (
											<span className="text-xs text-muted-foreground">
												No penalties selected yet.
											</span>
										)}
										{penalties.map((penalty) => (
											<Badge
												key={penalty.id}
												variant="outline"
												className="flex items-center gap-2"
											>
												<span>
													{formatPenaltySummary(penalty, currencyCode)}
												</span>
												<button
													type="button"
													onClick={() =>
														setPenalties((prev) =>
															prev.filter((item) => item.id !== penalty.id),
														)
													}
												>
													<X className="h-3 w-3" />
												</button>
											</Badge>
										))}
									</div>

									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsPenaltyDrawerOpen(true)}
										>
											<Plus className="h-4 w-4 mr-2" />
											Add Penalty
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsPenaltySelectOpen(true)}
										>
											Select Existing Penalty
										</Button>
									</div>
								</CardContent>
							</Card>
						)}

						{currentStep === 7 && (
							<div className="space-y-4">
								<Card>
									<CardHeader>
										<CardTitle>Delinquency & NPA</CardTitle>
										<CardDescription>
											Control delinquency behavior and NPA thresholds.
										</CardDescription>
									</CardHeader>
									<CardContent className="grid gap-4 md:grid-cols-3">
										<div className="space-y-2">
											<Label htmlFor="graceOnArrearsAgeing">
												Grace on Arrears Ageing (days)
											</Label>
											<Input
												id="graceOnArrearsAgeing"
												type="number"
												{...register("graceOnArrearsAgeing", {
													valueAsNumber: true,
												})}
												placeholder="0"
											/>
											<p className="text-xs text-muted-foreground">
												Days before arrears ageing starts. Example: 3 days.
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="inArrearsTolerance">
												In Arrears Tolerance
											</Label>
											<Input
												id="inArrearsTolerance"
												type="number"
												{...register("inArrearsTolerance", {
													valueAsNumber: true,
												})}
												placeholder="0"
											/>
											<p className="text-xs text-muted-foreground">
												Tolerance amount before marking in arrears. Example:
												100.
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="overdueDaysForNPA">
												Overdue Days for NPA
											</Label>
											<Input
												id="overdueDaysForNPA"
												type="number"
												{...register("overdueDaysForNPA", {
													valueAsNumber: true,
												})}
												placeholder="90"
											/>
											<p className="text-xs text-muted-foreground">
												Days overdue to classify NPA. Example: 90 days.
											</p>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Repayment Waterfall</CardTitle>
										<CardDescription>
											This decides how repayments are allocated.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-2">
										<Label htmlFor="transactionProcessingStrategyCode">
											Transaction Processing Strategy
											{hasTransactionProcessingStrategyOptions && (
												<span className="text-destructive"> *</span>
											)}
										</Label>
										<Controller
											control={control}
											name="transactionProcessingStrategyCode"
											render={({ field }) => (
												<Select
													value={field.value || undefined}
													onValueChange={field.onChange}
													disabled={!hasTransactionProcessingStrategyOptions}
												>
													<SelectTrigger id="transactionProcessingStrategyCode">
														<SelectValue placeholder="Select strategy" />
													</SelectTrigger>
													<SelectContent>
														{transactionProcessingStrategyOptions
															.filter((option) => option.code)
															.map((option) => (
																<SelectItem
																	key={option.code}
																	value={option.code!}
																>
																	{waterfallLabel(option)}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.transactionProcessingStrategyCode && (
											<p className="text-sm text-destructive">
												{String(
													errors.transactionProcessingStrategyCode.message,
												)}
											</p>
										)}
										{!hasTransactionProcessingStrategyOptions && (
											<p className="text-xs text-muted-foreground">
												No repayment strategy options configured.
											</p>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Accounting</CardTitle>
										<CardDescription>
											Enable accounting rule and map GL accounts.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="accountingRule">
												Accounting Rule
												{hasAccountingRuleOptions && (
													<span className="text-destructive"> *</span>
												)}
											</Label>
											<Controller
												control={control}
												name="accountingRule"
												render={({ field }) => (
													<Select
														value={
															field.value !== undefined && field.value !== null
																? String(field.value)
																: undefined
														}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
														disabled={!hasAccountingRuleOptions}
													>
														<SelectTrigger id="accountingRule">
															<SelectValue placeholder="Select rule" />
														</SelectTrigger>
														<SelectContent>
															{accountingRuleOptions.map((option) => (
																<SelectItem
																	key={option.id}
																	value={String(option.id)}
																>
																	{optionLabel(option)}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.accountingRule && (
												<p className="text-sm text-destructive">
													{String(errors.accountingRule.message)}
												</p>
											)}
											{!hasAccountingRuleOptions && (
												<p className="text-xs text-muted-foreground">
													No accounting rule options configured.
												</p>
											)}
										</div>

										{accountingRule && accountingRule !== 1 && (
											<div className="space-y-4">
												<Separator />
												{(!hasAssetOptions ||
													!hasIncomeOptions ||
													!hasExpenseOptions ||
													!hasLiabilityOptions) && (
													<div className="space-y-1 text-xs text-muted-foreground">
														{!hasAssetOptions && (
															<p>No asset accounts configured.</p>
														)}
														{!hasIncomeOptions && (
															<p>No income accounts configured.</p>
														)}
														{!hasExpenseOptions && (
															<p>No expense accounts configured.</p>
														)}
														{!hasLiabilityOptions && (
															<p>No liability accounts configured.</p>
														)}
													</div>
												)}
												<div className="grid gap-4 md:grid-cols-2">
													<div className="space-y-2">
														<Label htmlFor="fundSourceAccountId">
															Fund Source Account{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="fundSourceAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="fundSourceAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{assetOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.fundSourceAccountId && (
															<p className="text-sm text-destructive">
																{String(errors.fundSourceAccountId.message)}
															</p>
														)}
													</div>
													<div className="space-y-2">
														<Label htmlFor="loanPortfolioAccountId">
															Loan Portfolio Account{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="loanPortfolioAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="loanPortfolioAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{assetOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.loanPortfolioAccountId && (
															<p className="text-sm text-destructive">
																{String(errors.loanPortfolioAccountId.message)}
															</p>
														)}
													</div>
													<div className="space-y-2">
														<Label htmlFor="interestOnLoanAccountId">
															Interest on Loan Account{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="interestOnLoanAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="interestOnLoanAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{incomeOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.interestOnLoanAccountId && (
															<p className="text-sm text-destructive">
																{String(errors.interestOnLoanAccountId.message)}
															</p>
														)}
													</div>
													<div className="space-y-2">
														<Label htmlFor="incomeFromFeeAccountId">
															Income from Fees{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="incomeFromFeeAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="incomeFromFeeAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{incomeOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.incomeFromFeeAccountId && (
															<p className="text-sm text-destructive">
																{String(errors.incomeFromFeeAccountId.message)}
															</p>
														)}
													</div>
													<div className="space-y-2">
														<Label htmlFor="incomeFromPenaltyAccountId">
															Income from Penalties{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="incomeFromPenaltyAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="incomeFromPenaltyAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{incomeOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.incomeFromPenaltyAccountId && (
															<p className="text-sm text-destructive">
																{String(
																	errors.incomeFromPenaltyAccountId.message,
																)}
															</p>
														)}
													</div>
													<div className="space-y-2">
														<Label htmlFor="writeOffAccountId">
															Write-off Account{" "}
															<span className="text-destructive">*</span>
														</Label>
														<Controller
															control={control}
															name="writeOffAccountId"
															render={({ field }) => (
																<Select
																	value={
																		field.value !== undefined &&
																		field.value !== null
																			? String(field.value)
																			: undefined
																	}
																	onValueChange={(value) =>
																		field.onChange(Number(value))
																	}
																>
																	<SelectTrigger id="writeOffAccountId">
																		<SelectValue placeholder="Select account" />
																	</SelectTrigger>
																	<SelectContent>
																		{expenseOptions.map((option) => (
																			<SelectItem
																				key={option.id}
																				value={String(option.id)}
																			>
																				{option.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															)}
														/>
														{errors.writeOffAccountId && (
															<p className="text-sm text-destructive">
																{String(errors.writeOffAccountId.message)}
															</p>
														)}
													</div>
												</div>

												{(accountingRule === 3 || accountingRule === 4) && (
													<div className="space-y-4">
														<Separator />
														<div className="grid gap-4 md:grid-cols-2">
															<div className="space-y-2">
																<Label htmlFor="receivableInterestAccountId">
																	Receivable Interest{" "}
																	<span className="text-destructive">*</span>
																</Label>
																<Controller
																	control={control}
																	name="receivableInterestAccountId"
																	render={({ field }) => (
																		<Select
																			value={
																				field.value !== undefined &&
																				field.value !== null
																					? String(field.value)
																					: undefined
																			}
																			onValueChange={(value) =>
																				field.onChange(Number(value))
																			}
																		>
																			<SelectTrigger id="receivableInterestAccountId">
																				<SelectValue placeholder="Select account" />
																			</SelectTrigger>
																			<SelectContent>
																				{assetOptions.map((option) => (
																					<SelectItem
																						key={option.id}
																						value={String(option.id)}
																					>
																						{option.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																/>
																{errors.receivableInterestAccountId && (
																	<p className="text-sm text-destructive">
																		{String(
																			errors.receivableInterestAccountId
																				.message,
																		)}
																	</p>
																)}
															</div>
															<div className="space-y-2">
																<Label htmlFor="receivableFeeAccountId">
																	Receivable Fees{" "}
																	<span className="text-destructive">*</span>
																</Label>
																<Controller
																	control={control}
																	name="receivableFeeAccountId"
																	render={({ field }) => (
																		<Select
																			value={
																				field.value !== undefined &&
																				field.value !== null
																					? String(field.value)
																					: undefined
																			}
																			onValueChange={(value) =>
																				field.onChange(Number(value))
																			}
																		>
																			<SelectTrigger id="receivableFeeAccountId">
																				<SelectValue placeholder="Select account" />
																			</SelectTrigger>
																			<SelectContent>
																				{assetOptions.map((option) => (
																					<SelectItem
																						key={option.id}
																						value={String(option.id)}
																					>
																						{option.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																/>
																{errors.receivableFeeAccountId && (
																	<p className="text-sm text-destructive">
																		{String(
																			errors.receivableFeeAccountId.message,
																		)}
																	</p>
																)}
															</div>
															<div className="space-y-2">
																<Label htmlFor="receivablePenaltyAccountId">
																	Receivable Penalties{" "}
																	<span className="text-destructive">*</span>
																</Label>
																<Controller
																	control={control}
																	name="receivablePenaltyAccountId"
																	render={({ field }) => (
																		<Select
																			value={
																				field.value !== undefined &&
																				field.value !== null
																					? String(field.value)
																					: undefined
																			}
																			onValueChange={(value) =>
																				field.onChange(Number(value))
																			}
																		>
																			<SelectTrigger id="receivablePenaltyAccountId">
																				<SelectValue placeholder="Select account" />
																			</SelectTrigger>
																			<SelectContent>
																				{assetOptions.map((option) => (
																					<SelectItem
																						key={option.id}
																						value={String(option.id)}
																					>
																						{option.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																/>
																{errors.receivablePenaltyAccountId && (
																	<p className="text-sm text-destructive">
																		{String(
																			errors.receivablePenaltyAccountId.message,
																		)}
																	</p>
																)}
															</div>
															<div className="space-y-2">
																<Label htmlFor="overpaymentLiabilityAccountId">
																	Overpayment Liability{" "}
																	<span className="text-destructive">*</span>
																</Label>
																<Controller
																	control={control}
																	name="overpaymentLiabilityAccountId"
																	render={({ field }) => (
																		<Select
																			value={
																				field.value !== undefined &&
																				field.value !== null
																					? String(field.value)
																					: undefined
																			}
																			onValueChange={(value) =>
																				field.onChange(Number(value))
																			}
																		>
																			<SelectTrigger id="overpaymentLiabilityAccountId">
																				<SelectValue placeholder="Select account" />
																			</SelectTrigger>
																			<SelectContent>
																				{liabilityOptions.map((option) => (
																					<SelectItem
																						key={option.id}
																						value={String(option.id)}
																					>
																						{option.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																/>
																{errors.overpaymentLiabilityAccountId && (
																	<p className="text-sm text-destructive">
																		{String(
																			errors.overpaymentLiabilityAccountId
																				.message,
																		)}
																	</p>
																)}
															</div>
															<div className="space-y-2">
																<Label htmlFor="transfersInSuspenseAccountId">
																	Transfers in Suspense{" "}
																	<span className="text-destructive">*</span>
																</Label>
																<Controller
																	control={control}
																	name="transfersInSuspenseAccountId"
																	render={({ field }) => (
																		<Select
																			value={
																				field.value !== undefined &&
																				field.value !== null
																					? String(field.value)
																					: undefined
																			}
																			onValueChange={(value) =>
																				field.onChange(Number(value))
																			}
																		>
																			<SelectTrigger id="transfersInSuspenseAccountId">
																				<SelectValue placeholder="Select account" />
																			</SelectTrigger>
																			<SelectContent>
																				{liabilityOptions.map((option) => (
																					<SelectItem
																						key={option.id}
																						value={String(option.id)}
																					>
																						{option.name}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	)}
																/>
																{errors.transfersInSuspenseAccountId && (
																	<p className="text-sm text-destructive">
																		{String(
																			errors.transfersInSuspenseAccountId
																				.message,
																		)}
																	</p>
																)}
															</div>
														</div>
													</div>
												)}
											</div>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Review</CardTitle>
										<CardDescription>
											Confirm the loan product details before submission.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2 text-sm">
											<p>
												<strong>{watchedValues.name || "Loan Product"}</strong>
											</p>
											<p>
												{currencyCode || "Currency"}{" "}
												{watchedValues.minPrincipal || "-"} -{" "}
												{watchedValues.maxPrincipal || "-"},{" "}
												{watchedValues.minNumberOfRepayments || "-"} -{" "}
												{watchedValues.maxNumberOfRepayments || "-"} repayments
											</p>
											<p>
												{watchedValues.interestRatePerPeriod || "-"}%{" "}
												{optionLabel(
													interestRateFrequencyTypeOptions.find(
														(option) =>
															option.id ===
															watchedValues.interestRateFrequencyType,
													),
												)}
												, {watchedValues.repaymentEvery || "-"}{" "}
												{optionLabel(
													repaymentFrequencyTypeOptions.find(
														(option) =>
															option.id ===
															watchedValues.repaymentFrequencyType,
													),
												)}
											</p>
											<p>
												Fees:{" "}
												{fees.length
													? fees
															.map((fee) => formatFeeSummary(fee, currencyCode))
															.join("; ")
													: "None"}
											</p>
											<p>
												Late penalties:{" "}
												{penalties.length
													? penalties
															.map((penalty) =>
																formatPenaltySummary(penalty, currencyCode),
															)
															.join("; ")
													: "None"}
											</p>
											<p>
												Repayment order:{" "}
												{waterfallLabel(
													transactionProcessingStrategyOptions.find(
														(option) =>
															option.code ===
															watchedValues.transactionProcessingStrategyCode,
													),
												)}
											</p>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">JSON Preview</span>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleCopyPayload}
											>
												<Copy className="h-4 w-4 mr-2" />
												Copy
											</Button>
										</div>
										{copyMessage && (
											<p className="text-xs text-muted-foreground">
												{copyMessage}
											</p>
										)}
										<pre className="rounded-sm border border-border/80 bg-muted/30 p-3 text-xs text-foreground overflow-auto max-h-64">
											{JSON.stringify(payloadPreview, null, 2)}
										</pre>
									</CardContent>
								</Card>
							</div>
						)}

						{submitError && (
							<Alert variant="destructive" className="mt-4">
								<AlertTitle>Unable to submit</AlertTitle>
								<AlertDescription>{submitError}</AlertDescription>
							</Alert>
						)}

						{draftMessage && (
							<Alert variant="success" className="mt-4">
								<AlertTitle>Draft status</AlertTitle>
								<AlertDescription>{draftMessage}</AlertDescription>
							</Alert>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={currentStep === 1 ? onCancel : handlePrevious}
								disabled={currentStep === 1}
							>
								<ChevronLeft className="h-4 w-4 mr-2" />
								{currentStep === 1 ? "Cancel" : "Previous"}
							</Button>

							<div className="flex items-center gap-2">
								<Button type="submit" disabled={isWizardSubmitting}>
									{currentStep === steps.length ? (
										isWizardSubmitting ? (
											"Submitting..."
										) : (
											"Submit Loan Product"
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
					</form>
				)}

				<Sheet open={isFeeDrawerOpen} onOpenChange={setIsFeeDrawerOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Add Fee</SheetTitle>
							<SheetDescription>Create a new fee charge.</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<form onSubmit={handleCreateFee} className="space-y-4">
								{feeSubmitError && (
									<Alert variant="destructive">
										<AlertTitle>Fee creation failed</AlertTitle>
										<AlertDescription>{feeSubmitError}</AlertDescription>
									</Alert>
								)}
								<div className="space-y-2">
									<Label htmlFor="fee-name">Fee Name</Label>
									<Input
										id="fee-name"
										{...feeForm.register("name")}
										placeholder="Processing Fee"
									/>
									{feeForm.formState.errors.name && (
										<p className="text-sm text-destructive">
											{String(feeForm.formState.errors.name.message)}
										</p>
									)}
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fee-calculation">Fee Type</Label>
										<Controller
											control={feeForm.control}
											name="calculationMethod"
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger id="fee-calculation">
														<SelectValue placeholder="Select fee type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="flat">Flat amount</SelectItem>
														<SelectItem value="percent">Percentage</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="fee-amount">Amount</Label>
										<Input
											id="fee-amount"
											type="number"
											{...feeForm.register("amount", { valueAsNumber: true })}
										/>
										<p className="text-xs text-muted-foreground">
											Fee value for the charge. Example: 500.
										</p>
										{feeForm.formState.errors.amount && (
											<p className="text-sm text-destructive">
												{String(feeForm.formState.errors.amount.message)}
											</p>
										)}
									</div>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fee-charge-time">When Charged</Label>
										<Controller
											control={feeForm.control}
											name="chargeTimeType"
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger id="fee-charge-time">
														<SelectValue placeholder="Select charge timing" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="disbursement">
															At disbursement
														</SelectItem>
														<SelectItem value="specifiedDueDate">
															On specified due date
														</SelectItem>
														<SelectItem value="approval">
															On approval
														</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="fee-payment-mode">Payment Mode</Label>
										<Controller
											control={feeForm.control}
											name="paymentMode"
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger id="fee-payment-mode">
														<SelectValue placeholder="Select payment mode" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="deduct">
															Deduct from disbursement
														</SelectItem>
														<SelectItem value="payable">
															Payable separately
														</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
										<p className="text-xs text-muted-foreground">
											Deducted fees reduce the disbursed amount; payable fees
											are billed separately.
										</p>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="fee-currency">Currency</Label>
									<Input
										id="fee-currency"
										{...feeForm.register("currencyCode")}
									/>
									{feeForm.formState.errors.currencyCode && (
										<p className="text-sm text-destructive">
											{String(feeForm.formState.errors.currencyCode.message)}
										</p>
									)}
								</div>
								<div className="flex items-center justify-between">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsFeeDrawerOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isCreatingFee}>
										{isCreatingFee ? "Saving..." : "Save Fee"}
									</Button>
								</div>
							</form>
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={isFeeSelectOpen} onOpenChange={setIsFeeSelectOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{isEdit ? "Edit Loan Product" : "Create Loan Product"}
							</SheetTitle>
							<SheetDescription>
								{isEdit
									? "Update core loan product settings"
									: "Configure a new loan product with a multi-step wizard"}
							</SheetDescription>
						</SheetHeader>
						{submissionErrors && (
							<Alert variant="destructive">
								<AlertTitle>Submission Failed</AlertTitle>
								<AlertDescription>
									<ul>
										{Object.entries(submissionErrors).map(
											([field, messages]) => (
												<li key={field}>
													<strong>{field}:</strong> {messages.join(", ")}
												</li>
											),
										)}
									</ul>
								</AlertDescription>
							</Alert>
						)}
						<div className="space-y-3 mt-4">
							{feeOptions.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No fee charges available.
								</p>
							)}
							{feeOptions.map((option) => (
								<div
									key={option.id}
									className="flex items-center justify-between rounded-sm border border-border/80 p-3"
								>
									<div>
										<div className="text-sm font-medium">{option.name}</div>
										<div className="text-xs text-muted-foreground">
											{option.currency?.code} {option.amount}
										</div>
									</div>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => handleAddExistingFee(option)}
									>
										Add
									</Button>
								</div>
							))}
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={isPenaltyDrawerOpen} onOpenChange={setIsPenaltyDrawerOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Add Penalty</SheetTitle>
							<SheetDescription>Create a new penalty charge.</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<form onSubmit={handleCreatePenalty} className="space-y-4">
								{penaltySubmitError && (
									<Alert variant="destructive">
										<AlertTitle>Penalty creation failed</AlertTitle>
										<AlertDescription>{penaltySubmitError}</AlertDescription>
									</Alert>
								)}
								<p className="text-xs text-muted-foreground">
									Applied when an installment becomes overdue.
								</p>
								<div className="space-y-2">
									<Label htmlFor="penalty-name">Penalty Name</Label>
									<Input
										id="penalty-name"
										{...penaltyForm.register("name")}
										placeholder="Late Payment Penalty"
									/>
									{penaltyForm.formState.errors.name && (
										<p className="text-sm text-destructive">
											{String(penaltyForm.formState.errors.name.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-basis">Penalty Basis</Label>
									<Controller
										control={penaltyForm.control}
										name="penaltyBasis"
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger id="penalty-basis">
													<SelectValue placeholder="Select penalty basis" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="totalOverdue">
														Entire overdue amount
													</SelectItem>
													<SelectItem value="overduePrincipal">
														Overdue principal only
													</SelectItem>
													<SelectItem value="overdueInterest">
														Overdue interest only
													</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
									<p className="text-xs text-muted-foreground">
										Example: 2% on overdue principal means if KES 10,000 is
										overdue, penalty = KES 200.
									</p>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="penalty-method">Calculation Method</Label>
										<Controller
											control={penaltyForm.control}
											name="calculationMethod"
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger id="penalty-method">
														<SelectValue placeholder="Select method" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="flat">Flat amount</SelectItem>
														<SelectItem value="percent">Percentage</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
										<p className="text-xs text-muted-foreground">
											Flat fee means the same penalty regardless of overdue
											amount.
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="penalty-amount">Amount</Label>
										<Input
											id="penalty-amount"
											type="number"
											{...penaltyForm.register("amount", {
												valueAsNumber: true,
											})}
										/>
										<p className="text-xs text-muted-foreground">
											Penalty value. Example: 2 for 2% or 500 for flat.
										</p>
										{penaltyForm.formState.errors.amount && (
											<p className="text-sm text-destructive">
												{String(penaltyForm.formState.errors.amount.message)}
											</p>
										)}
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-grace">
										Grace Period Override (days)
									</Label>
									<Input
										id="penalty-grace"
										type="number"
										{...penaltyForm.register("gracePeriodOverride", {
											valueAsNumber: true,
										})}
										placeholder="3"
									/>
									<p className="text-xs text-muted-foreground">
										Optional. Overrides the delinquency grace period for this
										penalty. Example: 3 days.
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-currency">Currency</Label>
									<Input
										id="penalty-currency"
										{...penaltyForm.register("currencyCode")}
									/>
									{penaltyForm.formState.errors.currencyCode && (
										<p className="text-sm text-destructive">
											{String(
												penaltyForm.formState.errors.currencyCode.message,
											)}
										</p>
									)}
								</div>
								<div className="flex items-center justify-between">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsPenaltyDrawerOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isCreatingPenalty}>
										{isCreatingPenalty ? "Saving..." : "Save Penalty"}
									</Button>
								</div>
							</form>
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={isPenaltySelectOpen} onOpenChange={setIsPenaltySelectOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{isEdit ? "Edit Loan Product" : "Create Loan Product"}
							</SheetTitle>
							<SheetDescription>
								{isEdit
									? "Update core loan product settings"
									: "Configure a new loan product with a multi-step wizard"}
							</SheetDescription>
						</SheetHeader>
						<div className="space-y-3 mt-4">
							{penaltyOptions.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No penalty charges available.
								</p>
							)}
							{penaltyOptions.map((option) => (
								<div
									key={option.id}
									className="flex items-center justify-between rounded-sm border border-border/80 p-3"
								>
									<div>
										<div className="text-sm font-medium">{option.name}</div>
										<div className="text-xs text-muted-foreground">
											{option.currency?.code} {option.amount}
										</div>
									</div>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => handleAddExistingPenalty(option)}
									>
										Add
									</Button>
								</div>
							))}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</TooltipProvider>
	);
}
