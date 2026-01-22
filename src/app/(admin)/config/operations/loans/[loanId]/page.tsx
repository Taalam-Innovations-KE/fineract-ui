"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

function formatCurrency(amount: number | undefined, code = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${code} ${amount.toLocaleString()}`;
}

async function fetchLoan(tenantId: string, loanId: string) {
	const response = await fetch(`${BFF_ROUTES.loans}/${loanId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan details");
	}

	return response.json() as Promise<GetLoansLoanIdResponse>;
}

export default function LoanDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const loanId = params.loanId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["loan", tenantId, loanId],
		queryFn: () => fetchLoan(tenantId, loanId),
		enabled: Boolean(tenantId) && Boolean(loanId),
	});

	const statusLabel =
		data?.status?.description || data?.status?.code || "Unknown";
	let statusVariant:
		| "default"
		| "secondary"
		| "success"
		| "warning"
		| "destructive" = "secondary";
	if (statusLabel.toLowerCase().includes("active")) statusVariant = "success";
	else if (statusLabel.toLowerCase().includes("pending"))
		statusVariant = "warning";
	else if (
		statusLabel.toLowerCase().includes("closed") ||
		statusLabel.toLowerCase().includes("rejected")
	)
		statusVariant = "destructive";

	return (
		<PageShell
			title="Loan Details"
			subtitle="Inspect submitted loan information"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/operations/loans">Back to Loans</Link>
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Loan Overview</CardTitle>
					<CardDescription>Read-only view of the loan profile.</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading loan details...
						</div>
					)}
					{error && (
						<div className="py-6 text-center text-destructive">
							Failed to load loan details. Please try again.
						</div>
					)}
					{!isLoading && !error && data && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Account
								</div>
								<div className="text-lg font-semibold">
									{data.accountNo || "—"}
								</div>
								<div className="text-sm text-muted-foreground">
									{data.loanProductName || "Loan Product"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Status
								</div>
								<Badge variant={statusVariant}>{statusLabel}</Badge>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Client
								</div>
								<div className="text-sm">{data.clientName || "—"}</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Principal
								</div>
								<div className="text-sm font-mono">
									{formatCurrency(data.principal, data.currency?.displaySymbol)}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Repayments
								</div>
								<div className="text-sm">
									{data.numberOfRepayments || "—"} repayments every{" "}
									{data.repaymentEvery || "—"}{" "}
									{data.repaymentFrequencyType?.description ||
										data.repaymentFrequencyType?.code ||
										"period"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Interest Rate
								</div>
								<div className="text-sm">
									{data.interestRatePerPeriod ?? "—"}% per{" "}
									{data.interestRateFrequencyType?.description ||
										data.interestRateFrequencyType?.code ||
										"period"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Expected Disbursement
								</div>
								<div className="text-sm">
									{data.timeline?.expectedDisbursementDate || "—"}
								</div>
							</div>
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Submitted On
								</div>
								<div className="text-sm">
									{data.timeline?.submittedOnDate || "—"}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
