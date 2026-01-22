"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Calendar, CreditCard, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
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
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetClientsPageItemsResponse,
	GetClientsResponse,
	GetLoanProductsResponse,
	PostLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

type LoanFormData = {
	clientId: number;
	productId: number;
	principal: number;
	numberOfRepayments: number;
	interestRatePerPeriod: number;
	loanTermFrequency: number;
	loanTermFrequencyType: number;
	repaymentEvery: number;
	repaymentFrequencyType: number;
	expectedDisbursementDate: string;
	submittedOnDate: string;
	externalId?: string;
};

type LoanProduct = GetLoanProductsResponse & {
	id?: number;
	name?: string;
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
};

type LoanListItem = {
	id?: number;
	accountNo?: string;
	clientId?: number;
	clientName?: string;
	productId?: number;
	productName?: string;
	principal?: number;
	status?: { id?: number; value?: string; active?: boolean };
	loanType?: { value?: string };
	currency?: { code?: string; displaySymbol?: string };
};

type LoansResponse = {
	totalFilteredRecords?: number;
	pageItems?: LoanListItem[];
};

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function _formatDate(dateStr: string) {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const _month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()]} ${year}`;
}

function getToday() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function LookupSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="space-y-2">
				<div className="h-4 w-24 rounded bg-muted" />
				<div className="h-9 w-full rounded bg-muted" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<div className="h-4 w-28 rounded bg-muted" />
					<div className="h-9 w-full rounded bg-muted" />
				</div>
				<div className="space-y-2">
					<div className="h-4 w-24 rounded bg-muted" />
					<div className="h-9 w-full rounded bg-muted" />
				</div>
			</div>
			<div className="space-y-2">
				<div className="h-4 w-32 rounded bg-muted" />
				<div className="h-9 w-full rounded bg-muted" />
			</div>
		</div>
	);
}

async function fetchClients(tenantId: string): Promise<GetClientsResponse> {
	const response = await fetch(BFF_ROUTES.clients, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch clients");
	}

	return response.json();
}

async function fetchLoanProducts(tenantId: string): Promise<LoanProduct[]> {
	const response = await fetch(BFF_ROUTES.loanProducts, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan products");
	}

	return response.json();
}

async function fetchLoans(tenantId: string): Promise<LoansResponse> {
	const response = await fetch(BFF_ROUTES.loans, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loans");
	}

	return response.json();
}

async function createLoan(tenantId: string, payload: PostLoansRequest) {
	const response = await fetch(BFF_ROUTES.loans, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message ||
				data.errors?.[0]?.defaultUserMessage ||
				"Failed to create loan",
		);
	}

	return data;
}

export default function LoansPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(
		null,
	);

	const loansQuery = useQuery({
		queryKey: ["loans", tenantId],
		queryFn: () => fetchLoans(tenantId),
	});

	const clientsQuery = useQuery({
		queryKey: ["clients", tenantId],
		queryFn: () => fetchClients(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const productsQuery = useQuery({
		queryKey: ["loanProducts", tenantId],
		queryFn: () => fetchLoanProducts(tenantId),
		enabled: isDrawerOpen,
		staleTime: DEFAULT_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostLoansRequest) => createLoan(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
			setIsDrawerOpen(false);
			setToastMessage("Loan application submitted successfully");
		},
	});

	const {
		register,
		handleSubmit,
		control,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm<LoanFormData>({
		defaultValues: {
			submittedOnDate: getToday(),
			expectedDisbursementDate: getToday(),
			loanTermFrequencyType: 2,
			repaymentFrequencyType: 2,
			repaymentEvery: 1,
		},
	});

	const watchProductId = watch("productId");

	const clients = useMemo(
		() => (clientsQuery.data?.pageItems || []) as GetClientsPageItemsResponse[],
		[clientsQuery.data],
	);
	const activeClients = clients.filter((c) => c.active);

	const loanProducts = useMemo(
		() => (productsQuery.data || []) as LoanProduct[],
		[productsQuery.data],
	);

	const loans = loansQuery.data?.pageItems || [];
	const pendingLoans = loans.filter(
		(loan) =>
			loan.status?.value?.toLowerCase() === "submitted and pending approval",
	);
	const activeLoans = loans.filter((loan) => loan.status?.active);

	const isLookupsLoading =
		isDrawerOpen && (clientsQuery.isLoading || productsQuery.isLoading);

	const lookupErrors = [clientsQuery.error, productsQuery.error].filter(
		Boolean,
	) as Error[];

	const hasMissingClients = !clients.length;
	const hasMissingProducts = !loanProducts.length;

	const disableSubmit =
		isLookupsLoading ||
		hasMissingClients ||
		hasMissingProducts ||
		createMutation.isPending;

	const loanColumns = [
		{
			header: "Loan",
			cell: (loan: LoanListItem) => (
				<Link
					href={`/operations/loans/${loan.id || loan.accountNo}`}
					className="block hover:underline"
				>
					<div>
						<div className="font-medium">{loan.accountNo || "—"}</div>
						<div className="text-xs text-muted-foreground">
							{loan.productName || "Unknown product"}
						</div>
					</div>
				</Link>
			),
		},
		{
			header: "Client",
			cell: (loan: LoanListItem) => (
				<span className={loan.clientName ? "" : "text-muted-foreground"}>
					{loan.clientName || "—"}
				</span>
			),
		},
		{
			header: "Principal",
			cell: (loan: LoanListItem) => (
				<span className="font-mono">
					{formatCurrency(loan.principal, loan.currency?.displaySymbol)}
				</span>
			),
		},
		{
			header: "Status",
			cell: (loan: LoanListItem) => {
				const status = loan.status?.value?.toLowerCase() || "";
				let variant:
					| "default"
					| "secondary"
					| "success"
					| "warning"
					| "destructive" = "secondary";
				if (status.includes("active")) variant = "success";
				else if (status.includes("pending")) variant = "warning";
				else if (status.includes("closed") || status.includes("rejected"))
					variant = "destructive";

				return (
					<Badge variant={variant} className="text-xs px-2 py-0.5">
						{loan.status?.value || "Unknown"}
					</Badge>
				);
			},
		},
	];

	useEffect(() => {
		if (!isDrawerOpen) return;
		const today = getToday();
		reset({
			clientId: undefined,
			productId: undefined,
			principal: undefined,
			numberOfRepayments: undefined,
			interestRatePerPeriod: undefined,
			loanTermFrequency: undefined,
			loanTermFrequencyType: 2,
			repaymentEvery: 1,
			repaymentFrequencyType: 2,
			expectedDisbursementDate: today,
			submittedOnDate: today,
			externalId: "",
		});
		setSelectedProduct(null);
	}, [isDrawerOpen, reset]);

	useEffect(() => {
		if (!watchProductId || !loanProducts.length) return;
		const product = loanProducts.find((p) => p.id === watchProductId);
		if (product) {
			setSelectedProduct(product);
			if (product.principal) setValue("principal", product.principal);
			if (product.numberOfRepayments)
				setValue("numberOfRepayments", product.numberOfRepayments);
			if (product.interestRatePerPeriod)
				setValue("interestRatePerPeriod", product.interestRatePerPeriod);
			if (product.repaymentEvery)
				setValue("repaymentEvery", product.repaymentEvery);
			if (product.repaymentFrequencyType?.id)
				setValue("repaymentFrequencyType", product.repaymentFrequencyType.id);
		}
	}, [watchProductId, loanProducts, setValue]);

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const onSubmit = (data: LoanFormData) => {
		if (!data.clientId || !data.productId) return;

		const payload: PostLoansRequest = {
			clientId: data.clientId,
			productId: data.productId,
			principal: data.principal,
			numberOfRepayments: data.numberOfRepayments,
			interestRatePerPeriod: data.interestRatePerPeriod,
			loanTermFrequency: data.loanTermFrequency || data.numberOfRepayments,
			loanTermFrequencyType: data.loanTermFrequencyType,
			repaymentEvery: data.repaymentEvery,
			repaymentFrequencyType: data.repaymentFrequencyType,
			expectedDisbursementDate: data.expectedDisbursementDate,
			submittedOnDate: data.submittedOnDate,
			dateFormat: "yyyy-MM-dd",
			locale: "en",
			loanType: "individual",
		};

		if (data.externalId) {
			payload.externalId = data.externalId;
		}

		createMutation.mutate(payload);
	};

	return (
		<>
			<PageShell
				title="Loan Applications"
				subtitle="Book and manage loan applications for clients"
				actions={
					<Button onClick={() => setIsDrawerOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Book Loan
					</Button>
				}
			>
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<CreditCard className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-2xl font-bold">{loans.length}</div>
										<div className="text-sm text-muted-foreground">
											Total Loans
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
										<Calendar className="h-5 w-5 text-warning" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{pendingLoans.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Pending Approval
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
										<Banknote className="h-5 w-5 text-success" />
									</div>
									<div>
										<div className="text-2xl font-bold">
											{activeLoans.length}
										</div>
										<div className="text-sm text-muted-foreground">
											Active Loans
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Loan Directory</CardTitle>
							<CardDescription>
								{loans.length} loan{loans.length !== 1 ? "s" : ""} in the system
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loansQuery.isLoading && (
								<div className="py-6 text-center text-muted-foreground">
									Loading loans...
								</div>
							)}
							{loansQuery.error && (
								<div className="py-6 text-center text-destructive">
									Failed to load loans. Please try again.
								</div>
							)}
							{!loansQuery.isLoading && !loansQuery.error && (
								<DataTable
									data={loans}
									columns={loanColumns}
									getRowId={(loan) =>
										loan.id?.toString() || loan.accountNo || "loan-row"
									}
									emptyMessage="No loans found. Book your first loan to get started."
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Book New Loan</SheetTitle>
						<SheetDescription>
							Create a loan application for an existing client
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-4 mt-6">
						{isLookupsLoading && <LookupSkeleton />}

						{!isLookupsLoading && lookupErrors.length > 0 && (
							<Alert variant="destructive">
								<AlertTitle>Lookup error</AlertTitle>
								<AlertDescription>
									{lookupErrors[0]?.message || "Failed to load lookup data."}
								</AlertDescription>
							</Alert>
						)}

						{!isLookupsLoading && lookupErrors.length === 0 && (
							<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="clientId">
										Client <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="clientId"
										rules={{ required: "Client is required" }}
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={hasMissingClients}
											>
												<SelectTrigger id="clientId">
													<SelectValue placeholder="Select client" />
												</SelectTrigger>
												<SelectContent>
													{activeClients.map((client) => (
														<SelectItem
															key={client.id}
															value={String(client.id)}
														>
															{client.displayName || client.fullname} (
															{client.accountNo})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.clientId && (
										<p className="text-sm text-destructive">
											{errors.clientId.message}
										</p>
									)}
									{hasMissingClients && (
										<Alert variant="warning">
											<AlertTitle>No clients available</AlertTitle>
											<AlertDescription>
												Onboard clients before booking loans.
											</AlertDescription>
										</Alert>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="productId">
										Loan Product <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="productId"
										rules={{ required: "Loan product is required" }}
										render={({ field }) => (
											<Select
												value={
													field.value !== undefined && field.value !== null
														? String(field.value)
														: undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={hasMissingProducts}
											>
												<SelectTrigger id="productId">
													<SelectValue placeholder="Select loan product" />
												</SelectTrigger>
												<SelectContent>
													{loanProducts.map((product) => (
														<SelectItem
															key={product.id}
															value={String(product.id)}
														>
															{product.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.productId && (
										<p className="text-sm text-destructive">
											{errors.productId.message}
										</p>
									)}
									{hasMissingProducts && (
										<Alert variant="warning">
											<AlertTitle>No loan products available</AlertTitle>
											<AlertDescription>
												Configure loan products before booking loans.
											</AlertDescription>
										</Alert>
									)}
								</div>

								{selectedProduct && (
									<div className="p-3 bg-muted/50 border text-sm space-y-1">
										<div className="font-medium">{selectedProduct.name}</div>
										<div className="text-muted-foreground">
											Principal: {formatCurrency(selectedProduct.minPrincipal)}{" "}
											- {formatCurrency(selectedProduct.maxPrincipal)}
										</div>
										<div className="text-muted-foreground">
											Interest: {selectedProduct.interestRatePerPeriod}% per{" "}
											{selectedProduct.repaymentFrequencyType?.value ||
												"period"}
										</div>
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="principal">
											Principal Amount{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="principal"
											type="number"
											step="0.01"
											{...register("principal", {
												required: "Principal is required",
												valueAsNumber: true,
												min: {
													value: selectedProduct?.minPrincipal || 1,
													message: `Minimum is ${selectedProduct?.minPrincipal || 1}`,
												},
												max: selectedProduct?.maxPrincipal
													? {
															value: selectedProduct.maxPrincipal,
															message: `Maximum is ${selectedProduct.maxPrincipal}`,
														}
													: undefined,
											})}
											placeholder="Enter principal amount"
										/>
										{errors.principal && (
											<p className="text-sm text-destructive">
												{errors.principal.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="numberOfRepayments">
											Number of Repayments{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="numberOfRepayments"
											type="number"
											{...register("numberOfRepayments", {
												required: "Number of repayments is required",
												valueAsNumber: true,
												min: {
													value: selectedProduct?.minNumberOfRepayments || 1,
													message: `Minimum is ${selectedProduct?.minNumberOfRepayments || 1}`,
												},
												max: selectedProduct?.maxNumberOfRepayments
													? {
															value: selectedProduct.maxNumberOfRepayments,
															message: `Maximum is ${selectedProduct.maxNumberOfRepayments}`,
														}
													: undefined,
											})}
											placeholder="Enter number of repayments"
										/>
										{errors.numberOfRepayments && (
											<p className="text-sm text-destructive">
												{errors.numberOfRepayments.message}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="interestRatePerPeriod">
											Interest Rate (%)
										</Label>
										<Input
											id="interestRatePerPeriod"
											type="number"
											step="0.01"
											{...register("interestRatePerPeriod", {
												valueAsNumber: true,
											})}
											placeholder="Enter interest rate"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="repaymentEvery">Repayment Every</Label>
										<div className="flex gap-2">
											<Input
												id="repaymentEvery"
												type="number"
												className="flex-1"
												{...register("repaymentEvery", {
													valueAsNumber: true,
												})}
												placeholder="1"
											/>
											<Controller
												control={control}
												name="repaymentFrequencyType"
												render={({ field }) => (
													<Select
														value={String(field.value || 2)}
														onValueChange={(value) =>
															field.onChange(Number(value))
														}
													>
														<SelectTrigger className="w-[140px]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="0">Days</SelectItem>
															<SelectItem value="1">Weeks</SelectItem>
															<SelectItem value="2">Months</SelectItem>
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="submittedOnDate">
											Submitted On <span className="text-destructive">*</span>
										</Label>
										<Input
											id="submittedOnDate"
											type="date"
											{...register("submittedOnDate", {
												required: "Submission date is required",
											})}
										/>
										{errors.submittedOnDate && (
											<p className="text-sm text-destructive">
												{errors.submittedOnDate.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="expectedDisbursementDate">
											Expected Disbursement{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											id="expectedDisbursementDate"
											type="date"
											{...register("expectedDisbursementDate", {
												required: "Expected disbursement date is required",
											})}
										/>
										{errors.expectedDisbursementDate && (
											<p className="text-sm text-destructive">
												{errors.expectedDisbursementDate.message}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="externalId">External ID (Optional)</Label>
									<Input
										id="externalId"
										{...register("externalId")}
										placeholder="External reference ID"
									/>
								</div>

								{createMutation.isError && (
									<Alert variant="destructive">
										<AlertTitle>Submission failed</AlertTitle>
										<AlertDescription>
											{(createMutation.error as Error)?.message ||
												"Failed to book loan. Please try again."}
										</AlertDescription>
									</Alert>
								)}

								<div className="flex items-center justify-end gap-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsDrawerOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={disableSubmit}>
										{createMutation.isPending ? "Submitting..." : "Book Loan"}
									</Button>
								</div>
							</form>
						)}
					</div>
				</SheetContent>
			</Sheet>

			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 w-[280px]">
					<Alert variant="success">
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</>
	);
}
