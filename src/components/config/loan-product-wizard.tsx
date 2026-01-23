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
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
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
	GetLoanProductsChargeOptions,
	GetLoanProductsTemplateResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
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
}: LoanProductWizardProps) {
	const { tenantId } = useTenantStore();
	const [currentStep, setCurrentStep] = useState(1);
	const [fees, setFees] = useState<FeeItem[]>([]);
	const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [copyMessage, setCopyMessage] = useState<string | null>(null);
	const [draftMessage, setDraftMessage] = useState<string | null>(null);
	const [wizardData, setWizardData] = useState<
		Partial<CreateLoanProductFormData>
	>({});
	const [stepValidities, setStepValidities] = useState<Record<number, boolean>>(
		{},
	);

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

	const { setValue, watch, getValues } = form;

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

	const currencyCode = watch("currencyCode");
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
			template.repaymentFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"repaymentFrequencyType",
				template.repaymentFrequencyTypeOptions[0].id,
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
	}, [template, currencyOptions, getValues, setValue]);

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

	const handleStepDataValid = (stepId: number, data: any) => {
		setWizardData((prev) => ({ ...prev, ...data }));
		setStepValidities((prev) => ({ ...prev, [stepId]: true }));
	};

	const handleStepDataInvalid = (stepId: number) => {
		setStepValidities((prev) => ({ ...prev, [stepId]: false }));
	};

	const handleNext = () => {
		if (stepValidities[currentStep]) {
			if (currentStep < steps.length) {
				setCurrentStep(currentStep + 1);
			}
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
			const payload = buildLoanProductRequest(
				wizardData as CreateLoanProductFormData,
			);
			await onSubmit(payload);
			localStorage.removeItem("loanProductDraft");
		} catch (error) {
			const mapped = mapFineractError(error);
			setSubmitError(mapped.message);
		} finally {
			setIsSubmitting(false);
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
		if (!option?.id || typeof option.id !== "number") return;
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
		if (!option?.id || typeof option.id !== "number") return;
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
			const response = (await chargesApi.create(tenantId, payload)) as any;
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
			const response = (await chargesApi.create(tenantId, payload)) as any;
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

	const assetOptions =
		template?.accountingMappingOptions?.assetAccountOptions || [];
	const incomeOptions =
		template?.accountingMappingOptions?.incomeAccountOptions || [];
	const expenseOptions =
		template?.accountingMappingOptions?.expenseAccountOptions || [];
	const liabilityOptions =
		template?.accountingMappingOptions?.liabilityAccountOptions || [];

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
					<div>
						{currentStep === 1 && (
							<LoanProductIdentityStep
								template={template}
								currencies={currencies}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(1, data)}
								onDataInvalid={() => handleStepDataInvalid(1)}
							/>
						)}
						{currentStep === 2 && (
							<LoanProductAmountStep
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(2, data)}
								onDataInvalid={() => handleStepDataInvalid(2)}
							/>
						)}
						{currentStep === 3 && (
							<LoanProductScheduleStep
								template={template}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(3, data)}
								onDataInvalid={() => handleStepDataInvalid(3)}
							/>
						)}
						{currentStep === 4 && (
							<LoanProductInterestStep
								template={template}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(4, data)}
								onDataInvalid={() => handleStepDataInvalid(4)}
							/>
						)}
						{currentStep === 5 && (
							<LoanProductFeesStep
								template={template}
								currencyCode={wizardData.currencyCode}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(5, data)}
								onDataInvalid={() => handleStepDataInvalid(5)}
							/>
						)}
						{currentStep === 6 && (
							<LoanProductPenaltiesStep
								template={template}
								currencyCode={wizardData.currencyCode}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(6, data)}
								onDataInvalid={() => handleStepDataInvalid(6)}
							/>
						)}
						{currentStep === 7 && (
							<LoanProductAccountingStep
								template={template}
								data={wizardData}
								onDataValid={(data) => handleStepDataValid(7, data)}
								onDataInvalid={() => handleStepDataInvalid(7)}
							/>
						)}

						{submitError && (
							<Alert variant="destructive" className="mt-4">
								<AlertTitle>Failed to create loan product</AlertTitle>
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
					</div>
				)}

				<Sheet open={isFeeDrawerOpen} onOpenChange={setIsFeeDrawerOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Add Fee</SheetTitle>
							<SheetDescription>Create a new fee charge.</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<form onSubmit={handleCreateFee} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="fee-name">
										Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="fee-name"
										{...feeForm.register("name")}
										placeholder="e.g. Processing Fee"
									/>
									{feeForm.formState.errors.name && (
										<p className="text-sm text-destructive">
											{String(feeForm.formState.errors.name.message)}
										</p>
									)}
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fee-amount">
											Amount <span className="text-destructive">*</span>
										</Label>
										<Input
											id="fee-amount"
											type="number"
											step="0.01"
											{...feeForm.register("amount", { valueAsNumber: true })}
											placeholder="100"
										/>
										{feeForm.formState.errors.amount && (
											<p className="text-sm text-destructive">
												{String(feeForm.formState.errors.amount.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="fee-calculation">
											Calculation Method{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Select
											value={feeForm.watch("calculationMethod")}
											onValueChange={(value) =>
												feeForm.setValue(
													"calculationMethod",
													value as "flat" | "percent",
												)
											}
										>
											<SelectTrigger id="fee-calculation">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="flat">Flat Amount</SelectItem>
												<SelectItem value="percent">Percentage</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fee-time">
											Charge Time <span className="text-destructive">*</span>
										</Label>
										<Select
											value={feeForm.watch("chargeTimeType")}
											onValueChange={(value) =>
												feeForm.setValue(
													"chargeTimeType",
													value as
														| "disbursement"
														| "specifiedDueDate"
														| "approval",
												)
											}
										>
											<SelectTrigger id="fee-time">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="disbursement">
													At Disbursement
												</SelectItem>
												<SelectItem value="specifiedDueDate">
													On Specified Due Date
												</SelectItem>
												<SelectItem value="approval">On Approval</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="fee-payment">
											Payment Mode <span className="text-destructive">*</span>
										</Label>
										<Select
											value={feeForm.watch("paymentMode")}
											onValueChange={(value) =>
												feeForm.setValue(
													"paymentMode",
													value as "deduct" | "payable",
												)
											}
										>
											<SelectTrigger id="fee-payment">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="deduct">
													Deduct from Disbursement
												</SelectItem>
												<SelectItem value="payable">
													Payable Separately
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								{feeSubmitError && (
									<Alert variant="destructive">
										<AlertTitle>Failed to create fee</AlertTitle>
										<AlertDescription>{feeSubmitError}</AlertDescription>
									</Alert>
								)}

								<div className="flex items-center justify-end gap-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsFeeDrawerOpen(false)}
										disabled={isCreatingFee}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isCreatingFee}>
										{isCreatingFee ? "Creating..." : "Create Fee"}
									</Button>
								</div>
							</form>
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={isFeeSelectOpen} onOpenChange={setIsFeeSelectOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Select Existing Fee</SheetTitle>
							<SheetDescription>
								Choose from configured fee charges.
							</SheetDescription>
						</SheetHeader>
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
										onClick={() => {
											handleAddExistingFee(option);
											setIsFeeSelectOpen(false);
										}}
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
						className="w-full sm:max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Add Penalty</SheetTitle>
							<SheetDescription>Create a new penalty charge.</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<form onSubmit={handleCreatePenalty} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="penalty-name">
										Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="penalty-name"
										{...penaltyForm.register("name")}
										placeholder="e.g. Late Payment Penalty"
									/>
									{penaltyForm.formState.errors.name && (
										<p className="text-sm text-destructive">
											{String(penaltyForm.formState.errors.name.message)}
										</p>
									)}
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="penalty-amount">
											Amount <span className="text-destructive">*</span>
										</Label>
										<Input
											id="penalty-amount"
											type="number"
											step="0.01"
											{...penaltyForm.register("amount", {
												valueAsNumber: true,
											})}
											placeholder="100"
										/>
										{penaltyForm.formState.errors.amount && (
											<p className="text-sm text-destructive">
												{String(penaltyForm.formState.errors.amount.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="penalty-calculation">
											Calculation Method{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Select
											value={penaltyForm.watch("calculationMethod")}
											onValueChange={(value) =>
												penaltyForm.setValue(
													"calculationMethod",
													value as "flat" | "percent",
												)
											}
										>
											<SelectTrigger id="penalty-calculation">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="flat">Flat Amount</SelectItem>
												<SelectItem value="percent">Percentage</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="penalty-basis">
											Penalty Basis <span className="text-destructive">*</span>
										</Label>
										<Select
											value={penaltyForm.watch("penaltyBasis")}
											onValueChange={(value) =>
												penaltyForm.setValue(
													"penaltyBasis",
													value as
														| "totalOverdue"
														| "overduePrincipal"
														| "overdueInterest",
												)
											}
										>
											<SelectTrigger id="penalty-basis">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="totalOverdue">
													Total Overdue Amount
												</SelectItem>
												<SelectItem value="overduePrincipal">
													Overdue Principal
												</SelectItem>
												<SelectItem value="overdueInterest">
													Overdue Interest
												</SelectItem>
											</SelectContent>
										</Select>
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
											placeholder="0"
										/>
										<p className="text-xs text-muted-foreground">
											Optional grace period before penalty applies.
										</p>
									</div>
								</div>

								{penaltySubmitError && (
									<Alert variant="destructive">
										<AlertTitle>Failed to create penalty</AlertTitle>
										<AlertDescription>{penaltySubmitError}</AlertDescription>
									</Alert>
								)}

								<div className="flex items-center justify-end gap-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsPenaltyDrawerOpen(false)}
										disabled={isCreatingPenalty}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isCreatingPenalty}>
										{isCreatingPenalty ? "Creating..." : "Create Penalty"}
									</Button>
								</div>
							</form>
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={isPenaltySelectOpen} onOpenChange={setIsPenaltySelectOpen}>
					<SheetContent
						side="right"
						className="w-full sm:max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Select Existing Penalties</SheetTitle>
							<SheetDescription>
								Choose from configured penalty charges.
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
										onClick={() => {
											handleAddExistingPenalty(option);
											setIsPenaltySelectOpen(false);
										}}
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
