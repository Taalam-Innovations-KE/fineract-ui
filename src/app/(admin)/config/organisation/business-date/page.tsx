"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateStringToFormat, parseFineractDate } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	BusinessDateUpdateRequest,
	BusinessDateUpdateResponse,
	GetBusinessDatesResponse,
} from "@/lib/fineract/generated/types.gen";
import {
	getSubmitErrorDetails,
	type SubmitActionError,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import { getFieldError } from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

const DATE_FORMAT = "dd MMMM yyyy";
const DATE_TYPE_OPTIONS = [
	{
		type: "BUSINESS_DATE" as const,
		label: "Business Date",
		description:
			"The operational date used for daily transactions, schedules, and validations.",
	},
	{
		type: "COB_DATE" as const,
		label: "Close of Business Date",
		description:
			"The last date for which end-of-day processing has completed successfully.",
	},
];

async function fetchBusinessDates(
	tenantId: string,
): Promise<GetBusinessDatesResponse> {
	const response = await fetch(BFF_ROUTES.businessDate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateBusinessDate(
	tenantId: string,
	update: BusinessDateUpdateRequest,
): Promise<BusinessDateUpdateResponse> {
	const response = await fetch(BFF_ROUTES.businessDate, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(update),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

function convertFineractDateToInputValue(date?: string): string {
	if (!date) {
		return "";
	}

	try {
		return format(parseFineractDate(date), "yyyy-MM-dd");
	} catch {
		return "";
	}
}

export default function BusinessDatePage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [selectedType, setSelectedType] = useState<
		"BUSINESS_DATE" | "COB_DATE"
	>("BUSINESS_DATE");
	const [newDate, setNewDate] = useState("");

	const {
		data: businessDates,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["business-dates", tenantId],
		queryFn: () => fetchBusinessDates(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: (update: BusinessDateUpdateRequest) =>
			updateBusinessDate(tenantId, update),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["business-dates", tenantId] });
			setSubmitError(null);
			setSuccessMessage(
				`${result.type === "COB_DATE" ? "Close of Business Date" : "Business Date"} updated to ${result.date || "the selected value"}.`,
			);
		},
		onError: (error) => {
			setSuccessMessage(null);
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateBusinessDate",
					endpoint: BFF_ROUTES.businessDate,
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	useEffect(() => {
		if (!successMessage) {
			return;
		}

		const timer = setTimeout(() => setSuccessMessage(null), 5000);
		return () => clearTimeout(timer);
	}, [successMessage]);

	const selectedDate = businessDates?.find((bd) => bd.type === selectedType);
	const selectedTypeMetadata = DATE_TYPE_OPTIONS.find(
		(option) => option.type === selectedType,
	);
	const formattedSelectedDate = convertFineractDateToInputValue(
		selectedDate?.date,
	);

	useEffect(() => {
		setNewDate(formattedSelectedDate);
	}, [formattedSelectedDate]);

	const formattedDateForRequest = (() => {
		if (!newDate) {
			return null;
		}

		try {
			return formatDateStringToFormat(newDate, DATE_FORMAT);
		} catch {
			return null;
		}
	})();

	const handleUpdate = () => {
		if (!formattedDateForRequest) {
			return;
		}

		setSubmitError(null);
		setSuccessMessage(null);

		updateMutation.mutate({
			type: selectedType,
			date: formattedDateForRequest,
			dateFormat: DATE_FORMAT,
			locale: "en",
		});
	};

	const hasChanges =
		Boolean(formattedDateForRequest) &&
		formattedDateForRequest !== (selectedDate?.date || "");
	const detailMessages = getSubmitErrorDetails(submitError);
	const dateFieldError = getFieldError(submitError, "date");

	if (isLoading) {
		return (
			<PageShell
				title="Business Date"
				subtitle="Control the operational day used by transactions and close-of-business processing."
			>
				<div className="max-w-2xl space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-4 w-72" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-4 w-40" />
						</div>
					</div>
					<div className="space-y-3">
						<Skeleton className="h-6 w-40" />
						{Array.from({ length: 2 }).map((_, index) => (
							<div
								key={`business-date-skeleton-${index}`}
								className="space-y-2 rounded-lg border p-4"
							>
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-7 w-40" />
								<Skeleton className="h-4 w-64" />
							</div>
						))}
					</div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Business Date"
				subtitle="Control the operational day used by transactions and close-of-business processing."
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load business dates</AlertTitle>
					<AlertDescription>
						The business date settings could not be fetched right now. Refresh
						the page and try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Business Date"
			subtitle="Control the operational day used by transactions and close-of-business processing."
		>
			<div className="max-w-3xl space-y-6">
				<Alert>
					<AlertTitle>What this page manages</AlertTitle>
					<AlertDescription>
						<p>
							Use this page to keep your institution's operational timeline
							accurate.
						</p>
						<ul className="mt-2 list-disc space-y-1 pl-5">
							<li>
								Business Date controls the effective day for transactions,
								schedules, and validations.
							</li>
							<li>
								Close of Business Date tracks the most recent date that
								end-of-day processing has completed.
							</li>
						</ul>
					</AlertDescription>
				</Alert>

				{submitError && (
					<Alert variant="destructive">
						<AlertTitle>Unable to update business date</AlertTitle>
						<AlertDescription>
							<p>{submitError.message}</p>
							{detailMessages.length > 0 && (
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{detailMessages.map((detail) => (
										<li key={detail}>{detail}</li>
									))}
								</ul>
							)}
						</AlertDescription>
					</Alert>
				)}

				{successMessage && (
					<Alert>
						<AlertTitle>Business date updated</AlertTitle>
						<AlertDescription>{successMessage}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Update Date</CardTitle>
						<CardDescription>
							Choose a date type, review its current value, then apply a new
							date.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="date-type">Date Type</Label>
							<Select
								value={selectedType}
								onValueChange={(value: "BUSINESS_DATE" | "COB_DATE") => {
									setSelectedType(value);
									setSubmitError(null);
									setSuccessMessage(null);
								}}
							>
								<SelectTrigger id="date-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DATE_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.type} value={option.type}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="mt-1 text-sm text-muted-foreground">
								{selectedTypeMetadata?.description}
							</p>
						</div>

						<div className="space-y-2">
							<Label>Current Date</Label>
							<div className="rounded-sm border bg-muted/40 p-3">
								{selectedDate?.date || "Not set"}
							</div>
							{selectedDate?.description && (
								<p className="text-sm text-muted-foreground">
									{selectedDate.description}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="new-date">New Date</Label>
							<Input
								id="new-date"
								type="date"
								value={newDate}
								onChange={(e) => {
									setNewDate(e.target.value);
									setSubmitError(null);
									setSuccessMessage(null);
								}}
								placeholder="Select new date"
							/>
							<p className="text-sm text-muted-foreground">
								Apply a new{" "}
								{selectedType === "BUSINESS_DATE"
									? "Business Date"
									: "Close of Business Date"}
								.
							</p>
							{dateFieldError && (
								<p className="text-sm text-destructive">{dateFieldError}</p>
							)}
						</div>

						<div className="flex justify-end">
							<Button
								onClick={handleUpdate}
								disabled={!hasChanges || updateMutation.isPending}
							>
								{updateMutation.isPending ? "Updating..." : "Update Date"}
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<h3 className="text-lg font-semibold">All Business Dates</h3>
					<div className="grid gap-4">
						{businessDates?.map((date) => {
							const dateType =
								date.type === "COB_DATE" ? "COB_DATE" : "BUSINESS_DATE";

							return (
								<div
									key={`${dateType}-${date.date || "unset"}`}
									className="rounded-sm border p-4"
								>
									<div className="flex items-start justify-between">
										<div>
											<h4 className="font-medium">
												{dateType === "BUSINESS_DATE"
													? "Business Date"
													: "Close of Business Date"}
											</h4>
											<p className="text-2xl font-bold">
												{date.date || "Not set"}
											</p>
											{date.description && (
												<p className="mt-1 text-sm text-muted-foreground">
													{date.description}
												</p>
											)}
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedType(dateType);
												setNewDate(convertFineractDateToInputValue(date.date));
												setSubmitError(null);
												setSuccessMessage(null);
											}}
										>
											Edit
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</PageShell>
	);
}
