"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/config/page-shell";
import { LoanCharges } from "@/components/sections/LoanCharges";
import { LoanFinancialDetails } from "@/components/sections/LoanFinancialDetails";
import { LoanOverview } from "@/components/sections/LoanOverview";
import { LoanTerms } from "@/components/sections/LoanTerms";
import { LoanTimeline } from "@/components/sections/LoanTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

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

	const formatCurrency = (amount: number | undefined, symbol?: string) => {
		if (amount === undefined || amount === null) return "—";
		return `${symbol || "KES"} ${amount.toLocaleString()}`;
	};

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
				<>
					<Tabs defaultValue="overview" className="w-full">
						<TabsList className="grid w-full grid-cols-5 rounded-none">
							<TabsTrigger
								value="overview"
								className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								Overview
							</TabsTrigger>
							<TabsTrigger
								value="financial"
								className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								Financial Details
							</TabsTrigger>
							<TabsTrigger
								value="timeline"
								className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								Timeline
							</TabsTrigger>
							<TabsTrigger
								value="terms"
								className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								Terms & Schedule
							</TabsTrigger>
							<TabsTrigger
								value="charges"
								className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
							>
								Charges & Fees
							</TabsTrigger>
						</TabsList>

						<TabsContent value="overview" className="mt-6">
							<LoanOverview data={data} />
						</TabsContent>

						<TabsContent value="financial" className="mt-6">
							<LoanFinancialDetails
								data={data}
								formatCurrency={formatCurrency}
							/>
						</TabsContent>

						<TabsContent value="timeline" className="mt-6">
							<LoanTimeline data={data} />
						</TabsContent>

						<TabsContent value="terms" className="mt-6">
							<LoanTerms data={data} />
						</TabsContent>

						<TabsContent value="charges" className="mt-6">
							<LoanCharges data={data} formatCurrency={formatCurrency} />
						</TabsContent>
					</Tabs>
				</>
			)}
		</PageShell>
	);
}
