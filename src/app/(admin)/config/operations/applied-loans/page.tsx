"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Banknote,
	Calendar,
	CheckCircle,
	Clock,
	Eye,
	FileText,
	Plus,
	Search,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetLoansLoanIdResponse,
	GetLoansLoanIdStatus,
	GetLoansResponse,
	GetPermissionsResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const ITEMS_PER_PAGE = 20;

type LoanListItem = GetLoansLoanIdResponse;

type StatusOption = {
	value: string;
	label: string;
	variant: "default" | "secondary" | "success" | "warning" | "destructive";
};

const statusOptions: StatusOption[] = [
	{ value: "", label: "All Statuses", variant: "secondary" },
	{
		value: "submitted and pending approval",
		label: "Pending Approval",
		variant: "warning",
	},
	{ value: "approved", label: "Approved", variant: "success" },
	{ value: "active", label: "Active", variant: "default" },
	{ value: "rejected", label: "Rejected", variant: "destructive" },
	{ value: "closed", label: "Closed", variant: "secondary" },
];

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | undefined) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 1) return "Today";
	if (diffDays === 2) return "Yesterday";
	if (diffDays <= 7) return `${diffDays - 1} days ago`;

	return date.toLocaleDateString();
}

function getStatusDisplay(status?: GetLoansLoanIdStatus): StatusOption {
	if (!status) return statusOptions[0];

	// Check status flags in priority order
	if (status.pendingApproval) {
		return statusOptions.find(
			(opt) => opt.value === "submitted and pending approval",
		)!;
	}
	if (status.active) {
		return statusOptions.find((opt) => opt.value === "active")!;
	}
	if (status.closed) {
		return statusOptions.find((opt) => opt.value === "closed")!;
	}

	// Fallback based on description or code
	const statusText = status.description || status.code || "";
	const statusValue = statusText.toLowerCase();

	const matchingOption = statusOptions.find(
		(opt) =>
			opt.value === statusValue ||
			opt.label.toLowerCase().includes(statusValue),
	);

	return (
		matchingOption || {
			value: statusText,
			label: statusText || "Unknown",
			variant: "secondary",
		}
	);
}

async function fetchAppliedLoans(
	tenantId: string,
	params: {
		offset: number;
		limit: number;
		status?: string;
		clientId?: number;
		accountNo?: string;
		orderBy: string;
		sortOrder: string;
	},
): Promise<GetLoansResponse> {
	const queryParams = new URLSearchParams({
		offset: params.offset.toString(),
		limit: params.limit.toString(),
		orderBy: params.orderBy,
		sortOrder: params.sortOrder,
	});

	if (params.status) queryParams.set("status", params.status);
	if (params.clientId) queryParams.set("clientId", params.clientId.toString());
	if (params.accountNo) queryParams.set("accountNo", params.accountNo);

	const response = await fetch(`${BFF_ROUTES.loans}?${queryParams}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch applied loans");
	}

	return response.json();
}

async function approveLoan(tenantId: string, loanId: number) {
	// This would integrate with maker-checker API
	// For now, we'll assume approval goes through the regular loan approval endpoint
	const response = await fetch(
		`${BFF_ROUTES.loans}/${loanId}?command=approve`,
		{
			method: "POST",
			headers: {
				"x-tenant-id": tenantId,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to approve loan");
	}

	return data;
}

async function rejectLoan(tenantId: string, loanId: number, reason?: string) {
	// Similar to approve, would use maker-checker or loan rejection endpoint
	const response = await fetch(`${BFF_ROUTES.loans}/${loanId}?command=reject`, {
		method: "POST",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ rejectReason: reason || "Rejected via dashboard" }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to reject loan");
	}

	return data;
}

export default function AppliedLoansPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [filters, setFilters] = useState({
		status: "",
		clientId: undefined as number | undefined,
		accountNo: "",
	});

	const [pagination, setPagination] = useState({
		offset: 0,
		limit: ITEMS_PER_PAGE,
		orderBy: "submittedOnDate",
		sortOrder: "DESC" as "ASC" | "DESC",
	});

	const [clientSearch, setClientSearch] = useState("");
	const [actionDialog, setActionDialog] = useState<{
		open: boolean;
		action: "approve" | "reject" | null;
		loan: LoanListItem | null;
	}>({
		open: false,
		action: null,
		loan: null,
	});

	// Fetch user permissions for maker-checker actions
	const permissionsQuery = useQuery({
		queryKey: ["user-permissions", tenantId],
		queryFn: async (): Promise<GetPermissionsResponse[]> => {
			const response = await fetch(
				`${BFF_ROUTES.permissions}?makerCheckerable=true`,
				{
					headers: {
						"x-tenant-id": tenantId,
					},
				},
			);
			if (!response.ok) {
				throw new Error("Failed to fetch permissions");
			}
			return response.json();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Fetch loans with current filters and pagination
	const loansQuery = useQuery({
		queryKey: ["appliedLoans", tenantId, filters, pagination],
		queryFn: () => fetchAppliedLoans(tenantId, { ...filters, ...pagination }),
	});

	const approveMutation = useMutation({
		mutationFn: (loanId: number) => approveLoan(tenantId, loanId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appliedLoans"] });
			setActionDialog({ open: false, action: null, loan: null });
		},
	});

	const rejectMutation = useMutation({
		mutationFn: (loanId: number) => rejectLoan(tenantId, loanId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["appliedLoans"] });
			setActionDialog({ open: false, action: null, loan: null });
		},
	});

	const loans = loansQuery.data?.pageItems || [];
	const totalRecords = loansQuery.data?.totalFilteredRecords || 0;
	const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
	const currentPage = Math.floor(pagination.offset / ITEMS_PER_PAGE) + 1;

	// Check if user has permission to approve loans
	const canApproveLoans =
		permissionsQuery.data?.some(
			(permission) =>
				permission.actionName === "APPROVE_LOAN" ||
				permission.actionName === "APPROVE" ||
				permission.entityName === "LOAN",
		) || false;

	// Calculate summary statistics
	const summaryStats = useMemo(() => {
		const stats = {
			total: totalRecords,
			pending: loans.filter((loan) => loan.status?.pendingApproval).length,
			active: loans.filter((loan) => loan.status?.active).length,
			approved: loans.filter(
				(loan) =>
					!loan.status?.pendingApproval &&
					!loan.status?.active &&
					!loan.status?.closed,
			).length, // Rough approximation
		};
		return stats;
	}, [loans, totalRecords]);

	const handleFilterChange = (
		key: keyof typeof filters,
		value: string | number | undefined,
	) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setPagination((prev) => ({ ...prev, offset: 0 })); // Reset to first page
	};

	const handlePageChange = (page: number) => {
		const newOffset = (page - 1) * ITEMS_PER_PAGE;
		setPagination((prev) => ({ ...prev, offset: newOffset }));
	};

	const handleAction = (loan: LoanListItem, action: "approve" | "reject") => {
		setActionDialog({ open: true, action, loan });
	};

	const handleConfirmAction = () => {
		if (!actionDialog.loan || !actionDialog.action) return;

		if (actionDialog.action === "approve") {
			approveMutation.mutate(actionDialog.loan.id || 0);
		} else {
			rejectMutation.mutate(actionDialog.loan.id || 0);
		}
	};

	const loanColumns = [
		{
			header: "Account No",
			cell: (loan: LoanListItem) => (
				<div className="font-mono font-medium">{loan.accountNo || "—"}</div>
			),
			sortable: true,
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
			header: "Product",
			cell: (loan: LoanListItem) => (
				<span className={loan.loanProductName ? "" : "text-muted-foreground"}>
					{loan.loanProductName || "—"}
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
				const statusInfo = getStatusDisplay(loan.status);
				return (
					<Badge variant={statusInfo.variant} className="text-xs px-2 py-0.5">
						{statusInfo.label}
					</Badge>
				);
			},
		},
		{
			header: "Submitted",
			cell: (loan: LoanListItem) => (
				<span className="text-sm text-muted-foreground">
					{formatDate(loan.timeline?.submittedOnDate)}
				</span>
			),
			sortable: true,
		},
		{
			header: "Actions",
			cell: (loan: LoanListItem) => {
				const canApprove = loan.status?.pendingApproval && canApproveLoans;

				return (
					<div className="flex items-center gap-2">
						<Button asChild variant="outline" size="sm">
							<Link href={`/config/operations/loans/${loan.id}`}>
								<Eye className="h-4 w-4 mr-1" />
								View
							</Link>
						</Button>

						{canApprove ? (
							<>
								<Button
									size="sm"
									variant="default"
									onClick={() => handleAction(loan, "approve")}
									disabled={approveMutation.isPending}
								>
									<CheckCircle className="h-4 w-4 mr-1" />
									Approve
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => handleAction(loan, "reject")}
									disabled={rejectMutation.isPending}
								>
									<XCircle className="h-4 w-4 mr-1" />
									Reject
								</Button>
							</>
						) : loan.status?.pendingApproval ? (
							<span className="text-sm text-muted-foreground">
								No approval rights
							</span>
						) : null}
					</div>
				);
			},
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<PageShell
			title="Applied Loans"
			subtitle="Manage and review all loan applications across the platform"
		>
			<div className="space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<FileText className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{summaryStats.total}</div>
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
									<Clock className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{summaryStats.pending}
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
									<CheckCircle className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{summaryStats.approved}
									</div>
									<div className="text-sm text-muted-foreground">
										Recently Approved
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-500/10">
									<Banknote className="h-5 w-5 text-blue-500" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{summaryStats.active}
									</div>
									<div className="text-sm text-muted-foreground">
										Active Loans
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							Filter loans by status, client, or account number
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label htmlFor="status-filter">Status</Label>
								<Select
									value={filters.status}
									onValueChange={(value) => handleFilterChange("status", value)}
								>
									<SelectTrigger id="status-filter">
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										{statusOptions
											.filter((option) => option.value !== "")
											.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="client-filter">Client Name</Label>
								<Input
									id="client-filter"
									placeholder="Search by client name"
									value={clientSearch}
									onChange={(e) => setClientSearch(e.target.value)}
								/>
								{clientSearch && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setClientSearch("")}
										className="text-xs"
									>
										Clear client search
									</Button>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="account-filter">Account Number</Label>
								<Input
									id="account-filter"
									placeholder="Filter by account number"
									value={filters.accountNo}
									onChange={(e) =>
										handleFilterChange("accountNo", e.target.value)
									}
								/>
							</div>

							<div className="space-y-2">
								<Label>Actions</Label>
								<Button
									variant="outline"
									onClick={() => {
										setFilters({
											status: "",
											clientId: undefined,
											accountNo: "",
										});
										setClientSearch("");
										setPagination((prev) => ({ ...prev, offset: 0 }));
									}}
									className="w-full"
								>
									Clear All Filters
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Loans Table */}
				<Card>
					<CardHeader>
						<CardTitle>Loan Applications</CardTitle>
						<CardDescription>
							{loansQuery.isLoading
								? "Loading loans..."
								: `${totalRecords} loan${totalRecords !== 1 ? "s" : ""} found`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{loansQuery.isLoading && (
							<div className="py-6 text-center text-muted-foreground">
								Loading loan applications...
							</div>
						)}

						{loansQuery.error && (
							<Alert variant="destructive">
								<AlertTitle>Failed to load loans</AlertTitle>
								<AlertDescription>
									Unable to fetch loan applications. Please try again.
								</AlertDescription>
							</Alert>
						)}

						{!loansQuery.isLoading &&
							!loansQuery.error &&
							loans.length === 0 && (
								<div className="py-6 text-center text-muted-foreground">
									No loan applications found matching your criteria.
								</div>
							)}

						{!loansQuery.isLoading && !loansQuery.error && loans.length > 0 && (
							<>
								<DataTable
									data={loans}
									columns={loanColumns}
									getRowId={(loan) =>
										String(loan.id ?? loan.accountNo ?? "loan-row")
									}
								/>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="flex items-center justify-between px-2 py-4">
										<div className="text-sm text-muted-foreground">
											Showing {pagination.offset + 1} to{" "}
											{Math.min(
												pagination.offset + ITEMS_PER_PAGE,
												totalRecords,
											)}{" "}
											of {totalRecords} loans
										</div>
										<div className="flex items-center space-x-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handlePageChange(currentPage - 1)}
												disabled={currentPage === 1}
											>
												Previous
											</Button>

											{/* Page numbers */}
											{Array.from(
												{ length: Math.min(5, totalPages) },
												(_, i) => {
													const pageNumber = Math.max(1, currentPage - 2) + i;
													if (pageNumber > totalPages) return null;

													return (
														<Button
															key={pageNumber}
															variant={
																pageNumber === currentPage
																	? "default"
																	: "outline"
															}
															size="sm"
															onClick={() => handlePageChange(pageNumber)}
														>
															{pageNumber}
														</Button>
													);
												},
											)}

											<Button
												variant="outline"
												size="sm"
												onClick={() => handlePageChange(currentPage + 1)}
												disabled={currentPage === totalPages}
											>
												Next
											</Button>
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Action Confirmation Dialog */}
			<Dialog
				open={actionDialog.open}
				onOpenChange={(open) =>
					setActionDialog({ open, action: null, loan: null })
				}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{actionDialog.action === "approve" ? "Approve" : "Reject"} Loan
							Application
						</DialogTitle>
						<DialogDescription>
							{actionDialog.loan && (
								<>
									Are you sure you want to {actionDialog.action} the loan
									application for{" "}
									<strong>{actionDialog.loan.clientName}</strong> (
									{actionDialog.loan.accountNo})?
									{actionDialog.action === "reject" &&
										" This action cannot be undone."}
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() =>
								setActionDialog({ open: false, action: null, loan: null })
							}
							disabled={approveMutation.isPending || rejectMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant={
								actionDialog.action === "reject" ? "destructive" : "default"
							}
							onClick={handleConfirmAction}
							disabled={approveMutation.isPending || rejectMutation.isPending}
						>
							{approveMutation.isPending || rejectMutation.isPending
								? "Processing..."
								: actionDialog.action === "approve"
									? "Approve Loan"
									: "Reject Loan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Success/Error Messages */}
			{(approveMutation.isError || rejectMutation.isError) && (
				<div className="fixed bottom-6 right-6 z-50 w-[320px]">
					<Alert variant="destructive">
						<AlertTitle>Action Failed</AlertTitle>
						<AlertDescription>
							{((approveMutation.error || rejectMutation.error) as Error)
								?.message ||
								"Failed to process loan application. Please try again."}
						</AlertDescription>
					</Alert>
				</div>
			)}
		</PageShell>
	);
}
