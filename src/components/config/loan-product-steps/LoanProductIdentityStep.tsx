"use client";

import { Info } from "lucide-react";
import { useEffect, useMemo } from "react";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GetLoanProductsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import type { CreateLoanProductFormData } from "@/lib/schemas/loan-product";

interface LoanProductIdentityStepProps {
	template?: GetLoanProductsTemplateResponse;
	currencies: string[];
}

function getTemplateCurrencyOptions(
	template?: GetLoanProductsTemplateResponse,
	allowedCurrencies?: string[],
) {
	const options = template?.currencyOptions || [];
	if (!allowedCurrencies?.length) return options;

	return options.filter(
		(option) => option.code && allowedCurrencies.includes(option.code),
	);
}

export function LoanProductIdentityStep({
	template,
	currencies,
}: LoanProductIdentityStepProps) {
	const {
		register,
		control,
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();

	const currencyOptions = useMemo(
		() => getTemplateCurrencyOptions(template, currencies),
		[template, currencies],
	);

	const shortNameValue = watch("shortName");
	const currencyCode = watch("currencyCode");

	// Set default currency from template if not already set
	useEffect(() => {
		if (!template) return;

		if (!currencyCode && currencyOptions[0]?.code) {
			setValue("currencyCode", currencyOptions[0]?.code);
		}
	}, [template, currencyOptions, currencyCode, setValue]);

	// Update decimal places when currency changes
	useEffect(() => {
		if (!currencyCode) return;
		const match = currencyOptions.find(
			(option) => option.code === currencyCode,
		);
		if (match?.decimalPlaces !== undefined) {
			setValue("digitsAfterDecimal", match.decimalPlaces);
		}
	}, [currencyCode, currencyOptions, setValue]);

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<CardTitle>Identity & Currency</CardTitle>
					<CardDescription>
						Set the core product identity and currency defaults.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
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
							Short code appears in reports and account references. Max 4
							characters (e.g. SWCL).
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
								Currency <span className="text-destructive">*</span>
							</Label>
							<Controller
								control={control}
								name="currencyCode"
								render={({ field }) => (
									<Select
										value={field.value || undefined}
										onValueChange={field.onChange}
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
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="digitsAfterDecimal"
								className="flex items-center gap-2"
							>
								Decimal Places <span className="text-destructive">*</span>
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
								{...register("digitsAfterDecimal", {
									valueAsNumber: true,
								})}
							/>
							<p className="text-xs text-muted-foreground">
								Controls decimal precision for currency amounts. Example: 2 for
								KES.
							</p>
							{errors.digitsAfterDecimal && (
								<p className="text-sm text-destructive">
									{String(errors.digitsAfterDecimal.message)}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
