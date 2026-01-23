"use client";

import { useState } from "react";
import { Control, UseFormWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
	legalFormOptions: Array<{ id?: number; name?: string }>;
	businessLineOptions: Array<{ id?: number; name?: string }>;
	staffOptions: Array<{ id?: number; displayName?: string }>;
	savingProductOptions: Array<{ id?: number; name?: string }>;
	clientTypeOptions: Array<{ id?: number; name?: string }>;
	clientClassificationOptions: Array<{ id?: number; name?: string }>;
	countryOptions: Array<{ id?: number; name?: string }>;
	isAddressEnabled: boolean;
	onSubmit: () => void;
}

const steps = [
	{ id: 1, title: "Basic Information", component: ClientBasicStep },
	{ id: 2, title: "Client Details", component: ClientDetailsStep },
	{ id: 3, title: "Contact & Identifiers", component: ClientContactStep },
	{ id: 4, title: "Address & Activation", component: ClientAddressStep },
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
	isAddressEnabled,
	onSubmit,
}: ClientRegistrationWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const clientKind = watch("clientKind");

	const progress = (currentStep / steps.length) * 100;

	const nextStep = () => {
		if (currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const CurrentStepComponent = steps[currentStep - 1].component;

	const stepProps = {
		control,
		errors,
		...(currentStep === 1 && { officeOptions }),
		...(currentStep === 2 && {
			clientKind,
			genderOptions,
			legalFormOptions,
			businessLineOptions,
			staffOptions,
			savingProductOptions,
		}),
		...(currentStep === 3 && {
			clientKind,
			clientTypeOptions,
			clientClassificationOptions,
		}),
		...(currentStep === 4 && {
			isAddressEnabled,
			countryOptions,
		}),
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="flex justify-between items-center">
					<h3 className="text-lg font-semibold">
						{steps[currentStep - 1].title}
					</h3>
					<span className="text-sm text-muted-foreground">
						Step {currentStep} of {steps.length}
					</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2">
					<div
						className="bg-blue-600 h-2 rounded-full"
						style={{ width: `${progress}%` }}
					></div>
				</div>
			</div>

			<div className="min-h-[400px]">
				{/* biome-ignore lint/suspicious/noExplicitAny: Dynamic props for wizard steps */}
				<CurrentStepComponent {...(stepProps as any)} />
			</div>

			<div className="flex justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={prevStep}
					disabled={currentStep === 1}
				>
					Previous
				</Button>
				{currentStep < steps.length ? (
					<Button type="button" onClick={nextStep}>
						Next
					</Button>
				) : (
					<Button type="button" onClick={onSubmit}>
						Submit
					</Button>
				)}
			</div>
		</div>
	);
}
