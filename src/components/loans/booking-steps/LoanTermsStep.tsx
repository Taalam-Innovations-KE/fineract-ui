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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";

interface LoanProduct {
	id: number;
	name?: string;
	currency?: { code?: string; displaySymbol?: string };
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	minInterestRatePerPeriod?: number;
	maxInterestRatePerPeriod?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
}

interface LoanTermsStepProps {
	product: LoanProduct | null;
}

const FREQUENCY_OPTIONS = [
	{ id: 0, label: "Days" },
	{ id: 1, label: "Weeks" },
	{ id: 2, label: "Months" },
	{ id: 3, label: "Years" },
];

export function LoanTermsStep({ product }: LoanTermsStepProps) {
	const form = useFormContext<LoanApplicationInput>();

	const currency =
		product?.currency?.displaySymbol || product?.currency?.code || "KES";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Loan Terms</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Principal Amount */}
				<FormField
					control={form.control}
					name="principal"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Principal Amount ({currency}){" "}
								<span className="text-destructive">*</span>
							</FormLabel>
							<FormControl>
								<Input
									type="number"
									step="0.01"
									{...field}
									onChange={(e) =>
										field.onChange(
											e.target.value ? parseFloat(e.target.value) : undefined,
										)
									}
									placeholder="Enter principal amount"
								/>
							</FormControl>
							{product && (
								<FormDescription>
									Range: {product.minPrincipal?.toLocaleString()} -{" "}
									{product.maxPrincipal?.toLocaleString()} {currency}
								</FormDescription>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Number of Repayments */}
				<FormField
					control={form.control}
					name="numberOfRepayments"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Number of Repayments <span className="text-destructive">*</span>
							</FormLabel>
							<FormControl>
								<Input
									type="number"
									{...field}
									onChange={(e) =>
										field.onChange(
											e.target.value ? parseInt(e.target.value, 10) : undefined,
										)
									}
									placeholder="Enter number of repayments"
								/>
							</FormControl>
							{product && (
								<FormDescription>
									Range: {product.minNumberOfRepayments} -{" "}
									{product.maxNumberOfRepayments} repayments
								</FormDescription>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Interest Rate */}
				<FormField
					control={form.control}
					name="interestRatePerPeriod"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Interest Rate (% per period)</FormLabel>
							<FormControl>
								<Input
									type="number"
									step="0.01"
									{...field}
									onChange={(e) =>
										field.onChange(
											e.target.value ? parseFloat(e.target.value) : undefined,
										)
									}
									placeholder="Enter interest rate"
								/>
							</FormControl>
							{product && (
								<FormDescription>
									Product default: {product.interestRatePerPeriod}%
								</FormDescription>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Repayment Frequency */}
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="repaymentEvery"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Repaid Every</FormLabel>
								<FormControl>
									<Input
										type="number"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="1"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="repaymentFrequencyType"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Frequency</FormLabel>
								<Select
									value={field.value?.toString() || "2"}
									onValueChange={(value) => field.onChange(parseInt(value, 10))}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{FREQUENCY_OPTIONS.map((option) => (
											<SelectItem key={option.id} value={option.id.toString()}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* Loan Term (calculated or explicit) */}
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="loanTermFrequency"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Loan Term</FormLabel>
								<FormControl>
									<Input
										type="number"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? parseInt(e.target.value, 10)
													: undefined,
											)
										}
										placeholder="Auto-calculated if empty"
									/>
								</FormControl>
								<FormDescription>
									Leave empty to match number of repayments
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="loanTermFrequencyType"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Term Frequency</FormLabel>
								<Select
									value={field.value?.toString() || "2"}
									onValueChange={(value) => field.onChange(parseInt(value, 10))}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{FREQUENCY_OPTIONS.map((option) => (
											<SelectItem key={option.id} value={option.id.toString()}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
