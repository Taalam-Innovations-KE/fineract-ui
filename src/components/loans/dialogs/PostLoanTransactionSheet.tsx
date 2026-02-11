"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
	GetLoansLoanIdTransactionsTemplateResponse,
	GetPaymentTypeOptions,
	PostLoansLoanIdTransactionsRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	type LoanTransactionCommand,
	type LoanTransactionFormData,
	loanTransactionSchema,
} from "@/lib/schemas/loan-commands";
import { useTenantStore } from "@/store/tenant";

interface PostLoanTransactionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	currency?: string;
	onSuccess?: () => void;
}

const COMMAND_OPTIONS: Array<{
	value: LoanTransactionCommand;
	label: string;
	description: string;
	submitLabel: string;
	amountLabel: string;
}> = [
	{
		value: "repayment",
		label: "Repayment",
		description: "Record a repayment transaction from the template defaults.",
		submitLabel: "Post Repayment",
		amountLabel: "Transaction Amount",
	},
	{
		value: "prepayLoan",
		label: "Prepay Loan",
		description:
			"Use the template's calculated payoff amount for full prepayment.",
		submitLabel: "Post Prepayment",
		amountLabel: "Calculated Payoff Amount",
	},
	{
		value: "waiveInterest",
		label: "Waive Interest",
		description:
			"Waive interest using the amount suggested by the transaction template.",
		submitLabel: "Waive Interest",
		amountLabel: "Waived Amount",
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

function formatAmount(amount?: number): string {
	if (amount === undefined || amount === null) return "—";
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function getTemplateErrorMessage(
	fallback: string,
	errorBody: unknown,
): string | undefined {
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

export function PostLoanTransactionSheet({
	open,
	onOpenChange,
	loanId,
	currency = "KES",
	onSuccess,
}: PostLoanTransactionSheetProps) {
	const { tenantId } = useTenantStore();
	const [command, setCommand] = useState<LoanTransactionCommand>("repayment");
	const commandMeta =
		COMMAND_OPTIONS.find((option) => option.value === command) ||
		COMMAND_OPTIONS[0];

	const form = useForm<LoanTransactionFormData>({
		resolver: zodResolver(loanTransactionSchema),
		defaultValues: {
			command: "repayment",
			transactionDate: getTodayDateInputValue(),
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
		},
	});

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
				const message = getTemplateErrorMessage(fallback, errorBody);
				throw new Error(message);
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
		const templateAmount = template.amount;
		const resolvedAmount =
			command === "prepayLoan" ? templateAmount : (templateAmount ?? undefined);

		form.reset({
			command,
			transactionDate: toInputDateValue(template.date),
			transactionAmount: resolvedAmount,
			paymentTypeId:
				paymentTypeOptions.length === 1 ? paymentTypeOptions[0].id : undefined,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
		});
	}, [command, form, open, templateQuery.data]);

	const postTransactionMutation = useMutation({
		mutationFn: async (data: LoanTransactionFormData) => {
			const templateAmount = templateQuery.data?.amount;
			const transactionAmount =
				data.command === "prepayLoan" && templateAmount !== undefined
					? templateAmount
					: data.transactionAmount;

			if (transactionAmount === undefined) {
				throw new Error("Transaction amount is required");
			}

			const payload: PostLoansLoanIdTransactionsRequest = {
				transactionDate: formatDateStringToFormat(
					data.transactionDate,
					data.dateFormat || "dd MMMM yyyy",
				),
				transactionAmount,
				dateFormat: data.dateFormat || "dd MMMM yyyy",
				locale: data.locale || "en",
				paymentTypeId: data.paymentTypeId,
				note: normalizeOptionalString(data.note),
			};

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
				throw new Error(message);
			}

			return response.json();
		},
		onSuccess: () => {
			onOpenChange(false);
			onSuccess?.();
		},
	});

	const paymentTypeOptions = (
		templateQuery.data?.paymentTypeOptions ?? []
	).filter(hasPaymentTypeId);
	const hasPaymentTypeOptions = paymentTypeOptions.length > 0;
	const isPrepayCommand = command === "prepayLoan";
	const templateCurrency =
		templateQuery.data?.currency?.displaySymbol ||
		templateQuery.data?.currency?.code ||
		currency;

	const onSubmit = (data: LoanTransactionFormData) => {
		if (!templateQuery.data) return;

		if (hasPaymentTypeOptions && !data.paymentTypeId) {
			form.setError("paymentTypeId", {
				type: "required",
				message: "Payment type is required",
			});
			return;
		}

		if (
			isPrepayCommand &&
			(templateQuery.data.amount === undefined ||
				templateQuery.data.amount === null)
		) {
			form.setError("transactionAmount", {
				type: "required",
				message: "Prepayment amount is unavailable from template",
			});
			return;
		}

		postTransactionMutation.mutate(data);
	};

	const handleCommandChange = (nextCommand: LoanTransactionCommand) => {
		setCommand(nextCommand);
		form.setValue("command", nextCommand, {
			shouldDirty: true,
			shouldTouch: true,
		});
	};

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen) {
			setCommand("repayment");
			form.reset({
				command: "repayment",
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
						Fetch the transaction template first, then submit using Fineract's
						template-driven payload.
					</SheetDescription>
				</SheetHeader>

				<div className="pt-4">
					<div className="space-y-2">
						<FormLabel>
							Transaction Command <span className="text-destructive">*</span>
						</FormLabel>
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

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

								<FormField
									control={form.control}
									name="transactionAmount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{commandMeta.amountLabel} ({templateCurrency}){" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													placeholder="0.00"
													readOnly={isPrepayCommand}
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
							</div>

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

							{postTransactionMutation.error && (
								<Alert variant="destructive">
									<AlertTitle>Transaction Failed</AlertTitle>
									<AlertDescription>
										{postTransactionMutation.error.message}
									</AlertDescription>
								</Alert>
							)}

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
