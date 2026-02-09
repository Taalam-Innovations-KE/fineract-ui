"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	Banknote,
	CheckCircle,
	ChevronDown,
	DollarSign,
	Download,
	FileSpreadsheet,
	FileText,
	History,
	Info,
	Loader2,
	Package,
	Percent,
	Receipt,
	Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { AuditTrailViewer } from "@/components/loans/audit-trail-viewer";
import { PostRepaymentSheet } from "@/components/loans/dialogs/PostRepaymentSheet";
import { KpiCard, KpiCardSkeleton } from "@/components/loans/kpi-card";
import { LoanCommandDialog } from "@/components/loans/loan-command-dialog";
import { StatusChip } from "@/components/loans/status-chip";
import {
	LoanChargesTab,
	LoanChargesTabSkeleton,
	LoanCollateralTab,
	LoanCollateralTabSkeleton,
	LoanDocumentsTab,
	LoanDocumentsTabSkeleton,
	LoanGuarantorsTab,
	LoanGuarantorsTabSkeleton,
	LoanOverviewTab,
	LoanOverviewTabSkeleton,
	LoanScheduleTab,
	LoanScheduleTabSkeleton,
	LoanTransactionsTab,
	LoanTransactionsTabSkeleton,
} from "@/components/loans/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";
import { getDisbursementSummary } from "@/lib/fineract/loan-disbursement-utils";
import { useTenantStore } from "@/store/tenant";

interface LoanDetailPageProps {
	params: Promise<{ loanId: string }>;
}

type TabValue =
	| "overview"
	| "schedule"
	| "transactions"
	| "charges"
	| "collateral"
	| "guarantors"
	| "documents"
	| "audit";

type LoanDownloadType = "schedule" | "statement";
type LoanDownloadFormat = "pdf" | "xlsx" | "csv";

const LOAN_REPORT_NAMES: Record<LoanDownloadType, string> = {
	schedule:
		process.env.NEXT_PUBLIC_LOAN_SCHEDULE_REPORT_NAME ||
		"Loan Repayment Schedule",
	statement:
		process.env.NEXT_PUBLIC_LOAN_STATEMENT_REPORT_NAME ||
		"Loan Transaction Statement",
};

function getOutputType(format: LoanDownloadFormat): "PDF" | "XLSX" | "CSV" {
	if (format === "pdf") return "PDF";
	if (format === "xlsx") return "XLSX";
	return "CSV";
}

function getAvailableActions(loan: GetLoansLoanIdResponse | undefined) {
	if (!loan?.status) return [];

	const status = loan.status;

	if (status.pendingApproval) return ["approve", "reject"];
	if (status.waitingForDisbursal) return ["disburse", "undoApproval"];
	if (status.active) return ["addRepayment", "writeOff"];
	return [];
}

export default function LoanDetailPage({ params }: LoanDetailPageProps) {
	const [loanId, setLoanId] = useState<string>("");
	const [activeTab, setActiveTab] = useState<TabValue>("overview");

	useEffect(() => {
		params.then((resolvedParams) => {
			setLoanId(resolvedParams.loanId);
		});
	}, [params]);

	const { tenantId } = useTenantStore();
	const router = useRouter();
	const queryClient = useQueryClient();

	const [commandDialog, setCommandDialog] = useState<{
		open: boolean;
		type: "approve" | "disburse" | "reject" | "withdraw";
	}>({ open: false, type: "approve" });
	const [repaymentSheetOpen, setRepaymentSheetOpen] = useState(false);

	const [isDownloading, setIsDownloading] = useState(false);

	// Base loan query (no associations for fast initial load)
	const loanQuery = useQuery({
		queryKey: ["loan", loanId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.loans}/${loanId}`, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch loan details");
			return response.json() as Promise<GetLoansLoanIdResponse>;
		},
		enabled: !!loanId,
	});

	// Schedule query (lazy load when tab is active)
	const scheduleQuery = useQuery({
		queryKey: ["loan", loanId, "schedule"],
		queryFn: async () => {
			const response = await fetch(
				`${BFF_ROUTES.loans}/${loanId}?associations=repaymentSchedule`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) throw new Error("Failed to fetch schedule");
			return response.json() as Promise<GetLoansLoanIdResponse>;
		},
		enabled: !!loanId && activeTab === "schedule",
	});

	// Transactions query (load for overview, transactions, and charges tabs for disbursement/fee summary)
	const transactionsQuery = useQuery({
		queryKey: ["loan", loanId, "transactions"],
		queryFn: async () => {
			const response = await fetch(
				`${BFF_ROUTES.loans}/${loanId}?associations=transactions`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) throw new Error("Failed to fetch transactions");
			return response.json() as Promise<GetLoansLoanIdResponse>;
		},
		enabled:
			!!loanId &&
			(activeTab === "transactions" ||
				activeTab === "overview" ||
				activeTab === "charges"),
	});

	// Audit trail query
	const auditTrailQuery = useQuery({
		queryKey: ["loanAudit", loanId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.loanAudit}/${loanId}`, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch audit trail");
			const data = await response.json();
			return Array.isArray(data) ? data : data.events || [];
		},
		enabled: !!loanId && activeTab === "audit",
	});

	// Charges query (lazy load when tab is active)
	const chargesQuery = useQuery({
		queryKey: ["loan", loanId, "charges"],
		queryFn: async () => {
			const response = await fetch(
				`${BFF_ROUTES.loans}/${loanId}?associations=charges`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) throw new Error("Failed to fetch charges");
			return response.json() as Promise<GetLoansLoanIdResponse>;
		},
		enabled: !!loanId && activeTab === "charges",
	});

	const loan = loanQuery.data;
	const summary = loan?.summary;
	const currency = loan?.currency?.displaySymbol || "KES";
	const availableActions = getAvailableActions(loan);

	const handleCommandSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
		queryClient.invalidateQueries({
			queryKey: ["loan", loanId, "transactions"],
		});
		queryClient.invalidateQueries({ queryKey: ["loan", loanId, "schedule"] });
		queryClient.invalidateQueries({ queryKey: ["loan", loanId, "charges"] });
		queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
	};

	const handleDownloadExport = async (
		exportType: LoanDownloadType,
		format: LoanDownloadFormat,
	) => {
		if (!loan) return;

		setIsDownloading(true);
		try {
			const reportName = LOAN_REPORT_NAMES[exportType];
			const params = new URLSearchParams({
				"output-type": getOutputType(format),
				R_loanId: loanId,
			});

			if (format === "csv") {
				params.set("exportCSV", "true");
			}

			const url = `${BFF_ROUTES.runReport(reportName)}?${params.toString()}`;

			const response = await fetch(url, {
				headers: { "fineract-platform-tenantid": tenantId },
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.message || error.error || "Failed to download report",
				);
			}

			// Get the blob and download
			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = downloadUrl;
			a.download = `Loan_${loan.accountNo || loanId}_${exportType}_${new Date().toISOString().split("T")[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(downloadUrl);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Download failed:", error);
			// Could add toast notification here
		} finally {
			setIsDownloading(false);
		}
	};

	// Calculate total outstanding
	const totalOutstanding =
		(summary?.principalOutstanding || 0) +
		(summary?.interestOutstanding || 0) +
		(summary?.feeChargesOutstanding || 0) +
		(summary?.penaltyChargesOutstanding || 0);

	// Calculate disbursement summary (using transactions if available)
	const disbursementSummary = getDisbursementSummary(
		loan,
		transactionsQuery.data?.transactions,
	);

	// Check if loan is disbursed
	const isDisbursed =
		loan?.status?.active || loan?.status?.closedObligationsMet;

	if (loanQuery.isLoading) {
		return (
			<PageShell title="Loan Details" subtitle="Loading loan information...">
				<LoadingState />
			</PageShell>
		);
	}

	const headerActions = (
		<div className="flex items-center gap-2">
			{/* Download Statement Dropdown */}
			{isDisbursed && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" disabled={isDownloading}>
							{isDownloading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<Download className="w-4 h-4 mr-2" />
							)}
							Download
							<ChevronDown className="w-4 h-4 ml-2" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel>Loan Schedule</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("schedule", "pdf")}
						>
							<FileText className="w-4 h-4 mr-2" />
							Download as PDF
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("schedule", "xlsx")}
						>
							<FileSpreadsheet className="w-4 h-4 mr-2" />
							Download as Excel
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("schedule", "csv")}
						>
							<FileText className="w-4 h-4 mr-2" />
							Download as CSV
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>Transaction Statement</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("statement", "pdf")}
						>
							<FileText className="w-4 h-4 mr-2" />
							Download as PDF
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("statement", "xlsx")}
						>
							<FileSpreadsheet className="w-4 h-4 mr-2" />
							Download as Excel
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDownloadExport("statement", "csv")}
						>
							<FileText className="w-4 h-4 mr-2" />
							Download as CSV
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			<Button variant="outline" onClick={() => router.back()}>
				<ArrowLeft className="w-4 h-4 mr-2" />
				Back to Loans
			</Button>
		</div>
	);

	if (loanQuery.error || !loan) {
		return (
			<PageShell
				title="Loan Details"
				subtitle="Error loading loan"
				actions={headerActions}
			>
				<Card>
					<CardContent className="pt-6">
						<p className="text-red-600">
							{loanQuery.error?.message || "Loan not found"}
						</p>
					</CardContent>
				</Card>
			</PageShell>
		);
	}

	const numericLoanId = Number.parseInt(loanId, 10);

	return (
		<PageShell
			title={
				<div className="flex items-center gap-3">
					<span>Loan {loan.accountNo || loanId}</span>
					<StatusChip status={loan.status} />
				</div>
			}
			subtitle={
				<div className="flex items-center gap-2 text-muted-foreground">
					<span>{loan.clientName || "Unknown Client"}</span>
					<span className="text-muted-foreground/50">|</span>
					<span>{loan.loanProductName || "Unknown Product"}</span>
				</div>
			}
			actions={headerActions}
		>
			<div className="space-y-6">
				{/* KPI Strip */}
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					<KpiCard
						label="Total Outstanding"
						value={totalOutstanding}
						currency={currency}
						icon={Banknote}
						variant={totalOutstanding > 0 ? "warning" : "success"}
						breakdown={{
							charged: summary?.totalExpectedRepayment,
							paid: summary?.totalRepayment,
							waived: summary?.totalWaived,
							writtenOff: summary?.totalWrittenOff,
						}}
					/>
					<KpiCard
						label="Principal"
						value={summary?.principalOutstanding}
						currency={currency}
						icon={DollarSign}
						breakdown={{
							charged: summary?.principalDisbursed,
							paid: summary?.principalPaid,
							writtenOff: summary?.principalWrittenOff,
						}}
					/>
					<KpiCard
						label="Interest"
						value={summary?.interestOutstanding}
						currency={currency}
						icon={Percent}
						breakdown={{
							charged: summary?.interestCharged,
							paid: summary?.interestPaid,
							waived: summary?.interestWaived,
							writtenOff: summary?.interestWrittenOff,
						}}
					/>
					<KpiCard
						label="Fees Charged"
						value={summary?.feeChargesCharged}
						currency={currency}
						icon={Receipt}
						variant={
							(summary?.feeChargesOutstanding || 0) > 0
								? "warning"
								: (summary?.feeChargesCharged || 0) > 0
									? "success"
									: "default"
						}
						breakdown={{
							charged: summary?.feeChargesCharged,
							paid: summary?.feeChargesPaid,
							waived: summary?.feeChargesWaived,
							writtenOff: summary?.feeChargesWrittenOff,
							outstanding: summary?.feeChargesOutstanding,
						}}
					/>
					<KpiCard
						label="Penalties"
						value={summary?.penaltyChargesOutstanding}
						currency={currency}
						variant={
							(summary?.penaltyChargesOutstanding || 0) > 0
								? "danger"
								: "default"
						}
						breakdown={{
							charged: summary?.penaltyChargesCharged,
							paid: summary?.penaltyChargesPaid,
							waived: summary?.penaltyChargesWaived,
							writtenOff: summary?.penaltyChargesWrittenOff,
						}}
					/>
					<KpiCard
						label="Arrears"
						value={summary?.totalOverdue}
						currency={currency}
						icon={AlertTriangle}
						variant={(summary?.totalOverdue || 0) > 0 ? "danger" : "success"}
					/>
				</div>

				{/* Disbursement Summary Card */}
				{isDisbursed && (
					<DisbursementSummaryCard
						summary={disbursementSummary}
						currency={currency}
						isLoading={transactionsQuery.isLoading}
					/>
				)}

				{/* Actions Card */}
				{availableActions.length > 0 && (
					<Card>
						<CardContent className="py-3">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm text-muted-foreground mr-2">
									Actions:
								</span>
								{availableActions.includes("approve") && (
									<Button
										size="sm"
										onClick={() =>
											setCommandDialog({ open: true, type: "approve" })
										}
									>
										<CheckCircle className="w-4 h-4 mr-2" />
										Approve
									</Button>
								)}
								{availableActions.includes("disburse") && (
									<Button
										size="sm"
										onClick={() =>
											setCommandDialog({ open: true, type: "disburse" })
										}
									>
										<DollarSign className="w-4 h-4 mr-2" />
										Disburse
									</Button>
								)}
								{availableActions.includes("reject") && (
									<Button
										size="sm"
										variant="destructive"
										onClick={() =>
											setCommandDialog({ open: true, type: "reject" })
										}
									>
										Reject
									</Button>
								)}
								{availableActions.includes("addRepayment") && (
									<Button size="sm" onClick={() => setRepaymentSheetOpen(true)}>
										<Banknote className="w-4 h-4 mr-2" />
										Post Repayment
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Tabs */}
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as TabValue)}
				>
					<TabsList variant="line" className="w-full justify-start border-b">
						<TabsTrigger value="overview">
							<FileText className="w-4 h-4 mr-1.5" />
							Overview
						</TabsTrigger>
						<TabsTrigger value="schedule">
							<History className="w-4 h-4 mr-1.5" />
							Schedule
						</TabsTrigger>
						<TabsTrigger value="transactions">
							<DollarSign className="w-4 h-4 mr-1.5" />
							Transactions
						</TabsTrigger>
						<TabsTrigger value="charges">
							<Percent className="w-4 h-4 mr-1.5" />
							Charges
							{loan.charges && loan.charges.length > 0 && (
								<Badge variant="secondary" className="ml-1.5 text-xs">
									{loan.charges.length}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="collateral">
							<Package className="w-4 h-4 mr-1.5" />
							Collateral
						</TabsTrigger>
						<TabsTrigger value="guarantors">
							<Shield className="w-4 h-4 mr-1.5" />
							Guarantors
						</TabsTrigger>
						<TabsTrigger value="documents">
							<FileText className="w-4 h-4 mr-1.5" />
							Documents
						</TabsTrigger>
						<TabsTrigger value="audit">
							<History className="w-4 h-4 mr-1.5" />
							Audit
						</TabsTrigger>
					</TabsList>

					<div className="mt-4">
						<TabsContent value="overview">
							<LoanOverviewTab loan={loan} />
						</TabsContent>

						<TabsContent value="schedule">
							{scheduleQuery.isLoading ? (
								<LoanScheduleTabSkeleton />
							) : (
								<LoanScheduleTab
									schedule={scheduleQuery.data?.repaymentSchedule}
									currency={currency}
								/>
							)}
						</TabsContent>

						<TabsContent value="transactions">
							{transactionsQuery.isLoading ? (
								<LoanTransactionsTabSkeleton />
							) : (
								<LoanTransactionsTab
									transactions={transactionsQuery.data?.transactions}
									currency={currency}
									loan={loan}
								/>
							)}
						</TabsContent>

						<TabsContent value="charges">
							{chargesQuery.isLoading ? (
								<LoanChargesTabSkeleton />
							) : (
								<LoanChargesTab
									charges={chargesQuery.data?.charges ?? loan.charges}
									currency={currency}
									feesOutstanding={summary?.feeChargesOutstanding}
									penaltiesOutstanding={summary?.penaltyChargesOutstanding}
									loan={loan}
									transactions={transactionsQuery.data?.transactions}
								/>
							)}
						</TabsContent>

						<TabsContent value="collateral">
							<LoanCollateralTab
								loanId={parseInt(loanId)}
								currency={currency}
							/>
						</TabsContent>

						<TabsContent value="guarantors">
							<LoanGuarantorsTab
								loanId={parseInt(loanId)}
								currency={currency}
							/>
						</TabsContent>

						<TabsContent value="documents">
							<LoanDocumentsTab loanId={parseInt(loanId)} />
						</TabsContent>

						<TabsContent value="audit">
							<AuditTrailViewer
								events={auditTrailQuery.data || []}
								isLoading={auditTrailQuery.isLoading}
								error={auditTrailQuery.error}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</div>

			{/* Command Dialog */}
			<LoanCommandDialog
				open={commandDialog.open}
				onOpenChange={(open) => setCommandDialog({ ...commandDialog, open })}
				commandType={commandDialog.type}
				loanId={numericLoanId}
				onSuccess={handleCommandSuccess}
			/>
			<PostRepaymentSheet
				open={repaymentSheetOpen}
				onOpenChange={setRepaymentSheetOpen}
				loanId={numericLoanId}
				currency={currency}
				onSuccess={handleCommandSuccess}
			/>
		</PageShell>
	);
}

function formatDateArray(dateInput: string | number[] | undefined): string {
	if (!dateInput) return "—";
	if (Array.isArray(dateInput)) {
		const [year, month, day] = dateInput;
		return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}
	return new Date(dateInput).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatMoney(
	amount: number | undefined,
	currency: string = "KES",
): string {
	if (amount === undefined || amount === null) return "—";
	return `${currency} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

interface DisbursementSummaryCardProps {
	summary: ReturnType<typeof getDisbursementSummary>;
	currency: string;
	isLoading?: boolean;
}

function DisbursementSummaryCard({
	summary,
	currency,
	isLoading,
}: DisbursementSummaryCardProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						{[1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="space-y-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-6 w-28" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!summary) return null;

	return (
		<Card className="border-l-4 border-l-blue-500">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<CardTitle className="text-base">Disbursement Summary</CardTitle>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-4 w-4 text-muted-foreground cursor-help" />
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="text-sm">
									Net amount paid to customer after upfront fees were deducted
									at disbursement.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					{summary.hasNetOff && (
						<Badge variant="outline" className="text-xs bg-blue-50">
							Fees Net-off Applied
						</Badge>
					)}
				</div>
				<CardDescription>
					Breakdown of disbursement payout to client
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
					{/* Approved Principal */}
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							Approved Amount
						</p>
						<p className="text-sm font-medium font-mono">
							{formatMoney(summary.approvedPrincipal, currency)}
						</p>
					</div>

					{/* Upfront Fees Deducted */}
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							Upfront Fees Deducted
						</p>
						<p className="text-sm font-medium font-mono text-orange-600">
							{summary.upfrontFeesDeducted > 0
								? `- ${formatMoney(summary.upfrontFeesDeducted, currency)}`
								: formatMoney(0, currency)}
						</p>
					</div>

					{/* Net Amount Paid - Emphasized */}
					<div className="space-y-1 bg-green-50 -m-2 p-2 rounded-md">
						<p className="text-xs text-green-700 uppercase tracking-wide font-medium">
							Net Paid to Client
						</p>
						<p className="text-lg font-bold font-mono text-green-700">
							{formatMoney(summary.netPaidToClient, currency)}
						</p>
					</div>

					{/* Disbursement Date */}
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							Disbursement Date
						</p>
						<p className="text-sm font-medium">
							{formatDateArray(summary.disbursementDate)}
						</p>
					</div>

					{/* Payment Method */}
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground uppercase tracking-wide">
							Payment Method
						</p>
						<p className="text-sm font-medium">
							{summary.paymentMethod || "Not specified"}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingState() {
	return (
		<div className="space-y-6">
			{/* KPI Strip Skeleton */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<KpiCardSkeleton key={i} />
				))}
			</div>

			{/* Tabs Skeleton */}
			<div className="space-y-4">
				<div className="flex gap-2 border-b pb-2">
					{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
						<Skeleton key={i} className="h-8 w-24" />
					))}
				</div>
				<LoanOverviewTabSkeleton />
			</div>
		</div>
	);
}
