"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Settings, Trash } from "lucide-react";
import { use, useState } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchRole(
	tenantId: string,
	id: string,
): Promise<GetRolesResponse> {
	const response = await fetch(`${BFF_ROUTES.roles}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch role");
	}

	return response.json();
}

async function updateRole(
	tenantId: string,
	roleId: number,
	data: PutRolesRoleIdRequest,
): Promise<GetRolesResponse> {
	const response = await fetch(`${BFF_ROUTES.roles}/${roleId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to update role");
	}

	return response.json();
}

async function deleteRole(tenantId: string, roleId: number): Promise<void> {
	const response = await fetch(`${BFF_ROUTES.roles}/${roleId}`, {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to delete role");
	}
}

export default function RoleDetailPage({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
	const { roleId } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [formData, setFormData] = useState({ name: "", description: "" });

	const {
		data: role,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["role", tenantId, roleId],
		queryFn: () => fetchRole(tenantId, roleId),
	});

	const updateMutation = useMutation({
		mutationFn: (data: PutRolesRoleIdRequest) =>
			updateRole(tenantId, Number(roleId), data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["role", tenantId, roleId] });
			setEditDialogOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteRole(tenantId, Number(roleId)),
		onSuccess: () => {
			window.location.href = "/admin/config/organisation/roles";
		},
	});

	const isAdminRole =
		role?.name?.toLowerCase().includes("admin") ||
		role?.name?.toLowerCase().includes("super");

	const handleEditSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateMutation.mutate({ description: formData.description });
	};

	const handleDeleteConfirm = () => {
		deleteMutation.mutate();
	};

	if (isLoading) {
		return (
			<PageShell title="Role Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading role details...
				</div>
			</PageShell>
		);
	}

	if (error || !role) {
		return (
			<PageShell title="Role Details">
				<div className="py-6 text-center text-destructive">
					Failed to load role details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<>
			<PageShell
				title={`Role: ${role.name}`}
				subtitle="View and manage role details"
				actions={
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setFormData({
									name: role.name || "",
									description: role.description || "",
								});
								setEditDialogOpen(true);
							}}
						>
							<Edit className="mr-1 h-4 w-4" />
							Edit
						</Button>
						<Button variant="outline" asChild>
							<a
								href={`/admin/config/organisation/roles/${role.id}/permissions`}
							>
								<Settings className="mr-1 h-4 w-4" />
								Manage Permissions
							</a>
						</Button>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
							<Trash className="mr-1 h-4 w-4" />
							Delete
						</Button>
					</div>
				}
			>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Role Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium">Name</label>
									<p className="text-lg font-semibold">{role.name}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Type</label>
									<p>
										{isAdminRole ? (
											<Badge variant="destructive">Admin</Badge>
										) : (
											<Badge variant="secondary">Operational</Badge>
										)}
									</p>
								</div>
								<div className="md:col-span-2">
									<label className="text-sm font-medium">Description</label>
									<p
										className={role.description ? "" : "text-muted-foreground"}
									>
										{role.description || "No description provided."}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Role</DialogTitle>
						<DialogDescription>Modify the role details.</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleEditSubmit} className="space-y-4">
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
									setFormData({ ...formData, description: e.target.value })
								}
								className="mt-1 block w-full rounded border px-3 py-2"
								rows={3}
							/>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? "Updating..." : "Update"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Role</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{role.name}"? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end space-x-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
