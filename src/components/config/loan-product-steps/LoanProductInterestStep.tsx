"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import type { GetLoanProductsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import {
	type LoanProductInterestFormData,
	loanProductInterestSchema,
} from "@/lib/schemas/loan-product";

interface LoanProductInterestStepProps {
	template?: GetLoanProductsTemplateResponse;
	data?: Partial<LoanProductInterestFormData>;
	onDataValid: (data: LoanProductInterestFormData) => void;
	onDataInvalid: () => void;
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

export function LoanProductInterestStep({
	template,
	data,
	onDataValid,
	onDataInvalid,
}: LoanProductInterestStepProps) {
	const {
		register,
		control,
		setValue,
		watch,
		formState: { errors, isValid },
	} = useForm<LoanProductInterestFormData>({
		resolver: zodResolver(loanProductInterestSchema),
		mode: "onChange",
		defaultValues: data || {
			interestRatePerPeriod: 15,
			allowPartialPeriodInterestCalculation: false,
		},
	});

	const watchedValues = watch();

	useEffect(() => {
		if (!template) return;

		if (
			data?.interestType === undefined &&
			template.interestTypeOptions?.[0]?.id !== undefined
		) {
			setValue("interestType", template.interestTypeOptions[0].id);
		}

		if (
			data?.amortizationType === undefined &&
			template.amortizationTypeOptions?.[0]?.id !== undefined
		) {
			setValue("amortizationType", template.amortizationTypeOptions[0].id);
		}

		if (
			data?.interestRateFrequencyType === undefined &&
			template.interestRateFrequencyTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"interestRateFrequencyType",
				template.interestRateFrequencyTypeOptions[0].id,
			);
		}

		if (
			data?.interestCalculationPeriodType === undefined &&
			template.interestCalculationPeriodTypeOptions?.[0]?.id !== undefined
		) {
			setValue(
				"interestCalculationPeriodType",
				template.interestCalculationPeriodTypeOptions[0].id,
			);
		}
	}, [template, data, setValue]);

	useEffect(() => {
		if (isValid) {
			onDataValid(watchedValues);
		} else {
			onDataInvalid();
		}
	}, [isValid, watchedValues, onDataValid, onDataInvalid]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Interest & Calculation Rules</CardTitle>
				<CardDescription>
					Control how interest is calculated and amortized.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="interestType">
							Interest Type <span className="text-destructive">*</span>
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
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="interestType">
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										{template?.interestTypeOptions?.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
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
					</div>

					<div className="space-y-2">
						<Label htmlFor="amortizationType">
							Amortization <span className="text-destructive">*</span>
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
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="amortizationType">
										<SelectValue placeholder="Select amortization" />
									</SelectTrigger>
									<SelectContent>
										{template?.amortizationTypeOptions?.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
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
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="interestRatePerPeriod">
							Interest Rate <span className="text-destructive">*</span>
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
							Rate applied per selected frequency. Example: 15% per year.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="interestRateFrequencyType">
							Rate Frequency <span className="text-destructive">*</span>
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
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="interestRateFrequencyType">
										<SelectValue placeholder="Select frequency" />
									</SelectTrigger>
									<SelectContent>
										{template?.interestRateFrequencyTypeOptions?.map(
											(option) => (
												<SelectItem key={option.id} value={String(option.id)}>
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
						<p className="text-xs text-muted-foreground">
							15% per year ~ 1.25% per month (approx).
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="interestCalculationPeriodType">
							Calculation Period <span className="text-destructive">*</span>
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
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="interestCalculationPeriodType">
										<SelectValue placeholder="Select period" />
									</SelectTrigger>
									<SelectContent>
										{template?.interestCalculationPeriodTypeOptions?.map(
											(option) => (
												<SelectItem key={option.id} value={String(option.id)}>
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
						<p className="text-xs text-muted-foreground">
							Controls whether interest is computed daily or per installment.
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
								onCheckedChange={(value) => field.onChange(Boolean(value))}
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
	);
}
