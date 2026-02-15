"use client";

import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";

interface Client {
	id: number;
	displayName?: string;
	fullname?: string;
	accountNo?: string;
	active?: boolean;
}

interface LoanProduct {
	id: number;
	name?: string;
	shortName?: string;
	currency?: { code?: string; displaySymbol?: string };
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
}

interface LoanClientProductStepProps {
	clients: Client[];
	products: LoanProduct[];
	selectedProduct: LoanProduct | null;
	onProductSelect: (product: LoanProduct | null) => void;
	lockSelections?: boolean;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

export function LoanClientProductStep({
	clients,
	products,
	selectedProduct,
	onProductSelect,
	lockSelections = false,
}: LoanClientProductStepProps) {
	const form = useFormContext<LoanApplicationInput>();

	const activeClients = clients.filter((c) => c.active !== false);
	const hasMissingClients = activeClients.length === 0;
	const hasMissingProducts = products.length === 0;

	const currency =
		selectedProduct?.currency?.displaySymbol ||
		selectedProduct?.currency?.code ||
		"KES";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Client & Loan Product</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Client Selection */}
				<FormField
					control={form.control}
					name="clientId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Client <span className="text-destructive">*</span>
							</FormLabel>
							<Select
								value={field.value?.toString() || ""}
								onValueChange={(value) => field.onChange(parseInt(value, 10))}
								disabled={hasMissingClients || lockSelections}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a client" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{activeClients.map((client) => (
										<SelectItem key={client.id} value={client.id.toString()}>
											{client.displayName || client.fullname} (
											{client.accountNo})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{hasMissingClients && (
					<Alert variant="warning">
						<AlertTitle>No clients available</AlertTitle>
						<AlertDescription>
							Onboard clients before booking loans.
						</AlertDescription>
					</Alert>
				)}

				{/* Product Selection */}
				<FormField
					control={form.control}
					name="productId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Loan Product <span className="text-destructive">*</span>
							</FormLabel>
							<Select
								value={field.value?.toString() || ""}
								onValueChange={(value) => {
									const productId = parseInt(value, 10);
									field.onChange(productId);
									const product =
										products.find((p) => p.id === productId) || null;
									onProductSelect(product);
								}}
								disabled={hasMissingProducts || lockSelections}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a loan product" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{products.map((product) => (
										<SelectItem key={product.id} value={product.id.toString()}>
											{product.name}
											{product.shortName && (
												<span className="text-muted-foreground ml-1">
													({product.shortName})
												</span>
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{hasMissingProducts && (
					<Alert variant="warning">
						<AlertTitle>No loan products available</AlertTitle>
						<AlertDescription>
							Configure loan products before booking loans.
						</AlertDescription>
					</Alert>
				)}

				{lockSelections && (
					<Alert variant="default">
						<AlertTitle>Client and product are locked</AlertTitle>
						<AlertDescription>
							Use this flow to edit the current application details without
							changing the selected client or loan product.
						</AlertDescription>
					</Alert>
				)}

				{/* Product Summary */}
				{selectedProduct && (
					<div className="p-4 bg-muted/50 border rounded-md space-y-2">
						<div className="font-medium">{selectedProduct.name}</div>
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-muted-foreground">Principal Range:</span>
								<br />
								{formatCurrency(selectedProduct.minPrincipal, currency)} -{" "}
								{formatCurrency(selectedProduct.maxPrincipal, currency)}
							</div>
							<div>
								<span className="text-muted-foreground">
									Default Principal:
								</span>
								<br />
								{formatCurrency(selectedProduct.principal, currency)}
							</div>
							<div>
								<span className="text-muted-foreground">Repayments:</span>
								<br />
								{selectedProduct.minNumberOfRepayments} -{" "}
								{selectedProduct.maxNumberOfRepayments} (default:{" "}
								{selectedProduct.numberOfRepayments})
							</div>
							<div>
								<span className="text-muted-foreground">Interest Rate:</span>
								<br />
								{selectedProduct.interestRatePerPeriod}% per{" "}
								{selectedProduct.repaymentFrequencyType?.value || "period"}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
