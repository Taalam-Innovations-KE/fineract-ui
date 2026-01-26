"use client";

import { Controller, useFormContext } from "react-hook-form";
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
import type { CreateLoanProductFormData } from "@/lib/schemas/loan-product";

interface LoanProductInterestStepProps {
	template?: GetLoanProductsTemplateResponse;
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
}: LoanProductInterestStepProps) {
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();

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

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="daysInYearType">
							Days in Year <span className="text-destructive">*</span>
						</Label>
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
										{template?.daysInYearTypeOptions?.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{optionLabel(option)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.daysInYearType && (
							<p className="text-sm text-destructive">
								{String(errors.daysInYearType.message)}
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							Used for calculating interest. 365 is standard, 360 for some
							banking conventions.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="daysInMonthType">
							Days in Month <span className="text-destructive">*</span>
						</Label>
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
										{template?.daysInMonthTypeOptions?.map((option) => (
											<SelectItem
												key={option.code || option.id}
												value={String(option.id)}
											>
												{option.value || "Unknown"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.daysInMonthType && (
							<p className="text-sm text-destructive">
								{String(errors.daysInMonthType.message)}
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							Actual uses calendar days; 30 uses fixed 30-day months.
						</p>
					</div>
				</div>

				<div className="space-y-4">
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
					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="isInterestRecalculationEnabled"
							render={({ field }) => (
								<Checkbox
									id="isInterestRecalculationEnabled"
									checked={field.value ?? false}
									onCheckedChange={(value) => field.onChange(Boolean(value))}
								/>
							)}
						/>
						<Label
							htmlFor="isInterestRecalculationEnabled"
							className="cursor-pointer"
						>
							Enable interest recalculation on early/late repayments
						</Label>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
