"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetLoanRescheduleRequestResponse,
	GetRescheduleReasonsTemplateResponse,
	PostCreateRescheduleLoansRequest,
	PostUpdateRescheduleLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import {
	type LoanRescheduleDecisionInput,
	type LoanRescheduleRequestInput,
	loanRescheduleDecisionSchema,
	loanRescheduleRequestSchema,
} from "@/lib/schemas/loan-reschedule";
import { useTenantStore } from "@/store/tenant";

interface LoanRestructureTabProps {
	loanId: number;
}

type LoanRescheduleCreatePayload = PostCreateRescheduleLoansRequest & {
	emi?: number;
	endDate?: string;
	recalculateInterest?: boolean;
	rescheduleFromInstallment?: number;
};

function getTodayDateInputValue(): string {
	return new Date().toISOString().split("T")[0];
}

function formatDate(dateValue?: string): string {
	if (!dateValue) return "—";
	const parsed = new Date(dateValue);
	if (Number.isNaN(parsed.getTime())) return dateValue;
	return parsed.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function mapStatusVariant(
	request: GetLoanRescheduleRequestResponse,
): "secondary" | "warning" | "success" | "destructive" {
	if (request.statusEnum?.approved) return "success";
	if (request.statusEnum?.rejected) return "destructive";
	if (request.statusEnum?.pendingApproval) return "warning";
	return "secondary";
}

function buildCreatePayload(
	input: LoanRescheduleRequestInput,
): LoanRescheduleCreatePayload {
	const payload: LoanRescheduleCreatePayload = {
		loanId: input.loanId,
		submittedOnDate: formatDateStringToFormat(
			input.submittedOnDate,
			input.dateFormat || "dd MMMM yyyy",
		),
		rescheduleFromDate: formatDateStringToFormat(
			input.rescheduleFromDate,
			input.dateFormat || "dd MMMM yyyy",
		),
		rescheduleReasonId: input.rescheduleReasonId,
		dateFormat: input.dateFormat || "dd MMMM yyyy",
		locale: input.locale || "en",
	};

	if (input.adjustedDueDate) {
		payload.adjustedDueDate = formatDateStringToFormat(
			input.adjustedDueDate,
			input.dateFormat || "dd MMMM yyyy",
		);
	}
	if (input.graceOnPrincipal !== undefined) {
		payload.graceOnPrincipal = input.graceOnPrincipal;
	}
	if (input.graceOnInterest !== undefined) {
		payload.graceOnInterest = input.graceOnInterest;
	}
	if (input.extraTerms !== undefined) {
		payload.extraTerms = input.extraTerms;
	}
	if (input.newInterestRate !== undefined) {
		payload.newInterestRate = input.newInterestRate;
	}
	if (input.emi !== undefined) {
		payload.emi = input.emi;
	}
	if (input.endDate) {
		payload.endDate = formatDateStringToFormat(
			input.endDate,
			input.dateFormat || "dd MMMM yyyy",
		);
	}
	if (input.rescheduleReasonComment) {
		payload.rescheduleReasonComment = input.rescheduleReasonComment;
	}
	if (input.recalculateInterest !== undefined) {
		payload.recalculateInterest = input.recalculateInterest;
	}
	if (input.rescheduleFromInstallment !== undefined) {
		payload.rescheduleFromInstallment = input.rescheduleFromInstallment;
	}

	return payload;
}

function buildDecisionPayload(
	input: LoanRescheduleDecisionInput,
): PostUpdateRescheduleLoansRequest {
	const formattedDate = formatDateStringToFormat(
		input.actionDate,
		input.dateFormat || "dd MMMM yyyy",
	);

	return {
		approvedOnDate: input.action === "approve" ? formattedDate : undefined,
		rejectedOnDate: input.action === "reject" ? formattedDate : undefined,
		dateFormat: input.dateFormat || "dd MMMM yyyy",
		locale: input.locale || "en",
	};
}

function RestructureTableSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2 text-right">
								<Skeleton className="h-4 w-14" />
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, i) => (
							<tr key={i}>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-12" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-6 w-24" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-32" />
								</td>
								<td className="px-3 py-2 text-right">
									<Skeleton className="ml-auto h-8 w-20" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}

export function LoanRestructureTab({ loanId }: LoanRestructureTabProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [previewResult, setPreviewResult] = useState<unknown | null>(null);
	const [createError, setCreateError] = useState<SubmitActionError | null>(
		null,
	);
	const [decisionError, setDecisionError] = useState<SubmitActionError | null>(
		null,
	);
	const [decisionContext, setDecisionContext] = useState<{
		open: boolean;
		request: GetLoanRescheduleRequestResponse | null;
		action: "approve" | "reject";
	}>({
		open: false,
		request: null,
		action: "approve",
	});

	const rescheduleRequestsQuery = useQuery({
		queryKey: ["loanRescheduleRequests", tenantId, loanId],
		queryFn: async () => {
			const params = new URLSearchParams({ loanId: String(loanId) });
			const response = await fetch(
				`${BFF_ROUTES.rescheduleLoans}?${params.toString()}`,
				{
					headers: { "fineract-platform-tenantid": tenantId },
				},
			);
			if (!response.ok) {
				throw new Error("Failed to load restructure requests");
			}
			return (await response.json()) as Array<GetLoanRescheduleRequestResponse>;
		},
		enabled: Boolean(tenantId && loanId),
		refetchOnWindowFocus: false,
	});

	const rescheduleTemplateQuery = useQuery({
		queryKey: ["loanRescheduleTemplate", tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.rescheduleLoansTemplate, {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) {
				throw new Error("Failed to load reschedule reasons");
			}
			return (await response.json()) as GetRescheduleReasonsTemplateResponse;
		},
		enabled: Boolean(tenantId),
		refetchOnWindowFocus: false,
	});

	const createForm = useForm<LoanRescheduleRequestInput>({
		resolver: zodResolver(loanRescheduleRequestSchema),
		defaultValues: {
			loanId,
			submittedOnDate: getTodayDateInputValue(),
			rescheduleFromDate: getTodayDateInputValue(),
			rescheduleReasonComment: "",
			recalculateInterest: false,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
		},
	});

	const decisionForm = useForm<LoanRescheduleDecisionInput>({
		resolver: zodResolver(loanRescheduleDecisionSchema),
		defaultValues: {
			action: "approve",
			actionDate: getTodayDateInputValue(),
			dateFormat: "dd MMMM yyyy",
			locale: "en",
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: LoanRescheduleRequestInput) => {
			const payload = buildCreatePayload(data);
			const response = await fetch(BFF_ROUTES.rescheduleLoans, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"fineract-platform-tenantid": tenantId,
				},
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorBody = await response.json().catch(() => null);
				throw errorBody || { message: "Failed to create reschedule request" };
			}
			return response.json();
		},
		onSuccess: () => {
			setCreateError(null);
			setPreviewResult(null);
			setIsCreateSheetOpen(false);
			createForm.reset({
				loanId,
				submittedOnDate: getTodayDateInputValue(),
				rescheduleFromDate: getTodayDateInputValue(),
				rescheduleReasonComment: "",
				recalculateInterest: false,
				dateFormat: "dd MMMM yyyy",
				locale: "en",
			});
			void rescheduleRequestsQuery.refetch();
			void queryClient.invalidateQueries({ queryKey: ["loan", tenantId] });
		},
		onError: (error) => {
			setCreateError(
				toSubmitActionError(error, {
					action: "createLoanRescheduleRequest",
					endpoint: BFF_ROUTES.rescheduleLoans,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const previewMutation = useMutation({
		mutationFn: async (data: LoanRescheduleRequestInput) => {
			const payload = buildCreatePayload(data);
			const response = await fetch(
				`${BFF_ROUTES.rescheduleLoans}?command=previewLoanReschedule`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"fineract-platform-tenantid": tenantId,
					},
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				const errorBody = await response.json().catch(() => null);
				throw errorBody || { message: "Failed to preview reschedule request" };
			}
			return response.json();
		},
		onSuccess: (data) => {
			setCreateError(null);
			setPreviewResult(data);
		},
		onError: (error) => {
			setCreateError(
				toSubmitActionError(error, {
					action: "previewLoanRescheduleRequest",
					endpoint: `${BFF_ROUTES.rescheduleLoans}?command=previewLoanReschedule`,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const decisionMutation = useMutation({
		mutationFn: async (data: LoanRescheduleDecisionInput) => {
			const scheduleId = decisionContext.request?.id;
			if (!scheduleId) {
				throw { message: "Reschedule request ID is missing" };
			}
			const payload = buildDecisionPayload(data);
			const response = await fetch(
				`${BFF_ROUTES.rescheduleLoanById(scheduleId)}?command=${encodeURIComponent(data.action)}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"fineract-platform-tenantid": tenantId,
					},
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				const errorBody = await response.json().catch(() => null);
				throw errorBody || { message: `Failed to ${data.action} request` };
			}
			return response.json();
		},
		onSuccess: () => {
			setDecisionError(null);
			setDecisionContext({ open: false, request: null, action: "approve" });
			decisionForm.reset({
				action: "approve",
				actionDate: getTodayDateInputValue(),
				dateFormat: "dd MMMM yyyy",
				locale: "en",
			});
			void rescheduleRequestsQuery.refetch();
			void queryClient.invalidateQueries({ queryKey: ["loan", tenantId] });
		},
		onError: (error, variables) => {
			const scheduleId = decisionContext.request?.id;
			setDecisionError(
				toSubmitActionError(error, {
					action: `${variables.action}LoanRescheduleRequest`,
					endpoint: `${BFF_ROUTES.rescheduleLoanById(scheduleId || "")}?command=${variables.action}`,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const rescheduleRequests = rescheduleRequestsQuery.data ?? [];
	const rescheduleReasonOptions = useMemo(
		() =>
			(rescheduleTemplateQuery.data?.rescheduleReasons ?? []).filter(
				(reason): reason is { id: number; name?: string } =>
					typeof reason.id === "number",
			),
		[rescheduleTemplateQuery.data?.rescheduleReasons],
	);

	const columns = [
		{
			header: "Request",
			cell: (item: GetLoanRescheduleRequestResponse) => (
				<div>
					<div className="font-medium">#{item.id || "—"}</div>
					<div className="text-xs text-muted-foreground">
						{item.loanAccountNumber || "Loan"}
					</div>
				</div>
			),
		},
		{
			header: "Status",
			cell: (item: GetLoanRescheduleRequestResponse) => (
				<Badge variant={mapStatusVariant(item)}>
					{item.statusEnum?.value || "Unknown"}
				</Badge>
			),
		},
		{
			header: "Submitted",
			cell: (item: GetLoanRescheduleRequestResponse) =>
				formatDate(item.timeline?.submittedOnDate),
		},
		{
			header: "From Date",
			cell: (item: GetLoanRescheduleRequestResponse) =>
				formatDate(item.rescheduleFromDate),
		},
		{
			header: "Reason",
			cell: (item: GetLoanRescheduleRequestResponse) =>
				item.rescheduleReasonCodeValue?.name || "—",
		},
		{
			header: "Actions",
			className: "text-right",
			headerClassName: "text-right",
			cell: (item: GetLoanRescheduleRequestResponse) => {
				if (!item.statusEnum?.pendingApproval) {
					return <span className="text-xs text-muted-foreground">—</span>;
				}
				return (
					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							size="sm"
							onClick={() => {
								setDecisionError(null);
								setDecisionContext({
									open: true,
									request: item,
									action: "approve",
								});
								decisionForm.reset({
									action: "approve",
									actionDate: getTodayDateInputValue(),
									dateFormat: "dd MMMM yyyy",
									locale: "en",
								});
							}}
						>
							<CheckCircle2 className="mr-1 h-4 w-4" />
							Approve
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={() => {
								setDecisionError(null);
								setDecisionContext({
									open: true,
									request: item,
									action: "reject",
								});
								decisionForm.reset({
									action: "reject",
									actionDate: getTodayDateInputValue(),
									dateFormat: "dd MMMM yyyy",
									locale: "en",
								});
							}}
						>
							<XCircle className="mr-1 h-4 w-4" />
							Reject
						</Button>
					</div>
				);
			},
		},
	];

	return (
		<>
			<div className="space-y-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<div>
							<CardTitle>Loan Restructure Requests</CardTitle>
							<CardDescription>
								Create, preview, and action loan reschedule requests for this
								loan.
							</CardDescription>
						</div>
						<Button type="button" onClick={() => setIsCreateSheetOpen(true)}>
							New Restructure Request
						</Button>
					</CardHeader>
					<CardContent>
						{rescheduleRequestsQuery.isLoading ? (
							<RestructureTableSkeleton />
						) : rescheduleRequestsQuery.error ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load restructure requests</AlertTitle>
								<AlertDescription>
									{rescheduleRequestsQuery.error.message ||
										"Failed to load restructure requests."}
								</AlertDescription>
							</Alert>
						) : (
							<DataTable
								data={rescheduleRequests}
								columns={columns}
								getRowId={(item) => String(item.id || "")}
								emptyMessage="No restructure requests for this loan"
								pageSize={8}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet
				open={isCreateSheetOpen}
				onOpenChange={(open) => {
					if (!open) {
						setPreviewResult(null);
						setCreateError(null);
						createForm.reset({
							loanId,
							submittedOnDate: getTodayDateInputValue(),
							rescheduleFromDate: getTodayDateInputValue(),
							rescheduleReasonComment: "",
							recalculateInterest: false,
							dateFormat: "dd MMMM yyyy",
							locale: "en",
						});
					}
					setIsCreateSheetOpen(open);
				}}
			>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>Create Restructure Request</SheetTitle>
						<SheetDescription>
							Configure terms and submit for approval, or preview the generated
							schedule changes first.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6">
						<Form {...createForm}>
							<form className="space-y-4">
								<SubmitErrorAlert
									error={createError}
									title="Restructure request failed"
								/>

								<FormField
									control={createForm.control}
									name="submittedOnDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Submitted On <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={createForm.control}
									name="rescheduleFromDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Reschedule From Date{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<FormField
										control={createForm.control}
										name="adjustedDueDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Adjusted Due Date</FormLabel>
												<FormControl>
													<Input
														type="date"
														{...field}
														value={field.value || ""}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={createForm.control}
										name="rescheduleFromInstallment"
										render={({ field }) => (
											<FormItem>
												<FormLabel>From Installment</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="1"
														value={field.value ?? ""}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number.parseInt(event.target.value, 10)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<FormField
										control={createForm.control}
										name="graceOnPrincipal"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Grace on Principal</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														value={field.value ?? ""}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number.parseInt(event.target.value, 10)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={createForm.control}
										name="graceOnInterest"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Grace on Interest</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														value={field.value ?? ""}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number.parseInt(event.target.value, 10)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<FormField
										control={createForm.control}
										name="extraTerms"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Extra Terms</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														value={field.value ?? ""}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number.parseInt(event.target.value, 10)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={createForm.control}
										name="newInterestRate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>New Interest Rate (%)</FormLabel>
												<FormControl>
													<Input
														type="number"
														min="0"
														step="0.01"
														value={field.value ?? ""}
														onChange={(event) =>
															field.onChange(
																event.target.value
																	? Number.parseFloat(event.target.value)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={createForm.control}
									name="rescheduleReasonId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Reschedule Reason{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value?.toString() || ""}
												onValueChange={(value) =>
													field.onChange(Number.parseInt(value, 10))
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select reason" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{rescheduleReasonOptions.map((reason) => (
														<SelectItem
															key={reason.id}
															value={String(reason.id)}
														>
															{reason.name || `Reason #${reason.id}`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={createForm.control}
									name="recalculateInterest"
									render={({ field }) => (
										<FormItem className="space-y-2">
											<div className="flex items-center gap-2">
												<FormControl>
													<Checkbox
														checked={Boolean(field.value)}
														onCheckedChange={(checked) =>
															field.onChange(Boolean(checked))
														}
													/>
												</FormControl>
												<Label>Recalculate Interest</Label>
											</div>
											<p className="text-xs text-muted-foreground">
												Stored on request by Fineract, but current backend
												approval logic may not branch on this flag.
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={createForm.control}
									name="rescheduleReasonComment"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Comment</FormLabel>
											<FormControl>
												<Textarea
													rows={3}
													placeholder="Optional comment"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{previewResult !== null && (
									<Card className="rounded-sm border border-border/60 bg-muted/20">
										<CardHeader className="pb-2">
											<CardTitle className="text-sm">Preview Result</CardTitle>
										</CardHeader>
										<CardContent>
											<pre className="max-h-64 overflow-auto rounded-sm bg-background p-2 text-xs">
												{JSON.stringify(previewResult, null, 2)}
											</pre>
										</CardContent>
									</Card>
								)}

								<SheetFooter className="pt-2">
									<div className="flex w-full items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											disabled={previewMutation.isPending}
											onClick={createForm.handleSubmit((data) => {
												setCreateError(null);
												previewMutation.mutate(data);
											})}
										>
											<Eye className="mr-2 h-4 w-4" />
											{previewMutation.isPending ? "Previewing..." : "Preview"}
										</Button>
										<Button
											type="button"
											disabled={createMutation.isPending}
											onClick={createForm.handleSubmit((data) => {
												setCreateError(null);
												createMutation.mutate(data);
											})}
										>
											{createMutation.isPending
												? "Submitting..."
												: "Submit Request"}
										</Button>
									</div>
								</SheetFooter>
							</form>
						</Form>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet
				open={decisionContext.open}
				onOpenChange={(open) => {
					if (!open) {
						setDecisionError(null);
						setDecisionContext({
							open: false,
							request: null,
							action: "approve",
						});
					}
				}}
			>
				<SheetContent side="right" className="w-full sm:max-w-md">
					<SheetHeader>
						<SheetTitle>
							{decisionContext.action === "approve" ? "Approve" : "Reject"}{" "}
							Restructure Request
						</SheetTitle>
						<SheetDescription>
							Request #{decisionContext.request?.id || "—"} for loan{" "}
							{decisionContext.request?.loanAccountNumber || "—"}.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6">
						<Form {...decisionForm}>
							<form
								className="space-y-4"
								onSubmit={decisionForm.handleSubmit((data) => {
									setDecisionError(null);
									decisionMutation.mutate(data);
								})}
							>
								<SubmitErrorAlert
									error={decisionError}
									title="Unable to process restructure request"
								/>

								<FormField
									control={decisionForm.control}
									name="actionDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{decisionContext.action === "approve"
													? "Approved On"
													: "Rejected On"}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<SheetFooter>
									<div className="flex w-full items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setDecisionContext({
													open: false,
													request: null,
													action: "approve",
												})
											}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											variant={
												decisionContext.action === "approve"
													? "default"
													: "destructive"
											}
											disabled={decisionMutation.isPending}
										>
											{decisionMutation.isPending
												? "Processing..."
												: decisionContext.action === "approve"
													? "Approve Request"
													: "Reject Request"}
										</Button>
									</div>
								</SheetFooter>
							</form>
						</Form>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

export function LoanRestructureTabSkeleton() {
	return <RestructureTableSkeleton />;
}
