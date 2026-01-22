"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { PageShell } from "@/components/config/page-shell";
import { LoanProductAccounting } from "@/components/sections/LoanProductAccounting";
import { LoanProductFees } from "@/components/sections/LoanProductFees";
import { LoanProductFinancialTerms } from "@/components/sections/LoanProductFinancialTerms";
import { LoanProductOverview } from "@/components/sections/LoanProductOverview";
import { LoanProductSchedule } from "@/components/sections/LoanProductSchedule";
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
import type {
	GetLoanProductsResponse,
	GetLoanProductsTemplateResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type OptionWithCodeValue = {
	code: string;
	value: string;
};

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

async function fetchLoanProduct(tenantId: string, productId: string) {
	const response = await fetch(`${BFF_ROUTES.loanProducts}/${productId}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan product details");
	}

	return response.json() as Promise<GetLoanProductsResponse>;
}

async function fetchLoanProductTemplate(tenantId: string) {
	const response = await fetch(`${BFF_ROUTES.loanProductTemplate}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch loan product template");
	}

	return response.json() as Promise<GetLoanProductsTemplateResponse>;
}

export default function LoanProductDetailsPage() {
	const { tenantId } = useTenantStore();
	const params = useParams();
	const productId = params.productId as string;

	const { data, isLoading, error } = useQuery({
		queryKey: ["loanProduct", tenantId, productId],
		queryFn: () => fetchLoanProduct(tenantId, productId),
		enabled: Boolean(tenantId) && Boolean(productId),
	});

	const { data: templateData } = useQuery({
		queryKey: ["loanProductTemplate", tenantId],
		queryFn: () => fetchLoanProductTemplate(tenantId),
		enabled: Boolean(tenantId),
	});

	const enumMap = useMemo(() => {
		if (!templateData) return {};
		const map: Record<string, string> = {};
		const optionsArrays = [
			templateData.accountingRuleOptions,
			templateData.amortizationTypeOptions,
			templateData.interestTypeOptions,
			templateData.interestCalculationPeriodTypeOptions,
			templateData.repaymentFrequencyTypeOptions,
			templateData.interestRateFrequencyTypeOptions,
			templateData.daysInMonthTypeOptions,
			templateData.daysInYearTypeOptions,
			templateData.chargeOffBehaviourOptions,
			templateData.repaymentStartDateTypeOptions,
		].filter(Boolean);
		optionsArrays.forEach((options) => {
			(options as OptionWithCodeValue[])?.forEach((option) => {
				if (option.code && option.value) {
					map[option.code] = option.value;
				}
			});
		});
		return map;
	}, [templateData]);

	return (
		<PageShell
			title="Loan Product Details"
			subtitle="Inspect loan product configuration"
			actions={
				<Button asChild variant="outline">
					<Link href="/config/products/loans">Back to Loan Products</Link>
				</Button>
			}
		>
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
						Financial Terms
					</TabsTrigger>
					<TabsTrigger
						value="schedule"
						className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
					>
						Schedule & Repayments
					</TabsTrigger>
					<TabsTrigger
						value="fees"
						className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
					>
						Fees & Penalties
					</TabsTrigger>
					<TabsTrigger
						value="accounting"
						className="rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
					>
						Accounting & Rules
					</TabsTrigger>
				</TabsList>
				{isLoading && (
					<div className="py-6 text-center text-muted-foreground">
						Loading loan product details...
					</div>
				)}
				{error && (
					<div className="py-6 text-center text-destructive">
						Failed to load loan product details. Please try again.
					</div>
				)}
				{data && (
					<>
						<TabsContent value="overview" className="mt-6">
							<LoanProductOverview data={data} enumMap={enumMap} />
						</TabsContent>
						<TabsContent value="financial" className="mt-6">
							<LoanProductFinancialTerms
								data={data}
								formatCurrency={formatCurrency}
								enumMap={enumMap}
							/>
						</TabsContent>
						<TabsContent value="schedule" className="mt-6">
							<LoanProductSchedule
								data={data}
								formatCurrency={formatCurrency}
								enumMap={enumMap}
							/>
						</TabsContent>
						<TabsContent value="fees" className="mt-6">
							<LoanProductFees
								data={data}
								formatCurrency={formatCurrency}
								enumMap={enumMap}
							/>
						</TabsContent>
						<TabsContent value="accounting" className="mt-6">
							<LoanProductAccounting
								data={data}
								enumMap={enumMap}
								templateData={templateData}
							/>
						</TabsContent>
					</>
				)}
			</Tabs>
		</PageShell>
	);
}
