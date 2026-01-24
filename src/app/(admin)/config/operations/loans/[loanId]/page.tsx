"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	Banknote,
	CheckCircle,
	DollarSign,
	FileText,
	History,
	Package,
	Percent,
	Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { AuditTrailViewer } from "@/components/loans/audit-trail-viewer";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";
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

	// Transactions query (lazy load when tab is active)
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
		enabled: !!loanId && activeTab === "transactions",
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

	const loan = loanQuery.data;
	const summary = loan?.summary;
	const currency = loan?.currency?.displaySymbol || "KES";
	const availableActions = getAvailableActions(loan);

	const handleCommandSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
		queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
	};

	// Calculate total outstanding
	const totalOutstanding =
		(summary?.principalOutstanding || 0) +
		(summary?.interestOutstanding || 0) +
		(summary?.feeChargesOutstanding || 0) +
		(summary?.penaltyChargesOutstanding || 0);

	if (loanQuery.isLoading) {
		return (
			<PageShell title="Loan Details" subtitle="Loading loan information...">
				<LoadingState />
			</PageShell>
		);
	}

	const backButton = (
		<Button variant="outline" onClick={() => router.back()}>
			<ArrowLeft className="w-4 h-4 mr-2" />
			Back to Loans
		</Button>
	);

	if (loanQuery.error || !loan) {
		return (
			<PageShell
				title="Loan Details"
				subtitle="Error loading loan"
				actions={backButton}
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
			actions={backButton}
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
						label="Fees"
						value={summary?.feeChargesOutstanding}
						currency={currency}
						breakdown={{
							charged: summary?.feeChargesCharged,
							paid: summary?.feeChargesPaid,
							waived: summary?.feeChargesWaived,
							writtenOff: summary?.feeChargesWrittenOff,
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
								/>
							)}
						</TabsContent>

						<TabsContent value="charges">
							<LoanChargesTab
								charges={loan.charges}
								currency={currency}
								feesOutstanding={summary?.feeChargesOutstanding}
								penaltiesOutstanding={summary?.penaltyChargesOutstanding}
							/>
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
				loanId={parseInt(loanId)}
				onSuccess={handleCommandSuccess}
			/>
		</PageShell>
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
