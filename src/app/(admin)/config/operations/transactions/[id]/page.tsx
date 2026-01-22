"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Calendar,
	Check,
	Eye,
	FileText,
	History,
	PenLine,
	RotateCcw,
	X,
} from "lucide-react";
import { use, useEffect, useState } from "react";
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

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";
import { useTransactionStore } from "@/store/transactions";

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

async function reverseJournalEntry(
	tenantId: string,
	transactionId: string,
): Promise<{ transactionId: string }> {
	const response = await fetch(
		`${BFF_ROUTES.journalEntries}/reverse/${transactionId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify({}),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message ||
				data.errors?.[0]?.defaultUserMessage ||
				"Failed to reverse journal entry",
		);
	}

	return data;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day}/${month}/${year}`;
}

interface TransactionOverviewProps {
	entry: JournalEntryData;
}

function TransactionOverview({ entry }: TransactionOverviewProps) {
	const { getStatus } = useTransactionStore();
	const approvalStatus = getStatus(entry.transactionId || "");

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Basic Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Transaction ID
							</div>
							<div className="text-lg font-semibold">{entry.transactionId}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Date
							</div>
							<div className="text-lg">
								{formatDate(entry.transactionDate || "")}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Office
							</div>
							<div className="text-lg">{entry.officeName}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Amount
							</div>
							<div className="text-lg font-semibold">
								{formatCurrency(entry.amount)}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Type
							</div>
							<div className="text-lg">
								{entry.manualEntry ? "Manual" : "System"}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Status
							</div>
							<div className="flex items-center gap-2">
								{entry.reversed ? (
									<Badge variant="destructive">Reversed</Badge>
								) : approvalStatus === "approved" ? (
									<Badge variant="success">Approved</Badge>
								) : approvalStatus === "rejected" ? (
									<Badge variant="destructive">Rejected</Badge>
								) : (
									<Badge variant="secondary">Pending</Badge>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface TransactionLinesProps {
	entry: JournalEntryData;
}

function TransactionLines({ entry }: TransactionLinesProps) {
	const credits = entry.credits || [];
	const debits = entry.debits || [];

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Debit Entries</CardTitle>
					<CardDescription>
						Accounts debited in this transaction
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{debits.map((debit, index) => (
							<div
								key={index}
								className="flex justify-between items-center p-3 border rounded"
							>
								<div>
									<div className="font-medium">
										{(debit as any).glAccountName ||
											`Account ${debit.glAccountId}`}
									</div>
									<div className="text-sm text-muted-foreground">
										ID: {debit.glAccountId}
									</div>
								</div>
								<div className="text-right">
									<div className="font-semibold">
										{formatCurrency(debit.amount)}
									</div>
									<div className="text-sm text-muted-foreground">Debit</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Credit Entries</CardTitle>
					<CardDescription>
						Accounts credited in this transaction
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{credits.map((credit, index) => (
							<div
								key={index}
								className="flex justify-between items-center p-3 border rounded"
							>
								<div>
									<div className="font-medium">
										{(credit as any).glAccountName ||
											`Account ${credit.glAccountId}`}
									</div>
									<div className="text-sm text-muted-foreground">
										ID: {credit.glAccountId}
									</div>
								</div>
								<div className="text-right">
									<div className="font-semibold">
										{formatCurrency(credit.amount)}
									</div>
									<div className="text-sm text-muted-foreground">Credit</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface TransactionAuditProps {
	entry: JournalEntryData;
}

function TransactionAudit({ entry }: TransactionAuditProps) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
					<CardDescription>Transaction history and changes</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Created Date
							</div>
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>{formatDate(entry.submittedOnDate || "")}</span>
							</div>
						</div>
						{entry.reversed && (
							<div>
								<div className="text-sm font-medium text-muted-foreground">
									Reversed Date
								</div>
								<div className="flex items-center gap-2">
									<History className="h-4 w-4" />
									<span>{formatDate(entry.transactionDate || "")}</span>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function TransactionDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const { getStatus, setStatus } = useTransactionStore();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const entryQuery = useQuery({
		queryKey: ["journalEntry", tenantId, id],
		queryFn: async () => {
			const response = await fetch(`${BFF_ROUTES.journalEntries}/${id}`, {
				headers: { "x-tenant-id": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch journal entry");
			return (await response.json()) as JournalEntryData;
		},
		staleTime: DEFAULT_STALE_TIME,
	});

	const reverseMutation = useMutation({
		mutationFn: (transactionId: string) =>
			reverseJournalEntry(tenantId, transactionId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["journalEntry", tenantId, id],
			});
			queryClient.invalidateQueries({ queryKey: ["journalEntries", tenantId] });
			setToastMessage("Journal entry reversed successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const entry = entryQuery.data;

	if (entryQuery.isLoading) {
		return (
			<PageShell title="Transaction Details" subtitle="Loading...">
				<div className="py-6 text-center text-muted-foreground">
					Loading transaction details...
				</div>
			</PageShell>
		);
	}

	if (entryQuery.error || !entry) {
		return (
			<PageShell title="Transaction Details" subtitle="Error">
				<div className="py-6 text-center text-destructive">
					Failed to load transaction details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<>
			<PageShell
				title={`Transaction ${entry.transactionId}`}
				subtitle="Detailed view of the journal entry"
				actions={
					<div className="flex gap-2">
						<Button variant="outline" asChild>
							<a href="/config/operations/transactions">
								<Eye className="h-4 w-4 mr-2" />
								Back to List
							</a>
						</Button>
						{!entry.reversed && (
							<>
								<Button
									variant="outline"
									onClick={() => {
										const transactionId = entry.transactionId;
										if (
											transactionId &&
											confirm(
												"Are you sure you want to approve this journal entry?",
											)
										) {
											setStatus(transactionId, "approved");
											setToastMessage("Journal entry approved");
										}
									}}
								>
									<Check className="h-4 w-4 mr-2" />
									Approve
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										const transactionId = entry.transactionId;
										if (
											transactionId &&
											confirm(
												"Are you sure you want to reject this journal entry?",
											)
										) {
											setStatus(transactionId, "rejected");
											setToastMessage("Journal entry rejected");
										}
									}}
								>
									<X className="h-4 w-4 mr-2" />
									Reject
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										if (
											entry.transactionId &&
											confirm(
												"Are you sure you want to edit this journal entry? This will reverse the original and create a new one.",
											)
										) {
											window.location.href = `/config/operations/transactions/create?edit=true&transactionId=${entry.transactionId}`;
										}
									}}
								>
									<PenLine className="h-4 w-4 mr-2" />
									Edit
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										if (
											entry.transactionId &&
											confirm(
												"Are you sure you want to reverse this journal entry?",
											)
										) {
											reverseMutation.mutate(entry.transactionId);
										}
									}}
									disabled={reverseMutation.isPending}
								>
									<RotateCcw className="h-4 w-4 mr-2" />
									Reverse
								</Button>
							</>
						)}
					</div>
				}
			>
				<div className="space-y-6">
					<TransactionOverview entry={entry} />
					<TransactionLines entry={entry} />
					<TransactionAudit entry={entry} />
				</div>
			</PageShell>

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
