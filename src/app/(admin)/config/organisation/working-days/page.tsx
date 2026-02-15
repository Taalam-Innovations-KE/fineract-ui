"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	EnumOptionData,
	GetWorkingDaysTemplateResponse,
	PutWorkingDaysRequest,
	WorkingDaysData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitErrorDetails,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

type WorkingDaysForm = {
	recurrence: string;
	extendTermForDailyRepayments: boolean;
	repaymentRescheduleType?: EnumOptionData;
};

const DAYS_OF_WEEK = [
	{ value: "MO", label: "Monday" },
	{ value: "TU", label: "Tuesday" },
	{ value: "WE", label: "Wednesday" },
	{ value: "TH", label: "Thursday" },
	{ value: "FR", label: "Friday" },
	{ value: "SA", label: "Saturday" },
	{ value: "SU", label: "Sunday" },
] as const;

async function fetchWorkingDays(tenantId: string): Promise<WorkingDaysData> {
	const response = await fetch(BFF_ROUTES.workingDays, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function fetchWorkingDaysTemplate(
	tenantId: string,
): Promise<GetWorkingDaysTemplateResponse> {
	const response = await fetch(`${BFF_ROUTES.workingDays}/template`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateWorkingDays(
	tenantId: string,
	updates: PutWorkingDaysRequest,
): Promise<void> {
	const payload = {
		recurrence: updates.recurrence,
		extendTermForDailyRepayments: updates.extendTermForDailyRepayments,
		repaymentRescheduleType: updates.repaymentRescheduleType?.id,
		locale: "en",
	};

	const response = await fetch(BFF_ROUTES.workingDays, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}
}

function parseRecurrenceDays(recurrence?: string): string[] {
	if (!recurrence) {
		return [];
	}

	const byDayPart = recurrence
		.split(";")
		.find((part) => part.startsWith("BYDAY="));
	if (!byDayPart) {
		return [];
	}

	return byDayPart.replace("BYDAY=", "").split(",").filter(Boolean);
}

function buildRecurrence(days: string[]): string {
	const orderedDays = DAYS_OF_WEEK.map((day) => day.value).filter((day) =>
		days.includes(day),
	);

	return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${orderedDays.join(",")}`;
}

function getInitialFormState(data: WorkingDaysData): WorkingDaysForm {
	return {
		recurrence:
			data.recurrence || buildRecurrence(["MO", "TU", "WE", "TH", "FR"]),
		extendTermForDailyRepayments: Boolean(data.extendTermForDailyRepayments),
		repaymentRescheduleType: data.repaymentRescheduleType,
	};
}

function WorkingDaysPageSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				{["overview-a", "overview-b", "overview-c"].map((key) => (
					<Card key={key}>
						<CardContent className="pt-6">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="mt-3 h-8 w-16" />
							<Skeleton className="mt-2 h-4 w-32" />
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="grid gap-3 grid-cols-2 md:grid-cols-4">
					{DAYS_OF_WEEK.map((day) => (
						<div
							key={day.value}
							className="flex items-center gap-2 rounded-sm border p-3"
						>
							<Skeleton className="h-4 w-4 rounded-sm" />
							<Skeleton className="h-4 w-20" />
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-56" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-start gap-3 rounded-sm border p-4">
						<Skeleton className="h-4 w-4 rounded-sm" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-64" />
						</div>
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-44" />
						<Skeleton className="h-10 w-full" />
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-2">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-40" />
			</div>
		</div>
	);
}

export default function WorkingDaysPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [formState, setFormState] = useState<WorkingDaysForm | null>(null);

	const {
		data: workingDays,
		isLoading: isWorkingDaysLoading,
		error: workingDaysError,
	} = useQuery({
		queryKey: ["working-days", tenantId],
		queryFn: () => fetchWorkingDays(tenantId),
	});

	const {
		data: template,
		isLoading: isTemplateLoading,
		error: templateError,
	} = useQuery({
		queryKey: ["working-days-template", tenantId],
		queryFn: () => fetchWorkingDaysTemplate(tenantId),
	});

	const repaymentOptions = useMemo(
		() =>
			template?.repaymentRescheduleOptions ||
			workingDays?.repaymentRescheduleOptions ||
			[],
		[template, workingDays],
	);

	const updateMutation = useMutation({
		mutationFn: (updates: PutWorkingDaysRequest) =>
			updateWorkingDays(tenantId, updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["working-days", tenantId] });
			setSubmitError(null);
			setSuccessMessage("Working days configuration saved.");
		},
		onError: (error) => {
			setSuccessMessage(null);
			const trackedError = toSubmitActionError(error, {
				action: "updateWorkingDays",
				endpoint: BFF_ROUTES.workingDays,
				method: "PUT",
				tenantId,
			});
			setSubmitError(trackedError);
		},
	});

	useEffect(() => {
		if (!workingDays) {
			return;
		}

		setFormState(getInitialFormState(workingDays));
	}, [workingDays]);

	useEffect(() => {
		if (!successMessage) {
			return;
		}

		const timeout = setTimeout(() => setSuccessMessage(null), 5000);
		return () => clearTimeout(timeout);
	}, [successMessage]);

	const isLoading = isWorkingDaysLoading || isTemplateLoading;
	const initialLoadError = workingDaysError || templateError;

	if (isLoading) {
		return (
			<PageShell
				title="Working Days"
				subtitle="Configure which weekdays are available for business operations and repayment scheduling."
			>
				<WorkingDaysPageSkeleton />
			</PageShell>
		);
	}

	if (initialLoadError || !workingDays || !formState) {
		return (
			<PageShell
				title="Working Days"
				subtitle="Configure which weekdays are available for business operations and repayment scheduling."
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load working days</AlertTitle>
					<AlertDescription>
						The configuration could not be fetched right now. Refresh the page
						and try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const selectedDays = parseRecurrenceDays(formState.recurrence);
	const selectedDayLabels = DAYS_OF_WEEK.filter((day) =>
		selectedDays.includes(day.value),
	).map((day) => day.label);

	const selectedRescheduleTypeLabel =
		formState.repaymentRescheduleType?.value || "Not selected";
	const hasChanges =
		formState.recurrence !== workingDays.recurrence ||
		formState.extendTermForDailyRepayments !==
			Boolean(workingDays.extendTermForDailyRepayments) ||
		formState.repaymentRescheduleType?.id !==
			workingDays.repaymentRescheduleType?.id;
	const canSubmit = hasChanges && selectedDays.length > 0;

	const handleToggleDay = (dayValue: string, checked: boolean) => {
		const nextDays = checked
			? Array.from(new Set([...selectedDays, dayValue]))
			: selectedDays.filter((day) => day !== dayValue);

		setFormState((current) =>
			current
				? {
						...current,
						recurrence: buildRecurrence(nextDays),
					}
				: current,
		);
		setSuccessMessage(null);
		setSubmitError(null);
	};

	const handleReset = () => {
		setFormState(getInitialFormState(workingDays));
		setSuccessMessage(null);
		setSubmitError(null);
	};

	const handleSave = () => {
		if (selectedDays.length === 0) {
			setSubmitError({
				action: "updateWorkingDays",
				code: "validation.workingDays.required",
				endpoint: BFF_ROUTES.workingDays,
				message: "Select at least one working day before saving.",
				method: "PUT",
				status: 400,
				timestamp: new Date().toISOString(),
				tenantId,
			});
			setSuccessMessage(null);
			return;
		}

		updateMutation.mutate({
			recurrence: formState.recurrence,
			extendTermForDailyRepayments: formState.extendTermForDailyRepayments,
			repaymentRescheduleType: formState.repaymentRescheduleType,
		});
	};

	return (
		<PageShell
			title="Working Days"
			subtitle="Configure which weekdays are available for business operations and repayment scheduling."
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<CalendarDays className="h-5 w-5 text-primary" />
								</div>
								<div>
									<p className="text-2xl font-bold">{selectedDays.length}</p>
									<p className="text-sm text-muted-foreground">
										Working days selected
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<Clock3 className="h-5 w-5 text-primary" />
								</div>
								<div>
									<Badge
										variant={
											formState.extendTermForDailyRepayments
												? "success"
												: "secondary"
										}
									>
										{formState.extendTermForDailyRepayments
											? "Enabled"
											: "Disabled"}
									</Badge>
									<p className="mt-1 text-sm text-muted-foreground">
										Daily repayment extension
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">Reschedule policy</p>
							<p className="mt-2 font-semibold">
								{selectedRescheduleTypeLabel}
							</p>
						</CardContent>
					</Card>
				</div>

				{successMessage && (
					<Alert>
						<AlertTitle>Saved</AlertTitle>
						<AlertDescription>{successMessage}</AlertDescription>
					</Alert>
				)}

				{submitError && (
					<Alert variant="destructive">
						<AlertTitle>Failed to update working days</AlertTitle>
						<AlertDescription className="space-y-2">
							<p>{submitError.message}</p>
							{getSubmitErrorDetails(submitError).length > 0 && (
								<ul className="list-disc space-y-1 pl-5 text-xs">
									{getSubmitErrorDetails(submitError).map((message) => (
										<li key={message}>{message}</li>
									))}
								</ul>
							)}
						</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Working week calendar</CardTitle>
						<CardDescription>
							Choose the weekdays available for transactions, schedules, and
							processing.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 grid-cols-2 md:grid-cols-4">
							{DAYS_OF_WEEK.map((day) => {
								const isChecked = selectedDays.includes(day.value);

								return (
									<label
										key={day.value}
										htmlFor={`working-day-${day.value}`}
										className="flex cursor-pointer items-center gap-2 rounded-sm border p-3"
									>
										<Checkbox
											id={`working-day-${day.value}`}
											checked={isChecked}
											onCheckedChange={(checked) =>
												handleToggleDay(day.value, Boolean(checked))
											}
										/>
										<span className="text-sm font-medium">{day.label}</span>
									</label>
								);
							})}
						</div>
						<p className="text-sm text-muted-foreground">
							{selectedDayLabels.length > 0
								? `Selected: ${selectedDayLabels.join(", ")}`
								: "No days selected"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Repayment handling</CardTitle>
						<CardDescription>
							Define how repayments are handled when they fall on non-working
							days.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-start gap-3 rounded-sm border p-4">
							<Checkbox
								id="extend-daily"
								checked={formState.extendTermForDailyRepayments}
								onCheckedChange={(checked) => {
									setFormState((current) =>
										current
											? {
													...current,
													extendTermForDailyRepayments: Boolean(checked),
												}
											: current,
									);
									setSuccessMessage(null);
									setSubmitError(null);
								}}
							/>
							<div className="space-y-1">
								<Label htmlFor="extend-daily" className="font-medium">
									Extend term for daily repayments
								</Label>
								<p className="text-sm text-muted-foreground">
									Allows loan terms to extend when repayment dates land on
									non-working days.
								</p>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="reschedule-type">Repayment reschedule type</Label>
							<Select
								value={formState.repaymentRescheduleType?.id?.toString() || ""}
								onValueChange={(value) => {
									const selectedOption = repaymentOptions.find(
										(option) => option.id?.toString() === value,
									);
									setFormState((current) =>
										current
											? {
													...current,
													repaymentRescheduleType: selectedOption,
												}
											: current,
									);
									setSuccessMessage(null);
									setSubmitError(null);
								}}
							>
								<SelectTrigger id="reschedule-type">
									<SelectValue placeholder="Select reschedule type" />
								</SelectTrigger>
								<SelectContent>
									{repaymentOptions.map((option) => (
										<SelectItem
											key={option.id}
											value={option.id?.toString() || ""}
										>
											{option.value || "Unnamed option"}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleReset}
						disabled={!hasChanges || updateMutation.isPending}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Reset
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={!canSubmit || updateMutation.isPending}
					>
						<Save className="mr-2 h-4 w-4" />
						{updateMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>
		</PageShell>
	);
}
