"use client";

import { Info } from "lucide-react";
import {
	type Control,
	Controller,
	type FieldErrors,
	type UseFormRegister,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoanProductsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import type { CreateLoanProductFormData } from "@/lib/schemas/loan-product";

interface LoanProductIdentityFormSectionProps {
	control: Control<CreateLoanProductFormData>;
	register: UseFormRegister<CreateLoanProductFormData>;
	errors: FieldErrors<CreateLoanProductFormData>;
	shortNameValue?: string;
	template?: GetLoanProductsTemplateResponse;
}

export function LoanProductIdentityFormSection({
	control,
	register,
	errors,
	shortNameValue,
	template,
}: LoanProductIdentityFormSectionProps) {
	const currencyOptions = template?.currencyOptions || [];
	const hasCurrencyOptions = currencyOptions.length > 0;

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">
					Product Name <span className="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					{...register("name")}
					placeholder="e.g. Working Capital Loan"
				/>
				{errors.name && (
					<p className="text-sm text-destructive">
						{String(errors.name.message)}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="shortName">
						Short Name <span className="text-destructive">*</span>
					</Label>
					<span className="text-xs text-muted-foreground">
						{shortNameValue?.length || 0}/4
					</span>
				</div>
				<Input
					id="shortName"
					{...register("shortName")}
					placeholder="e.g. SWCL"
					maxLength={4}
				/>
				<p className="text-xs text-muted-foreground">
					Short code appears in reports and account references. Max 4 characters
					(e.g. SWCL).
				</p>
				{errors.shortName && (
					<p className="text-sm text-destructive">
						{String(errors.shortName.message)}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Input
					id="description"
					{...register("description")}
					placeholder="Describe the product purpose"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="currencyCode">
						Currency
						{hasCurrencyOptions && <span className="text-destructive"> *</span>}
					</Label>
					<Controller
						control={control}
						name="currencyCode"
						render={({ field }) => (
							<Select
								value={field.value || undefined}
								onValueChange={(value) => {
									console.log("Currency selected:", value);
									field.onChange(value);
								}}
								disabled={!hasCurrencyOptions}
							>
								<SelectTrigger id="currencyCode">
									<SelectValue placeholder="Select currency" />
								</SelectTrigger>
								<SelectContent>
									{currencyOptions
										.filter((option) => option.code)
										.map((option) => (
											<SelectItem key={option.code} value={option.code!}>
												{option.code} - {option.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.currencyCode && (
						<p className="text-sm text-destructive">
							{String(errors.currencyCode.message)}
						</p>
					)}
					{!hasCurrencyOptions && (
						<p className="text-xs text-muted-foreground">
							No currency options configured.
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label
						htmlFor="digitsAfterDecimal"
						className="flex items-center gap-2"
					>
						Decimal Places
						{hasCurrencyOptions && <span className="text-destructive"> *</span>}
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="inline-flex items-center"
									aria-label="Decimal place info"
								>
									<Info className="h-4 w-4 text-muted-foreground" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								Default decimal places for the selected currency.
							</TooltipContent>
						</Tooltip>
					</Label>
					<Input
						id="digitsAfterDecimal"
						type="number"
						min={0}
						max={6}
						disabled={!hasCurrencyOptions}
						{...register("digitsAfterDecimal", { valueAsNumber: true })}
					/>
					<p className="text-xs text-muted-foreground">
						Controls decimal precision for currency amounts. Example: 2 for KES.
					</p>
					{errors.digitsAfterDecimal && (
						<p className="text-sm text-destructive">
							{String(errors.digitsAfterDecimal.message)}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
