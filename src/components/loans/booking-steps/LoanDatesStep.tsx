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

export function LoanDatesStep() {
	const form = useFormContext<LoanApplicationInput>();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Dates & Reference</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="submittedOnDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Submitted On <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormDescription>
									Date the loan application was submitted
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="expectedDisbursementDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Expected Disbursement{" "}
									<span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormDescription>
									Expected date of loan disbursement
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="repaymentsStartingFromDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>First Repayment Date</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormDescription>
									Leave empty for automatic calculation
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="interestChargedFromDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Interest Charged From</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormDescription>
									Date to start charging interest (defaults to disbursement)
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="externalId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>External ID</FormLabel>
							<FormControl>
								<Input {...field} placeholder="External reference ID" />
							</FormControl>
							<FormDescription>
								Optional external reference for integration purposes
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</CardContent>
		</Card>
	);
}
