"use client";

import { useEffect } from "react";
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

function optionId(option?: { id?: number | string }) {
	if (option?.id === undefined || option.id === null) return "";
	return String(option.id);
}

export function LoanProductInterestStep({
	template,
}: LoanProductInterestStepProps) {
	const {
		register,
		control,
		watch,
		getValues,
		setValue,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();
	const isInterestRecalculationEnabled = Boolean(
		watch("isInterestRecalculationEnabled"),
	);
	const recalculationCompoundingMethod = watch(
		"interestRecalculationCompoundingMethod",
	);
	const recalculationCompoundingFrequencyType = watch(
		"recalculationCompoundingFrequencyType",
	);
	const shouldConfigureCompoundingFrequency =
		isInterestRecalculationEnabled &&
		recalculationCompoundingMethod !== undefined &&
		recalculationCompoundingMethod !== 0;
	const isMonthlyCompounding =
		shouldConfigureCompoundingFrequency &&
		recalculationCompoundingFrequencyType === 4;

	useEffect(() => {
		if (!isInterestRecalculationEnabled) {
			if (getValues("interestRecalculationCompoundingMethod") !== undefined) {
				setValue("interestRecalculationCompoundingMethod", undefined);
			}
			if (getValues("rescheduleStrategyMethod") !== undefined) {
				setValue("rescheduleStrategyMethod", undefined);
			}
			if (getValues("preClosureInterestCalculationStrategy") !== undefined) {
				setValue("preClosureInterestCalculationStrategy", undefined);
			}
			if (getValues("isArrearsBasedOnOriginalSchedule") !== false) {
				setValue("isArrearsBasedOnOriginalSchedule", false);
			}
			if (getValues("disallowInterestCalculationOnPastDue") !== false) {
				setValue("disallowInterestCalculationOnPastDue", false);
			}
			if (getValues("recalculationCompoundingFrequencyType") !== undefined) {
				setValue("recalculationCompoundingFrequencyType", undefined);
			}
			if (
				getValues("recalculationCompoundingFrequencyInterval") !== undefined
			) {
				setValue("recalculationCompoundingFrequencyInterval", undefined);
			}
			if (
				getValues("recalculationCompoundingFrequencyOnDayType") !== undefined
			) {
				setValue("recalculationCompoundingFrequencyOnDayType", undefined);
			}
			if (getValues("recalculationRestFrequencyType") !== undefined) {
				setValue("recalculationRestFrequencyType", undefined);
			}
			if (getValues("recalculationRestFrequencyInterval") !== undefined) {
				setValue("recalculationRestFrequencyInterval", undefined);
			}
			return;
		}

		if (getValues("interestRecalculationCompoundingMethod") === undefined) {
			const compoundingMethod =
				template?.interestRecalculationData
					?.interestRecalculationCompoundingType?.id ??
				template?.interestRecalculationCompoundingTypeOptions?.[0]?.id;
			if (compoundingMethod !== undefined) {
				setValue("interestRecalculationCompoundingMethod", compoundingMethod);
			}
		}

		if (getValues("rescheduleStrategyMethod") === undefined) {
			const rescheduleMethod =
				template?.interestRecalculationData?.rescheduleStrategyType?.id ??
				template?.rescheduleStrategyTypeOptions?.[0]?.id;
			if (rescheduleMethod !== undefined) {
				setValue("rescheduleStrategyMethod", rescheduleMethod);
			}
		}

		if (getValues("preClosureInterestCalculationStrategy") === undefined) {
			const preClosureMethod =
				template?.interestRecalculationData
					?.preClosureInterestCalculationStrategy?.id ??
				template?.preClosureInterestCalculationStrategyOptions?.[0]?.id;
			if (preClosureMethod !== undefined) {
				setValue("preClosureInterestCalculationStrategy", preClosureMethod);
			}
		}

		if (getValues("recalculationRestFrequencyType") === undefined) {
			const restFrequencyType =
				template?.interestRecalculationData?.recalculationRestFrequencyType
					?.id ?? template?.interestRecalculationFrequencyTypeOptions?.[0]?.id;
			if (restFrequencyType !== undefined) {
				setValue("recalculationRestFrequencyType", restFrequencyType);
			}
		}

		if (getValues("recalculationRestFrequencyInterval") === undefined) {
			setValue(
				"recalculationRestFrequencyInterval",
				template?.interestRecalculationData
					?.recalculationRestFrequencyInterval ?? 1,
			);
		}
	}, [getValues, isInterestRecalculationEnabled, setValue, template]);

	useEffect(() => {
		if (!shouldConfigureCompoundingFrequency) {
			if (getValues("recalculationCompoundingFrequencyType") !== undefined) {
				setValue("recalculationCompoundingFrequencyType", undefined);
			}
			if (
				getValues("recalculationCompoundingFrequencyInterval") !== undefined
			) {
				setValue("recalculationCompoundingFrequencyInterval", undefined);
			}
			if (
				getValues("recalculationCompoundingFrequencyOnDayType") !== undefined
			) {
				setValue("recalculationCompoundingFrequencyOnDayType", undefined);
			}
			return;
		}

		if (getValues("recalculationCompoundingFrequencyType") === undefined) {
			const compoundingFrequencyType =
				template?.interestRecalculationData
					?.interestRecalculationCompoundingFrequencyType?.id ??
				template?.interestRecalculationFrequencyTypeOptions?.[0]?.id;
			if (compoundingFrequencyType !== undefined) {
				setValue(
					"recalculationCompoundingFrequencyType",
					compoundingFrequencyType,
				);
			}
		}

		if (getValues("recalculationCompoundingFrequencyInterval") === undefined) {
			setValue(
				"recalculationCompoundingFrequencyInterval",
				template?.interestRecalculationData
					?.recalculationCompoundingFrequencyInterval ?? 1,
			);
		}
	}, [getValues, setValue, shouldConfigureCompoundingFrequency, template]);

	useEffect(() => {
		if (!isMonthlyCompounding) {
			setValue("recalculationCompoundingFrequencyOnDayType", undefined);
		}
	}, [isMonthlyCompounding, setValue]);

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
											: ""
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
											: ""
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
											: ""
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
											: ""
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
											: ""
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
											: ""
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

					{isInterestRecalculationEnabled && (
						<div className="space-y-4 rounded-sm border border-border/60 p-4">
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="interestRecalculationCompoundingMethod">
										Compounding Method{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="interestRecalculationCompoundingMethod"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: ""
												}
												onValueChange={(value) => field.onChange(Number(value))}
											>
												<SelectTrigger id="interestRecalculationCompoundingMethod">
													<SelectValue placeholder="Select compounding method" />
												</SelectTrigger>
												<SelectContent>
													{template?.interestRecalculationCompoundingTypeOptions?.map(
														(option) => {
															const id = optionId(option);
															if (!id) return null;
															return (
																<SelectItem key={id} value={id}>
																	{optionLabel(option)}
																</SelectItem>
															);
														},
													)}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.interestRecalculationCompoundingMethod && (
										<p className="text-sm text-destructive">
											{String(
												errors.interestRecalculationCompoundingMethod.message,
											)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="rescheduleStrategyMethod">
										Reschedule Strategy{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="rescheduleStrategyMethod"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: ""
												}
												onValueChange={(value) => field.onChange(Number(value))}
											>
												<SelectTrigger id="rescheduleStrategyMethod">
													<SelectValue placeholder="Select strategy" />
												</SelectTrigger>
												<SelectContent>
													{template?.rescheduleStrategyTypeOptions?.map(
														(option) => {
															const id = optionId(option);
															if (!id) return null;
															return (
																<SelectItem key={id} value={id}>
																	{optionLabel(option)}
																</SelectItem>
															);
														},
													)}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.rescheduleStrategyMethod && (
										<p className="text-sm text-destructive">
											{String(errors.rescheduleStrategyMethod.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="preClosureInterestCalculationStrategy">
										Pre-Closure Strategy{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="preClosureInterestCalculationStrategy"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: ""
												}
												onValueChange={(value) => field.onChange(Number(value))}
											>
												<SelectTrigger id="preClosureInterestCalculationStrategy">
													<SelectValue placeholder="Select pre-closure strategy" />
												</SelectTrigger>
												<SelectContent>
													{template?.preClosureInterestCalculationStrategyOptions?.map(
														(option) => {
															const id = optionId(option);
															if (!id) return null;
															return (
																<SelectItem key={id} value={id}>
																	{optionLabel(option)}
																</SelectItem>
															);
														},
													)}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.preClosureInterestCalculationStrategy && (
										<p className="text-sm text-destructive">
											{String(
												errors.preClosureInterestCalculationStrategy.message,
											)}
										</p>
									)}
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="recalculationRestFrequencyType">
										Rest Frequency Type{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="recalculationRestFrequencyType"
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: ""
												}
												onValueChange={(value) => field.onChange(Number(value))}
											>
												<SelectTrigger id="recalculationRestFrequencyType">
													<SelectValue placeholder="Select rest frequency type" />
												</SelectTrigger>
												<SelectContent>
													{template?.interestRecalculationFrequencyTypeOptions?.map(
														(option) => {
															const id = optionId(option);
															if (!id) return null;
															return (
																<SelectItem key={id} value={id}>
																	{optionLabel(option)}
																</SelectItem>
															);
														},
													)}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.recalculationRestFrequencyType && (
										<p className="text-sm text-destructive">
											{String(errors.recalculationRestFrequencyType.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="recalculationRestFrequencyInterval">
										Rest Frequency Interval{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Input
										id="recalculationRestFrequencyInterval"
										type="number"
										min={1}
										{...register("recalculationRestFrequencyInterval", {
											valueAsNumber: true,
										})}
									/>
									{errors.recalculationRestFrequencyInterval && (
										<p className="text-sm text-destructive">
											{String(
												errors.recalculationRestFrequencyInterval.message,
											)}
										</p>
									)}
								</div>
							</div>

							{shouldConfigureCompoundingFrequency && (
								<div className="grid gap-4 md:grid-cols-3">
									<div className="space-y-2">
										<Label htmlFor="recalculationCompoundingFrequencyType">
											Compounding Frequency Type{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="recalculationCompoundingFrequencyType"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: ""
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="recalculationCompoundingFrequencyType">
														<SelectValue placeholder="Select compounding frequency" />
													</SelectTrigger>
													<SelectContent>
														{template?.interestRecalculationFrequencyTypeOptions?.map(
															(option) => {
																const id = optionId(option);
																if (!id) return null;
																return (
																	<SelectItem key={id} value={id}>
																		{optionLabel(option)}
																	</SelectItem>
																);
															},
														)}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.recalculationCompoundingFrequencyType && (
											<p className="text-sm text-destructive">
												{String(
													errors.recalculationCompoundingFrequencyType.message,
												)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="recalculationCompoundingFrequencyInterval">
											Compounding Interval{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="recalculationCompoundingFrequencyInterval"
											type="number"
											min={1}
											{...register(
												"recalculationCompoundingFrequencyInterval",
												{
													valueAsNumber: true,
												},
											)}
										/>
										{errors.recalculationCompoundingFrequencyInterval && (
											<p className="text-sm text-destructive">
												{String(
													errors.recalculationCompoundingFrequencyInterval
														.message,
												)}
											</p>
										)}
									</div>
									{isMonthlyCompounding && (
										<div className="space-y-2">
											<Label htmlFor="recalculationCompoundingFrequencyOnDayType">
												Compounding Day of Month{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id="recalculationCompoundingFrequencyOnDayType"
												type="number"
												min={1}
												max={31}
												{...register(
													"recalculationCompoundingFrequencyOnDayType",
													{
														valueAsNumber: true,
													},
												)}
											/>
											{errors.recalculationCompoundingFrequencyOnDayType && (
												<p className="text-sm text-destructive">
													{String(
														errors.recalculationCompoundingFrequencyOnDayType
															.message,
													)}
												</p>
											)}
										</div>
									)}
								</div>
							)}

							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex items-center gap-2">
									<Controller
										control={control}
										name="isArrearsBasedOnOriginalSchedule"
										render={({ field }) => (
											<Checkbox
												id="isArrearsBasedOnOriginalSchedule"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="isArrearsBasedOnOriginalSchedule"
										className="cursor-pointer"
									>
										Arrears based on original schedule
									</Label>
								</div>
								<div className="flex items-center gap-2">
									<Controller
										control={control}
										name="disallowInterestCalculationOnPastDue"
										render={({ field }) => (
											<Checkbox
												id="disallowInterestCalculationOnPastDue"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="disallowInterestCalculationOnPastDue"
										className="cursor-pointer"
									>
										Disallow interest calculation on past due
									</Label>
								</div>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
