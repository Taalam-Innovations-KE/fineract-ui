"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Landmark, PiggyBank, Wallet } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	SavingsAccountData,
	SavingsAccountTransactionData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

function formatText(value?: string | number | null): string {
	if (value === null || value === undefined || value === "") {
		return "N/A";
	}
	return String(value);
}

function formatDate(value?: string): string {
	if (!value) return "N/A";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatMoney(value?: number, currency = "KES"): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "N/A";
	}
	return `${currency} ${value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function MetricCard({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: React.ElementType;
}) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
						<Icon className="h-5 w-5 text-primary" />
					</div>
					<div>
						<div className="text-2xl font-bold">{value}</div>
						<div className="text-sm text-muted-foreground">{label}</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-right text-sm font-medium">{value}</span>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="space-y-2 pt-6">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardContent className="space-y-3 pt-6">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={index} className="grid grid-cols-2 gap-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

async function fetchSavingsAccount(
	tenantId: string,
	accountId: string,
): Promise<SavingsAccountData> {
	const response = await fetch(
		`${BFF_ROUTES.savingsAccountById(accountId)}?associations=transactions`,
		{
			headers: { "x-tenant-id": tenantId },
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch savings account details");
	}

	return response.json();
}

export default function SavingsAccountDetailPage({
	params,
}: {
	params: Promise<{ accountId: string }>;
}) {
	const { accountId } = use(params);
	const { tenantId } = useTenantStore();

	const savingsQuery = useQuery({
		queryKey: ["savings-account", tenantId, accountId],
		queryFn: () => fetchSavingsAccount(tenantId, accountId),
		enabled: Boolean(tenantId && accountId),
	});

	const headerActions = (
		<Button variant="outline" asChild>
			<Link href="/config/operations/clients">
				<ArrowLeft className="mr-2 h-4 w-4" />
				Back to Clients
			</Link>
		</Button>
	);

	if (savingsQuery.isLoading) {
		return (
			<PageShell
				title="Savings Account Details"
				subtitle="Comprehensive savings account profile and activity"
				actions={headerActions}
			>
				<LoadingState />
			</PageShell>
		);
	}

	if (savingsQuery.error || !savingsQuery.data) {
		return (
			<PageShell
				title="Savings Account Details"
				subtitle="Could not load savings account"
				actions={headerActions}
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load savings account details. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const savings = savingsQuery.data;
	const currency =
		savings.currency?.displaySymbol || savings.currency?.code || "KES";
	const summary = savings.summary || savings.savingsAccountSummaryData;
	const transactions =
		savings.transactions || savings.savingsAccountTransactionData || [];

	const transactionColumns = [
		{
			header: "Date",
			cell: (row: SavingsAccountTransactionData) =>
				formatDate(row.date || row.transactionDate),
		},
		{
			header: "Type",
			cell: (row: SavingsAccountTransactionData) =>
				formatText(row.transactionType?.value || row.transactionType?.code),
		},
		{
			header: "Amount",
			cell: (row: SavingsAccountTransactionData) =>
				formatMoney(row.amount ?? row.transactionAmount, currency),
		},
		{
			header: "Balance",
			cell: (row: SavingsAccountTransactionData) =>
				formatMoney(row.runningBalance, currency),
		},
		{
			header: "Reversed",
			cell: (row: SavingsAccountTransactionData) => (
				<Badge variant={row.reversed ? "warning" : "secondary"}>
					{row.reversed ? "Yes" : "No"}
				</Badge>
			),
		},
	];

	return (
		<PageShell
			title={
				<div className="flex items-center gap-2">
					<span>Savings {formatText(savings.accountNo || accountId)}</span>
					<Badge variant={savings.status?.active ? "success" : "secondary"}>
						{formatText(savings.status?.value)}
					</Badge>
				</div>
			}
			subtitle={`${formatText(savings.clientName)} | ${formatText(savings.savingsProductName)}`}
			actions={headerActions}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						label="Account Balance"
						value={formatMoney(summary?.accountBalance, currency)}
						icon={Wallet}
					/>
					<MetricCard
						label="Available Balance"
						value={formatMoney(summary?.availableBalance, currency)}
						icon={PiggyBank}
					/>
					<MetricCard
						label="Total Deposits"
						value={formatMoney(summary?.totalDeposits, currency)}
						icon={Landmark}
					/>
					<MetricCard
						label="Total Withdrawals"
						value={formatMoney(summary?.totalWithdrawals, currency)}
						icon={Banknote}
					/>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Account Overview</CardTitle>
						</CardHeader>
						<CardContent className="divide-y">
							<InfoRow label="Account ID" value={formatText(savings.id)} />
							<InfoRow
								label="Account Number"
								value={formatText(savings.accountNo)}
							/>
							<InfoRow
								label="External ID"
								value={formatText(savings.externalId)}
							/>
							<InfoRow
								label="Client Name"
								value={formatText(savings.clientName)}
							/>
							<InfoRow label="Office ID" value={formatText(savings.officeId)} />
							<InfoRow
								label="Deposit Type"
								value={formatText(savings.depositType?.value)}
							/>
							<InfoRow
								label="Submitted On"
								value={formatDate(savings.submittedOnDate)}
							/>
							<InfoRow
								label="Activated On"
								value={formatDate(savings.activatedOnDate)}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Product & Limits</CardTitle>
						</CardHeader>
						<CardContent className="divide-y">
							<InfoRow
								label="Savings Product"
								value={formatText(savings.savingsProductName)}
							/>
							<InfoRow label="Currency" value={formatText(currency)} />
							<InfoRow
								label="Nominal Interest Rate"
								value={formatText(savings.nominalAnnualInterestRate)}
							/>
							<InfoRow
								label="Minimum Balance"
								value={formatMoney(savings.minRequiredBalance, currency)}
							/>
							<InfoRow
								label="Overdraft Limit"
								value={formatMoney(savings.overdraftLimit, currency)}
							/>
							<InfoRow
								label="Withhold Tax"
								value={savings.withHoldTax ? "Yes" : "No"}
							/>
							<InfoRow
								label="Dormancy Tracking"
								value={
									savings.isDormancyTrackingActive ? "Enabled" : "Disabled"
								}
							/>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Recent Transactions</CardTitle>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={transactionColumns}
							data={transactions}
							getRowId={(row) => row.id ?? `${row.date}-${row.amount}`}
							emptyMessage="No transactions found for this savings account."
						/>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
