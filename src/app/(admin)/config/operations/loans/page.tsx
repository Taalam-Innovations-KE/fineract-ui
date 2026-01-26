"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Calendar, CreditCard, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { LoanBookingWizard } from "@/components/loans/loan-booking-wizard";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetClientsPageItemsResponse,
	GetClientsResponse,
	GetLoanProductsResponse,
	PostLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

// Type guard to filter items with defined IDs
function hasDefinedId<T extends { id?: number | string }>(
	item: T,
): item is T & { id: number | string } {
	return item.id !== undefined;
}
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

type LoanProduct = GetLoanProductsResponse & {
	id?: number;
	name?: string;
	shortName?: string;
	minPrincipal?: number;
	maxPrincipal?: number;
	principal?: number;
	minNumberOfRepayments?: number;
	maxNumberOfRepayments?: number;
	numberOfRepayments?: number;
	interestRatePerPeriod?: number;
	repaymentEvery?: number;
	repaymentFrequencyType?: { id?: number; value?: string };
	currency?: { code?: string; displaySymbol?: string };
	enableDownPayment?: boolean;
	multiDisburseLoan?: boolean;
	charges?: Array<{
		id: number;
		name?: string;
		amount?: number;
		chargeCalculationType?: { id?: number; value?: string };
		chargeTimeType?: { id?: number; value?: string };
		penalty?: boolean;
	}>;
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

function WizardSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex items-center justify-between">
				{[1, 2, 3, 4, 5, 6, 7].map((i) => (
					<div key={i} className="flex flex-col items-center">
						<div className="h-10 w-10 rounded-full bg-muted" />
						<div className="h-3 w-16 mt-2 rounded bg-muted" />
					</div>
				))}
			</div>
			<div className="space-y-4">
				<div className="h-6 w-48 rounded bg-muted" />
				<div className="h-10 w-full rounded bg-muted" />
				<div className="h-10 w-full rounded bg-muted" />
				<div className="h-32 w-full rounded bg-muted" />
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

	const clients = useMemo(
		() => (clientsQuery.data?.pageItems || []).filter(hasDefinedId),
		[clientsQuery.data],
	);

	const loanProducts = useMemo(
		() => (productsQuery.data || []).filter(hasDefinedId),
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

	const loanColumns = [
		{
			header: "Loan",
			cell: (loan: LoanListItem) => (
				<Link
					href={`/config/operations/loans/${loan.id || loan.accountNo}`}
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

	const handleWizardSubmit = async (data: PostLoansRequest) => {
		await createMutation.mutateAsync(data);
	};

	// Clear toast after timeout
	if (toastMessage) {
		setTimeout(() => setToastMessage(null), 3000);
	}

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
									enableActions={true}
									getViewUrl={(loan) => `/config/operations/loans/${loan.id}`}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-3xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Book New Loan</SheetTitle>
						<SheetDescription>
							Create a loan application for an existing client
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6">
						{isLookupsLoading && <WizardSkeleton />}

						{!isLookupsLoading && lookupErrors.length > 0 && (
							<Alert variant="destructive">
								<AlertTitle>Lookup error</AlertTitle>
								<AlertDescription>
									{lookupErrors[0]?.message || "Failed to load lookup data."}
								</AlertDescription>
							</Alert>
						)}

						{!isLookupsLoading && lookupErrors.length === 0 && (
							<LoanBookingWizard
								clients={clients}
								products={loanProducts}
								isOpen={isDrawerOpen}
								onSubmit={handleWizardSubmit}
								onCancel={() => setIsDrawerOpen(false)}
							/>
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
