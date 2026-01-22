"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	GetLoanProductsRepaymentTemplateFrequencyType,
	GetLoanProductsResponse,
	PutLoanProductsProductIdRequest,
} from "@/lib/fineract/generated/types.gen";

type LoanProductEditFormData = {
	name: string;
	shortName: string;
	description?: string;
	principal?: number;
	minPrincipal?: number;
	maxPrincipal?: number;
	numberOfRepayments?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: number;
};

interface LoanProductEditFormProps {
	initialData?: GetLoanProductsResponse | null;
	repaymentFrequencyTypeOptions: GetLoanProductsRepaymentTemplateFrequencyType[];
	onSubmit: (data: PutLoanProductsProductIdRequest) => Promise<void>;
	onCancel: () => void;
}

export function LoanProductEditForm({
	initialData,
	repaymentFrequencyTypeOptions,
	onSubmit,
	onCancel,
}: LoanProductEditFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm<LoanProductEditFormData>({
		defaultValues: {
			name: initialData?.name || "",
			shortName: initialData?.shortName || "",
			description: "",
			principal: initialData?.principal ?? undefined,
			minPrincipal: initialData?.minPrincipal ?? undefined,
			maxPrincipal: initialData?.maxPrincipal ?? undefined,
			numberOfRepayments: initialData?.numberOfRepayments ?? undefined,
			minNumberOfRepayments: initialData?.minNumberOfRepayments ?? undefined,
			maxNumberOfRepayments: initialData?.maxNumberOfRepayments ?? undefined,
			interestRatePerPeriod: initialData?.interestRatePerPeriod ?? undefined,
			repaymentEvery: initialData?.repaymentEvery ?? undefined,
			repaymentFrequencyType: initialData?.repaymentFrequencyType?.id,
		},
	});

	useEffect(() => {
		if (!initialData) return;
		reset({
			name: initialData.name || "",
			shortName: initialData.shortName || "",
			description: "",
			principal: initialData.principal ?? undefined,
			minPrincipal: initialData.minPrincipal ?? undefined,
			maxPrincipal: initialData.maxPrincipal ?? undefined,
			numberOfRepayments: initialData.numberOfRepayments ?? undefined,
			minNumberOfRepayments: initialData.minNumberOfRepayments ?? undefined,
			maxNumberOfRepayments: initialData.maxNumberOfRepayments ?? undefined,
			interestRatePerPeriod: initialData.interestRatePerPeriod ?? undefined,
			repaymentEvery: initialData.repaymentEvery ?? undefined,
			repaymentFrequencyType: initialData.repaymentFrequencyType?.id,
		});
	}, [initialData, reset]);

	const onFormSubmit = async (data: LoanProductEditFormData) => {
		setIsSubmitting(true);
		try {
			const payload: PutLoanProductsProductIdRequest = {
				name: data.name.trim(),
				shortName: data.shortName.trim(),
				description: data.description?.trim() || undefined,
				currencyCode: initialData?.currency?.code,
				digitsAfterDecimal: initialData?.currency?.decimalPlaces,
				principal: data.principal,
				minPrincipal: data.minPrincipal,
				maxPrincipal: data.maxPrincipal,
				numberOfRepayments: data.numberOfRepayments,
				minNumberOfRepayments: data.minNumberOfRepayments,
				maxNumberOfRepayments: data.maxNumberOfRepayments,
				interestRatePerPeriod: data.interestRatePerPeriod,
				repaymentEvery: data.repaymentEvery,
				repaymentFrequencyType: data.repaymentFrequencyType,
			};
			await onSubmit(payload);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="name">
						Product Name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="name"
						{...register("name", { required: "Product name is required" })}
						placeholder="Loan product name"
					/>
					{errors.name && (
						<p className="text-sm text-destructive">{errors.name.message}</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="shortName">
						Short Name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="shortName"
						{...register("shortName", { required: "Short name is required" })}
						placeholder="Short name"
					/>
					{errors.shortName && (
						<p className="text-sm text-destructive">
							{errors.shortName.message}
						</p>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Input
					id="description"
					{...register("description")}
					placeholder="Describe this loan product"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label>Currency</Label>
					<Input value={initialData?.currency?.code || "—"} disabled readOnly />
				</div>
				<div className="space-y-2">
					<Label htmlFor="principal">Principal</Label>
					<Input
						id="principal"
						type="number"
						step="0.01"
						{...register("principal", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="interestRatePerPeriod">Interest Rate %</Label>
					<Input
						id="interestRatePerPeriod"
						type="number"
						step="0.01"
						{...register("interestRatePerPeriod", { valueAsNumber: true })}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="minPrincipal">Min Principal</Label>
					<Input
						id="minPrincipal"
						type="number"
						step="0.01"
						{...register("minPrincipal", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="maxPrincipal">Max Principal</Label>
					<Input
						id="maxPrincipal"
						type="number"
						step="0.01"
						{...register("maxPrincipal", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="repaymentEvery">Repayment Every</Label>
					<Input
						id="repaymentEvery"
						type="number"
						{...register("repaymentEvery", { valueAsNumber: true })}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="numberOfRepayments">Repayments</Label>
					<Input
						id="numberOfRepayments"
						type="number"
						{...register("numberOfRepayments", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="minNumberOfRepayments">Min Repayments</Label>
					<Input
						id="minNumberOfRepayments"
						type="number"
						{...register("minNumberOfRepayments", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="maxNumberOfRepayments">Max Repayments</Label>
					<Input
						id="maxNumberOfRepayments"
						type="number"
						{...register("maxNumberOfRepayments", { valueAsNumber: true })}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="repaymentFrequencyType">Repayment Frequency</Label>
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
							onValueChange={(value) => field.onChange(Number(value))}
						>
							<SelectTrigger id="repaymentFrequencyType">
								<SelectValue placeholder="Select frequency" />
							</SelectTrigger>
							<SelectContent>
								{repaymentFrequencyTypeOptions.map((option) => (
									<SelectItem key={option.id} value={String(option.id)}>
										{option.description || option.code || "Unknown"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
			</div>

			<div className="flex justify-end gap-3 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}
