"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
	GetWorkingDaysTemplateResponse,
	PutWorkingDaysRequest,
	WorkingDaysData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchWorkingDays(tenantId: string): Promise<WorkingDaysData> {
	const response = await fetch(BFF_ROUTES.workingDays, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch working days");
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
		throw new Error("Failed to fetch working days template");
	}

	return response.json();
}

async function updateWorkingDays(
	tenantId: string,
	updates: PutWorkingDaysRequest,
): Promise<void> {
	const response = await fetch(BFF_ROUTES.workingDays, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		throw new Error("Failed to update working days");
	}
}

const DAYS_OF_WEEK = [
	{ value: "MONDAY", label: "Monday" },
	{ value: "TUESDAY", label: "Tuesday" },
	{ value: "WEDNESDAY", label: "Wednesday" },
	{ value: "THURSDAY", label: "Thursday" },
	{ value: "FRIDAY", label: "Friday" },
	{ value: "SATURDAY", label: "Saturday" },
	{ value: "SUNDAY", label: "Sunday" },
];

export default function WorkingDaysPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const {
		data: workingDays,
		isLoading: isLoadingDays,
		error: daysError,
	} = useQuery({
		queryKey: ["working-days", tenantId],
		queryFn: () => fetchWorkingDays(tenantId),
	});

	const {
		data: template,
		isLoading: isLoadingTemplate,
		error: templateError,
	} = useQuery({
		queryKey: ["working-days-template", tenantId],
		queryFn: () => fetchWorkingDaysTemplate(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: (updates: PutWorkingDaysRequest) =>
			updateWorkingDays(tenantId, updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["working-days"] });
			setToastMessage("Working days updated successfully");
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

	const isLoading = isLoadingDays || isLoadingTemplate;
	const error = daysError || templateError;

	const [localConfig, setLocalConfig] = useState<
		Partial<PutWorkingDaysRequest>
	>({});

	useEffect(() => {
		if (workingDays) {
			setLocalConfig({
				recurrence: workingDays.recurrence,
				extendTermForDailyRepayments: workingDays.extendTermForDailyRepayments,
				repaymentRescheduleType: workingDays.repaymentRescheduleType,
			});
		}
	}, [workingDays]);

	const handleSave = () => {
		updateMutation.mutate(localConfig as PutWorkingDaysRequest);
	};

	const hasChanges =
		localConfig.recurrence !== workingDays?.recurrence ||
		localConfig.extendTermForDailyRepayments !==
			workingDays?.extendTermForDailyRepayments ||
		localConfig.repaymentRescheduleType?.id !==
			workingDays?.repaymentRescheduleType?.id;

	if (isLoading) {
		return (
			<PageShell title="Working Days" subtitle="Loading...">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Working Days"
				subtitle="Configure organisation working days"
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load working days configuration. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Working Days"
			subtitle="Configure the days of the week that are considered working days for your organisation"
		>
			<div className="max-w-2xl space-y-6">
				<div className="space-y-4">
					<div>
						<Label className="text-base font-semibold">Working Days</Label>
						<p className="text-sm text-muted-foreground mb-3">
							Select which days of the week are considered working days
						</p>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							{DAYS_OF_WEEK.map((day) => (
								<div key={day.value} className="flex items-center space-x-2">
									<Checkbox
										id={day.value}
										checked={
											localConfig.recurrence?.includes(day.value) || false
										}
										onCheckedChange={(checked: boolean) => {
											const current = localConfig.recurrence || "";
											const days = current.split(",").filter((d) => d.trim());
											let newDays: string[];

											if (checked) {
												newDays = [...days, day.value];
											} else {
												newDays = days.filter((d) => d !== day.value);
											}

											setLocalConfig({
												...localConfig,
												recurrence: newDays.join(","),
											});
										}}
									/>
									<Label htmlFor={day.value} className="text-sm">
										{day.label}
									</Label>
								</div>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="extend-daily"
								checked={localConfig.extendTermForDailyRepayments || false}
								onCheckedChange={(checked: boolean) =>
									setLocalConfig({
										...localConfig,
										extendTermForDailyRepayments: checked,
									})
								}
							/>
							<div>
								<Label htmlFor="extend-daily" className="text-sm font-medium">
									Extend term for daily repayments
								</Label>
								<p className="text-xs text-muted-foreground">
									Allow loan terms to be extended when repayments fall on
									non-working days
								</p>
							</div>
						</div>
					</div>

					{template?.repaymentRescheduleOptions && (
						<div className="space-y-2">
							<Label htmlFor="reschedule-type">Repayment Reschedule Type</Label>
							<Select
								value={
									localConfig.repaymentRescheduleType?.id?.toString() || ""
								}
								onValueChange={(value) => {
									const selectedOption =
										template?.repaymentRescheduleOptions?.find(
											(option) => option.id?.toString() === value,
										);
									setLocalConfig({
										...localConfig,
										repaymentRescheduleType: selectedOption,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select reschedule type" />
								</SelectTrigger>
								<SelectContent>
									{template.repaymentRescheduleOptions.map((option) => (
										<SelectItem
											key={option.id}
											value={option.id?.toString() || ""}
										>
											{option.value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				{hasChanges && (
					<div className="flex justify-end">
						<Button onClick={handleSave} disabled={updateMutation.isPending}>
							{updateMutation.isPending ? "Updating..." : "Save Changes"}
						</Button>
					</div>
				)}
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
