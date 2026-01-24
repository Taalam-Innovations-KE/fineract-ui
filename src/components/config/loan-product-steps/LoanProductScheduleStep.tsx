"use client";

import { Controller, useFormContext } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

export function LoanProductScheduleStep({
	template,
}: LoanProductScheduleStepProps) {
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();

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

				<div className="grid gap-4 md:grid-cols-2">
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
											: undefined
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
			</CardContent>
		</Card>
	);
}
