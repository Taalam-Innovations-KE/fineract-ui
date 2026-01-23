"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
	type LoanProductAccountingFormData,
	loanProductAccountingSchema,
} from "@/lib/schemas/loan-product";

interface LoanProductAccountingStepProps {
	template?: GetLoanProductsTemplateResponse;
	data?: Partial<LoanProductAccountingFormData>;
	onDataValid: (data: LoanProductAccountingFormData) => void;
	onDataInvalid: () => void;
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
	data,
	onDataValid,
	onDataInvalid,
}: LoanProductAccountingStepProps) {
	const {
		register,
		control,
		setValue,
		watch,
		formState: { errors, isValid },
	} = useForm<LoanProductAccountingFormData>({
		resolver: zodResolver(loanProductAccountingSchema),
		mode: "onChange",
		defaultValues: data || {
			graceOnArrearsAgeing: 0,
			inArrearsTolerance: 0,
			overdueDaysForNPA: 0,
		},
	});

	const watchedValues = watch();

	useEffect(() => {
		if (!template) return;

		if (
			data?.transactionProcessingStrategyCode === undefined &&
			template.transactionProcessingStrategyOptions?.[0]?.code
		) {
			setValue(
				"transactionProcessingStrategyCode",
				template.transactionProcessingStrategyOptions[0].code,
			);
		}

		if (
			data?.accountingRule === undefined &&
			template.accountingRuleOptions?.[0]?.id !== undefined
		) {
			setValue("accountingRule", template.accountingRuleOptions[0].id);
		}
	}, [template, data, setValue]);

	useEffect(() => {
		if (isValid) {
			onDataValid(watchedValues);
		} else {
			onDataInvalid();
		}
	}, [isValid, watchedValues, onDataValid, onDataInvalid]);

	const assetOptions =
		template?.accountingMappingOptions?.assetAccountOptions || [];
	const incomeOptions =
		template?.accountingMappingOptions?.incomeAccountOptions || [];
	const expenseOptions =
		template?.accountingMappingOptions?.expenseAccountOptions || [];
	const liabilityOptions =
		template?.accountingMappingOptions?.liabilityAccountOptions || [];

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
						Enable accounting rule and map GL accounts.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
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

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="fundSourceAccountId">Fund Source Account</Label>
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
									>
										<SelectTrigger id="fundSourceAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
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
									>
										<SelectTrigger id="loanPortfolioAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="interestOnLoanAccountId">
								Interest on Loan Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="interestOnLoanAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{incomeOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="incomeFromFeeAccountId">
								Income from Fee Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="incomeFromFeeAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{incomeOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="incomeFromPenaltyAccountId">
								Income from Penalty Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="incomeFromPenaltyAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{incomeOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="writeOffAccountId">Write Off Account</Label>
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="writeOffAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{expenseOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="receivableInterestAccountId">
								Receivable Interest Account
							</Label>
							<Controller
								control={control}
								name="receivableInterestAccountId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: undefined
										}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="receivableInterestAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="receivableFeeAccountId">
								Receivable Fee Account
							</Label>
							<Controller
								control={control}
								name="receivableFeeAccountId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: undefined
										}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="receivableFeeAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="receivablePenaltyAccountId">
								Receivable Penalty Account
							</Label>
							<Controller
								control={control}
								name="receivablePenaltyAccountId"
								render={({ field }) => (
									<Select
										value={
											field.value !== undefined && field.value !== null
												? String(field.value)
												: undefined
										}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="receivablePenaltyAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{assetOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="incomeFromRecoveryAccountId">
								Income from Recovery Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="incomeFromRecoveryAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{incomeOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="overpaymentLiabilityAccountId">
								Overpayment Liability Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="overpaymentLiabilityAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{liabilityOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="transfersInSuspenseAccountId">
								Transfers in Suspense Account
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
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="transfersInSuspenseAccountId">
											<SelectValue placeholder="Select account" />
										</SelectTrigger>
										<SelectContent>
											{liabilityOptions.map((option) => (
												<SelectItem key={option.id} value={String(option.id)}>
													{optionLabel(option)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
