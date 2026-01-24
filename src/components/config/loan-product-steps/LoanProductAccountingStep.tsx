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

interface LoanProductAccountingStepProps {
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

export function LoanProductAccountingStep({
	template,
}: LoanProductAccountingStepProps) {
	const {
		register,
		control,
		getValues,
		setValue,
		watch,
		formState: { errors },
	} = useFormContext<CreateLoanProductFormData>();

	const assetOptions =
		template?.accountingMappingOptions?.assetAccountOptions || [];
	const incomeOptions =
		template?.accountingMappingOptions?.incomeAccountOptions || [];
	const expenseOptions =
		template?.accountingMappingOptions?.expenseAccountOptions || [];
	const liabilityOptions =
		template?.accountingMappingOptions?.liabilityAccountOptions || [];

	const accountingRule = watch("accountingRule");

	// Determine which fields are required based on accounting rule
	const isAccountingEnabled = accountingRule && accountingRule !== 1;
	const isAccrualAccounting = accountingRule === 3 || accountingRule === 4;

	// Set default accounts when accounting rule requires them
	useEffect(() => {
		if (!template || !accountingRule || accountingRule === 1) return;

		const currentValues = getValues();
		// For CASH BASED (2) or ACCRUAL (3, 4), set default accounts if not set
		const updates: Partial<CreateLoanProductFormData> = {};

		// Base accounts required for all non-NONE accounting
		if (!currentValues.fundSourceAccountId && assetOptions.length > 0) {
			updates.fundSourceAccountId = assetOptions[0].id;
		}
		if (!currentValues.loanPortfolioAccountId && assetOptions.length > 0) {
			updates.loanPortfolioAccountId = assetOptions[0].id;
		}
		if (!currentValues.interestOnLoanAccountId && incomeOptions.length > 0) {
			updates.interestOnLoanAccountId = incomeOptions[0].id;
		}
		if (!currentValues.incomeFromFeeAccountId && incomeOptions.length > 0) {
			updates.incomeFromFeeAccountId = incomeOptions[0].id;
		}
		if (!currentValues.incomeFromPenaltyAccountId && incomeOptions.length > 0) {
			updates.incomeFromPenaltyAccountId = incomeOptions[0].id;
		}
		if (!currentValues.writeOffAccountId && expenseOptions.length > 0) {
			updates.writeOffAccountId = expenseOptions[0].id;
		}

		// Additional accounts for all accounting types (required by Fineract)
		if (
			!currentValues.transfersInSuspenseAccountId &&
			liabilityOptions.length > 0
		) {
			updates.transfersInSuspenseAccountId = liabilityOptions[0].id;
		}
		if (
			!currentValues.overpaymentLiabilityAccountId &&
			liabilityOptions.length > 0
		) {
			updates.overpaymentLiabilityAccountId = liabilityOptions[0].id;
		}
		if (
			!currentValues.incomeFromRecoveryAccountId &&
			incomeOptions.length > 0
		) {
			updates.incomeFromRecoveryAccountId = incomeOptions[0].id;
		}

		// Receivable accounts for accrual accounting (3, 4)
		if (accountingRule === 3 || accountingRule === 4) {
			if (
				!currentValues.receivableInterestAccountId &&
				assetOptions.length > 0
			) {
				updates.receivableInterestAccountId = assetOptions[0].id;
			}
			if (!currentValues.receivableFeeAccountId && assetOptions.length > 0) {
				updates.receivableFeeAccountId = assetOptions[0].id;
			}
			if (
				!currentValues.receivablePenaltyAccountId &&
				assetOptions.length > 0
			) {
				updates.receivablePenaltyAccountId = assetOptions[0].id;
			}
		}

		if (Object.keys(updates).length > 0) {
			for (const [key, value] of Object.entries(updates)) {
				setValue(key as keyof CreateLoanProductFormData, value);
			}
		}
	}, [
		accountingRule,
		template,
		setValue,
		getValues,
		assetOptions,
		incomeOptions,
		expenseOptions,
		liabilityOptions,
	]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Delinquency & NPA</CardTitle>
					<CardDescription>
						Control delinquency behavior and NPA thresholds.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="graceOnArrearsAgeing">
							Grace on Arrears Ageing (days)
						</Label>
						<Input
							id="graceOnArrearsAgeing"
							type="number"
							{...register("graceOnArrearsAgeing", {
								valueAsNumber: true,
							})}
							placeholder="0"
						/>
						<p className="text-xs text-muted-foreground">
							Days before arrears ageing starts. Example: 3 days.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="inArrearsTolerance">In Arrears Tolerance</Label>
						<Input
							id="inArrearsTolerance"
							type="number"
							{...register("inArrearsTolerance", {
								valueAsNumber: true,
							})}
							placeholder="0"
						/>
						<p className="text-xs text-muted-foreground">
							Tolerance amount before marking in arrears. Example: 100.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="overdueDaysForNPA">Overdue Days for NPA</Label>
						<Input
							id="overdueDaysForNPA"
							type="number"
							{...register("overdueDaysForNPA", {
								valueAsNumber: true,
							})}
							placeholder="90"
						/>
						<p className="text-xs text-muted-foreground">
							Days overdue to classify NPA. Example: 90 days.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Repayment Waterfall</CardTitle>
					<CardDescription>
						This decides how repayments are allocated.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Label htmlFor="transactionProcessingStrategyCode">
						Transaction Processing Strategy{" "}
						<span className="text-destructive">*</span>
					</Label>
					<Controller
						control={control}
						name="transactionProcessingStrategyCode"
						render={({ field }) => (
							<Select
								value={field.value || undefined}
								onValueChange={field.onChange}
							>
								<SelectTrigger id="transactionProcessingStrategyCode">
									<SelectValue placeholder="Select strategy" />
								</SelectTrigger>
								<SelectContent>
									{template?.transactionProcessingStrategyOptions
										?.filter((option) => option.code)
										.map((option) => (
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Accounting</CardTitle>
					<CardDescription>
						Enable accounting rule and map GL accounts. Accounts will be
						auto-populated with defaults when you select an accounting rule.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="accountingRule">
							Accounting Rule <span className="text-destructive">*</span>
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
								>
									<SelectTrigger id="accountingRule">
										<SelectValue placeholder="Select rule" />
									</SelectTrigger>
									<SelectContent>
										{template?.accountingRuleOptions?.map((option) => (
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
					</div>

					{isAccountingEnabled && (
						<>
							{/* Asset Accounts */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Asset Accounts
								</h4>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="fundSourceAccountId">
											Fund Source Account{" "}
											<span className="text-destructive">*</span>
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
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="fundSourceAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{assetOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
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
									</div>
									<div className="space-y-2">
										<Label htmlFor="loanPortfolioAccountId">
											Loan Portfolio Account{" "}
											<span className="text-destructive">*</span>
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
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="loanPortfolioAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{assetOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
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
									{isAccrualAccounting && (
										<>
											<div className="space-y-2">
												<Label htmlFor="receivableInterestAccountId">
													Receivable Interest Account{" "}
													<span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="receivableInterestAccountId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
														>
															<SelectTrigger id="receivableInterestAccountId">
																<SelectValue placeholder="Select account" />
															</SelectTrigger>
															<SelectContent>
																{assetOptions.map((option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{optionLabel(option)}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.receivableInterestAccountId && (
													<p className="text-sm text-destructive">
														{String(errors.receivableInterestAccountId.message)}
													</p>
												)}
											</div>
											<div className="space-y-2">
												<Label htmlFor="receivableFeeAccountId">
													Receivable Fee Account{" "}
													<span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="receivableFeeAccountId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
														>
															<SelectTrigger id="receivableFeeAccountId">
																<SelectValue placeholder="Select account" />
															</SelectTrigger>
															<SelectContent>
																{assetOptions.map((option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{optionLabel(option)}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.receivableFeeAccountId && (
													<p className="text-sm text-destructive">
														{String(errors.receivableFeeAccountId.message)}
													</p>
												)}
											</div>
											<div className="space-y-2">
												<Label htmlFor="receivablePenaltyAccountId">
													Receivable Penalty Account{" "}
													<span className="text-destructive">*</span>
												</Label>
												<Controller
													control={control}
													name="receivablePenaltyAccountId"
													render={({ field }) => (
														<Select
															value={
																field.value !== undefined &&
																field.value !== null
																	? String(field.value)
																	: undefined
															}
															onValueChange={(value) =>
																field.onChange(Number(value))
															}
														>
															<SelectTrigger id="receivablePenaltyAccountId">
																<SelectValue placeholder="Select account" />
															</SelectTrigger>
															<SelectContent>
																{assetOptions.map((option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{optionLabel(option)}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.receivablePenaltyAccountId && (
													<p className="text-sm text-destructive">
														{String(errors.receivablePenaltyAccountId.message)}
													</p>
												)}
											</div>
										</>
									)}
								</div>
							</div>

							{/* Income Accounts */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Income Accounts
								</h4>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="interestOnLoanAccountId">
											Interest on Loan Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="interestOnLoanAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="interestOnLoanAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{incomeOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.interestOnLoanAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.interestOnLoanAccountId.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="incomeFromFeeAccountId">
											Income from Fee Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="incomeFromFeeAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="incomeFromFeeAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{incomeOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.incomeFromFeeAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.incomeFromFeeAccountId.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="incomeFromPenaltyAccountId">
											Income from Penalty Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="incomeFromPenaltyAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="incomeFromPenaltyAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{incomeOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.incomeFromPenaltyAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.incomeFromPenaltyAccountId.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="incomeFromRecoveryAccountId">
											Income from Recovery Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="incomeFromRecoveryAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="incomeFromRecoveryAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{incomeOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.incomeFromRecoveryAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.incomeFromRecoveryAccountId.message)}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Expense Accounts */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Expense Accounts
								</h4>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="writeOffAccountId">
											Write Off Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="writeOffAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="writeOffAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{expenseOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.writeOffAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.writeOffAccountId.message)}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Liability Accounts */}
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">
									Liability Accounts
								</h4>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="overpaymentLiabilityAccountId">
											Overpayment Liability Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="overpaymentLiabilityAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="overpaymentLiabilityAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{liabilityOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.overpaymentLiabilityAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.overpaymentLiabilityAccountId.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="transfersInSuspenseAccountId">
											Transfers in Suspense Account{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="transfersInSuspenseAccountId"
											render={({ field }) => (
												<Select
													value={
														field.value !== undefined && field.value !== null
															? String(field.value)
															: undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="transfersInSuspenseAccountId">
														<SelectValue placeholder="Select account" />
													</SelectTrigger>
													<SelectContent>
														{liabilityOptions.map((option) => (
															<SelectItem
																key={option.id}
																value={String(option.id)}
															>
																{optionLabel(option)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{errors.transfersInSuspenseAccountId && (
											<p className="text-sm text-destructive">
												{String(errors.transfersInSuspenseAccountId.message)}
											</p>
										)}
									</div>
								</div>
							</div>
						</>
					)}

					{!isAccountingEnabled && (
						<p className="text-sm text-muted-foreground">
							Select an accounting rule other than "None" to configure GL
							account mappings.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
