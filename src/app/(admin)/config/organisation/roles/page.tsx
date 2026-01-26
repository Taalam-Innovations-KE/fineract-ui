"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Edit,
	MoreHorizontal,
	Plus,
	Settings,
	Shield,
	Trash,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PostRolesRequest,
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

export default function RolesPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	async function createRole(data: PostRolesRequest): Promise<GetRolesResponse> {
		const response = await fetch(BFF_ROUTES.roles, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to create role");
		}

		return response.json();
	}

	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [formData, setFormData] = useState({ name: "", description: "" });

	const roleTemplates = [
		{ name: "Super User", description: "Full system access" },
		{ name: "Loan Officer", description: "Manage loans and clients" },
		{ name: "Teller", description: "Handle transactions" },
		{ name: "Auditor", description: "View reports and logs" },
	];

	const {
		data: roles = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["roles", tenantId],
		queryFn: () => fetchRoles(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: createRole,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
			setCreateDialogOpen(false);
			setFormData({ name: "", description: "" });
		},
	});

	const handleCreateSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			name: formData.name,
			description: formData.description,
		});
	};

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
	];

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
						<CardTitle className="flex items-center justify-between">
							Roles
							<Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
								<SheetTrigger asChild>
									<Button>
										<Plus className="mr-2 h-4 w-4" />
										Create Role
									</Button>
								</SheetTrigger>
								<SheetContent side="right" className="sm:max-w-[450px]">
									<SheetHeader>
										<SheetTitle>Create New Role</SheetTitle>
										<SheetDescription>
											Add a new custom role to the system.
										</SheetDescription>
									</SheetHeader>
									<form
										onSubmit={handleCreateSubmit}
										className="space-y-4 mt-6"
									>
										<div>
											<label className="text-sm font-medium">
												Template (Optional)
											</label>
											<select
												onChange={(e) => {
													const template = roleTemplates.find(
														(t) => t.name === e.target.value,
													);
													if (template) {
														setFormData({
															name: template.name,
															description: template.description,
														});
													}
												}}
												className="mt-1 block w-full rounded border px-3 py-2"
											>
												<option value="">Select a template</option>
												{roleTemplates.map((template) => (
													<option key={template.name} value={template.name}>
														{template.name}
													</option>
												))}
											</select>
										</div>
										<div>
											<label className="text-sm font-medium">Name</label>
											<input
												type="text"
												value={formData.name}
												onChange={(e) =>
													setFormData({ ...formData, name: e.target.value })
												}
												className="mt-1 block w-full rounded border px-3 py-2"
												required
											/>
										</div>
										<div>
											<label className="text-sm font-medium">Description</label>
											<textarea
												value={formData.description}
												onChange={(e) =>
													setFormData({
														...formData,
														description: e.target.value,
													})
												}
												className="mt-1 block w-full rounded border px-3 py-2"
												rows={3}
											/>
										</div>
										<SheetFooter>
											<Button
												type="button"
												variant="outline"
												onClick={() => setCreateDialogOpen(false)}
											>
												Cancel
											</Button>
											<Button type="submit" disabled={createMutation.isPending}>
												{createMutation.isPending ? "Creating..." : "Create"}
											</Button>
										</SheetFooter>
									</form>
								</SheetContent>
							</Sheet>
						</CardTitle>
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
								enableActions={true}
								getViewUrl={(role) => `/config/organisation/roles/${role.id}`}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
