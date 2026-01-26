"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetLoanProductsTemplateResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	buildLoanProductRequest,
	loanProductsApi,
} from "@/lib/fineract/loan-products";
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
	1: ["name", "shortName", "description", "currencyCode", "digitsAfterDecimal"],
	2: ["minPrincipal", "principal", "maxPrincipal", "inMultiplesOf"],
	3: [
		"minNumberOfRepayments",
		"numberOfRepayments",
		"maxNumberOfRepayments",
		"repaymentEvery",
		"repaymentFrequencyType",
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
	],
	5: ["fees"],
	6: ["penalties"],
	7: [
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
	const [submitError, setSubmitError] = useState<string | null>(null);
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
		allowPartialPeriodInterestCalculation: false,
		graceOnArrearsAgeing: 0,
		inArrearsTolerance: 0,
		overdueDaysForNPA: 0,
		daysInYearType: 365,
		daysInMonthType: 30,
		isInterestRecalculationEnabled: false,
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

	const currencyCode = form.watch("currencyCode");

	// Set template defaults when template loads
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
				setSubmitError(`Validation failed: ${errorMessages}`);
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
			const mapped = mapFineractError(error);
			setSubmitError(mapped.message);
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

							{submitError && (
								<Alert variant="destructive" className="mt-4">
									<AlertTitle>Failed to create loan product</AlertTitle>
									<AlertDescription>{submitError}</AlertDescription>
								</Alert>
							)}

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
					</FormProvider>
				)}
			</div>
		</TooltipProvider>
	);
}
