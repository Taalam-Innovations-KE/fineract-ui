"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	FormControl,
	FormDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";
import { useTenantStore } from "@/store/tenant";

interface LoanProduct {
	enableDownPayment?: boolean;
	disbursedAmountPercentageForDownPayment?: number;
	enableAutoRepaymentForDownPayment?: boolean;
	multiDisburseLoan?: boolean;
	maxTrancheCount?: number;
	canUseForTopup?: boolean;
	currency?: { code?: string; displaySymbol?: string };
}

interface TopupLoanOption {
	id: number;
	accountNo?: string;
	status?: { active?: boolean; value?: string };
	currency?: { code?: string; displaySymbol?: string };
	summary?: { totalOutstanding?: number };
	totalOutstanding?: number;
}

interface LoanAdvancedStepProps {
	product: LoanProduct | null;
	currency?: string;
	selectedClientId?: number;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function getOutstandingAmount(loan: TopupLoanOption): number {
	return loan.summary?.totalOutstanding ?? loan.totalOutstanding ?? 0;
}

function normalizeTopupLoanOptions(payload: unknown): TopupLoanOption[] {
	if (Array.isArray(payload)) {
		return payload as TopupLoanOption[];
	}
	if (
		payload &&
		typeof payload === "object" &&
		"pageItems" in payload &&
		Array.isArray((payload as { pageItems?: unknown }).pageItems)
	) {
		return (payload as { pageItems: TopupLoanOption[] }).pageItems;
	}
	return [];
}

export function LoanAdvancedStep({
	product,
	currency = "KES",
	selectedClientId,
}: LoanAdvancedStepProps) {
	const form = useFormContext<LoanApplicationInput>();
	const { tenantId } = useTenantStore();

	const watchEnableDownPayment = form.watch("enableDownPayment");
	const watchMultiTranche = form.watch("isMultiTrancheEnabled");
	const watchIsTopup = form.watch("isTopup");
	const watchLoanIdToClose = form.watch("loanIdToClose");
	const watchPrincipal = form.watch("principal");

	const showDownPayment = product?.enableDownPayment;
	const showMultiTranche = product?.multiDisburseLoan;
	const showTopup = product?.canUseForTopup;
	const productCurrency = product?.currency?.code;

	const topupLoansQuery = useQuery({
		queryKey: ["topupLoans", tenantId, selectedClientId],
		queryFn: async () => {
			if (!selectedClientId) return [] as TopupLoanOption[];
			const params = new URLSearchParams({
				clientId: String(selectedClientId),
			});
			const response = await fetch(`${BFF_ROUTES.loans}?${params.toString()}`, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) {
				throw new Error("Failed to load active client loans for top-up");
			}
			const payload = (await response.json()) as unknown;
			return normalizeTopupLoanOptions(payload);
		},
		enabled: Boolean(showTopup && selectedClientId && tenantId),
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const topupLoanOptions = useMemo(() => {
		const options = topupLoansQuery.data ?? [];
		return options.filter((loan) => {
			const statusValue = loan.status?.value?.toLowerCase() || "";
			const isActive =
				loan.status?.active === true || statusValue.includes("active");
			if (!isActive) return false;
			if (!productCurrency) return true;
			return loan.currency?.code === productCurrency;
		});
	}, [topupLoansQuery.data, productCurrency]);

	const selectedTopupLoan = useMemo(
		() => topupLoanOptions.find((loan) => loan.id === watchLoanIdToClose),
		[topupLoanOptions, watchLoanIdToClose],
	);

	useEffect(() => {
		if (!watchIsTopup) {
			form.setValue("loanIdToClose", undefined, {
				shouldDirty: true,
				shouldTouch: true,
				shouldValidate: true,
			});
		}
	}, [watchIsTopup, form]);

	if (!showDownPayment && !showMultiTranche && !showTopup) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Advanced Features</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="py-4 text-center text-sm text-muted-foreground">
						This loan product does not have advanced features enabled.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Advanced Features</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{showDownPayment && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium">Down Payment</h4>

						<FormField
							control={form.control}
							name="enableDownPayment"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel>Enable Down Payment</FormLabel>
										<FormDescription>
											Require a down payment before loan disbursement
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						{watchEnableDownPayment && (
							<>
								<FormField
									control={form.control}
									name="disbursedAmountPercentageForDownPayment"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Down Payment Percentage</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="0"
													max="100"
													step="0.01"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseFloat(e.target.value)
																: undefined,
														)
													}
													placeholder={
														product?.disbursedAmountPercentageForDownPayment?.toString() ||
														"Enter percentage"
													}
												/>
											</FormControl>
											<FormDescription>
												Percentage of disbursed amount required as down payment
												(Product default:{" "}
												{product?.disbursedAmountPercentageForDownPayment || 0}
												%)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="enableAutoRepaymentForDownPayment"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Auto-Repayment for Down Payment</FormLabel>
												<FormDescription>
													Automatically apply down payment on disbursement
												</FormDescription>
											</div>
										</FormItem>
									)}
								/>
							</>
						)}
					</div>
				)}

				{showMultiTranche && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium">Multi-Tranche Disbursement</h4>

						<FormField
							control={form.control}
							name="isMultiTrancheEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel>Enable Multi-Tranche</FormLabel>
										<FormDescription>
											Disburse loan in multiple tranches (up to{" "}
											{product?.maxTrancheCount || "unlimited"} tranches)
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						{watchMultiTranche && (
							<FormField
								control={form.control}
								name="maxOutstandingLoanBalance"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Max Outstanding Balance ({currency})</FormLabel>
										<FormControl>
											<Input
												type="number"
												min="0"
												step="0.01"
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? parseFloat(e.target.value)
															: undefined,
													)
												}
												placeholder="Enter maximum outstanding balance"
											/>
										</FormControl>
										<FormDescription>
											Maximum outstanding balance allowed across all tranches
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
					</div>
				)}

				{showTopup && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium">Top-up</h4>

						<FormField
							control={form.control}
							name="isTopup"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel>Use as top-up loan</FormLabel>
										<FormDescription>
											This application can close an active client loan and
											disburse the net remainder.
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						{watchIsTopup && (
							<div className="space-y-3">
								{topupLoansQuery.isLoading && (
									<div className="rounded-sm border border-border/60 p-3">
										<div className="space-y-2">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-10 w-full" />
											<Skeleton className="h-10 w-full" />
										</div>
									</div>
								)}

								{topupLoansQuery.error && (
									<Alert variant="destructive">
										<AlertTitle>Unable to load active loans</AlertTitle>
										<AlertDescription>
											{topupLoansQuery.error.message}
										</AlertDescription>
									</Alert>
								)}

								{!topupLoansQuery.isLoading &&
									!topupLoansQuery.error &&
									topupLoanOptions.length === 0 && (
										<Alert variant="warning">
											<AlertTitle>No eligible active loans found</AlertTitle>
											<AlertDescription>
												No active loan matching this client and product currency
												is available for top-up.
											</AlertDescription>
										</Alert>
									)}

								{topupLoanOptions.length > 0 && (
									<FormField
										control={form.control}
										name="loanIdToClose"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Loan to Close{" "}
													<span className="text-destructive">*</span>
												</FormLabel>
												<Select
													value={field.value?.toString() || ""}
													onValueChange={(value) =>
														field.onChange(Number.parseInt(value, 10))
													}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select active loan to close" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{topupLoanOptions.map((loan) => {
															const displayCurrency =
																loan.currency?.displaySymbol ||
																loan.currency?.code ||
																currency;
															const outstanding = getOutstandingAmount(loan);
															return (
																<SelectItem
																	key={loan.id}
																	value={String(loan.id)}
																>
																	{loan.accountNo || `Loan #${loan.id}`} (
																	{formatCurrency(outstanding, displayCurrency)}
																	)
																</SelectItem>
															);
														})}
													</SelectContent>
												</Select>
												<FormDescription>
													New principal (
													{formatCurrency(watchPrincipal, currency)}) must cover
													the selected loan outstanding balance.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
								{selectedTopupLoan &&
									watchPrincipal !== undefined &&
									getOutstandingAmount(selectedTopupLoan) > watchPrincipal && (
										<Alert variant="warning">
											<AlertTitle>
												Principal is lower than outstanding
											</AlertTitle>
											<AlertDescription>
												Selected loan outstanding{" "}
												{formatCurrency(
													getOutstandingAmount(selectedTopupLoan),
													currency,
												)}{" "}
												exceeds new principal{" "}
												{formatCurrency(watchPrincipal, currency)}. Fineract
												will reject this top-up request.
											</AlertDescription>
										</Alert>
									)}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
