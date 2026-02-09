"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Resolver } from "react-hook-form";
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
	type LoanRepaymentFormData,
	loanRepaymentSchema,
} from "@/lib/schemas/loan-commands";
import { useTenantStore } from "@/store/tenant";

interface PostRepaymentSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	currency?: string;
	onSuccess?: () => void;
}

function getTodayDateInputValue(): string {
	return new Date().toISOString().split("T")[0];
}

function toInputDateValue(date?: string): string {
	if (!date) return getTodayDateInputValue();
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return getTodayDateInputValue();
	return parsed.toISOString().split("T")[0];
}

function normalizeOptionalString(value?: string): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function formatAmount(amount?: number): string {
	if (amount === undefined || amount === null) return "—";
	return amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function hasPaymentTypeId(
	option: GetPaymentTypeOptions,
): option is GetPaymentTypeOptions & { id: number } {
	return option.id !== undefined;
}

export function PostRepaymentSheet({
	open,
	onOpenChange,
	loanId,
	currency = "KES",
	onSuccess,
}: PostRepaymentSheetProps) {
	const { tenantId } = useTenantStore();

	const form = useForm<LoanRepaymentFormData>({
		resolver: zodResolver(
			loanRepaymentSchema,
		) as Resolver<LoanRepaymentFormData>,
		defaultValues: {
			transactionDate: getTodayDateInputValue(),
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
			accountNumber: "",
			bankNumber: "",
			checkNumber: "",
			receiptNumber: "",
			routingCode: "",
			externalId: "",
		},
	});

	const templateQuery = useQuery({
		queryKey: ["loanRepaymentTemplate", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(
				`${BFF_ROUTES.loanTransactionTemplate(loanId)}?command=repayment`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) {
				throw new Error("Failed to load repayment template");
			}
			return response.json() as Promise<GetLoansLoanIdTransactionsTemplateResponse>;
		},
		enabled: open && Number.isFinite(loanId) && loanId > 0,
	});

	useEffect(() => {
		if (!open || !templateQuery.data) return;

		const template = templateQuery.data;
		const paymentTypeOptions = template.paymentTypeOptions ?? [];

		form.reset({
			transactionDate: toInputDateValue(template.date),
			transactionAmount: template.amount,
			paymentTypeId:
				paymentTypeOptions.length === 1 ? paymentTypeOptions[0].id : undefined,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
			note: "",
			accountNumber: "",
			bankNumber: "",
			checkNumber: "",
			receiptNumber: "",
			routingCode: "",
			externalId: "",
		});
	}, [open, templateQuery.data, form]);

	const repaymentMutation = useMutation({
		mutationFn: async (data: LoanRepaymentFormData) => {
			const payload: PostLoansLoanIdTransactionsRequest = {
				transactionAmount: data.transactionAmount,
				paymentTypeId: data.paymentTypeId,
				transactionDate: formatDateStringToFormat(
					data.transactionDate,
					data.dateFormat || "dd MMMM yyyy",
				),
				dateFormat: data.dateFormat || "dd MMMM yyyy",
				locale: data.locale || "en",
				note: normalizeOptionalString(data.note),
				accountNumber: normalizeOptionalString(data.accountNumber),
				bankNumber: normalizeOptionalString(data.bankNumber),
				checkNumber: normalizeOptionalString(data.checkNumber),
				receiptNumber: normalizeOptionalString(data.receiptNumber),
				routingCode: normalizeOptionalString(data.routingCode),
				externalId: normalizeOptionalString(data.externalId),
			};

			const response = await fetch(
				`${BFF_ROUTES.loanTransactions(loanId)}?command=repayment`,
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
				const error = await response.json();
				throw new Error(
					error.message ||
						error.details?.general?.[0] ||
						error.errors?.[0]?.defaultUserMessage ||
						"Failed to post repayment",
				);
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

	const onSubmit = (data: LoanRepaymentFormData) => {
		if (hasPaymentTypeOptions && !data.paymentTypeId) {
			form.setError("paymentTypeId", {
				type: "required",
				message: "Payment type is required",
			});
			return;
		}
		repaymentMutation.mutate(data);
	};

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen) {
			form.reset({
				transactionDate: getTodayDateInputValue(),
				dateFormat: "dd MMMM yyyy",
				locale: "en",
				note: "",
				accountNumber: "",
				bankNumber: "",
				checkNumber: "",
				receiptNumber: "",
				routingCode: "",
				externalId: "",
			});
		}
		onOpenChange(nextOpen);
	};

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Post Manual Repayment</SheetTitle>
					<SheetDescription>
						Record a repayment transaction directly on this loan.
					</SheetDescription>
				</SheetHeader>

				{templateQuery.isLoading && (
					<div className="space-y-4 pt-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				)}

				{templateQuery.error && (
					<div className="pt-4">
						<Alert variant="destructive">
							<AlertTitle>Template Unavailable</AlertTitle>
							<AlertDescription>
								Failed to load repayment template. Please retry.
							</AlertDescription>
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
											Template Breakdown
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 gap-2 text-sm">
											<div className="text-muted-foreground">Principal</div>
											<div className="text-right font-mono">
												{currency}{" "}
												{formatAmount(templateQuery.data.principalPortion)}
											</div>
											<div className="text-muted-foreground">Interest</div>
											<div className="text-right font-mono">
												{currency}{" "}
												{formatAmount(templateQuery.data.interestPortion)}
											</div>
											<div className="text-muted-foreground">Fees</div>
											<div className="text-right font-mono">
												{currency}{" "}
												{formatAmount(templateQuery.data.feeChargesPortion)}
											</div>
											<div className="text-muted-foreground">Penalties</div>
											<div className="text-right font-mono">
												{currency}{" "}
												{formatAmount(templateQuery.data.penaltyChargesPortion)}
											</div>
										</div>
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
												Repayment Date{" "}
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
												Amount ({currency}){" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													placeholder="0.00"
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
												Payment Type <span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value?.toString()}
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value, 10))
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select payment type" />
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

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="receiptNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Receipt Number</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="accountNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Account Number</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="bankNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Bank Number</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="checkNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Check Number</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="routingCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Routing Code</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="externalId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>External Reference</FormLabel>
											<FormControl>
												<Input placeholder="Optional" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="note"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Note</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Optional internal note"
												className="min-h-24 resize-y"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{repaymentMutation.error && (
								<Alert variant="destructive">
									<AlertTitle>Repayment Failed</AlertTitle>
									<AlertDescription>
										{repaymentMutation.error.message}
									</AlertDescription>
								</Alert>
							)}

							<SheetFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleClose(false)}
									disabled={repaymentMutation.isPending}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={repaymentMutation.isPending}>
									{repaymentMutation.isPending
										? "Posting..."
										: "Post Repayment"}
								</Button>
							</SheetFooter>
						</form>
					</Form>
				)}
			</SheetContent>
		</Sheet>
	);
}
