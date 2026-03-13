"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Building2,
	CalendarDays,
	Edit,
	UserCheck,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { StaffForm } from "@/components/config/forms/staff-form";
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
	OfficeData,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";
import {
	getStaffDisplayName,
	getStaffIsActive,
	getStaffIsLoanOfficer,
	getStaffOfficeName,
	type StaffFormRecord,
} from "@/lib/schemas/staff";
import { useTenantStore } from "@/store/tenant";

async function fetchStaffDetail(
	tenantId: string,
	id: string,
): Promise<StaffFormRecord> {
	const response = await fetch(`${BFF_ROUTES.staff}/${id}?template=true`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function fetchOffices(tenantId: string): Promise<OfficeData[]> {
	const response = await fetch(BFF_ROUTES.offices, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function updateStaff(
	tenantId: string,
	staffId: number,
	payload: StaffRequest,
) {
	const response = await fetch(`${BFF_ROUTES.staff}/${staffId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

function StaffDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={`staff-stat-skeleton-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-8 w-24" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-56" />
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 6 }).map((_, index) => (
						<div key={`staff-field-skeleton-${index}`} className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-36" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export default function StaffDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [editSheetOpen, setEditSheetOpen] = useState(false);

	const {
		data: staff,
		isLoading: staffLoading,
		error: staffError,
	} = useQuery({
		queryKey: ["staff-member", tenantId, id],
		queryFn: () => fetchStaffDetail(tenantId, id),
		enabled: Boolean(tenantId && id),
	});

	const { data: offices = [] } = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
		enabled: Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
	});

	const updateMutation = useMutation({
		mutationFn: (payload: StaffRequest) =>
			updateStaff(tenantId, Number(id), payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["staff-member", tenantId, id],
			});
			await queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setEditSheetOpen(false);
		},
	});

	if (staffLoading) {
		return (
			<PageShell
				title="Staff Details"
				subtitle="Review staff profile, office alignment, and operational status"
			>
				<StaffDetailSkeleton />
			</PageShell>
		);
	}

	if (staffError || !staff) {
		return (
			<PageShell
				title="Staff Details"
				subtitle="Review staff profile, office alignment, and operational status"
				actions={
					<Button variant="outline" asChild>
						<Link href="/config/organisation/staff">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Staff
						</Link>
					</Button>
				}
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load staff details</AlertTitle>
					<AlertDescription>
						Check connectivity and your access to the staff resource, then
						retry.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const staffName = getStaffDisplayName(staff);
	const isActive = getStaffIsActive(staff);
	const isLoanOfficer = getStaffIsLoanOfficer(staff);
	const officeName = getStaffOfficeName(staff) || "Unassigned";
	const allowedOffices = staff.allowedOffices ?? offices;

	return (
		<>
			<PageShell
				title={`Staff: ${staffName}`}
				subtitle="Review staff profile, office alignment, and operational status"
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/organisation/staff">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Staff
							</Link>
						</Button>
						<Button variant="outline" onClick={() => setEditSheetOpen(true)}>
							<Edit className="mr-2 h-4 w-4" />
							Edit Staff
						</Button>
					</div>
				}
			>
				<div className="space-y-6">
					<Alert>
						<AlertTitle>Staff remains an organisational record</AlertTitle>
						<AlertDescription>
							Staff cannot be deleted through this flow. Use active status
							updates and force status only when assignment validations require
							it.
						</AlertDescription>
					</Alert>

					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<Building2 className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-lg font-semibold">{officeName}</div>
										<div className="text-sm text-muted-foreground">Office</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
										<UserCheck className="h-5 w-5 text-success" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<Badge variant={isActive ? "success" : "secondary"}>
												{isActive ? "Active" : "Inactive"}
											</Badge>
										</div>
										<div className="mt-1 text-sm text-muted-foreground">
											{isLoanOfficer
												? "Loan officer enabled"
												: "Standard staff"}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
										<CalendarDays className="h-5 w-5 text-info" />
									</div>
									<div>
										<div className="text-lg font-semibold">
											{staff.joiningDate || "Not provided"}
										</div>
										<div className="text-sm text-muted-foreground">
											Joining Date
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Staff Profile</CardTitle>
							<CardDescription>
								Identity, office, and contact details for this staff member.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1">
								<div className="text-sm font-medium">Display Name</div>
								<div>{staffName}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Office</div>
								<div>{officeName}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">First Name</div>
								<div>{staff.firstname || "Not provided"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Last Name</div>
								<div>{staff.lastname || "Not provided"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Mobile Number</div>
								<div>{staff.mobileNo || "Not provided"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">External ID</div>
								<div>{staff.externalId || "Not provided"}</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Operational Flags</CardTitle>
							<CardDescription>
								Active status and loan officer designation.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							<Badge variant={isActive ? "success" : "secondary"}>
								{isActive ? "Active" : "Inactive"}
							</Badge>
							<Badge variant={isLoanOfficer ? "default" : "secondary"}>
								{isLoanOfficer ? "Loan Officer" : "Staff"}
							</Badge>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>Edit Staff Member</SheetTitle>
						<SheetDescription>
							Update staff profile details, office assignment, and active
							status.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<StaffForm
							offices={allowedOffices}
							initialData={staff}
							onSubmit={(payload) =>
								updateMutation.mutateAsync(payload as StaffRequest)
							}
							onCancel={() => setEditSheetOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
