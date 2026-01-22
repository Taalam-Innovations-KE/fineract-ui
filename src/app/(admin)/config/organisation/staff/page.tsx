"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, PenLine, Plus, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StaffForm } from "@/components/config/forms/staff-form";
import { PageShell } from "@/components/config/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	OfficeData,
	Staff,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type StaffFilters = {
	officeId?: string;
	loanOfficersOnly?: boolean;
	status?: string;
};

async function fetchStaff(
	tenantId: string,
	filters: StaffFilters = {},
): Promise<Staff[]> {
	const params = new URLSearchParams();
	if (filters.officeId) params.set("officeId", filters.officeId);
	if (filters.loanOfficersOnly) params.set("loanOfficersOnly", "true");
	if (filters.status) params.set("status", filters.status);

	const queryString = params.toString();
	const url = queryString
		? `${BFF_ROUTES.staff}?${queryString}`
		: BFF_ROUTES.staff;

	const response = await fetch(url, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch staff");
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
		throw new Error("Failed to fetch offices");
	}

	return response.json();
}

async function createStaff(tenantId: string, data: StaffRequest) {
	const response = await fetch(BFF_ROUTES.staff, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to create staff");
	}

	return response.json();
}

async function updateStaff(
	tenantId: string,
	staffId: number,
	data: StaffRequest,
) {
	const response = await fetch(`${BFF_ROUTES.staff}/${staffId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to update staff");
	}

	return response.json();
}

export default function StaffPage() {
	const { tenantId } = useTenantStore();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
	const [filters, setFilters] = useState({
		officeId: "",
		loanOfficersOnly: false,
		status: "active",
	});
	const queryClient = useQueryClient();

	const isEditing = Boolean(selectedStaff);

	const { data: offices = [] } = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});

	const {
		data: staff = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["staff", tenantId, filters],
		queryFn: () => fetchStaff(tenantId, filters),
	});

	const createMutation = useMutation({
		mutationFn: (data: StaffRequest) => createStaff(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setIsDialogOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: StaffRequest) =>
			updateStaff(tenantId, selectedStaff!.id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setIsDialogOpen(false);
			setSelectedStaff(null);
		},
	});

	const handleEditStaff = (member: Staff) => {
		setSelectedStaff(member);
		setIsDialogOpen(true);
	};

	const handleCreateNew = () => {
		setSelectedStaff(null);
		setIsDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setIsDialogOpen(open);
		if (!open) {
			setSelectedStaff(null);
		}
	};

	const handleFilterChange = (
		key: keyof StaffFilters,
		value: string | boolean,
	) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const loanOfficers = staff.filter((s) => s.loanOfficer);
	const activeStaff = staff.filter((s) => s.active);
	const staffColumns = [
		{
			header: "Name",
			cell: (member: Staff) => (
				<span className="font-medium">{member.displayName}</span>
			),
		},
		{
			header: "Office",
			cell: (member: Staff) => (
				<span className={member.office?.name ? "" : "text-muted-foreground"}>
					{member.office?.name || "—"}
				</span>
			),
		},
		{
			header: "Role",
			cell: (member: Staff) =>
				member.loanOfficer ? (
					<Badge variant="default" className="text-xs px-2 py-0.5">
						Loan Officer
					</Badge>
				) : (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						Staff
					</Badge>
				),
		},
		{
			header: "Status",
			cell: (member: Staff) => (
				<Badge
					variant={member.active ? "success" : "secondary"}
					className="text-xs px-2 py-0.5"
				>
					{member.active ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			header: "External ID",
			cell: (member: Staff) => (
				<span className={member.externalId ? "" : "text-muted-foreground"}>
					{member.externalId || "—"}
				</span>
			),
		},
		{
			header: "Actions",
			cell: (member: Staff) => {
				const staffId = member.id;
				return (
					<div className="flex items-center justify-end gap-2">
						<Button asChild variant="outline" size="sm" disabled={!staffId}>
							<Link href={`/config/organisation/staff/${staffId ?? ""}`}>
								<Eye className="mr-2 h-4 w-4" />
								View
							</Link>
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => handleEditStaff(member)}
							disabled={!staffId}
						>
							<PenLine className="mr-2 h-4 w-4" />
							Edit
						</Button>
					</div>
				);
			},
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	return (
		<PageShell
			title="Staff"
			subtitle="Manage your organization's staff members"
			actions={
				<Button onClick={handleCreateNew}>
					<Plus className="h-4 w-4 mr-2" />
					Add Staff
				</Button>
			}
		>
			<div className="space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<Users className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{staff.length}</div>
									<div className="text-sm text-muted-foreground">
										Total Staff
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
									<div className="text-2xl font-bold">{activeStaff.length}</div>
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
									<div className="text-2xl font-bold">
										{loanOfficers.length}
									</div>
									<div className="text-sm text-muted-foreground">
										Loan Officers
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Filters</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="officeFilter">Office</Label>
								<Select
									value={filters.officeId || "all"}
									onValueChange={(value) =>
										handleFilterChange("officeId", value === "all" ? "" : value)
									}
								>
									<SelectTrigger id="officeFilter">
										<SelectValue placeholder="All Offices" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Offices</SelectItem>
										{offices.map((office) => (
											<SelectItem key={office.id} value={String(office.id)}>
												{office.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="statusFilter">Status</Label>
								<Select
									value={filters.status || "all"}
									onValueChange={(value) => handleFilterChange("status", value)}
								>
									<SelectTrigger id="statusFilter">
										<SelectValue placeholder="All" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="roleFilter">Role</Label>
								<Select
									value={filters.loanOfficersOnly ? "loanOfficer" : "all"}
									onValueChange={(value) =>
										handleFilterChange(
											"loanOfficersOnly",
											value === "loanOfficer",
										)
									}
								>
									<SelectTrigger id="roleFilter">
										<SelectValue placeholder="All Staff" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Staff</SelectItem>
										<SelectItem value="loanOfficer">
											Loan Officers Only
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Staff List */}
				<Card>
					<CardHeader>
						<CardTitle>Staff Members</CardTitle>
						<CardDescription>
							{staff.length} staff member{staff.length !== 1 ? "s" : ""} found
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="text-center py-8 text-muted-foreground">
								Loading staff...
							</div>
						)}
						{error && (
							<div className="text-center py-8 text-destructive">
								Failed to load staff. Please try again.
							</div>
						)}
						{!isLoading && !error && staff.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No staff members found. Add your first staff member to get
								started.
							</div>
						)}
						{!isLoading && !error && staff.length > 0 && (
							<DataTable
								data={staff}
								columns={staffColumns}
								getRowId={(member) =>
									member.id ?? member.displayName ?? "staff-row"
								}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDialogOpen} onOpenChange={handleDialogClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditing ? "Edit Staff Member" : "Add Staff Member"}
						</SheetTitle>
						<SheetDescription>
							{isEditing
								? "Update staff member details"
								: "Add a new staff member to your organization"}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<StaffForm
							key={selectedStaff?.id ?? "new"}
							offices={offices}
							initialData={selectedStaff ?? undefined}
							onSubmit={(data) =>
								isEditing
									? updateMutation.mutateAsync(data)
									: createMutation.mutateAsync(data)
							}
							onCancel={() => handleDialogClose(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
