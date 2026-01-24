"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function LoanGracePeriodsStep() {
	const form = useFormContext<LoanApplicationInput>();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Grace Periods</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground mb-4">
					Grace periods allow the borrower to skip certain payments at the
					beginning of the loan term. All values are in number of repayment
					periods.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="graceOnPrincipalPayment"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Grace on Principal Payment</FormLabel>
								<FormControl>
									<Input
										type="number"
										min="0"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="0"
									/>
								</FormControl>
								<FormDescription>
									Number of periods to defer principal payment
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="graceOnInterestPayment"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Grace on Interest Payment</FormLabel>
								<FormControl>
									<Input
										type="number"
										min="0"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="0"
									/>
								</FormControl>
								<FormDescription>
									Number of periods to defer interest payment
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="graceOnInterestCharged"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Grace on Interest Charged</FormLabel>
								<FormControl>
									<Input
										type="number"
										min="0"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="0"
									/>
								</FormControl>
								<FormDescription>
									Number of periods to skip charging interest
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="graceOnArrearsAgeing"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Grace on Arrears Ageing</FormLabel>
								<FormControl>
									<Input
										type="number"
										min="0"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="0"
									/>
								</FormControl>
								<FormDescription>
									Days before loan is considered in arrears
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
