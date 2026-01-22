"use client";

import {
	type Control,
	Controller,
	type FieldErrors,
	type UseFormRegister,
} from "react-hook-form";
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
import type { CreateLoanProductFormData } from "@/lib/schemas/loan-product";

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

interface LoanProductInterestFormSectionProps {
	control: Control<CreateLoanProductFormData>;
	register: UseFormRegister<CreateLoanProductFormData>;
	errors: FieldErrors<CreateLoanProductFormData>;
	template?: GetLoanProductsTemplateResponse;
}

export function LoanProductInterestFormSection({
	control,
	register,
	errors,
	template,
}: LoanProductInterestFormSectionProps) {
	const interestTypeOptions = template?.interestTypeOptions || [];
	const amortizationTypeOptions = template?.amortizationTypeOptions || [];
	const interestRateFrequencyTypeOptions =
		template?.interestRateFrequencyTypeOptions || [];
	const interestCalculationPeriodTypeOptions =
		template?.interestCalculationPeriodTypeOptions || [];
	const hasInterestTypeOptions = interestTypeOptions.length > 0;
	const hasAmortizationTypeOptions = amortizationTypeOptions.length > 0;
	const hasInterestRateFrequencyTypeOptions =
		interestRateFrequencyTypeOptions.length > 0;
	const hasInterestCalculationPeriodTypeOptions =
		interestCalculationPeriodTypeOptions.length > 0;

	return (
		<div className="space-y-4">
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
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!hasInterestTypeOptions}
							>
								<SelectTrigger id="interestType">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									{interestTypeOptions.map((option) => (
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
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!hasAmortizationTypeOptions}
							>
								<SelectTrigger id="amortizationType">
									<SelectValue placeholder="Select amortization" />
								</SelectTrigger>
								<SelectContent>
									{amortizationTypeOptions.map((option) => (
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
						Interest Rate <span className="text-destructive">*</span>
					</Label>
					<Input
						id="interestRatePerPeriod"
						type="number"
						step="0.01"
						{...register("interestRatePerPeriod", { valueAsNumber: true })}
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
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!hasInterestRateFrequencyTypeOptions}
							>
								<SelectTrigger id="interestRateFrequencyType">
									<SelectValue placeholder="Select frequency" />
								</SelectTrigger>
								<SelectContent>
									{interestRateFrequencyTypeOptions.map((option) => (
										<SelectItem key={option.id} value={String(option.id)}>
											{optionLabel(option)}
										</SelectItem>
									))}
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
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!hasInterestCalculationPeriodTypeOptions}
							>
								<SelectTrigger id="interestCalculationPeriodType">
									<SelectValue placeholder="Select period" />
								</SelectTrigger>
								<SelectContent>
									{interestCalculationPeriodTypeOptions.map((option) => (
										<SelectItem key={option.id} value={String(option.id)}>
											{optionLabel(option)}
										</SelectItem>
									))}
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
				{errors.allowPartialPeriodInterestCalculation && (
					<p className="text-sm text-destructive">
						{String(errors.allowPartialPeriodInterestCalculation.message)}
					</p>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="daysInYearType">Days in Year Type *</Label>
					<Controller
						control={control}
						name="daysInYearType"
						render={({ field }) => (
							<Select
								value={
									field.value !== undefined && field.value !== null
										? String(field.value)
										: undefined
								}
								onValueChange={(value) => field.onChange(Number(value))}
							>
								<SelectTrigger id="daysInYearType">
									<SelectValue placeholder="Select days in year" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1</SelectItem>
									<SelectItem value="360">360</SelectItem>
									<SelectItem value="364">364</SelectItem>
									<SelectItem value="365">365</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
					{errors.daysInYearType && (
						<p className="text-sm text-destructive">
							{String(errors.daysInYearType.message)}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="daysInMonthType">Days in Month Type *</Label>
					<Controller
						control={control}
						name="daysInMonthType"
						render={({ field }) => (
							<Select
								value={
									field.value !== undefined && field.value !== null
										? String(field.value)
										: undefined
								}
								onValueChange={(value) => field.onChange(Number(value))}
							>
								<SelectTrigger id="daysInMonthType">
									<SelectValue placeholder="Select days in month" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1</SelectItem>
									<SelectItem value="30">30</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
					{errors.daysInMonthType && (
						<p className="text-sm text-destructive">
							{String(errors.daysInMonthType.message)}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="isInterestRecalculationEnabled">
						Interest Recalculation Enabled *
					</Label>
					<Controller
						control={control}
						name="isInterestRecalculationEnabled"
						render={({ field }) => (
							<Select
								value={
									field.value !== undefined && field.value !== null
										? String(field.value)
										: undefined
								}
								onValueChange={(value) => field.onChange(value === "true")}
							>
								<SelectTrigger id="isInterestRecalculationEnabled">
									<SelectValue placeholder="Select option" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="true">True</SelectItem>
									<SelectItem value="false">False</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
					{errors.isInterestRecalculationEnabled && (
						<p className="text-sm text-destructive">
							{String(errors.isInterestRecalculationEnabled.message)}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
