"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	BusinessDateResponse,
	BusinessDateUpdateRequest,
	BusinessDateUpdateResponse,
	GetBusinessDatesResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchBusinessDates(
	tenantId: string,
): Promise<GetBusinessDatesResponse> {
	const response = await fetch(BFF_ROUTES.businessDate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch business dates");
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
		throw new Error("Failed to update business date");
	}

	return response.json();
}

export default function BusinessDatePage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["business-dates"] });
			setToastMessage("Business date updated successfully");
		},
		onError: (error) => {
			setToastMessage(mapFineractError(error).message);
		},
	});

	useEffect(() => {
		if (toastMessage) {
			const timer = setTimeout(() => setToastMessage(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toastMessage]);

	const [selectedType, setSelectedType] = useState<
		"BUSINESS_DATE" | "COB_DATE"
	>("BUSINESS_DATE");
	const [newDate, setNewDate] = useState("");

	const selectedDate = businessDates?.find((bd) => bd.type === selectedType);

	const handleUpdate = () => {
		if (!newDate) return;

		updateMutation.mutate({
			type: selectedType,
			date: newDate,
			dateFormat: "yyyy-MM-dd",
			locale: "en",
		});
	};

	const hasChanges = newDate !== selectedDate?.date && newDate !== "";

	if (isLoading) {
		return (
			<PageShell title="Business Date" subtitle="Loading...">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Business Date"
				subtitle="Configure organisation business dates"
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load business dates. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Business Date"
			subtitle="Manage your organisation's business date and close of business date"
		>
			<div className="max-w-2xl space-y-6">
				<div className="space-y-4">
					<div>
						<Label htmlFor="date-type">Date Type</Label>
						<Select
							value={selectedType}
							onValueChange={(value: "BUSINESS_DATE" | "COB_DATE") => {
								setSelectedType(value);
								setNewDate("");
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="BUSINESS_DATE">Business Date</SelectItem>
								<SelectItem value="COB_DATE">Close of Business Date</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-sm text-muted-foreground mt-1">
							{selectedType === "BUSINESS_DATE"
								? "The current operational date for business transactions"
								: "The date when close of business operations were last run"}
						</p>
					</div>

					<div className="space-y-2">
						<Label>Current Date</Label>
						<div className="p-3 bg-muted rounded-md">
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
							onChange={(e) => setNewDate(e.target.value)}
							placeholder="Select new date"
						/>
						<p className="text-sm text-muted-foreground">
							Set a new {selectedType === "BUSINESS_DATE" ? "business" : "COB"}{" "}
							date
						</p>
					</div>
				</div>

				{hasChanges && (
					<div className="flex justify-end">
						<Button onClick={handleUpdate} disabled={updateMutation.isPending}>
							{updateMutation.isPending ? "Updating..." : "Update Date"}
						</Button>
					</div>
				)}

				<div className="space-y-4">
					<h3 className="text-lg font-semibold">All Business Dates</h3>
					<div className="grid gap-4">
						{businessDates?.map((date) => (
							<div key={date.type} className="p-4 border rounded-lg">
								<div className="flex justify-between items-start">
									<div>
										<h4 className="font-medium">
											{date.type === "BUSINESS_DATE"
												? "Business Date"
												: "COB Date"}
										</h4>
										<p className="text-2xl font-bold">{date.date}</p>
										{date.description && (
											<p className="text-sm text-muted-foreground mt-1">
												{date.description}
											</p>
										)}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSelectedType(date.type!);
											setNewDate(date.date || "");
										}}
									>
										Edit
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{toastMessage && (
				<div className="fixed bottom-4 right-4 z-50">
					<Alert>
						<AlertTitle>Notification</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</PageShell>
	);
}
