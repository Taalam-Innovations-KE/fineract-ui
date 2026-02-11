"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetCodeValuesDataResponse,
	GetLoanProductsChargeOffReasonOptions,
	GetLoansLoanIdTransactionsTemplateResponse,
	GetPaymentTypeOptions,
	PostLoansLoanIdTransactionsRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import {
	LOAN_TRANSACTION_COMMANDS,
	type LoanTransactionCommand,
	type LoanTransactionFormData,
	type LoanTransactionFormInput,
	loanTransactionSchema,
} from "@/lib/schemas/loan-commands";
import { useTenantStore } from "@/store/tenant";

interface PostLoanTransactionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	currency?: string;
	initialCommand?: LoanTransactionCommand;
	onSuccess?: () => void;
}

type CommandOption = {
	value: LoanTransactionCommand;
	label: string;
	description: string;
	submitLabel: string;
	amountLabel: string;
	hideAmountField?: boolean;
	readOnlyTemplateAmount?: boolean;
	requireTemplateAmount?: boolean;
	requireAmount?: boolean;
};

const COMMAND_OPTIONS: Array<CommandOption> = [
	{
		value: "repayment",
		label: "Repayment",
		description: "Record a repayment transaction from template defaults.",
		submitLabel: "Post Repayment",
		amountLabel: "Transaction Amount",
		requireAmount: true,
	},
	{
		value: "merchantIssuedRefund",
		label: "Merchant Issued Refund",
		description: "Post merchant-issued refund against this loan.",
		submitLabel: "Post Merchant Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "payoutRefund",
		label: "Payout Refund",
		description: "Post payout refund against this loan.",
		submitLabel: "Post Payout Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "goodwillCredit",
		label: "Goodwill Credit",
		description: "Apply a goodwill credit on the loan account.",
		submitLabel: "Post Goodwill Credit",
		amountLabel: "Credit Amount",
		requireAmount: true,
	},
	{
		value: "chargeRefund",
		label: "Charge Refund",
		description: "Refund loan charges.",
		submitLabel: "Post Charge Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "waiveInterest",
		label: "Waive Interest",
		description: "Waive interest amount from the loan account.",
		submitLabel: "Waive Interest",
		amountLabel: "Waived Amount",
		requireAmount: true,
	},
	{
		value: "writeoff",
		label: "Write Off",
		description: "Close the loan as written off.",
		submitLabel: "Write Off Loan",
		amountLabel: "Write-Off Amount",
		requireAmount: true,
	},
	{
		value: "close-rescheduled",
		label: "Close Rescheduled",
		description: "Close the loan as rescheduled.",
		submitLabel: "Close as Rescheduled",
		amountLabel: "Amount",
		hideAmountField: true,
	},
	{
		value: "close",
		label: "Close Loan",
		description: "Close the loan account.",
		submitLabel: "Close Loan",
		amountLabel: "Amount",
		hideAmountField: true,
	},
	{
		value: "undowriteoff",
		label: "Undo Write Off",
		description: "Undo a previous write-off transaction.",
		submitLabel: "Undo Write Off",
		amountLabel: "Amount",
		hideAmountField: true,
	},
	{
		value: "recoverypayment",
		label: "Recovery Payment",
		description: "Record repayment after write-off.",
		submitLabel: "Post Recovery Payment",
		amountLabel: "Recovery Amount",
		requireAmount: true,
	},
	{
		value: "refundByCash",
		label: "Refund By Cash",
		description: "Refund active loan by cash.",
		submitLabel: "Post Cash Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "refundbytransfer",
		label: "Refund By Transfer",
		description: "Refund active loan by transfer.",
		submitLabel: "Post Transfer Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "foreclosure",
		label: "Foreclosure",
		description: "Foreclose this active loan.",
		submitLabel: "Post Foreclosure",
		amountLabel: "Foreclosure Amount",
		requireAmount: true,
	},
	{
		value: "creditBalanceRefund",
		label: "Credit Balance Refund",
		description: "Refund available credit balance.",
		submitLabel: "Post Credit Balance Refund",
		amountLabel: "Refund Amount",
		requireAmount: false,
	},
	{
		value: "downPayment",
		label: "Down Payment",
		description: "Post a down payment transaction.",
		submitLabel: "Post Down Payment",
		amountLabel: "Down Payment Amount",
		requireAmount: true,
	},
	{
		value: "prepayLoan",
		label: "Prepay Loan",
		description:
			"Use the template calculated amount as full payoff for prepayment.",
		submitLabel: "Post Prepayment",
		amountLabel: "Calculated Payoff Amount",
		readOnlyTemplateAmount: true,
		requireTemplateAmount: true,
		requireAmount: true,
	},
	{
		value: "interestPaymentWaiver",
		label: "Interest Payment Waiver",
		description: "Post an interest payment waiver transaction.",
		submitLabel: "Post Interest Payment Waiver",
		amountLabel: "Waiver Amount",
		requireAmount: true,
	},
	{
		value: "interest-refund",
		label: "Interest Refund",
		description: "Post an interest refund transaction.",
		submitLabel: "Post Interest Refund",
		amountLabel: "Refund Amount",
		requireAmount: true,
	},
	{
		value: "charge-off",
		label: "Charge Off",
		description: "Charge off the loan account.",
		submitLabel: "Charge Off Loan",
		amountLabel: "Charge-Off Amount",
		requireAmount: true,
	},
];

function getTodayDateInputValue(): string {
	return new Date().toISOString().split("T")[0];
}

function toInputDateValue(dateValue: unknown): string {
	if (Array.isArray(dateValue) && dateValue.length >= 3) {
		const [year, month, day] = dateValue;
		if (
			typeof year === "number" &&
			typeof month === "number" &&
			typeof day === "number"
		) {
			return `${year.toString().padStart(4, "0")}-${month
				.toString()
				.padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
		}
	}

	if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
		return dateValue;
	}

	if (typeof dateValue === "string" && dateValue.trim().length > 0) {
		const parsed = new Date(dateValue);
		if (!Number.isNaN(parsed.getTime())) {
			const year = parsed.getFullYear();
			const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
			const day = `${parsed.getDate()}`.padStart(2, "0");
			return `${year}-${month}-${day}`;
		}
	}

	return getTodayDateInputValue();
}

function normalizeOptionalString(value?: string): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function hasPaymentTypeId(
	option: GetPaymentTypeOptions,
): option is GetPaymentTypeOptions & { id: number } {
	return option.id !== undefined;
}

function hasCodeValueId(
	option: GetCodeValuesDataResponse,
): option is GetCodeValuesDataResponse & { id: number } {
	return option.id !== undefined;
}

function hasChargeOffReasonId(
	option: GetLoanProductsChargeOffReasonOptions,
): option is GetLoanProductsChargeOffReasonOptions & { id: number } {
	return option.id !== undefined;
}

function formatAmount(amount?: number): string {
	if (amount === undefined || amount === null) return "—";
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function getTemplateErrorMessage(fallback: string, errorBody: unknown): string {
	if (!errorBody || typeof errorBody !== "object") {
		return fallback;
	}

	const body = errorBody as {
		defaultUserMessage?: string;
		message?: string;
		errors?: Array<{ defaultUserMessage?: string; message?: string }>;
	};

	return (
		body.defaultUserMessage ||
		body.message ||
		body.errors?.[0]?.defaultUserMessage ||
		body.errors?.[0]?.message ||
		fallback
	);
}

function isSupportedLoanTransactionCommand(
	value: string,
): value is LoanTransactionCommand {
	return (LOAN_TRANSACTION_COMMANDS as readonly string[]).includes(value);
}

function getCommandMeta(command: LoanTransactionCommand): CommandOption {
	return (
		COMMAND_OPTIONS.find((option) => option.value === command) ||
		COMMAND_OPTIONS[0]
	);
}

export function PostLoanTransactionSheet({
	open,
	onOpenChange,
	loanId,
	currency = "KES",
	initialCommand = "repayment",
	onSuccess,
}: PostLoanTransactionSheetProps) {
	const { tenantId } = useTenantStore();
	const [command, setCommand] =
		useState<LoanTransactionCommand>(initialCommand);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const commandMeta = getCommandMeta(command);

	const form = useForm<
		LoanTransactionFormInput,
		unknown,
		LoanTransactionFormData
	>({
		resolver: zodResolver(loanTransactionSchema),
		defaultValues: {
			command: initialCommand,
			transactionDate: getTodayDateInputValue(),
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
		},
	});

	useEffect(() => {
		if (!open) return;
		setCommand(initialCommand);
		form.setValue("command", initialCommand, {
			shouldDirty: false,
			shouldTouch: false,
		});
	}, [form, initialCommand, open]);

	const templateQuery = useQuery({
		queryKey: ["loanTransactionTemplate", loanId, tenantId, command],
		queryFn: async () => {
			const response = await fetch(
				`${BFF_ROUTES.loanTransactionTemplate(loanId)}?command=${encodeURIComponent(command)}`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);

			if (!response.ok) {
				const errorBody = await response.json().catch(() => null);
				const fallback =
					response.status === 404
						? `${commandMeta.label} is not available for this loan in its current state.`
						: `Failed to load ${commandMeta.label.toLowerCase()} template`;
				throw new Error(getTemplateErrorMessage(fallback, errorBody));
			}

			return response.json() as Promise<GetLoansLoanIdTransactionsTemplateResponse>;
		},
		enabled: open && Number.isFinite(loanId) && loanId > 0,
	});

	useEffect(() => {
		if (!open || !templateQuery.data) return;

		const template = templateQuery.data;
		const paymentTypeOptions = (template.paymentTypeOptions ?? []).filter(
			hasPaymentTypeId,
		);
		const chargeOffReasonOptions = (
			template.chargeOffReasonOptions ?? []
		).filter(hasChargeOffReasonId);
		const classificationOptions = (template.classificationOptions ?? []).filter(
			hasCodeValueId,
		);

		const transactionAmount = commandMeta.hideAmountField
			? undefined
			: commandMeta.readOnlyTemplateAmount
				? template.amount
				: (template.amount ?? undefined);

		form.reset({
			command,
			transactionDate: toInputDateValue(template.date),
			transactionAmount,
			paymentTypeId:
				paymentTypeOptions.length === 1 ? paymentTypeOptions[0].id : undefined,
			chargeOffReasonId:
				chargeOffReasonOptions.length === 1
					? chargeOffReasonOptions[0].id
					: undefined,
			classificationId:
				classificationOptions.length === 1
					? classificationOptions[0].id
					: undefined,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
		});
	}, [command, commandMeta, form, open, templateQuery.data]);

	const postTransactionMutation = useMutation({
		mutationFn: async (data: LoanTransactionFormData) => {
			if (!templateQuery.data) {
				throw { message: "Transaction template is required" };
			}

			const payload: PostLoansLoanIdTransactionsRequest = {
				transactionDate: formatDateStringToFormat(
					data.transactionDate,
					data.dateFormat || "dd MMMM yyyy",
				),
				dateFormat: data.dateFormat || "dd MMMM yyyy",
				locale: data.locale || "en",
				note: normalizeOptionalString(data.note),
			};

			if (
				data.transactionAmount !== undefined &&
				data.transactionAmount !== null
			) {
				payload.transactionAmount = data.transactionAmount;
			}
			if (data.paymentTypeId !== undefined) {
				payload.paymentTypeId = data.paymentTypeId;
			}
			if (data.chargeOffReasonId !== undefined) {
				payload.chargeOffReasonId = data.chargeOffReasonId;
			}
			if (data.classificationId !== undefined) {
				payload.classificationId = data.classificationId;
			}

			const response = await fetch(
				`${BFF_ROUTES.loanTransactions(loanId)}?command=${encodeURIComponent(data.command)}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"fineract-platform-tenantid": tenantId,
					},
					body: JSON.stringify(payload),
				},
			);

			if (!response.ok) {
				const errorBody = await response.json().catch(() => null);
				const message = getTemplateErrorMessage(
					"Failed to post transaction",
					errorBody,
				);
				if (errorBody && typeof errorBody === "object") {
					throw { ...errorBody, message };
				}
				throw { message };
			}

			return response.json();
		},
		onSuccess: () => {
			onOpenChange(false);
			setSubmitError(null);
			onSuccess?.();
		},
		onError: (error, data) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: `loanTransaction:${data.command}`,
					endpoint: `${BFF_ROUTES.loanTransactions(loanId)}?command=${encodeURIComponent(data.command)}`,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const paymentTypeOptions = (
		templateQuery.data?.paymentTypeOptions ?? []
	).filter(hasPaymentTypeId);
	const chargeOffReasonOptions = (
		templateQuery.data?.chargeOffReasonOptions ?? []
	).filter(hasChargeOffReasonId);
	const classificationOptions = (
		templateQuery.data?.classificationOptions ?? []
	).filter(hasCodeValueId);

	const hasPaymentTypeOptions = paymentTypeOptions.length > 0;
	const hasChargeOffReasonOptions = chargeOffReasonOptions.length > 0;
	const hasClassificationOptions = classificationOptions.length > 0;

	const shouldShowAmountField = !commandMeta.hideAmountField;
	const isReadOnlyAmount = commandMeta.readOnlyTemplateAmount === true;
	const resolvedRequiresAmount =
		shouldShowAmountField &&
		((commandMeta.requireAmount ?? true) ||
			commandMeta.requireTemplateAmount === true);

	const templateCurrency =
		templateQuery.data?.currency?.displaySymbol ||
		templateQuery.data?.currency?.code ||
		currency;

	const onSubmit = (data: LoanTransactionFormData) => {
		if (!templateQuery.data) return;

		if (hasPaymentTypeOptions && !data.paymentTypeId) {
			form.setError("paymentTypeId", {
				type: "required",
				message: "Payment method is required",
			});
			return;
		}

		if (hasChargeOffReasonOptions && !data.chargeOffReasonId) {
			form.setError("chargeOffReasonId", {
				type: "required",
				message: "Charge-off reason is required",
			});
			return;
		}

		if (hasClassificationOptions && !data.classificationId) {
			form.setError("classificationId", {
				type: "required",
				message: "Classification is required",
			});
			return;
		}

		if (
			commandMeta.requireTemplateAmount &&
			(templateQuery.data.amount === undefined ||
				templateQuery.data.amount === null)
		) {
			form.setError("transactionAmount", {
				type: "required",
				message: "Template amount is unavailable for this command",
			});
			return;
		}

		const submitData: LoanTransactionFormData = {
			...data,
			transactionAmount: isReadOnlyAmount
				? (templateQuery.data.amount ?? undefined)
				: data.transactionAmount,
		};

		if (
			resolvedRequiresAmount &&
			(submitData.transactionAmount === undefined ||
				submitData.transactionAmount === null)
		) {
			form.setError("transactionAmount", {
				type: "required",
				message: "Amount is required",
			});
			return;
		}

		setSubmitError(null);
		postTransactionMutation.mutate(submitData);
	};

	const handleCommandChange = (value: string) => {
		if (!isSupportedLoanTransactionCommand(value)) return;
		setSubmitError(null);
		setCommand(value);
		form.setValue("command", value, {
			shouldDirty: true,
			shouldTouch: true,
		});
	};

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen) {
			setSubmitError(null);
			setCommand(initialCommand);
			form.reset({
				command: initialCommand,
				transactionDate: getTodayDateInputValue(),
				dateFormat: "dd MMMM yyyy",
				locale: "en",
				note: "",
			});
		}
		onOpenChange(nextOpen);
	};

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>Post Loan Transaction</SheetTitle>
					<SheetDescription>
						Fetch template defaults first, then submit command-specific
						transaction payload.
					</SheetDescription>
				</SheetHeader>

				<div className="pt-4">
					<div className="space-y-2">
						<Label>
							Transaction Command <span className="text-destructive">*</span>
						</Label>
						<Select value={command} onValueChange={handleCommandChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select command" />
							</SelectTrigger>
							<SelectContent>
								{COMMAND_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							{commandMeta.description}
						</p>
					</div>
				</div>

				{templateQuery.isLoading && (
					<div className="space-y-4 pt-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				)}

				{templateQuery.error && (
					<div className="pt-4">
						<Alert variant="destructive">
							<AlertTitle>Template Unavailable</AlertTitle>
							<AlertDescription>{templateQuery.error.message}</AlertDescription>
						</Alert>
					</div>
				)}

				{!templateQuery.isLoading && !templateQuery.error && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-4 pt-4"
						>
							<SubmitErrorAlert
								error={submitError}
								title="Loan transaction failed"
							/>
							{templateQuery.data && (
								<Card className="rounded-sm border border-border/60 bg-muted/20">
									<CardHeader className="pb-2">
										<CardTitle className="text-sm">
											Template Defaults ({commandMeta.label})
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2 text-sm">
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">Date</span>
											<span>{toInputDateValue(templateQuery.data.date)}</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">Amount</span>
											<span className="font-mono">
												{templateCurrency}{" "}
												{formatAmount(templateQuery.data.amount)}
											</span>
										</div>
										{command === "repayment" && (
											<div className="grid grid-cols-2 gap-2 text-sm">
												<div className="text-muted-foreground">Principal</div>
												<div className="text-right font-mono">
													{templateCurrency}{" "}
													{formatAmount(templateQuery.data.principalPortion)}
												</div>
												<div className="text-muted-foreground">Interest</div>
												<div className="text-right font-mono">
													{templateCurrency}{" "}
													{formatAmount(templateQuery.data.interestPortion)}
												</div>
												<div className="text-muted-foreground">Fees</div>
												<div className="text-right font-mono">
													{templateCurrency}{" "}
													{formatAmount(templateQuery.data.feeChargesPortion)}
												</div>
												<div className="text-muted-foreground">Penalties</div>
												<div className="text-right font-mono">
													{templateCurrency}{" "}
													{formatAmount(
														templateQuery.data.penaltyChargesPortion,
													)}
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							)}

							<FormField
								control={form.control}
								name="transactionDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Transaction Date{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{shouldShowAmountField && (
								<FormField
									control={form.control}
									name="transactionAmount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{commandMeta.amountLabel} ({templateCurrency}){" "}
												{resolvedRequiresAmount && (
													<span className="text-destructive">*</span>
												)}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													placeholder="0.00"
													readOnly={isReadOnlyAmount}
													value={field.value ?? ""}
													onChange={(event) =>
														field.onChange(
															event.target.value
																? Number.parseFloat(event.target.value)
																: undefined,
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{hasPaymentTypeOptions && (
								<FormField
									control={form.control}
									name="paymentTypeId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Payment Method{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value?.toString()}
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value, 10))
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select payment method" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{paymentTypeOptions.map((option) => (
														<SelectItem
															key={option.id}
															value={option.id.toString()}
														>
															{option.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{hasChargeOffReasonOptions && (
								<FormField
									control={form.control}
									name="chargeOffReasonId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Charge-Off Reason{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value?.toString()}
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value, 10))
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select charge-off reason" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{chargeOffReasonOptions.map((option) => (
														<SelectItem
															key={option.id}
															value={option.id.toString()}
														>
															{option.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{hasClassificationOptions && (
								<FormField
									control={form.control}
									name="classificationId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Classification{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value?.toString()}
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value, 10))
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select classification" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{classificationOptions.map((option) => (
														<SelectItem
															key={option.id}
															value={option.id.toString()}
														>
															{option.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<FormField
								control={form.control}
								name="note"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Note</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Optional transaction note"
												className="min-h-24 resize-y"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<SheetFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleClose(false)}
									disabled={postTransactionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										postTransactionMutation.isPending || !templateQuery.data
									}
								>
									{postTransactionMutation.isPending
										? "Submitting..."
										: commandMeta.submitLabel}
								</Button>
							</SheetFooter>
						</form>
					</Form>
				)}
			</SheetContent>
		</Sheet>
	);
}
