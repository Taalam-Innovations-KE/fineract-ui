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
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { TransactionAudit } from "@/components/transaction-audit";
import { TransactionDetails } from "@/components/transaction-details";
import { TransactionLines } from "@/components/transaction-lines";
import { TransactionOverview } from "@/components/transaction-overview";
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
	CreditDebit,
	JournalEntryData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
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
		throw data;
	}

	return data;
}

export default function TransactionDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const { setStatus } = useTransactionStore();
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

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
			setSubmitError(null);
			setToastMessage("Journal entry reversed successfully");
		},
		onError: (error, transactionId) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "reverseJournalEntry",
					endpoint: `${BFF_ROUTES.journalEntries}/reverse/${transactionId}`,
					method: "POST",
					tenantId,
				}),
			);
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
			<PageShell
				title="Transaction Details"
				subtitle="Detailed view of the journal entry"
			>
				<div className="space-y-6">
					{Array.from({ length: 3 }).map((_, index) => (
						<Card key={`transaction-detail-skeleton-${index}`}>
							<CardHeader>
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-72" />
							</CardHeader>
							<CardContent className="space-y-3">
								{Array.from({ length: 4 }).map((__, fieldIndex) => (
									<div
										key={`transaction-field-skeleton-${index}-${fieldIndex}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-6 w-44" />
									</div>
								))}
							</CardContent>
						</Card>
					))}
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
					</div>
				}
			>
				<div className="space-y-6">
					<SubmitErrorAlert
						error={submitError}
						title="Transaction action failed"
					/>
					<TransactionOverview entry={entry} />
					<TransactionLines entry={entry} />
					<TransactionDetails entry={entry} />
					<TransactionAudit entry={entry} />
					{!entry.reversed && (
						<Card>
							<CardHeader>
								<CardTitle>Actions</CardTitle>
								<CardDescription>
									Perform operations on this transaction
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
									<Button
										variant="outline"
										className="rounded-none"
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
										className="rounded-none"
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
										className="rounded-none"
										onClick={() => {
											if (
												entry.transactionId &&
												confirm(
													"Are you sure you want to edit this journal entry? This will reverse the original and create a new one.",
												)
											) {
												setIsEditDrawerOpen(true);
											}
										}}
									>
										<PenLine className="h-4 w-4 mr-2" />
										Edit
									</Button>
									<Button
										variant="outline"
										className="rounded-none"
										onClick={() => {
											if (
												entry.transactionId &&
												confirm(
													"Are you sure you want to reverse this journal entry?",
												)
											) {
												setSubmitError(null);
												reverseMutation.mutate(entry.transactionId);
											}
										}}
										disabled={reverseMutation.isPending}
									>
										<RotateCcw className="h-4 w-4 mr-2" />
										Reverse
									</Button>
								</div>
							</CardContent>
						</Card>
					)}
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

			<Sheet open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Edit Journal Entry</SheetTitle>
						<SheetDescription>
							Modify the journal entry details. This will reverse the original
							entry and create a new one.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<SubmitErrorAlert
							error={submitError}
							title="Transaction action failed"
						/>
						<JournalEntryForm
							initialData={entry}
							onSuccess={() => {
								setIsEditDrawerOpen(false);
								setSubmitError(null);
								if (entry.transactionId) {
									reverseMutation.mutate(entry.transactionId);
								}
							}}
							onCancel={() => setIsEditDrawerOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
