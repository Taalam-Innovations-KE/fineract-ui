"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RoleForm } from "@/components/config/forms/role-form";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

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

async function updateRole(
	tenantId: string,
	roleId: number,
	data: PutRolesRoleIdRequest,
) {
	const response = await fetch(`${BFF_ROUTES.roles}/${roleId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	const payload = await response.json();

	if (!response.ok) {
		throw new Error(payload.message || "Failed to update role");
	}

	return payload;
}

export default function RolesPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [selectedRole, setSelectedRole] = useState<GetRolesResponse | null>(
		null,
	);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const {
		data: roles = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["roles", tenantId],
		queryFn: () => fetchRoles(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: (data: PutRolesRoleIdRequest) =>
			updateRole(tenantId, selectedRole!.id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
			setIsDrawerOpen(false);
			setSelectedRole(null);
		},
	});

	const isAdminRole = (role: GetRolesResponse) =>
		role.name?.toLowerCase().includes("admin") ||
		role.name?.toLowerCase().includes("super");
	const adminRoles = roles.filter(isAdminRole);
	const operationalRoles = roles.filter((role) => !isAdminRole(role));
	const roleColumns = [
		{
			header: "Role",
			cell: (role: GetRolesResponse) => (
				<div className="font-medium">{role.name}</div>
			),
		},
		{
			header: "Description",
			cell: (role: GetRolesResponse) => (
				<span className={role.description ? "" : "text-muted-foreground"}>
					{role.description || "—"}
				</span>
			),
		},
		{
			header: "Type",
			cell: (role: GetRolesResponse) =>
				isAdminRole(role) ? (
					<Badge variant="destructive" className="text-xs px-2 py-0.5">
						Admin
					</Badge>
				) : (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						Operational
					</Badge>
				),
		},
		{
			header: "Actions",
			cell: (role: GetRolesResponse) => (
				<div className="flex items-center justify-end gap-2">
					<Button asChild variant="outline" size="sm" disabled={!role.id}>
						<Link href={`/config/organisation/roles/${role.id ?? ""}`}>
							<Eye className="mr-2 h-4 w-4" />
							View
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							setSelectedRole(role);
							setIsDrawerOpen(true);
						}}
						disabled={!role.id}
					>
						<PenLine className="mr-2 h-4 w-4" />
						Edit
					</Button>
				</div>
			),
			className: "text-right",
			headerClassName: "text-right",
		},
	];

	const handleDrawerClose = (open: boolean) => {
		setIsDrawerOpen(open);
		if (!open) {
			setSelectedRole(null);
		}
	};

	return (
		<PageShell
			title="Roles & Permissions"
			subtitle="View and manage system roles and their permissions"
		>
			<div className="space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<Shield className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{roles.length}</div>
									<div className="text-sm text-muted-foreground">
										Total Roles
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-destructive/10">
									<Shield className="h-5 w-5 text-destructive" />
								</div>
								<div>
									<div className="text-2xl font-bold">{adminRoles.length}</div>
									<div className="text-sm text-muted-foreground">
										Admin Roles
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-info/10">
									<Users className="h-5 w-5 text-info" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{operationalRoles.length}
									</div>
									<div className="text-sm text-muted-foreground">
										Operational
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Roles</CardTitle>
						<CardDescription>
							{roles.length} role{roles.length !== 1 ? "s" : ""} in the system
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="text-center py-8 text-muted-foreground">
								Loading roles...
							</div>
						)}
						{error && (
							<div className="text-center py-8 text-destructive">
								Failed to load roles. Please try again.
							</div>
						)}
						{!isLoading && !error && roles.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No roles found in the system.
							</div>
						)}
						{!isLoading && !error && roles.length > 0 && (
							<DataTable
								data={roles}
								columns={roleColumns}
								getRowId={(role) => role.id ?? role.name ?? "role-row"}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDrawerOpen} onOpenChange={handleDrawerClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Edit Role</SheetTitle>
						<SheetDescription>
							Update role metadata and description.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<RoleForm
							initialData={selectedRole}
							onSubmit={(data) => updateMutation.mutateAsync(data)}
							onCancel={() => handleDrawerClose(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
