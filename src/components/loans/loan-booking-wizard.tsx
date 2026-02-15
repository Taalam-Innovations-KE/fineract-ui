"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import {
	LoanAdvancedStep,
	LoanChargesStep,
	LoanClientProductStep,
	LoanDatesStep,
	LoanGracePeriodsStep,
	LoanReviewStep,
	LoanTermsStep,
} from "@/components/loans/booking-steps";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { PostLoansRequest } from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";
import {
	baseLoanApplicationSchema,
	LOAN_STEP_FIELDS,
} from "@/lib/schemas/loan-application";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

export interface Client {
	id: number;
	displayName?: string;
	fullname?: string;
	accountNo?: string;
	active?: boolean;
}

export interface LoanProduct {
	id: number;
	name?: string;
	shortName?: string;
	currency?: { code?: string; displaySymbol?: string };
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	minInterestRatePerPeriod?: number;
	maxInterestRatePerPeriod?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
	enableDownPayment?: boolean;
	disbursedAmountPercentageForDownPayment?: number;
	enableAutoRepaymentForDownPayment?: boolean;
	multiDisburseLoan?: boolean;
	maxTrancheCount?: number;
	charges?: ProductCharge[];
}

interface ProductCharge {
	id: number;
	name?: string;
	amount?: number;
	chargeCalculationType?: { id?: number; value?: string };
	chargeTimeType?: { id?: number; value?: string };
	chargeAppliesTo?: { id?: number; value?: string };
	currency?: { code?: string; displaySymbol?: string };
	penalty?: boolean;
}

export type LoanBookingMode = "create" | "edit";

interface LoanBookingWizardProps {
	clients: Client[];
	products: LoanProduct[];
	isOpen: boolean;
	onSubmit: (data: PostLoansRequest) => Promise<void>;
	onCancel: () => void;
	mode?: LoanBookingMode;
	loanId?: number;
	initialValues?: Partial<LoanApplicationInput>;
	lockClientProductSelection?: boolean;
}

const STEPS = [
	{ id: 0, name: "Client & Product" },
	{ id: 1, name: "Loan Terms" },
	{ id: 2, name: "Charges" },
	{ id: 3, name: "Grace Periods" },
	{ id: 4, name: "Advanced" },
	{ id: 5, name: "Dates" },
	{ id: 6, name: "Review" },
];

function getToday(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getBaseDefaultValues(): Partial<LoanApplicationInput> {
	const today = getToday();
	return {
		submittedOnDate: today,
		expectedDisbursementDate: today,
		repaymentFrequencyType: 2,
		loanTermFrequencyType: 2,
		repaymentEvery: 1,
		charges: [],
	};
}

function mergeInitialValues(
	initialValues?: Partial<LoanApplicationInput>,
): Partial<LoanApplicationInput> {
	const base = getBaseDefaultValues();
	const merged = {
		...base,
		...initialValues,
	};

	if (!merged.charges) {
		merged.charges = [];
	}

	return merged;
}

export function LoanBookingWizard({
	clients,
	products,
	isOpen,
	onSubmit,
	onCancel,
	mode = "create",
	loanId,
	initialValues,
	lockClientProductSelection = false,
}: LoanBookingWizardProps) {
	const { tenantId } = useTenantStore();
	const initialFormValues = useMemo(
		() => mergeInitialValues(initialValues),
		[initialValues],
	);
	const [currentStep, setCurrentStep] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [draftMessage, setDraftMessage] = useState<string | null>(null);
	const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(
		null,
	);

	// Fetch product details when product is selected
	const productDetailQuery = useQuery({
		queryKey: ["loanProduct", selectedProduct?.id, tenantId],
		queryFn: async () => {
			if (!selectedProduct?.id) return null;
			const response = await fetch(
				`${BFF_ROUTES.loanProducts}/${selectedProduct.id}`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) throw new Error("Failed to fetch product details");
			return response.json() as Promise<LoanProduct>;
		},
		enabled: !!selectedProduct?.id && isOpen,
		staleTime: 1000 * 60 * 5,
	});

	const productDetails = productDetailQuery.data || selectedProduct;

	// Filter charges that can be added at loan booking time
	// Installment charges (chargeTimeType.id = 3) and overdue installment charges (chargeTimeType.id = 9)
	// cannot be added at booking - they require the loan to be disbursed first
	const BOOKING_INCOMPATIBLE_CHARGE_TIME_TYPES = [3, 9];
	const allProductCharges = productDetails?.charges || [];
	const availableCharges = allProductCharges.filter(
		(charge) =>
			!BOOKING_INCOMPATIBLE_CHARGE_TIME_TYPES.includes(
				charge.chargeTimeType?.id ?? 0,
			),
	);

	const form = useForm<LoanApplicationInput>({
		// @ts-expect-error - Resolver type incompatibility due to optional arrays with .default() in schema
		resolver: zodResolver(baseLoanApplicationSchema),
		mode: "onChange",
		shouldUnregister: false,
		defaultValues: initialFormValues,
	});

	const { setValue, getValues, trigger, reset } = form;

	// Reset form when wizard opens
	useEffect(() => {
		if (!isOpen) return;
		reset(initialFormValues);
		setCurrentStep(0);
		setSubmitError(null);
	}, [isOpen, reset, initialFormValues]);

	// Keep selected product in sync with form value and available products.
	useEffect(() => {
		if (!isOpen) return;
		const productId = getValues("productId");
		if (!productId) {
			setSelectedProduct(null);
			return;
		}
		const product =
			products.find((candidate) => candidate.id === productId) || null;
		setSelectedProduct(product);
	}, [isOpen, products, getValues]);

	// Update form when product is selected
	useEffect(() => {
		if (!selectedProduct) return;
		if (mode === "edit") return;

		if (selectedProduct.principal) {
			setValue("principal", selectedProduct.principal);
		}
		if (selectedProduct.numberOfRepayments) {
			setValue("numberOfRepayments", selectedProduct.numberOfRepayments);
		}
		if (selectedProduct.interestRatePerPeriod !== undefined) {
			setValue("interestRatePerPeriod", selectedProduct.interestRatePerPeriod);
		}
		if (selectedProduct.repaymentEvery) {
			setValue("repaymentEvery", selectedProduct.repaymentEvery);
		}
		if (selectedProduct.repaymentFrequencyType?.id !== undefined) {
			setValue(
				"repaymentFrequencyType",
				selectedProduct.repaymentFrequencyType.id,
			);
			setValue(
				"loanTermFrequencyType",
				selectedProduct.repaymentFrequencyType.id,
			);
		}
	}, [mode, selectedProduct, setValue]);

	// Clear draft message after timeout
	useEffect(() => {
		if (!draftMessage) return;
		const timeout = setTimeout(() => setDraftMessage(null), 2500);
		return () => clearTimeout(timeout);
	}, [draftMessage]);

	// Auto-populate charges when product details are loaded
	useEffect(() => {
		if (!productDetails?.charges || availableCharges.length === 0) return;

		// Get current charges to avoid overwriting if user has already modified them
		const currentCharges = getValues("charges");
		if (currentCharges && currentCharges.length > 0) return;

		// Pre-select all booking-compatible charges from the product template
		const preselectedCharges = availableCharges.map((charge) => ({
			chargeId: charge.id,
			amount: charge.amount,
		}));

		setValue("charges", preselectedCharges);
	}, [productDetails?.charges, availableCharges, setValue, getValues]);

	const handleProductSelect = (product: LoanProduct | null) => {
		setSelectedProduct(product);
		// Clear charges when product changes - they'll be repopulated by the effect above
		setValue("charges", []);
	};

	const handleNext = async () => {
		const fields = LOAN_STEP_FIELDS[
			currentStep
		] as (keyof LoanApplicationInput)[];
		const isValid = await trigger(fields, { shouldFocus: true });
		if (isValid && currentStep < STEPS.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleEditStep = (step: number) => {
		setCurrentStep(step);
	};

	const handleSaveDraft = () => {
		if (mode !== "create") return;
		try {
			const draft = getValues();
			localStorage.setItem("loanApplicationDraft", JSON.stringify(draft));
			setDraftMessage("Draft saved locally");
		} catch (_error) {
			setDraftMessage("Unable to save draft");
		}
	};

	const handleFinalSubmit = async () => {
		setSubmitError(null);
		setIsSubmitting(true);
		const isEditMode = mode === "edit";
		const endpoint =
			isEditMode && loanId ? `${BFF_ROUTES.loans}/${loanId}` : BFF_ROUTES.loans;
		const submitContext = {
			action: isEditMode ? "updateLoanApplication" : "createLoan",
			endpoint,
			method: isEditMode ? ("PUT" as const) : ("POST" as const),
			tenantId,
		};

		try {
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
							statusCode: 400,
						},
						submitContext,
					),
				);
				setIsSubmitting(false);
				return;
			}

			const formData = getValues();

			// Build the payload
			const payload: PostLoansRequest = {
				clientId: formData.clientId,
				productId: formData.productId,
				principal: formData.principal,
				numberOfRepayments: formData.numberOfRepayments,
				interestRatePerPeriod: formData.interestRatePerPeriod,
				loanTermFrequency:
					formData.loanTermFrequency || formData.numberOfRepayments,
				loanTermFrequencyType:
					formData.loanTermFrequencyType || formData.repaymentFrequencyType,
				repaymentEvery: formData.repaymentEvery || 1,
				repaymentFrequencyType: formData.repaymentFrequencyType,
				expectedDisbursementDate: formatDateStringToFormat(
					formData.expectedDisbursementDate,
					"dd MMMM yyyy",
				),
				submittedOnDate: formatDateStringToFormat(
					formData.submittedOnDate,
					"dd MMMM yyyy",
				),
				dateFormat: "dd MMMM yyyy",
				locale: "en",
			};

			if (mode === "create") {
				payload.loanType = "individual";
				payload.interestType = 1;
				payload.interestCalculationPeriodType = 1;
				payload.amortizationType = 1;
				payload.transactionProcessingStrategyCode = "mifos-standard-strategy";
			}

			// Add optional fields
			if (formData.externalId) {
				payload.externalId = formData.externalId;
			}

			if (formData.repaymentsStartingFromDate) {
				payload.repaymentsStartingFromDate = formatDateStringToFormat(
					formData.repaymentsStartingFromDate,
					"dd MMMM yyyy",
				);
			}
			// Grace periods
			if (formData.graceOnPrincipalPayment) {
				payload.graceOnPrincipalPayment = formData.graceOnPrincipalPayment;
			}
			if (formData.graceOnInterestPayment) {
				payload.graceOnInterestPayment = formData.graceOnInterestPayment;
			}
			if (formData.graceOnInterestCharged) {
				payload.graceOnInterestCharged = formData.graceOnInterestCharged;
			}
			if (formData.graceOnArrearsAgeing) {
				payload.graceOnArrearsAgeing = formData.graceOnArrearsAgeing;
			}

			// Advanced options
			if (formData.enableDownPayment !== undefined) {
				payload.enableDownPayment = formData.enableDownPayment;
			}
			if (formData.disbursedAmountPercentageForDownPayment !== undefined) {
				payload.disbursedAmountPercentageForDownPayment =
					formData.disbursedAmountPercentageForDownPayment;
			}
			if (formData.enableAutoRepaymentForDownPayment !== undefined) {
				payload.enableAutoRepaymentForDownPayment =
					formData.enableAutoRepaymentForDownPayment;
			}
			if (formData.maxOutstandingLoanBalance !== undefined) {
				payload.maxOutstandingLoanBalance = formData.maxOutstandingLoanBalance;
			}
			if (formData.disbursementData && formData.disbursementData.length > 0) {
				payload.disbursementData = formData.disbursementData.map((item) => ({
					principal: item.principal,
					expectedDisbursementDate: formatDateStringToFormat(
						item.expectedDisbursementDate,
						"dd MMMM yyyy",
					),
				}));
			}

			// Charges
			if (formData.charges && formData.charges.length > 0) {
				payload.charges = formData.charges.map((c) => ({
					chargeId: c.chargeId,
					amount: c.amount,
				}));
			}

			await onSubmit(payload);
			if (mode === "create") {
				localStorage.removeItem("loanApplicationDraft");
			}
		} catch (error) {
			setSubmitError(toSubmitActionError(error, submitContext));
		} finally {
			setIsSubmitting(false);
		}
	};

	// Determine which steps to show based on product
	const visibleSteps = useMemo(() => {
		const steps = [...STEPS];
		// Could filter out steps based on product capabilities
		return steps;
	}, []);

	const currency =
		selectedProduct?.currency?.displaySymbol ||
		selectedProduct?.currency?.code ||
		"KES";
	const isEditMode = mode === "edit";
	const submitErrorTitle = isEditMode
		? "Failed to update loan application"
		: "Failed to submit loan application";
	const submitButtonLabel = isEditMode
		? "Update Loan Application"
		: "Submit Loan Application";
	const submittingButtonLabel = isEditMode ? "Updating..." : "Submitting...";

	return (
		<div className="space-y-6">
			{/* Step indicator */}
			<div className="flex items-center justify-between overflow-x-auto pb-2">
				{visibleSteps.map((step, index) => (
					<div key={step.id} className="flex items-center flex-1 min-w-0">
						<div className="flex flex-col items-center">
							<button
								type="button"
								onClick={() => currentStep > step.id && setCurrentStep(step.id)}
								disabled={currentStep <= step.id}
								className={cn(
									"flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
									currentStep > step.id
										? "bg-primary border-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
										: currentStep === step.id
											? "border-primary text-primary"
											: "border-muted text-muted-foreground cursor-default",
								)}
							>
								{currentStep > step.id ? (
									<Check className="h-5 w-5" />
								) : (
									<span>{step.id + 1}</span>
								)}
							</button>
							<span
								className={cn(
									"mt-2 text-xs font-medium text-center whitespace-nowrap",
									currentStep >= step.id
										? "text-foreground"
										: "text-muted-foreground",
								)}
							>
								{step.name}
							</span>
						</div>
						{index < visibleSteps.length - 1 && (
							<div
								className={cn(
									"h-[2px] flex-1 mx-2 min-w-4",
									currentStep > step.id ? "bg-primary" : "bg-muted",
								)}
							/>
						)}
					</div>
				))}
			</div>

			{/* Form Content */}
			<FormProvider {...form}>
				<div>
					{currentStep === 0 && (
						<LoanClientProductStep
							clients={clients}
							products={products}
							selectedProduct={selectedProduct}
							onProductSelect={handleProductSelect}
							lockSelections={lockClientProductSelection}
						/>
					)}
					{currentStep === 1 && <LoanTermsStep product={selectedProduct} />}
					{currentStep === 2 && (
						<LoanChargesStep
							availableCharges={availableCharges}
							currency={currency}
						/>
					)}
					{currentStep === 3 && <LoanGracePeriodsStep />}
					{currentStep === 4 && (
						<LoanAdvancedStep product={selectedProduct} currency={currency} />
					)}
					{currentStep === 5 && <LoanDatesStep />}
					{currentStep === 6 && (
						<LoanReviewStep
							clients={clients}
							products={products}
							availableCharges={availableCharges}
							onEditStep={handleEditStep}
						/>
					)}

					<div className="mt-4">
						<SubmitErrorAlert error={submitError} title={submitErrorTitle} />
					</div>

					{draftMessage && (
						<Alert variant="default" className="mt-4">
							<AlertTitle>Draft status</AlertTitle>
							<AlertDescription>{draftMessage}</AlertDescription>
						</Alert>
					)}

					{/* Navigation */}
					<div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={currentStep === 0 ? onCancel : handleBack}
						>
							<ChevronLeft className="h-4 w-4 mr-2" />
							{currentStep === 0 ? "Cancel" : "Back"}
						</Button>

						<div className="flex items-center gap-2">
							{mode === "create" && (
								<Button
									type="button"
									variant="outline"
									onClick={handleSaveDraft}
								>
									Save Draft
								</Button>
							)}
							<Button
								type="button"
								disabled={isSubmitting}
								onClick={
									currentStep === visibleSteps.length - 1
										? handleFinalSubmit
										: handleNext
								}
							>
								{currentStep === visibleSteps.length - 1 ? (
									isSubmitting ? (
										submittingButtonLabel
									) : (
										submitButtonLabel
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
		</div>
	);
}
