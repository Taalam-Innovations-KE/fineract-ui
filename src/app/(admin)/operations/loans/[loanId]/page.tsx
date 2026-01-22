"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	FileText,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { AuditTrailViewer } from "@/components/loans/audit-trail-viewer";
import { LoanCommandDialog } from "@/components/loans/loan-command-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetLoansLoanIdResponse,
	GetLoansLoanIdStatus,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

interface LoanDetailPageProps {
	params: Promise<{ loanId: string }>;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | undefined) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function getStatusColor(status: GetLoansLoanIdStatus | undefined) {
	if (status?.pendingApproval) return "bg-yellow-100 text-yellow-800";
	if (status?.waitingForDisbursal) return "bg-blue-100 text-blue-800";
	if (status?.active) return "bg-green-100 text-green-800";
	if (status?.closed) return "bg-gray-100 text-gray-800";
	return "bg-gray-100 text-gray-800";
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

	const auditTrailQuery = useQuery({
		queryKey: ["loanAudit", loanId],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.loanAudit}/${loanId}`, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch audit trail");
			const data = await response.json();
			// Handle different response structures - might be an array or wrapped in an object
			return Array.isArray(data) ? data : data.events || [];
		},
		enabled: !!loanId,
	});

	const loan = loanQuery.data;
	const availableActions = getAvailableActions(loan);

	const handleCommandSuccess = () => {
		queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
		queryClient.invalidateQueries({ queryKey: ["loans", tenantId] });
	};

	if (loanQuery.isLoading) {
		return (
			<PageShell title="Loan Details" subtitle="Loading loan information...">
				<div className="animate-pulse space-y-4">
					<div className="h-32 bg-gray-200 rounded"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</PageShell>
		);
	}

	if (loanQuery.error || !loan) {
		return (
			<PageShell title="Loan Details" subtitle="Error loading loan">
				<Card>
					<CardContent className="pt-6">
						<p className="text-red-600">
							{loanQuery.error?.message || "Loan not found"}
						</p>
						<Button
							variant="outline"
							onClick={() => router.back()}
							className="mt-4"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Loans
						</Button>
					</CardContent>
				</Card>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Loan ${loan.accountNo || loanId}`}
			subtitle={`Client: ${loan.clientName || "Unknown"}`}
		>
			<div className="space-y-6">
				{/* Back Button */}
				<Button
					variant="outline"
					onClick={() => router.back()}
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Loans
				</Button>

				{/* Loan Summary */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<FileText className="w-5 h-5" />
									Loan Summary
								</CardTitle>
								<CardDescription>
									Key details and current status
								</CardDescription>
							</div>
							<Badge className={getStatusColor(loan.status)}>
								{loan.status?.code || "Unknown"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="flex items-center gap-2">
							<DollarSign className="w-4 h-4 text-green-600" />
							<div>
								<p className="text-sm font-medium">Principal</p>
								<p className="text-lg">{formatCurrency(loan.principal)}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4 text-blue-600" />
							<div>
								<p className="text-sm font-medium">Term</p>
								<p className="text-lg">{loan.termFrequency || 0} months</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<User className="w-4 h-4 text-purple-600" />
							<div>
								<p className="text-sm font-medium">Client</p>
								<p className="text-lg">{loan.clientName || "Unknown"}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-orange-600" />
							<div>
								<p className="text-sm font-medium">Submitted</p>
								<p className="text-lg">
									{formatDate(loan.timeline?.submittedOnDate)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				{availableActions.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Available Actions</CardTitle>
							<CardDescription>
								Perform actions based on the current loan status
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{availableActions.includes("approve") && (
									<Button
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

				{/* Repayment Schedule Placeholder */}
				<Card>
					<CardHeader>
						<CardTitle>Repayment Schedule</CardTitle>
						<CardDescription>Scheduled payments and due dates</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Repayment schedule will be displayed here.
						</p>
					</CardContent>
				</Card>

				{/* Transaction History Placeholder */}
				<Card>
					<CardHeader>
						<CardTitle>Transaction History</CardTitle>
						<CardDescription>All transactions and payments</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Transaction history will be displayed here.
						</p>
					</CardContent>
				</Card>

				{/* Audit Trail */}
				<AuditTrailViewer
					events={auditTrailQuery.data || []}
					isLoading={auditTrailQuery.isLoading}
					error={auditTrailQuery.error}
				/>
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
