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

function optionId(option?: { id?: number | string }) {
	if (option?.id === undefined || option.id === null) return "";
	return String(option.id);
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
	const delinquencyBucketOptions =
		(
			template as GetLoanProductsTemplateResponse & {
				delinquencyBucketOptions?: Array<{
					id?: number;
					code?: string;
					description?: string;
					name?: string;
					value?: string;
				}>;
			}
		)?.delinquencyBucketOptions || [];
	const supportedInterestRefundTypeOptions =
		template?.supportedInterestRefundTypesOptions || [];
	const advancedPaymentAllocationTransactionTypeOptions =
		template?.advancedPaymentAllocationTransactionTypes || [];
	const advancedPaymentAllocationTypeOptions =
		template?.advancedPaymentAllocationTypes || [];
	const advancedPaymentAllocationFutureInstallmentRuleOptions =
		template?.advancedPaymentAllocationFutureInstallmentAllocationRules || [];
	const creditAllocationTransactionTypeOptions =
		template?.creditAllocationTransactionTypes || [];
	const creditAllocationTypeOptions =
		template?.creditAllocationAllocationTypes || [];
	const capitalizedIncomeTypeOptions =
		template?.capitalizedIncomeTypeOptions || [];
	const capitalizedIncomeCalculationTypeOptions =
		template?.capitalizedIncomeCalculationTypeOptions || [];
	const capitalizedIncomeStrategyOptions =
		template?.capitalizedIncomeStrategyOptions || [];
	const buyDownFeeIncomeTypeOptions =
		template?.buyDownFeeIncomeTypeOptions || [];
	const buyDownFeeCalculationTypeOptions =
		template?.buyDownFeeCalculationTypeOptions || [];
	const buyDownFeeStrategyOptions = template?.buyDownFeeStrategyOptions || [];
	const chargeOffBehaviourOptions = template?.chargeOffBehaviourOptions || [];
	const chargeOffReasonOptions = template?.chargeOffReasonOptions || [];
	const writeOffReasonOptions = template?.writeOffReasonOptions || [];

	const selectedSupportedInterestRefundTypes =
		watch("supportedInterestRefundTypes") || [];
	const selectedPaymentAllocationTransactionTypes =
		watch("paymentAllocationTransactionTypes") || [];
	const selectedPaymentAllocationRules = watch("paymentAllocationRules") || [];
	const selectedCreditAllocationTransactionTypes =
		watch("creditAllocationTransactionTypes") || [];
	const selectedCreditAllocationRules = watch("creditAllocationRules") || [];
	const isIncomeCapitalizationEnabled = Boolean(
		watch("enableIncomeCapitalization"),
	);
	const isBuyDownFeeEnabled = Boolean(watch("enableBuyDownFee"));

	const accountingRule = watch("accountingRule");

	// Determine which fields are required based on accounting rule
	const isAccountingEnabled = accountingRule && accountingRule !== 1;
	const isAccrualAccounting = accountingRule === 3 || accountingRule === 4;

	function toggleArrayField(
		field:
			| "supportedInterestRefundTypes"
			| "paymentAllocationTransactionTypes"
			| "paymentAllocationRules"
			| "creditAllocationTransactionTypes"
			| "creditAllocationRules",
		value: string,
		checked: boolean,
	) {
		const currentValues = getValues(field) || [];
		if (checked) {
			if (!currentValues.includes(value)) {
				setValue(field, [...currentValues, value]);
			}
			return;
		}
		setValue(
			field,
			currentValues.filter((item) => item !== value),
		);
	}

	function getReasonMappingExpenseId(
		field:
			| "chargeOffReasonToExpenseMappings"
			| "writeOffReasonToExpenseMappings",
		reasonCodeValueId: number,
	) {
		const mappings = getValues(field) || [];
		const match = mappings.find(
			(mapping) => mapping.reasonCodeValueId === reasonCodeValueId,
		);
		return match?.expenseAccountId;
	}

	function setReasonExpenseMapping(
		field:
			| "chargeOffReasonToExpenseMappings"
			| "writeOffReasonToExpenseMappings",
		reasonCodeValueId: number,
		expenseAccountId: number | undefined,
	) {
		const mappings = getValues(field) || [];
		const nextMappings = mappings.filter(
			(mapping) => mapping.reasonCodeValueId !== reasonCodeValueId,
		);

		if (expenseAccountId !== undefined) {
			nextMappings.push({ reasonCodeValueId, expenseAccountId });
		}

		setValue(field, nextMappings);
	}

	useEffect(() => {
		if (!isIncomeCapitalizationEnabled) {
			if (getValues("capitalizedIncomeType") !== undefined) {
				setValue("capitalizedIncomeType", undefined);
			}
			if (getValues("capitalizedIncomeCalculationType") !== undefined) {
				setValue("capitalizedIncomeCalculationType", undefined);
			}
			if (getValues("capitalizedIncomeStrategy") !== undefined) {
				setValue("capitalizedIncomeStrategy", undefined);
			}
			return;
		}

		if (getValues("capitalizedIncomeType") === undefined) {
			const defaultType = capitalizedIncomeTypeOptions[0]?.id;
			if (defaultType === "FEE" || defaultType === "INTEREST") {
				setValue("capitalizedIncomeType", defaultType);
			}
		}
		if (getValues("capitalizedIncomeCalculationType") === undefined) {
			const defaultType = capitalizedIncomeCalculationTypeOptions[0]?.id;
			if (defaultType === "FLAT") {
				setValue("capitalizedIncomeCalculationType", defaultType);
			}
		}
		if (getValues("capitalizedIncomeStrategy") === undefined) {
			const defaultStrategy = capitalizedIncomeStrategyOptions[0]?.id;
			if (defaultStrategy === "EQUAL_AMORTIZATION") {
				setValue("capitalizedIncomeStrategy", defaultStrategy);
			}
		}
	}, [
		capitalizedIncomeCalculationTypeOptions,
		capitalizedIncomeStrategyOptions,
		capitalizedIncomeTypeOptions,
		getValues,
		isIncomeCapitalizationEnabled,
		setValue,
	]);

	useEffect(() => {
		if (!isBuyDownFeeEnabled) {
			if (getValues("buyDownFeeIncomeType") !== undefined) {
				setValue("buyDownFeeIncomeType", undefined);
			}
			if (getValues("buyDownFeeCalculationType") !== undefined) {
				setValue("buyDownFeeCalculationType", undefined);
			}
			if (getValues("buyDownFeeStrategy") !== undefined) {
				setValue("buyDownFeeStrategy", undefined);
			}
			if (getValues("merchantBuyDownFee") !== false) {
				setValue("merchantBuyDownFee", false);
			}
			return;
		}

		if (getValues("buyDownFeeIncomeType") === undefined) {
			const defaultType = buyDownFeeIncomeTypeOptions[0]?.id;
			if (defaultType === "FEE" || defaultType === "INTEREST") {
				setValue("buyDownFeeIncomeType", defaultType);
			}
		}
		if (getValues("buyDownFeeCalculationType") === undefined) {
			const defaultType = buyDownFeeCalculationTypeOptions[0]?.id;
			if (defaultType === "FLAT") {
				setValue("buyDownFeeCalculationType", defaultType);
			}
		}
		if (getValues("buyDownFeeStrategy") === undefined) {
			const defaultStrategy = buyDownFeeStrategyOptions[0]?.id;
			if (defaultStrategy === "EQUAL_AMORTIZATION") {
				setValue("buyDownFeeStrategy", defaultStrategy);
			}
		}
	}, [
		buyDownFeeCalculationTypeOptions,
		buyDownFeeIncomeTypeOptions,
		buyDownFeeStrategyOptions,
		getValues,
		isBuyDownFeeEnabled,
		setValue,
	]);

	useEffect(() => {
		if (getValues("chargeOffBehaviour") !== undefined) {
			return;
		}

		const defaultBehaviour = chargeOffBehaviourOptions[0]?.id;
		if (
			defaultBehaviour === "REGULAR" ||
			defaultBehaviour === "ZERO_INTEREST" ||
			defaultBehaviour === "ACCELERATE_MATURITY"
		) {
			setValue("chargeOffBehaviour", defaultBehaviour);
		}
	}, [chargeOffBehaviourOptions, getValues, setValue]);

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

	const unassignedExpenseValue = "__UNASSIGNED_EXPENSE__";

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Delinquency & NPA</CardTitle>
					<CardDescription>
						Control delinquency behavior and NPA thresholds.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
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
					</div>

					<div className="grid gap-4 border-t pt-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="delinquencyBucketId">Delinquency Bucket</Label>
							<Controller
								control={control}
								name="delinquencyBucketId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: ""
										}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="delinquencyBucketId">
											<SelectValue placeholder="Select delinquency bucket" />
										</SelectTrigger>
										<SelectContent>
											{delinquencyBucketOptions
												.filter((option) => option.id !== undefined)
												.map((option) => (
													<SelectItem key={option.id} value={String(option.id)}>
														{optionLabel(option)}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								)}
							/>
							<p className="text-xs text-muted-foreground">
								Assign a bucket policy for delinquency classification.
							</p>
						</div>
						<div className="space-y-2 rounded-sm border border-border/60 p-3">
							<div className="flex items-center gap-2">
								<Controller
									control={control}
									name="accountMovesOutOfNPAOnlyOnArrearsCompletion"
									render={({ field }) => (
										<Checkbox
											id="accountMovesOutOfNPAOnlyOnArrearsCompletion"
											checked={Boolean(field.value)}
											onCheckedChange={(value) =>
												field.onChange(Boolean(value))
											}
										/>
									)}
								/>
								<Label
									htmlFor="accountMovesOutOfNPAOnlyOnArrearsCompletion"
									className="cursor-pointer"
								>
									Move out of NPA only on arrears completion
								</Label>
							</div>
							<p className="text-xs text-muted-foreground">
								Prevents NPA status reset until arrears are fully cleared.
							</p>
						</div>
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
							<Select value={field.value ?? ""} onValueChange={field.onChange}>
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
					<CardTitle>Capitalized Income & Buy-down Fee</CardTitle>
					<CardDescription>
						Configure capitalization and buy-down fee behavior for eligible
						products.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4 rounded-sm border border-border/60 p-3">
						<div className="flex items-center gap-2">
							<Controller
								control={control}
								name="enableIncomeCapitalization"
								render={({ field }) => (
									<Checkbox
										id="enableIncomeCapitalization"
										checked={Boolean(field.value)}
										onCheckedChange={(value) => field.onChange(Boolean(value))}
									/>
								)}
							/>
							<Label
								htmlFor="enableIncomeCapitalization"
								className="cursor-pointer"
							>
								Enable income capitalization
							</Label>
						</div>
						{isIncomeCapitalizationEnabled && (
							<div className="grid gap-4 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="capitalizedIncomeType">
										Capitalized Income Type{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="capitalizedIncomeType"
										render={({ field }) => (
											<Select
												value={field.value || ""}
												onValueChange={(value) => field.onChange(value)}
											>
												<SelectTrigger id="capitalizedIncomeType">
													<SelectValue placeholder="Select income type" />
												</SelectTrigger>
												<SelectContent>
													{capitalizedIncomeTypeOptions.map((option) => {
														const value = optionId(option);
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
									{errors.capitalizedIncomeType && (
										<p className="text-sm text-destructive">
											{String(errors.capitalizedIncomeType.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="capitalizedIncomeCalculationType">
										Calculation Type <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="capitalizedIncomeCalculationType"
										render={({ field }) => (
											<Select
												value={field.value || ""}
												onValueChange={(value) => field.onChange(value)}
											>
												<SelectTrigger id="capitalizedIncomeCalculationType">
													<SelectValue placeholder="Select calculation type" />
												</SelectTrigger>
												<SelectContent>
													{capitalizedIncomeCalculationTypeOptions.map(
														(option) => {
															const value = optionId(option);
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
									{errors.capitalizedIncomeCalculationType && (
										<p className="text-sm text-destructive">
											{String(errors.capitalizedIncomeCalculationType.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="capitalizedIncomeStrategy">
										Strategy <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="capitalizedIncomeStrategy"
										render={({ field }) => (
											<Select
												value={field.value || ""}
												onValueChange={(value) => field.onChange(value)}
											>
												<SelectTrigger id="capitalizedIncomeStrategy">
													<SelectValue placeholder="Select strategy" />
												</SelectTrigger>
												<SelectContent>
													{capitalizedIncomeStrategyOptions.map((option) => {
														const value = optionId(option);
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
									{errors.capitalizedIncomeStrategy && (
										<p className="text-sm text-destructive">
											{String(errors.capitalizedIncomeStrategy.message)}
										</p>
									)}
								</div>
							</div>
						)}
					</div>

					<div className="space-y-4 rounded-sm border border-border/60 p-3">
						<div className="flex items-center gap-2">
							<Controller
								control={control}
								name="enableBuyDownFee"
								render={({ field }) => (
									<Checkbox
										id="enableBuyDownFee"
										checked={Boolean(field.value)}
										onCheckedChange={(value) => field.onChange(Boolean(value))}
									/>
								)}
							/>
							<Label htmlFor="enableBuyDownFee" className="cursor-pointer">
								Enable buy-down fee
							</Label>
						</div>
						{isBuyDownFeeEnabled && (
							<div className="space-y-4">
								<div className="grid gap-4 md:grid-cols-3">
									<div className="space-y-2">
										<Label htmlFor="buyDownFeeIncomeType">
											Buy-down Income Type{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="buyDownFeeIncomeType"
											render={({ field }) => (
												<Select
													value={field.value || ""}
													onValueChange={(value) => field.onChange(value)}
												>
													<SelectTrigger id="buyDownFeeIncomeType">
														<SelectValue placeholder="Select income type" />
													</SelectTrigger>
													<SelectContent>
														{buyDownFeeIncomeTypeOptions.map((option) => {
															const value = optionId(option);
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
										{errors.buyDownFeeIncomeType && (
											<p className="text-sm text-destructive">
												{String(errors.buyDownFeeIncomeType.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="buyDownFeeCalculationType">
											Calculation Type{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="buyDownFeeCalculationType"
											render={({ field }) => (
												<Select
													value={field.value || ""}
													onValueChange={(value) => field.onChange(value)}
												>
													<SelectTrigger id="buyDownFeeCalculationType">
														<SelectValue placeholder="Select calculation type" />
													</SelectTrigger>
													<SelectContent>
														{buyDownFeeCalculationTypeOptions.map((option) => {
															const value = optionId(option);
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
										{errors.buyDownFeeCalculationType && (
											<p className="text-sm text-destructive">
												{String(errors.buyDownFeeCalculationType.message)}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="buyDownFeeStrategy">
											Strategy <span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="buyDownFeeStrategy"
											render={({ field }) => (
												<Select
													value={field.value || ""}
													onValueChange={(value) => field.onChange(value)}
												>
													<SelectTrigger id="buyDownFeeStrategy">
														<SelectValue placeholder="Select strategy" />
													</SelectTrigger>
													<SelectContent>
														{buyDownFeeStrategyOptions.map((option) => {
															const value = optionId(option);
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
										{errors.buyDownFeeStrategy && (
											<p className="text-sm text-destructive">
												{String(errors.buyDownFeeStrategy.message)}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Controller
										control={control}
										name="merchantBuyDownFee"
										render={({ field }) => (
											<Checkbox
												id="merchantBuyDownFee"
												checked={Boolean(field.value)}
												onCheckedChange={(value) =>
													field.onChange(Boolean(value))
												}
											/>
										)}
									/>
									<Label
										htmlFor="merchantBuyDownFee"
										className="cursor-pointer"
									>
										Merchant-funded buy-down fee
									</Label>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Charge-off Behavior & Expense Mapping</CardTitle>
					<CardDescription>
						Configure charge-off behavior and map charge-off/write-off reasons
						to expense accounts.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="chargeOffBehaviour">Charge-off Behaviour</Label>
						<Controller
							control={control}
							name="chargeOffBehaviour"
							render={({ field }) => (
								<Select
									value={field.value || ""}
									onValueChange={(value) => field.onChange(value)}
								>
									<SelectTrigger id="chargeOffBehaviour">
										<SelectValue placeholder="Select charge-off behaviour" />
									</SelectTrigger>
									<SelectContent>
										{chargeOffBehaviourOptions.map((option) => {
											const value = optionId(option);
											if (!value) return null;
											return (
												<SelectItem key={value} value={value}>
													{option.value || optionLabel(option)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-3 rounded-sm border border-border/60 p-3">
							<h4 className="text-sm font-medium text-muted-foreground">
								Charge-off Reason to Expense Account
							</h4>
							{chargeOffReasonOptions.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No charge-off reasons available in this tenant.
								</p>
							)}
							<div className="space-y-2">
								{chargeOffReasonOptions
									.filter((reason) => reason.id !== undefined)
									.map((reason) => {
										const reasonId = reason.id!;
										const selectedExpense = getReasonMappingExpenseId(
											"chargeOffReasonToExpenseMappings",
											reasonId,
										);
										return (
											<div key={reasonId} className="space-y-2">
												<Label htmlFor={`chargeOffReason-${reasonId}`}>
													{optionLabel(reason)}
												</Label>
												<Select
													value={
														selectedExpense !== undefined
															? String(selectedExpense)
															: unassignedExpenseValue
													}
													onValueChange={(value) =>
														setReasonExpenseMapping(
															"chargeOffReasonToExpenseMappings",
															reasonId,
															value === unassignedExpenseValue
																? undefined
																: Number(value),
														)
													}
												>
													<SelectTrigger id={`chargeOffReason-${reasonId}`}>
														<SelectValue placeholder="Select expense account" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value={unassignedExpenseValue}>
															Not mapped
														</SelectItem>
														{expenseOptions.map((account) => (
															<SelectItem
																key={account.id}
																value={String(account.id)}
															>
																{optionLabel(account)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										);
									})}
							</div>
						</div>

						<div className="space-y-3 rounded-sm border border-border/60 p-3">
							<h4 className="text-sm font-medium text-muted-foreground">
								Write-off Reason to Expense Account
							</h4>
							{writeOffReasonOptions.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No write-off reasons available in this tenant.
								</p>
							)}
							<div className="space-y-2">
								{writeOffReasonOptions
									.filter((reason) => reason.id !== undefined)
									.map((reason) => {
										const reasonId = reason.id!;
										const selectedExpense = getReasonMappingExpenseId(
											"writeOffReasonToExpenseMappings",
											reasonId,
										);
										return (
											<div key={reasonId} className="space-y-2">
												<Label htmlFor={`writeOffReason-${reasonId}`}>
													{optionLabel(reason)}
												</Label>
												<Select
													value={
														selectedExpense !== undefined
															? String(selectedExpense)
															: unassignedExpenseValue
													}
													onValueChange={(value) =>
														setReasonExpenseMapping(
															"writeOffReasonToExpenseMappings",
															reasonId,
															value === unassignedExpenseValue
																? undefined
																: Number(value),
														)
													}
												>
													<SelectTrigger id={`writeOffReason-${reasonId}`}>
														<SelectValue placeholder="Select expense account" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value={unassignedExpenseValue}>
															Not mapped
														</SelectItem>
														{expenseOptions.map((account) => (
															<SelectItem
																key={account.id}
																value={String(account.id)}
															>
																{optionLabel(account)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										);
									})}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Advanced Allocation & Refunds</CardTitle>
					<CardDescription>
						Configure supported interest refund types and advanced allocation
						rules.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-muted-foreground">
							Supported Interest Refund Types
						</h4>
						<div className="grid gap-2 md:grid-cols-2">
							{supportedInterestRefundTypeOptions.map((option) => {
								const value = option.id || option.code;
								if (!value) return null;
								return (
									<div key={value} className="flex items-center gap-2">
										<Checkbox
											id={`supportedInterestRefundTypes-${value}`}
											checked={selectedSupportedInterestRefundTypes.includes(
												value,
											)}
											onCheckedChange={(checked) =>
												toggleArrayField(
													"supportedInterestRefundTypes",
													value,
													Boolean(checked),
												)
											}
										/>
										<Label
											htmlFor={`supportedInterestRefundTypes-${value}`}
											className="cursor-pointer"
										>
											{option.value || optionLabel(option)}
										</Label>
									</div>
								);
							})}
						</div>
					</div>

					<div className="space-y-4 border-t pt-4">
						<h4 className="text-sm font-medium text-muted-foreground">
							Payment Allocation
						</h4>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Transaction Types</Label>
								<div className="space-y-2 rounded-sm border border-border/60 p-3">
									{advancedPaymentAllocationTransactionTypeOptions.map(
										(option) => {
											const value = option.code;
											if (!value) return null;
											return (
												<div key={value} className="flex items-center gap-2">
													<Checkbox
														id={`paymentAllocationTransactionTypes-${value}`}
														checked={selectedPaymentAllocationTransactionTypes.includes(
															value,
														)}
														onCheckedChange={(checked) =>
															toggleArrayField(
																"paymentAllocationTransactionTypes",
																value,
																Boolean(checked),
															)
														}
													/>
													<Label
														htmlFor={`paymentAllocationTransactionTypes-${value}`}
														className="cursor-pointer"
													>
														{optionLabel(option)}
													</Label>
												</div>
											);
										},
									)}
								</div>
								{errors.paymentAllocationTransactionTypes && (
									<p className="text-sm text-destructive">
										{String(errors.paymentAllocationTransactionTypes.message)}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label>Allocation Rule Priority (top to bottom)</Label>
								<div className="space-y-2 rounded-sm border border-border/60 p-3">
									{advancedPaymentAllocationTypeOptions.map((option) => {
										const value = option.code;
										if (!value) return null;
										return (
											<div key={value} className="flex items-center gap-2">
												<Checkbox
													id={`paymentAllocationRules-${value}`}
													checked={selectedPaymentAllocationRules.includes(
														value,
													)}
													onCheckedChange={(checked) =>
														toggleArrayField(
															"paymentAllocationRules",
															value,
															Boolean(checked),
														)
													}
												/>
												<Label
													htmlFor={`paymentAllocationRules-${value}`}
													className="cursor-pointer"
												>
													{optionLabel(option)}
												</Label>
											</div>
										);
									})}
								</div>
								{errors.paymentAllocationRules && (
									<p className="text-sm text-destructive">
										{String(errors.paymentAllocationRules.message)}
									</p>
								)}
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="paymentAllocationFutureInstallmentAllocationRule">
								Future Installment Allocation Rule
							</Label>
							<Controller
								control={control}
								name="paymentAllocationFutureInstallmentAllocationRule"
								render={({ field }) => (
									<Select
										value={field.value || ""}
										onValueChange={(value) => field.onChange(value)}
									>
										<SelectTrigger id="paymentAllocationFutureInstallmentAllocationRule">
											<SelectValue placeholder="Select future installment rule" />
										</SelectTrigger>
										<SelectContent>
											{advancedPaymentAllocationFutureInstallmentRuleOptions.map(
												(option) => {
													const value = option.code;
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
							{errors.paymentAllocationFutureInstallmentAllocationRule && (
								<p className="text-sm text-destructive">
									{String(
										errors.paymentAllocationFutureInstallmentAllocationRule
											.message,
									)}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-4 border-t pt-4">
						<h4 className="text-sm font-medium text-muted-foreground">
							Credit Allocation
						</h4>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Transaction Types</Label>
								<div className="space-y-2 rounded-sm border border-border/60 p-3">
									{creditAllocationTransactionTypeOptions.map((option) => {
										const value = option.code;
										if (!value) return null;
										return (
											<div key={value} className="flex items-center gap-2">
												<Checkbox
													id={`creditAllocationTransactionTypes-${value}`}
													checked={selectedCreditAllocationTransactionTypes.includes(
														value,
													)}
													onCheckedChange={(checked) =>
														toggleArrayField(
															"creditAllocationTransactionTypes",
															value,
															Boolean(checked),
														)
													}
												/>
												<Label
													htmlFor={`creditAllocationTransactionTypes-${value}`}
													className="cursor-pointer"
												>
													{optionLabel(option)}
												</Label>
											</div>
										);
									})}
								</div>
								{errors.creditAllocationTransactionTypes && (
									<p className="text-sm text-destructive">
										{String(errors.creditAllocationTransactionTypes.message)}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label>Allocation Rule Priority (top to bottom)</Label>
								<div className="space-y-2 rounded-sm border border-border/60 p-3">
									{creditAllocationTypeOptions.map((option) => {
										const value = option.code;
										if (!value) return null;
										return (
											<div key={value} className="flex items-center gap-2">
												<Checkbox
													id={`creditAllocationRules-${value}`}
													checked={selectedCreditAllocationRules.includes(
														value,
													)}
													onCheckedChange={(checked) =>
														toggleArrayField(
															"creditAllocationRules",
															value,
															Boolean(checked),
														)
													}
												/>
												<Label
													htmlFor={`creditAllocationRules-${value}`}
													className="cursor-pointer"
												>
													{optionLabel(option)}
												</Label>
											</div>
										);
									})}
								</div>
								{errors.creditAllocationRules && (
									<p className="text-sm text-destructive">
										{String(errors.creditAllocationRules.message)}
									</p>
								)}
							</div>
						</div>
					</div>
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
											: ""
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
															: ""
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
															: ""
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
																	: ""
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
																	: ""
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
																	: ""
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
															: ""
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
															: ""
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
															: ""
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
															: ""
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
															: ""
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
															: ""
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
															: ""
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
