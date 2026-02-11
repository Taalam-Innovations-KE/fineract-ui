"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { Control, UseFormWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientFormData } from "../../lib/schemas/client";
import { ClientAddressStep } from "./ClientAddressStep";
import { ClientBasicStep } from "./ClientBasicStep";
import { ClientContactStep } from "./ClientContactStep";
import { ClientDetailsStep } from "./ClientDetailsStep";

interface ClientRegistrationWizardProps {
	control: Control<ClientFormData>;
	errors: Record<string, { message?: string }>;
	watch: UseFormWatch<ClientFormData>;
	officeOptions: Array<{ id?: number; name?: string; nameDecorated?: string }>;
	genderOptions: Array<{ id?: number; name?: string }>;
	legalFormOptions: Array<{ id?: number; name?: string; value?: string }>;
	businessLineOptions: Array<{ id?: number; name?: string }>;
	staffOptions: Array<{ id?: number; displayName?: string }>;
	savingProductOptions: Array<{ id?: number; name?: string }>;
	clientTypeOptions: Array<{ id?: number; name?: string }>;
	clientClassificationOptions: Array<{ id?: number; name?: string }>;
	countryOptions: Array<{ id?: number; name?: string }>;
	canCreateBusinessClient: boolean;
	hasBusinessTypeConfiguration: boolean;
	isOpen: boolean;
	isSubmitting?: boolean;
	submissionError?: string | null;
	submissionErrorDetails?: string[];
	submissionErrorTitle?: string;
	submitLabel?: string;
	submittingLabel?: string;
	onValidateStep: (step: number) => Promise<boolean> | boolean;
	onSubmit: () => Promise<number | null> | number | null;
	onCancel: () => void;
}

const steps = [
	{ id: 1, name: "Profile" },
	{ id: 2, name: "Details" },
	{ id: 3, name: "Contact & KYC" },
	{ id: 4, name: "Activation" },
];

export function ClientRegistrationWizard({
	control,
	errors,
	watch,
	officeOptions,
	genderOptions,
	legalFormOptions,
	businessLineOptions,
	staffOptions,
	savingProductOptions,
	clientTypeOptions,
	clientClassificationOptions,
	countryOptions,
	canCreateBusinessClient,
	hasBusinessTypeConfiguration,
	isOpen,
	isSubmitting = false,
	submissionError,
	submissionErrorDetails = [],
	submissionErrorTitle = "Failed to create client",
	submitLabel = "Submit Client",
	submittingLabel = "Submitting...",
	onValidateStep,
	onSubmit,
	onCancel,
}: ClientRegistrationWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const clientKind = watch("clientKind");

	useEffect(() => {
		if (isOpen) {
			setCurrentStep(1);
		}
	}, [isOpen]);

	const normalizedOfficeOptions = officeOptions.filter(
		(option): option is { id?: number; name: string; nameDecorated?: string } =>
			typeof option.name === "string" && option.name.length > 0,
	);

	const nextStep = async () => {
		const isValid = await onValidateStep(currentStep);
		if (!isValid) return;
		if (currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleFinalSubmit = async () => {
		const invalidStep = await onSubmit();
		if (invalidStep && invalidStep >= 1 && invalidStep <= steps.length) {
			setCurrentStep(invalidStep);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				{steps.map((step, index) => (
					<div key={step.id} className="flex flex-1 items-center">
						<div className="flex flex-col items-center">
							<div
								className={cn(
									"flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm transition-colors",
									currentStep > step.id
										? "border-primary bg-primary text-primary-foreground"
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
									"mt-2 text-center text-xs font-medium",
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
									"mx-2 h-[2px] flex-1",
									currentStep > step.id ? "bg-primary" : "bg-muted",
								)}
							/>
						)}
					</div>
				))}
			</div>

			<div className="min-h-[460px]">
				{currentStep === 1 && (
					<ClientBasicStep
						control={control}
						errors={errors}
						officeOptions={normalizedOfficeOptions}
						legalFormOptions={legalFormOptions}
						canCreateBusinessClient={canCreateBusinessClient}
					/>
				)}
				{currentStep === 2 && (
					<ClientDetailsStep
						control={control}
						errors={errors}
						clientKind={clientKind}
						genderOptions={genderOptions}
						businessLineOptions={businessLineOptions}
						staffOptions={staffOptions}
						savingProductOptions={savingProductOptions}
						hasBusinessTypeConfiguration={hasBusinessTypeConfiguration}
					/>
				)}
				{currentStep === 3 && (
					<ClientContactStep
						control={control}
						errors={errors}
						clientKind={clientKind}
						clientTypeOptions={clientTypeOptions}
						clientClassificationOptions={clientClassificationOptions}
					/>
				)}
				{currentStep === 4 && (
					<ClientAddressStep
						control={control}
						errors={errors}
						countryOptions={countryOptions}
					/>
				)}
			</div>

			{submissionError && (
				<Alert variant="destructive">
					<AlertTitle>{submissionErrorTitle}</AlertTitle>
					<AlertDescription className="space-y-1">
						<p>{submissionError}</p>
						{submissionErrorDetails.map((detail) => (
							<p key={detail} className="text-xs">
								- {detail}
							</p>
						))}
					</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
				<Button
					type="button"
					variant="outline"
					onClick={currentStep === 1 ? onCancel : prevStep}
				>
					<ChevronLeft className="mr-2 h-4 w-4" />
					{currentStep === 1 ? "Cancel" : "Back"}
				</Button>
				<div className="flex items-center gap-2">
					{currentStep < steps.length ? (
						<Button type="button" onClick={nextStep}>
							Next
							<ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					) : (
						<Button
							type="button"
							disabled={isSubmitting}
							onClick={handleFinalSubmit}
						>
							{isSubmitting ? submittingLabel : submitLabel}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
