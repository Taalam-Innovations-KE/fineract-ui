"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isValid, parseISO } from "date-fns";
import { Building2, Plus, UserCheck, Users } from "lucide-react";
import { useDeferredValue, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { parseFineractDate } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	OfficeData,
	Staff,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

type StaffFilters = {
	officeId?: string;
	loanOfficersOnly?: boolean;
	status?: string;
	staffInOfficeHierarchy?: boolean;
};

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

async function fetchStaff(
	tenantId: string,
	filters: StaffFilters,
): Promise<Staff[]> {
	const params = new URLSearchParams();

	if (filters.officeId) {
		params.set("officeId", filters.officeId);
	}
	if (filters.loanOfficersOnly) {
		params.set("loanOfficersOnly", "true");
	}
	if (filters.status && filters.status !== "all") {
		params.set("status", filters.status);
	}
	if (filters.staffInOfficeHierarchy) {
		params.set("staffInOfficeHierarchy", "true");
	}

	const queryString = params.toString();
	const response = await fetch(
		queryString ? `${BFF_ROUTES.staff}?${queryString}` : BFF_ROUTES.staff,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function createStaff(tenantId: string, payload: StaffRequest) {
	const response = await fetch(BFF_ROUTES.staff, {
		method: "POST",
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

function StaffTableSkeleton() {
	return (
		<div className="space-y-2">
			<div className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-16" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2 text-right">
								<Skeleton className="ml-auto h-4 w-12" />
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, index) => (
							<tr key={`staff-row-skeleton-${index}`}>
								<td className="px-3 py-2">
									<div className="space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-6 w-20" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-28" />
								</td>
								<td className="px-3 py-2 text-right">
									<Skeleton className="ml-auto h-8 w-16" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function formatStaffDate(value?: string) {
	if (!value) {
		return "Not provided";
	}

	const isoDate = parseISO(value);
	if (isValid(isoDate)) {
		return isoDate.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}

	try {
		const fineractDate = parseFineractDate(value);
		if (isValid(fineractDate)) {
			return fineractDate.toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			});
		}
	} catch {
		// Ignore and return the original string.
	}

	return value;
}

export default function StaffPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [filters, setFilters] = useState<StaffFilters>({
		status: "active",
		loanOfficersOnly: false,
		staffInOfficeHierarchy: false,
	});
	const deferredSearchValue = useDeferredValue(searchValue);

	const {
		data: offices = [],
		isLoading: officesLoading,
		error: officesError,
	} = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
		enabled: Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
	});

	const {
		data: staff = [],
		isLoading: staffLoading,
		error: staffError,
	} = useQuery({
		queryKey: ["staff", tenantId, filters],
		queryFn: () => fetchStaff(tenantId, filters),
		enabled: Boolean(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: StaffRequest) => createStaff(tenantId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setIsCreateSheetOpen(false);
		},
	});

	const normalizedSearch = deferredSearchValue.trim().toLowerCase();
	const filteredStaff = staff.filter((member) => {
		if (normalizedSearch.length === 0) {
			return true;
		}

		return [
			member.displayName,
			member.firstname,
			member.lastname,
			member.office?.name,
			member.mobileNo,
			member.externalId,
		]
			.filter(Boolean)
			.some((value) => value?.toLowerCase().includes(normalizedSearch));
	});

	const activeCount = filteredStaff.filter((member) => member.active).length;
	const inactiveCount = filteredStaff.filter((member) => !member.active).length;
	const loanOfficerCount = filteredStaff.filter(
		(member) => member.loanOfficer,
	).length;

	const columns: DataTableColumn<Staff>[] = [
		{
			header: "Staff",
			cell: (member) => (
				<div className="space-y-1">
					<div className="font-medium">
						{member.displayName ||
							[member.firstname, member.lastname].filter(Boolean).join(" ") ||
							"Unnamed Staff"}
					</div>
					<div className="text-xs text-muted-foreground">
						{member.mobileNo || member.externalId || "No contact metadata"}
					</div>
				</div>
			),
		},
		{
			header: "Office",
			cell: (member) => (
				<span className={member.office?.name ? "" : "text-muted-foreground"}>
					{member.office?.name || "No office"}
				</span>
			),
		},
		{
			header: "Role",
			cell: (member) =>
				member.loanOfficer ? (
					<Badge variant="default">Loan Officer</Badge>
				) : (
					<Badge variant="secondary">Staff</Badge>
				),
		},
		{
			header: "Joining Date",
			cell: (member) => (
				<span className={member.joiningDate ? "" : "text-muted-foreground"}>
					{formatStaffDate(member.joiningDate)}
				</span>
			),
		},
		{
			header: "Status",
			cell: (member) => (
				<Badge variant={member.active ? "success" : "secondary"}>
					{member.active ? "Active" : "Inactive"}
				</Badge>
			),
		},
	];

	return (
		<PageShell
			title="Staff"
			subtitle="Manage organisational staff records independently from user accounts, with office-aware filtering and active-status controls."
			actions={
				<Button onClick={() => setIsCreateSheetOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Staff
				</Button>
			}
		>
			<div className="space-y-6">
				<Alert>
					<AlertTitle>Staff records are updated, not deleted</AlertTitle>
					<AlertDescription>
						Use inactive status when a staff member leaves. If portfolio
						assignments block inactivation, use the force status option in the
						edit flow.
					</AlertDescription>
				</Alert>

				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<Users className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{filteredStaff.length}
									</div>
									<div className="text-sm text-muted-foreground">
										Visible Staff
									</div>
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
									<div className="text-2xl font-bold">{activeCount}</div>
									<div className="text-sm text-muted-foreground">Active</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
									<Building2 className="h-5 w-5 text-info" />
								</div>
								<div>
									<div className="text-2xl font-bold">{loanOfficerCount}</div>
									<div className="text-sm text-muted-foreground">
										Loan Officers
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							Use server-backed office, status, and loan officer filters, then
							refine locally with search.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
							<div className="space-y-2">
								<Label htmlFor="staff-search">Search</Label>
								<Input
									id="staff-search"
									value={searchValue}
									onChange={(event) => setSearchValue(event.target.value)}
									placeholder="Search by name, office, mobile, or external ID"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="staff-office-filter">Office</Label>
								<Select
									value={filters.officeId || "all"}
									onValueChange={(value) =>
										setFilters((current) => ({
											...current,
											officeId: value === "all" ? undefined : value,
										}))
									}
								>
									<SelectTrigger id="staff-office-filter">
										<SelectValue placeholder="All offices" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All offices</SelectItem>
										{offices.map((office) => (
											<SelectItem key={office.id} value={String(office.id)}>
												{office.nameDecorated || office.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="staff-status-filter">Status</Label>
								<Select
									value={filters.status || "all"}
									onValueChange={(value) =>
										setFilters((current) => ({ ...current, status: value }))
									}
								>
									<SelectTrigger id="staff-status-filter">
										<SelectValue placeholder="All statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All statuses</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="staff-role-filter">Role</Label>
								<Select
									value={filters.loanOfficersOnly ? "loanOfficer" : "all"}
									onValueChange={(value) =>
										setFilters((current) => ({
											...current,
											loanOfficersOnly: value === "loanOfficer",
										}))
									}
								>
									<SelectTrigger id="staff-role-filter">
										<SelectValue placeholder="All staff" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All staff</SelectItem>
										<SelectItem value="loanOfficer">
											Loan officers only
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="staff-hierarchy-filter"
								checked={filters.staffInOfficeHierarchy ?? false}
								onCheckedChange={(value) =>
									setFilters((current) => ({
										...current,
										staffInOfficeHierarchy: Boolean(value),
									}))
								}
							/>
							<Label
								htmlFor="staff-hierarchy-filter"
								className="cursor-pointer"
							>
								Include office hierarchy when filtering by office
							</Label>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Staff Members</CardTitle>
						<CardDescription>
							{filteredStaff.length} staff member
							{filteredStaff.length === 1 ? "" : "s"} match the current filters.{" "}
							{inactiveCount} currently inactive.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{staffLoading ? <StaffTableSkeleton /> : null}
						{staffError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load staff</AlertTitle>
								<AlertDescription>
									Check connectivity and your access to the staff resource, then
									retry.
								</AlertDescription>
							</Alert>
						) : null}
						{officesError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load offices</AlertTitle>
								<AlertDescription>
									Office metadata is required for filtering and staff setup.
								</AlertDescription>
							</Alert>
						) : null}
						{!staffLoading && !staffError ? (
							<DataTable
								data={filteredStaff}
								columns={columns}
								getRowId={(member) =>
									member.id ?? member.displayName ?? "staff-row"
								}
								enableActions={true}
								getViewUrl={(member) =>
									`/config/organisation/staff/${member.id}`
								}
								emptyMessage="No staff records match the current filters."
							/>
						) : null}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>Add Staff Member</SheetTitle>
						<SheetDescription>
							Create the organisational staff record first. A system user can be
							linked later if login access is required.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						{officesLoading ? (
							<div className="space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : officesError ? (
							<Alert variant="destructive">
								<AlertTitle>Office data unavailable</AlertTitle>
								<AlertDescription>
									Staff creation requires office metadata to be loaded first.
								</AlertDescription>
							</Alert>
						) : (
							<StaffForm
								offices={offices}
								onSubmit={(payload) =>
									createMutation.mutateAsync(payload as StaffRequest)
								}
								onCancel={() => setIsCreateSheetOpen(false)}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
