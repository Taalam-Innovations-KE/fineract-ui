"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Shield, UserCog, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TeamMemberForm } from "@/components/config/forms/team-member-form";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	GetUsersResponse,
	OfficeData,
} from "@/lib/fineract/generated/types.gen";
import type { TeamMemberRequestPayload } from "@/lib/schemas/team-member";
import { useTenantStore } from "@/store/tenant";

function isSelfServiceUser(user: GetUsersResponse): boolean {
	const record = user as unknown as Record<string, unknown>;
	return record.isSelfServiceUser === true || record.selfServiceUser === true;
}

async function fetchUsers(tenantId: string): Promise<GetUsersResponse[]> {
	const response = await fetch(BFF_ROUTES.users, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch users");
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

async function fetchRoles(tenantId: string): Promise<GetRolesResponse[]> {
	const response = await fetch(BFF_ROUTES.roles, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch roles");
	}

	return response.json();
}

async function createTeamMember(
	tenantId: string,
	data: TeamMemberRequestPayload,
) {
	const response = await fetch(BFF_ROUTES.onboarding, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	const payload = await response.json();

	if (!response.ok) {
		throw payload;
	}

	return payload;
}

async function updateUser(
	tenantId: string,
	userId: number,
	data: TeamMemberRequestPayload,
) {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	const payload = await response.json();

	if (!response.ok) {
		throw payload;
	}

	return payload;
}

export default function UsersPage() {
	const { tenantId } = useTenantStore();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<GetUsersResponse | null>(
		null,
	);
	const queryClient = useQueryClient();

	const isEditing = Boolean(selectedUser);

	const {
		data: users = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["users", tenantId],
		queryFn: () => fetchUsers(tenantId),
	});

	const { data: offices = [] } = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});

	const { data: roles = [] } = useQuery({
		queryKey: ["roles", tenantId],
		queryFn: () => fetchRoles(tenantId),
	});
	const selfServiceUserCount = users.filter(isSelfServiceUser).length;

	const createMutation = useMutation({
		mutationFn: (data: TeamMemberRequestPayload) =>
			createTeamMember(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setIsDrawerOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: TeamMemberRequestPayload) =>
			updateUser(tenantId, selectedUser!.id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
			setIsDrawerOpen(false);
			setSelectedUser(null);
		},
	});

	const handleCreateNew = () => {
		setSelectedUser(null);
		setIsDrawerOpen(true);
	};

	const handleDrawerClose = (open: boolean) => {
		setIsDrawerOpen(open);
		if (!open) {
			setSelectedUser(null);
		}
	};

	const userColumns = [
		{
			header: "User",
			cell: (user: GetUsersResponse) => (
				<div>
					<div className="font-medium">
						{user.firstname} {user.lastname}
					</div>
					<div className="text-xs text-muted-foreground">
						@{user.username} • {user.officeName || "No office"}
					</div>
					{isSelfServiceUser(user) && (
						<Badge variant="success" className="mt-1 text-[10px]">
							Self-Service
						</Badge>
					)}
				</div>
			),
		},
		{
			header: "Roles",
			cell: (user: GetUsersResponse) => (
				<div className="flex flex-wrap gap-1">
					{user.selectedRoles && user.selectedRoles.length > 0 ? (
						<>
							{user.selectedRoles.slice(0, 2).map((role) => (
								<Badge
									key={role.id}
									variant="secondary"
									className="text-xs px-2 py-0.5"
								>
									{role.name}
								</Badge>
							))}
							{user.selectedRoles.length > 2 && (
								<Badge variant="outline" className="text-xs px-2 py-0.5">
									+{user.selectedRoles.length - 2}
								</Badge>
							)}
						</>
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			header: "Email",
			cell: (user: GetUsersResponse) => (
				<span className={user.email ? "" : "text-muted-foreground"}>
					{user.email || "—"}
				</span>
			),
		},
	];

	return (
		<PageShell
			title="Users"
			subtitle="Manage system users and their access permissions"
			actions={
				<div className="flex items-center gap-2">
					<Button variant="outline" asChild>
						<Link href="/config/organisation/self-service">
							<UserRoundCheck className="h-4 w-4 mr-2" />
							Self-Service Access
						</Link>
					</Button>
					<Button onClick={handleCreateNew}>
						<Plus className="h-4 w-4 mr-2" />
						Create Team Member
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<UserCog className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{users.length}</div>
									<div className="text-sm text-muted-foreground">
										Total Users
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
									<UserRoundCheck className="h-5 w-5 text-warning" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{selfServiceUserCount}
									</div>
									<div className="text-sm text-muted-foreground">
										Self-Service Users
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
									<Shield className="h-5 w-5 text-info" />
								</div>
								<div>
									<div className="text-2xl font-bold">{roles.length}</div>
									<div className="text-sm text-muted-foreground">
										Available Roles
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<Building2 className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">{offices.length}</div>
									<div className="text-sm text-muted-foreground">Offices</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>System Users</CardTitle>
						<CardDescription>
							{users.length} user{users.length !== 1 ? "s" : ""} in the system
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: 8 }).map((_, index) => (
									<Skeleton
										key={`users-row-skeleton-${index}`}
										className="h-12 w-full"
									/>
								))}
							</div>
						)}
						{error && (
							<div className="text-center py-8 text-destructive">
								Failed to load users. Please try again.
							</div>
						)}
						{!isLoading && !error && users.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No users found. Create your first user to get started.
							</div>
						)}
						{!isLoading && !error && users.length > 0 && (
							<DataTable
								data={users}
								columns={userColumns}
								getRowId={(user) => user.id ?? user.username ?? "user-row"}
								enableActions={true}
								getViewUrl={(user) => `/config/organisation/users/${user.id}`}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Create/Edit Team Member Sheet */}
			<Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditing ? "Edit Team Member" : "Create Team Member"}
						</SheetTitle>
						<SheetDescription>
							{isEditing
								? "Update team member details"
								: "Create staff first, then provision their system access"}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<TeamMemberForm
							key={selectedUser?.id ?? "new"}
							offices={offices}
							roles={roles}
							initialData={selectedUser ?? undefined}
							onSubmit={(data) =>
								isEditing
									? updateMutation.mutateAsync(data)
									: createMutation.mutateAsync(data)
							}
							onCancel={() => handleDrawerClose(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
