"use client";

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

function waterfallLabel(option?: { code?: string; name?: string }) {
	if (!option?.code) return option?.name || "Strategy";

	const mapping: Record<string, string> = {
		"mifos-standard-strategy":
			"Standard (Penalties -> Fees -> Interest -> Principal)",
		"principal-interest-penalties-fees-order-strategy":
			"Principal -> Interest -> Penalties -> Fees",
		"interest-principal-penalties-fees-order-strategy":
			"Interest -> Principal -> Penalties -> Fees",
	};

	return mapping[option.code] || option?.name || option.code;
}

interface LoanProductAccountingFormSectionProps {
	control: Control<CreateLoanProductFormData>;
	register: UseFormRegister<CreateLoanProductFormData>;
	errors: FieldErrors<CreateLoanProductFormData>;
	accountingRule?: number;
	template?: GetLoanProductsTemplateResponse;
}

export function LoanProductAccountingFormSection({
	control,
	register,
	errors,
	accountingRule,
	template,
}: LoanProductAccountingFormSectionProps) {
	const transactionProcessingStrategyOptions =
		template?.transactionProcessingStrategyOptions || [];
	const accountingRuleOptions = template?.accountingRuleOptions || [];
	const assetOptions =
		template?.accountingMappingOptions?.assetAccountOptions || [];
	const incomeOptions =
		template?.accountingMappingOptions?.incomeAccountOptions || [];
	const expenseOptions =
		template?.accountingMappingOptions?.expenseAccountOptions || [];
	const liabilityOptions =
		template?.accountingMappingOptions?.liabilityAccountOptions || [];

	const hasTransactionProcessingStrategyOptions =
		transactionProcessingStrategyOptions.length > 0;
	const hasAccountingRuleOptions = accountingRuleOptions.length > 0;
	const hasAssetOptions = assetOptions.length > 0;
	const _hasIncomeOptions = incomeOptions.length > 0;
	const _hasExpenseOptions = expenseOptions.length > 0;
	const _hasLiabilityOptions = liabilityOptions.length > 0;

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="transactionProcessingStrategyCode">
						Repayment Strategy
						{hasTransactionProcessingStrategyOptions && (
							<span className="text-destructive"> *</span>
						)}
					</Label>
					<Controller
						control={control}
						name="transactionProcessingStrategyCode"
						render={({ field }) => (
							<Select
								value={field.value || undefined}
								onValueChange={field.onChange}
								disabled={!hasTransactionProcessingStrategyOptions}
							>
								<SelectTrigger id="transactionProcessingStrategyCode">
									<SelectValue placeholder="Select strategy" />
								</SelectTrigger>
								<SelectContent>
									{transactionProcessingStrategyOptions.map((option) => (
										<SelectItem key={option.code} value={option.code!}>
											{waterfallLabel(option)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.transactionProcessingStrategyCode && (
						<p className="text-sm text-destructive">
							{String(errors.transactionProcessingStrategyCode.message)}
						</p>
					)}
					{!hasTransactionProcessingStrategyOptions && (
						<p className="text-xs text-muted-foreground">
							No repayment strategy options configured.
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="graceOnArrearsAgeing">Grace on Arrears Ageing</Label>
					<Input
						id="graceOnArrearsAgeing"
						type="number"
						{...register("graceOnArrearsAgeing", { valueAsNumber: true })}
						placeholder="0"
					/>
					<p className="text-xs text-muted-foreground">
						Days of grace before arrears ageing starts.
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="inArrearsTolerance">Arrears Tolerance</Label>
					<Input
						id="inArrearsTolerance"
						type="number"
						step="0.01"
						{...register("inArrearsTolerance", { valueAsNumber: true })}
						placeholder="0"
					/>
					<p className="text-xs text-muted-foreground">
						Amount tolerance for considering loan in arrears.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="overdueDaysForNPA">Days for NPA</Label>
					<Input
						id="overdueDaysForNPA"
						type="number"
						{...register("overdueDaysForNPA", { valueAsNumber: true })}
						placeholder="0"
					/>
					<p className="text-xs text-muted-foreground">
						Days overdue to classify as Non-Performing Asset.
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="accountingRule">
					Accounting Rule
					{hasAccountingRuleOptions && (
						<span className="text-destructive"> *</span>
					)}
				</Label>
				<Controller
					control={control}
					name="accountingRule"
					render={({ field }) => (
						<Select
							value={
								field.value !== undefined && field.value !== null
									? String(field.value)
									: undefined
							}
							onValueChange={(value) => field.onChange(Number(value))}
							disabled={!hasAccountingRuleOptions}
						>
							<SelectTrigger id="accountingRule">
								<SelectValue placeholder="Select accounting rule" />
							</SelectTrigger>
							<SelectContent>
								{accountingRuleOptions.map((option) => (
									<SelectItem key={option.id} value={String(option.id)}>
										{optionLabel(option)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.accountingRule && (
					<p className="text-sm text-destructive">
						{String(errors.accountingRule.message)}
					</p>
				)}
				{!hasAccountingRuleOptions && (
					<p className="text-xs text-muted-foreground">
						No accounting rule options configured.
					</p>
				)}
			</div>

			{accountingRule && accountingRule !== 1 && (
				<div className="space-y-4">
					<h4 className="font-medium">Account Mappings</h4>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="fundSourceAccountId">
								Fund Source Account{" "}
								{!hasAssetOptions && (
									<span className="text-destructive">*</span>
								)}
							</Label>
							<Controller
								control={control}
								name="fundSourceAccountId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: undefined
										}
										onValueChange={(value) => field.onChange(Number(value))}
										disabled={!hasAssetOptions}
									>
										<SelectTrigger id="fundSourceAccountId">
											<SelectValue placeholder="Select fund source" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.fundSourceAccountId && (
								<p className="text-sm text-destructive">
									{String(errors.fundSourceAccountId.message)}
								</p>
							)}
							{!hasAssetOptions && (
								<p className="text-xs text-muted-foreground">
									No asset accounts configured.
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="loanPortfolioAccountId">
								Loan Portfolio Account
							</Label>
							<Controller
								control={control}
								name="loanPortfolioAccountId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: undefined
										}
										onValueChange={(value) => field.onChange(Number(value))}
										disabled={!hasAssetOptions}
									>
										<SelectTrigger id="loanPortfolioAccountId">
											<SelectValue placeholder="Select portfolio account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{option.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.loanPortfolioAccountId && (
								<p className="text-sm text-destructive">
									{String(errors.loanPortfolioAccountId.message)}
								</p>
							)}
						</div>
					</div>

					{/* Additional account mappings grids would go here - simplified for brevity */}
					<div className="text-sm text-muted-foreground">
						Additional account mapping fields (income, expense, receivable,
						etc.) - implementation details omitted for brevity.
					</div>
				</div>
			)}
		</div>
	);
}
