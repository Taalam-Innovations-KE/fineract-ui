"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, UserCheck, Users } from "lucide-react";
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
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

export default function StaffPage() {
	const { tenantId } = useTenantStore();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [filters, setFilters] = useState({
		officeId: "",
		loanOfficersOnly: false,
		status: "active",
	});
	const queryClient = useQueryClient();

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
			setIsCreateDialogOpen(false);
		},
	});

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
	];

	return (
		<PageShell
			title="Staff"
			subtitle="Manage your organization's staff members"
			actions={
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Add Staff
				</Button>
			}
		>
			<div className="grid gap-6 md:grid-cols-[1fr_300px]">
				<div className="space-y-6">
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
										id="officeFilter"
										value={filters.officeId}
										onChange={(e) =>
											handleFilterChange("officeId", e.target.value)
										}
									>
										<option value="">All Offices</option>
										{offices.map((office) => (
											<option key={office.id} value={office.id}>
												{office.name}
											</option>
										))}
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="statusFilter">Status</Label>
									<Select
										id="statusFilter"
										value={filters.status}
										onChange={(e) =>
											handleFilterChange("status", e.target.value)
										}
									>
										<option value="all">All</option>
										<option value="active">Active</option>
										<option value="inactive">Inactive</option>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="roleFilter">Role</Label>
									<Select
										id="roleFilter"
										value={filters.loanOfficersOnly ? "loanOfficer" : "all"}
										onChange={(e) =>
											handleFilterChange(
												"loanOfficersOnly",
												e.target.value === "loanOfficer",
											)
										}
									>
										<option value="all">All Staff</option>
										<option value="loanOfficer">Loan Officers Only</option>
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

				{/* Summary */}
				<Card className="h-fit">
					<CardHeader>
						<CardTitle>Summary</CardTitle>
						<CardDescription>Staff statistics</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
								<Users className="h-5 w-5 text-primary" />
							</div>
							<div>
								<div className="text-2xl font-bold">{staff.length}</div>
								<div className="text-sm text-muted-foreground">Total Staff</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
								<UserCheck className="h-5 w-5 text-success" />
							</div>
							<div>
								<div className="text-2xl font-bold">{activeStaff.length}</div>
								<div className="text-sm text-muted-foreground">Active</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
								<Building2 className="h-5 w-5 text-info" />
							</div>
							<div>
								<div className="text-2xl font-bold">{loanOfficers.length}</div>
								<div className="text-sm text-muted-foreground">
									Loan Officers
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Drawer open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DrawerHeader>
					<div>
						<DrawerTitle>Add Staff Member</DrawerTitle>
						<DrawerDescription>
							Add a new staff member to your organization
						</DrawerDescription>
					</div>
					<DrawerClose onClick={() => setIsCreateDialogOpen(false)} />
				</DrawerHeader>
				<DrawerContent>
					<StaffForm
						offices={offices}
						onSubmit={(data) => createMutation.mutateAsync(data)}
						onCancel={() => setIsCreateDialogOpen(false)}
					/>
				</DrawerContent>
			</Drawer>
		</PageShell>
	);
}
