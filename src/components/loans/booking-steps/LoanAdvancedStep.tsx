"use client";

import { useFormContext } from "react-hook-form";
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
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";

interface LoanProduct {
	enableDownPayment?: boolean;
	disbursedAmountPercentageForDownPayment?: number;
	enableAutoRepaymentForDownPayment?: boolean;
	multiDisburseLoan?: boolean;
	maxTrancheCount?: number;
}

interface LoanAdvancedStepProps {
	product: LoanProduct | null;
	currency?: string;
}

export function LoanAdvancedStep({
	product,
	currency = "KES",
}: LoanAdvancedStepProps) {
	const form = useFormContext<LoanApplicationInput>();

	const watchEnableDownPayment = form.watch("enableDownPayment");
	const watchMultiTranche = form.watch("isMultiTrancheEnabled");

	const showDownPayment = product?.enableDownPayment;
	const showMultiTranche = product?.multiDisburseLoan;

	if (!showDownPayment && !showMultiTranche) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Advanced Features</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground text-center py-4">
						This loan product does not have advanced features enabled (down
						payment or multi-tranche disbursement).
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
				{/* Down Payment Section */}
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

				{/* Multi-Tranche Section */}
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
			</CardContent>
		</Card>
	);
}
