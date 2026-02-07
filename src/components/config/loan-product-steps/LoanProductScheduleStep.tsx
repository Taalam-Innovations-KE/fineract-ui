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

interface LoanProductScheduleStepProps {
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

function optionCode(option?: { code?: string; value?: string; id?: number }) {
	if (option?.code) return option.code;
	if (option?.value) return option.value;
	if (option?.id !== undefined) return String(option.id);
	return "";
}

function optionId(option?: { id?: number | string }) {
	if (option?.id === undefined || option.id === null) return "";
	return String(option.id);
}

export function LoanProductScheduleStep({
	template,
}: LoanProductScheduleStepProps) {
	const {
		register,
		control,
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();
	const isMultiDisburseEnabled = Boolean(watch("multiDisburseLoan"));
	const isOverAppliedEnabled = Boolean(
		watch("allowApprovedDisbursedAmountsOverApplied"),
	);
	const overAppliedCalculationType = watch("overAppliedCalculationType");

	useEffect(() => {
		if (!isMultiDisburseEnabled) {
			setValue("maxTrancheCount", undefined);
			setValue("disallowExpectedDisbursements", false);
			setValue("allowFullTermForTranche", false);
			setValue("syncExpectedWithDisbursementDate", false);
		}
	}, [isMultiDisburseEnabled, setValue]);

	useEffect(() => {
		if (!isOverAppliedEnabled) {
			setValue("overAppliedCalculationType", undefined);
			setValue("overAppliedNumber", undefined);
		} else if (!overAppliedCalculationType) {
			setValue("overAppliedCalculationType", "flat");
		}
	}, [isOverAppliedEnabled, overAppliedCalculationType, setValue]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tenure & Repayment Schedule</CardTitle>
				<CardDescription>
					Define repayment counts and frequency.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-xs text-muted-foreground">
					6 repayments + monthly = a 6-month loan.
				</p>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="minNumberOfRepayments">
							Min Repayments <span className="text-destructive">*</span>
						</Label>
						<Input
							id="minNumberOfRepayments"
							type="number"
							{...register("minNumberOfRepayments", {
								valueAsNumber: true,
							})}
							placeholder="6"
						/>
						<p className="text-xs text-muted-foreground">
							Minimum installments allowed. Example: 6 months if monthly.
						</p>
						{errors.minNumberOfRepayments && (
							<p className="text-sm text-destructive">
								{String(errors.minNumberOfRepayments.message)}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="numberOfRepayments">
							Default Repayments <span className="text-destructive">*</span>
						</Label>
						<Input
							id="numberOfRepayments"
							type="number"
							{...register("numberOfRepayments", {
								valueAsNumber: true,
							})}
							placeholder="12"
						/>
						<p className="text-xs text-muted-foreground">
							Default schedule length. Example: 12 monthly repayments.
						</p>
						{errors.numberOfRepayments && (
							<p className="text-sm text-destructive">
								{String(errors.numberOfRepayments.message)}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxNumberOfRepayments">
							Max Repayments <span className="text-destructive">*</span>
						</Label>
						<Input
							id="maxNumberOfRepayments"
							type="number"
							{...register("maxNumberOfRepayments", {
								valueAsNumber: true,
							})}
							placeholder="24"
						/>
						<p className="text-xs text-muted-foreground">
							Maximum installments allowed. Example: 24 monthly repayments.
						</p>
						{errors.maxNumberOfRepayments && (
							<p className="text-sm text-destructive">
								{String(errors.maxNumberOfRepayments.message)}
							</p>
						)}
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="repaymentEvery">
							Repayment Every <span className="text-destructive">*</span>
						</Label>
						<Input
							id="repaymentEvery"
							type="number"
							{...register("repaymentEvery", { valueAsNumber: true })}
							placeholder="1"
						/>
						{errors.repaymentEvery && (
							<p className="text-sm text-destructive">
								{String(errors.repaymentEvery.message)}
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							How often the borrower pays. Example: 1 with Months = monthly.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="repaymentFrequencyType">
							Frequency <span className="text-destructive">*</span>
						</Label>
						<Controller
							control={control}
							name="repaymentFrequencyType"
							render={({ field }) => (
								<Select
									value={
										field.value !== undefined && field.value !== null
											? String(field.value)
											: ""
									}
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="repaymentFrequencyType">
										<SelectValue placeholder="Select frequency" />
									</SelectTrigger>
									<SelectContent>
										{template?.repaymentFrequencyTypeOptions?.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{optionLabel(option)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.repaymentFrequencyType && (
							<p className="text-sm text-destructive">
								{String(errors.repaymentFrequencyType.message)}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="repaymentStartDateType">Repayment Start Date</Label>
						<Controller
							control={control}
							name="repaymentStartDateType"
							render={({ field }) => (
								<Select
									value={
										field.value !== undefined && field.value !== null
											? String(field.value)
											: ""
									}
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger id="repaymentStartDateType">
										<SelectValue placeholder="Select start date type" />
									</SelectTrigger>
									<SelectContent>
										{template?.repaymentStartDateTypeOptions?.map((option) => {
											const id = optionId(option);
											if (!id) return null;
											return (
												<SelectItem key={id} value={id}>
													{optionLabel(option)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-xs text-muted-foreground">
							Choose whether schedule dates start from disbursement or
							submission date.
						</p>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="loanScheduleType">Repayment Schedule Type</Label>
						<Controller
							control={control}
							name="loanScheduleType"
							render={({ field }) => (
								<Select
									value={field.value || ""}
									onValueChange={(value) => field.onChange(value)}
								>
									<SelectTrigger id="loanScheduleType">
										<SelectValue placeholder="Select schedule type" />
									</SelectTrigger>
									<SelectContent>
										{template?.loanScheduleTypeOptions?.map((option) => {
											const value = optionCode(option);
											if (!value) return null;
											return (
												<SelectItem key={value} value={value}>
													{optionLabel(option)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-xs text-muted-foreground">
							Cumulative uses total planned disbursements. Progressive
							recalculates installments as disbursements occur.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="loanScheduleProcessingType">
							Schedule Processing Type
						</Label>
						<Controller
							control={control}
							name="loanScheduleProcessingType"
							render={({ field }) => (
								<Select
									value={field.value || ""}
									onValueChange={(value) => field.onChange(value)}
								>
									<SelectTrigger id="loanScheduleProcessingType">
										<SelectValue placeholder="Select processing type" />
									</SelectTrigger>
									<SelectContent>
										{template?.loanScheduleProcessingTypeOptions?.map(
											(option) => {
												const value = optionCode(option);
												if (!value) return null;
												return (
													<SelectItem key={value} value={value}>
														{optionLabel(option)}
													</SelectItem>
												);
											},
										)}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-xs text-muted-foreground">
							Controls how repayment schedule rows are processed by the engine.
						</p>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="minimumDaysBetweenDisbursalAndFirstRepayment">
						Minimum Days Before First Repayment
					</Label>
					<Input
						id="minimumDaysBetweenDisbursalAndFirstRepayment"
						type="number"
						{...register("minimumDaysBetweenDisbursalAndFirstRepayment", {
							valueAsNumber: true,
						})}
						placeholder="0"
					/>
					<p className="text-xs text-muted-foreground">
						Buffer before first due date. Example: 7 days after disbursement.
					</p>
				</div>

				<div className="space-y-4 border-t pt-4">
					<p className="text-xs text-muted-foreground">
						Fine tune repayment behavior and grace handling.
					</p>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="graceOnPrincipalPayment">
								Grace on Principal Payment
							</Label>
							<Input
								id="graceOnPrincipalPayment"
								type="number"
								min={0}
								{...register("graceOnPrincipalPayment", {
									setValueAs: (value) =>
										value === "" ? undefined : Number(value),
								})}
								placeholder="0"
							/>
							<p className="text-xs text-muted-foreground">
								Number of installments with principal grace.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="graceOnInterestPayment">
								Grace on Interest Payment
							</Label>
							<Input
								id="graceOnInterestPayment"
								type="number"
								min={0}
								{...register("graceOnInterestPayment", {
									setValueAs: (value) =>
										value === "" ? undefined : Number(value),
								})}
								placeholder="0"
							/>
							<p className="text-xs text-muted-foreground">
								Number of installments with interest grace.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="principalThresholdForLastInstallment">
								Last Installment Principal Threshold
							</Label>
							<Input
								id="principalThresholdForLastInstallment"
								type="number"
								min={0}
								step="0.01"
								{...register("principalThresholdForLastInstallment", {
									setValueAs: (value) =>
										value === "" ? undefined : Number(value),
								})}
								placeholder="0"
							/>
							<p className="text-xs text-muted-foreground">
								Minimum principal moved to the final installment.
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-4 border-t pt-4">
					<p className="text-xs text-muted-foreground">
						Configure tranche disbursement behavior for staged loan releases.
					</p>
					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="multiDisburseLoan"
							render={({ field }) => (
								<Checkbox
									id="multiDisburseLoan"
									checked={Boolean(field.value)}
									onCheckedChange={(value) => field.onChange(Boolean(value))}
								/>
							)}
						/>
						<Label htmlFor="multiDisburseLoan" className="cursor-pointer">
							Enable multi-disbursement
						</Label>
					</div>

					{isMultiDisburseEnabled && (
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="maxTrancheCount">
									Max Tranche Count <span className="text-destructive">*</span>
								</Label>
								<Input
									id="maxTrancheCount"
									type="number"
									min={2}
									{...register("maxTrancheCount", {
										valueAsNumber: true,
									})}
									placeholder="2"
								/>
								{errors.maxTrancheCount && (
									<p className="text-sm text-destructive">
										{String(errors.maxTrancheCount.message)}
									</p>
								)}
							</div>
							<div className="space-y-2 rounded-sm border border-border/60 p-3">
								<div className="flex items-center gap-2">
									<Controller
										control={control}
										name="disallowExpectedDisbursements"
										render={({ field }) => (
											<Checkbox
												id="disallowExpectedDisbursements"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="disallowExpectedDisbursements"
										className="cursor-pointer"
									>
										Disallow expected disbursements
									</Label>
								</div>
								<div className="flex items-center gap-2 pt-2">
									<Controller
										control={control}
										name="allowFullTermForTranche"
										render={({ field }) => (
											<Checkbox
												id="allowFullTermForTranche"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="allowFullTermForTranche"
										className="cursor-pointer"
									>
										Allow full term for each tranche
									</Label>
								</div>
								<div className="flex items-center gap-2 pt-2">
									<Controller
										control={control}
										name="syncExpectedWithDisbursementDate"
										render={({ field }) => (
											<Checkbox
												id="syncExpectedWithDisbursementDate"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="syncExpectedWithDisbursementDate"
										className="cursor-pointer"
									>
										Sync expected with disbursement date
									</Label>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="space-y-4 border-t pt-4">
					<p className="text-xs text-muted-foreground">
						Control whether approved disbursal can exceed applied amount within
						a defined limit.
					</p>
					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="allowApprovedDisbursedAmountsOverApplied"
							render={({ field }) => (
								<Checkbox
									id="allowApprovedDisbursedAmountsOverApplied"
									checked={Boolean(field.value)}
									onCheckedChange={(value) => field.onChange(Boolean(value))}
								/>
							)}
						/>
						<Label
							htmlFor="allowApprovedDisbursedAmountsOverApplied"
							className="cursor-pointer"
						>
							Allow approved disbursed amount over applied
						</Label>
					</div>

					{isOverAppliedEnabled && (
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="overAppliedCalculationType">
									Over-applied Calculation Type{" "}
									<span className="text-destructive">*</span>
								</Label>
								<Controller
									control={control}
									name="overAppliedCalculationType"
									render={({ field }) => (
										<Select
											value={field.value || ""}
											onValueChange={(value) => field.onChange(value)}
										>
											<SelectTrigger id="overAppliedCalculationType">
												<SelectValue placeholder="Select calculation type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="flat">Flat</SelectItem>
												<SelectItem value="percentage">Percentage</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
								{errors.overAppliedCalculationType && (
									<p className="text-sm text-destructive">
										{String(errors.overAppliedCalculationType.message)}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="overAppliedNumber">
									Over-applied Limit <span className="text-destructive">*</span>
								</Label>
								<Input
									id="overAppliedNumber"
									type="number"
									min={0}
									step="0.01"
									{...register("overAppliedNumber", {
										valueAsNumber: true,
									})}
									placeholder="0"
								/>
								{errors.overAppliedNumber && (
									<p className="text-sm text-destructive">
										{String(errors.overAppliedNumber.message)}
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
