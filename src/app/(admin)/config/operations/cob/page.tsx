"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	Play,
} from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	IsCatchUpRunningDto,
	OldestCobProcessedLoanDto,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

async function checkCatchUpStatus(
	tenantId: string,
): Promise<IsCatchUpRunningDto> {
	const response = await fetch(BFF_ROUTES.loansCatchUpRunning, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch catch-up status");
	}

	return response.json();
}

async function getOldestCOB(
	tenantId: string,
): Promise<OldestCobProcessedLoanDto> {
	const response = await fetch(BFF_ROUTES.loansOldestCOB, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch oldest COB");
	}

	return response.json();
}

async function triggerCatchUp(tenantId: string) {
	const response = await fetch(BFF_ROUTES.loansCatchUp, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify({}),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => null);
		const message =
			typeof error === "object" &&
			error !== null &&
			"message" in error &&
			typeof (error as { message?: unknown }).message === "string"
				? ((error as { message: string }).message ??
					"Failed to trigger catch-up")
				: "Failed to trigger catch-up";
		if (typeof error === "object" && error !== null) {
			throw { ...error, message };
		}
		throw { message };
	}

	return response.json();
}

export default function COBPage() {
	const { tenantId } = useTenantStore();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const queryClient = useQueryClient();

	const { data: catchUpStatus, isLoading: isLoadingStatus } = useQuery({
		queryKey: ["catchUpStatus", tenantId],
		queryFn: () => checkCatchUpStatus(tenantId),
		refetchInterval: 5000, // Poll every 5 seconds
	});

	const { data: oldestCOB, isLoading: isLoadingOldest } = useQuery({
		queryKey: ["oldestCOB", tenantId],
		queryFn: () => getOldestCOB(tenantId),
	});

	const catchUpMutation = useMutation({
		mutationFn: () => triggerCatchUp(tenantId),
		onSuccess: () => {
			setSubmitError(null);
			queryClient.invalidateQueries({ queryKey: ["catchUpStatus", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["oldestCOB", tenantId] });
			setIsConfirmDialogOpen(false);
			setReason("");
		},
		onError: (error) => {
			const trackedError = toSubmitActionError(error, {
				action: "triggerCobCatchUp",
				endpoint: BFF_ROUTES.loansCatchUp,
				method: "POST",
				tenantId,
			});
			setSubmitError(trackedError);
		},
	});

	const handleStartCatchUp = () => {
		setSubmitError(null);
		setIsConfirmDialogOpen(true);
	};

	const handleConfirmCatchUp = () => {
		setSubmitError(null);
		catchUpMutation.mutate();
	};

	const isRunning = catchUpStatus?.catchUpRunning || false;

	return (
		<PageShell
			title="Close of Business"
			subtitle="Manage COB catch-up operations for loan accounts"
		>
			<div className="space-y-6">
				<SubmitErrorAlert error={submitError} title="COB catch-up failed" />
				{/* Warning Alert */}
				<Alert variant="warning">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Important</AlertTitle>
					<AlertDescription>
						COB (Close of Business) catch-up is a critical operation that
						processes outstanding loan account closures. Only run this operation
						during off-peak hours and ensure you have proper authorization.
					</AlertDescription>
				</Alert>

				{/* Status Cards */}
				<div className="grid gap-6 md:grid-cols-2">
					{/* Catch-up Status */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Catch-up Status
							</CardTitle>
							<CardDescription>
								Current state of the COB catch-up process
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoadingStatus ? (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-6 w-24" />
									</div>
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-4 w-24" />
									</div>
									<Skeleton className="h-10 w-full" />
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											Status
										</span>
										<Badge
											variant={isRunning ? "warning" : "success"}
											className="text-sm"
										>
											{isRunning ? (
												<>
													<Clock className="h-3 w-3 mr-1" />
													Running
												</>
											) : (
												<>
													<CheckCircle className="h-3 w-3 mr-1" />
													Idle
												</>
											)}
										</Badge>
									</div>
									{catchUpStatus?.processingDate && (
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												Processing Date
											</span>
											<span className="text-sm font-medium">
												{catchUpStatus.processingDate}
											</span>
										</div>
									)}
									<Button
										onClick={handleStartCatchUp}
										disabled={isRunning || catchUpMutation.isPending}
										className="w-full"
									>
										<Play className="h-4 w-4 mr-2" />
										{catchUpMutation.isPending
											? "Starting..."
											: isRunning
												? "Catch-up Running"
												: "Start Catch-up"}
									</Button>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Oldest COB Processed */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Oldest COB Processed
							</CardTitle>
							<CardDescription>
								Information about the oldest processed COB
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoadingOldest ? (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-28" />
									</div>
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-28" />
									</div>
									<div className="flex items-center justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-6 w-20" />
									</div>
								</div>
							) : (
								<div className="space-y-4">
									{oldestCOB?.cobBusinessDate && (
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												Business Date
											</span>
											<span className="text-sm font-medium">
												{oldestCOB.cobBusinessDate}
											</span>
										</div>
									)}
									{oldestCOB?.cobProcessedDate && (
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												Processed Date
											</span>
											<span className="text-sm font-medium">
												{oldestCOB.cobProcessedDate}
											</span>
										</div>
									)}
									{oldestCOB?.loanIds && (
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												Affected Loans
											</span>
											<Badge variant="secondary">
												{oldestCOB.loanIds.length} loan(s)
											</Badge>
										</div>
									)}
									{!oldestCOB?.cobBusinessDate && (
										<div className="text-sm text-muted-foreground text-center py-4">
											No COB data available
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Operation Log */}
				<Card>
					<CardHeader>
						<CardTitle>Operation Guidelines</CardTitle>
						<CardDescription>
							Important considerations for COB catch-up operations
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm">
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>
									Ensure all users have completed their daily transactions
									before initiating catch-up
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>
									The catch-up process may take several minutes to hours
									depending on the volume of loans
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>
									Do not start another catch-up while one is already running
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>
									Monitor the system logs for any errors during the catch-up
									process
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>
									Document the reason for running catch-up in your audit trail
								</span>
							</li>
						</ul>
					</CardContent>
				</Card>
			</div>

			{/* Confirmation Sheet */}
			<Sheet open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Confirm COB Catch-up</SheetTitle>
						<SheetDescription>
							This operation will process all outstanding COB closures. Please
							confirm you want to proceed.
						</SheetDescription>
					</SheetHeader>
					<div className="space-y-4 mt-4">
						<SubmitErrorAlert error={submitError} title="COB catch-up failed" />
						<Alert variant="warning">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								This is a critical operation that affects loan account
								processing. Ensure you have proper authorization and have
								notified relevant teams.
							</AlertDescription>
						</Alert>
						<div className="space-y-2">
							<Label htmlFor="reason">Reason / Ticket Number (Optional)</Label>
							<Input
								id="reason"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Enter reason or ticket number"
							/>
							<p className="text-xs text-muted-foreground">
								Document why this catch-up is being performed
							</p>
						</div>
						<div className="flex items-center justify-end gap-2 pt-4">
							<Button
								variant="outline"
								onClick={() => setIsConfirmDialogOpen(false)}
								disabled={catchUpMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								onClick={handleConfirmCatchUp}
								disabled={catchUpMutation.isPending}
							>
								{catchUpMutation.isPending ? "Starting..." : "Confirm & Start"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
