"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
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
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetHolidaysResponse,
	GetOfficesResponse,
	PostHolidaysHolidayIdResponse,
	PostHolidaysRequest,
	PostHolidaysResponse,
	PutHolidaysHolidayIdRequest,
	PutHolidaysHolidayIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type HolidayReschedulingOption = {
	id?: number;
	code?: string;
	value?: string;
};

async function fetchHolidays(
	tenantId: string,
	officeId?: number,
): Promise<GetHolidaysResponse[]> {
	const url = officeId
		? `${BFF_ROUTES.holidays}?officeId=${officeId}`
		: BFF_ROUTES.holidays;

	const response = await fetch(url, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function fetchOffices(tenantId: string): Promise<GetOfficesResponse[]> {
	const response = await fetch(BFF_ROUTES.offices, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function fetchHolidayTemplate(
	tenantId: string,
): Promise<HolidayReschedulingOption[]> {
	const response = await fetch(`${BFF_ROUTES.holidays}/template`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	const template = (await response.json()) as unknown;
	return Array.isArray(template)
		? (template as HolidayReschedulingOption[])
		: [];
}

async function createHoliday(
	tenantId: string,
	holiday: PostHolidaysRequest,
): Promise<PostHolidaysResponse> {
	const response = await fetch(BFF_ROUTES.holidays, {
		method: "POST",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(holiday),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateHoliday(
	tenantId: string,
	holidayId: number,
	holiday: PutHolidaysHolidayIdRequest,
): Promise<PutHolidaysHolidayIdResponse> {
	const response = await fetch(`${BFF_ROUTES.holidays}/${holidayId}`, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(holiday),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function activateHoliday(
	tenantId: string,
	holidayId: number,
): Promise<PostHolidaysHolidayIdResponse> {
	const response = await fetch(
		`${BFF_ROUTES.holidays}/${holidayId}?command=activate`,
		{
			method: "POST",
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

export default function HolidaysPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingHoliday, setEditingHoliday] =
		useState<GetHolidaysResponse | null>(null);
	const [selectedOffice, setSelectedOffice] = useState<number | null>(null);

	const {
		data: holidays,
		isLoading: isLoadingHolidays,
		error: holidaysError,
	} = useQuery({
		queryKey: ["holidays", tenantId, selectedOffice],
		queryFn: () => fetchHolidays(tenantId, selectedOffice || undefined),
	});

	const { data: offices, isLoading: isLoadingOffices } = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});
	const {
		data: reschedulingTypeOptions,
		isLoading: isLoadingTemplate,
		error: templateError,
	} = useQuery({
		queryKey: ["holidays-template", tenantId],
		queryFn: () => fetchHolidayTemplate(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (holiday: PostHolidaysRequest) =>
			createHoliday(tenantId, holiday),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			setToastMessage("Holiday created successfully");
			setIsSheetOpen(false);
			resetForm();
		},
		onError: (error) => {
			setToastMessage(mapFineractError(error).message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			holidayId,
			holiday,
		}: {
			holidayId: number;
			holiday: PutHolidaysHolidayIdRequest;
		}) => updateHoliday(tenantId, holidayId, holiday),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			setToastMessage("Holiday updated successfully");
			setIsSheetOpen(false);
			setEditingHoliday(null);
			resetForm();
		},
		onError: (error) => {
			setToastMessage(mapFineractError(error).message);
		},
	});

	const activateMutation = useMutation({
		mutationFn: (holidayId: number) => activateHoliday(tenantId, holidayId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			setToastMessage("Holiday activated successfully");
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

	const [formData, setFormData] = useState({
		name: "",
		fromDate: "",
		toDate: "",
		repaymentsRescheduledTo: "",
		reschedulingType: "",
		description: "",
		offices: [] as number[],
	});

	const resetForm = () => {
		setFormData({
			name: "",
			fromDate: "",
			toDate: "",
			repaymentsRescheduledTo: "",
			reschedulingType: "",
			description: "",
			offices: [],
		});
	};

	useEffect(() => {
		if (editingHoliday) {
			setFormData({
				name: editingHoliday.name || "",
				fromDate: editingHoliday.fromDate || "",
				toDate: editingHoliday.toDate || "",
				repaymentsRescheduledTo: editingHoliday.repaymentsRescheduledTo || "",
				reschedulingType:
					reschedulingTypeOptions?.[0]?.id !== undefined
						? String(reschedulingTypeOptions[0].id)
						: "",
				description: "",
				offices: editingHoliday.officeId ? [editingHoliday.officeId] : [],
			});
		}
	}, [editingHoliday, reschedulingTypeOptions]);

	useEffect(() => {
		if (editingHoliday || formData.reschedulingType) {
			return;
		}

		const defaultOption = reschedulingTypeOptions?.[0];
		if (defaultOption?.id === undefined) {
			return;
		}

		setFormData((current) => ({
			...current,
			reschedulingType: String(defaultOption.id),
		}));
	}, [editingHoliday, formData.reschedulingType, reschedulingTypeOptions]);

	const handleSubmit = () => {
		const effectiveRepaymentRescheduleDate =
			formData.repaymentsRescheduledTo || formData.toDate || formData.fromDate;
		const parsedReschedulingType = Number(formData.reschedulingType);

		if (!effectiveRepaymentRescheduleDate) {
			setToastMessage("Repayments rescheduled to date is required");
			return;
		}
		if (!Number.isInteger(parsedReschedulingType)) {
			setToastMessage("Repayment reschedule type is required");
			return;
		}

		const holidayData: PostHolidaysRequest & { reschedulingType: number } = {
			name: formData.name,
			fromDate: formatDateStringToFormat(formData.fromDate, "dd MMMM yyyy"),
			toDate: formatDateStringToFormat(formData.toDate, "dd MMMM yyyy"),
			repaymentsRescheduledTo: formatDateStringToFormat(
				effectiveRepaymentRescheduleDate,
				"dd MMMM yyyy",
			),
			reschedulingType: parsedReschedulingType,
			description: formData.description,
			offices: formData.offices.map((officeId) => ({ officeId })),
			locale: "en",
			dateFormat: "dd MMMM yyyy",
		};

		if (editingHoliday?.id) {
			updateMutation.mutate({
				holidayId: editingHoliday.id,
				holiday: holidayData,
			});
		} else {
			createMutation.mutate(holidayData);
		}
	};

	const columns = [
		{
			header: "Holiday Name",
			cell: (row: GetHolidaysResponse) => row.name,
		},
		{
			header: "From Date",
			cell: (row: GetHolidaysResponse) => row.fromDate,
		},
		{
			header: "To Date",
			cell: (row: GetHolidaysResponse) => row.toDate,
		},
		{
			header: "Status",
			cell: (row: GetHolidaysResponse) => row.status?.value || "Unknown",
		},
		{
			header: "Office",
			cell: (row: GetHolidaysResponse) => {
				const office = offices?.find((o) => o.id === row.officeId);
				return office?.name || "All Offices";
			},
		},
		{
			header: "Actions",
			cell: (row: GetHolidaysResponse) => (
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setEditingHoliday(row);
							setIsSheetOpen(true);
						}}
					>
						Edit
					</Button>
					{row.status?.id === 100 && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => row.id && activateMutation.mutate(row.id)}
							disabled={activateMutation.isPending}
						>
							Activate
						</Button>
					)}
				</div>
			),
		},
	];

	const isLoading = isLoadingHolidays || isLoadingOffices || isLoadingTemplate;
	const error = holidaysError || templateError;

	if (isLoading) {
		return (
			<PageShell
				title="Holidays"
				subtitle="Configure organisation holidays and office applicability"
			>
				<div className="space-y-6">
					<div className="flex items-end justify-between">
						<div className="space-y-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-64" />
						</div>
						<Skeleton className="h-10 w-32" />
					</div>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-24" />
							<Skeleton className="h-4 w-72" />
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Array.from({ length: 8 }).map((_, index) => (
									<div key={index} className="grid grid-cols-5 gap-3">
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell title="Holidays" subtitle="Configure organisation holidays">
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load holidays. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Holidays"
			subtitle="Manage holidays and non-working days for your organisation offices"
		>
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div className="space-y-2">
						<Label htmlFor="office-filter">Filter by Office</Label>
						<Select
							value={selectedOffice?.toString() || "all-offices"}
							onValueChange={(value) =>
								setSelectedOffice(
									value === "all-offices" ? null : parseInt(value),
								)
							}
						>
							<SelectTrigger className="w-64">
								<SelectValue placeholder="All Offices" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all-offices">All Offices</SelectItem>
								{offices?.map(
									(office) =>
										office.id !== undefined && (
											<SelectItem key={office.id} value={office.id.toString()}>
												{office.name}
											</SelectItem>
										),
								)}
							</SelectContent>
						</Select>
					</div>

					<Button
						onClick={() => {
							setEditingHoliday(null);
							resetForm();
							setIsSheetOpen(true);
						}}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Holiday
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Holidays</CardTitle>
						<CardDescription>
							List of all holidays configured for your organisation
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={columns}
							data={holidays || []}
							getRowId={(row: GetHolidaysResponse) =>
								row.id || row.name || "holiday"
							}
						/>
					</CardContent>
				</Card>
			</div>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent className="w-full sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>
							{editingHoliday ? "Edit Holiday" : "Add New Holiday"}
						</SheetTitle>
						<SheetDescription>
							Configure holiday details and applicable offices
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Holiday Name</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Enter holiday name"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="fromDate">From Date</Label>
								<Input
									id="fromDate"
									type="date"
									value={formData.fromDate}
									onChange={(e) =>
										setFormData({ ...formData, fromDate: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="toDate">To Date</Label>
								<Input
									id="toDate"
									type="date"
									value={formData.toDate}
									onChange={(e) =>
										setFormData({ ...formData, toDate: e.target.value })
									}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="repaymentsRescheduledTo">
								Repayments Rescheduled To
							</Label>
							<Input
								id="repaymentsRescheduledTo"
								type="date"
								value={formData.repaymentsRescheduledTo}
								onChange={(e) =>
									setFormData({
										...formData,
										repaymentsRescheduledTo: e.target.value,
									})
								}
							/>
							<p className="text-xs text-muted-foreground">
								Required by backend. If left empty, To Date will be used.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="reschedulingType">
								Repayment Reschedule Type
							</Label>
							<Select
								value={formData.reschedulingType}
								onValueChange={(value) =>
									setFormData({ ...formData, reschedulingType: value })
								}
							>
								<SelectTrigger id="reschedulingType">
									<SelectValue placeholder="Select repayment reschedule type" />
								</SelectTrigger>
								<SelectContent>
									{reschedulingTypeOptions
										?.filter((option) => option.id !== undefined)
										.map((option) => (
											<SelectItem key={option.id} value={String(option.id)}>
												{option.value || option.code || option.id}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								placeholder="Optional description"
							/>
						</div>

						<div className="space-y-2">
							<Label>Applicable Offices</Label>
							<div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
								{offices?.map((office) => {
									const officeId = office.id;
									if (officeId === undefined) {
										return null;
									}

									return (
										<div key={officeId} className="flex items-center space-x-2">
											<Checkbox
												id={`office-${officeId}`}
												checked={formData.offices.includes(officeId)}
												onCheckedChange={(checked) => {
													if (checked === true) {
														if (formData.offices.includes(officeId)) {
															return;
														}

														setFormData({
															...formData,
															offices: [...formData.offices, officeId],
														});
														return;
													}

													setFormData({
														...formData,
														offices: formData.offices.filter(
															(id) => id !== officeId,
														),
													});
												}}
											/>
											<Label htmlFor={`office-${officeId}`} className="text-sm">
												{office.name}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setIsSheetOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{createMutation.isPending || updateMutation.isPending
								? "Saving..."
								: "Save"}
						</Button>
					</div>
				</SheetContent>
			</Sheet>

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
