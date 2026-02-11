"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Save, Settings, Trash } from "lucide-react";
import { use, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
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
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to update role" }));
		throw payload;
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
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to delete role" }));
		throw payload;
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
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

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
			setSubmitError(null);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateRole",
					endpoint: `${BFF_ROUTES.roles}/${roleId}`,
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteRole(tenantId, Number(roleId)),
		onSuccess: () => {
			window.location.href = "/config/organisation/roles";
			setSubmitError(null);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteRole",
					endpoint: `${BFF_ROUTES.roles}/${roleId}`,
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const isAdminRole =
		role?.name?.toLowerCase().includes("admin") ||
		role?.name?.toLowerCase().includes("super");

	const handleEditSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitError(null);
		updateMutation.mutate({ description: formData.description });
	};

	const handleDeleteConfirm = () => {
		setSubmitError(null);
		deleteMutation.mutate();
	};

	if (isLoading) {
		return (
			<PageShell title="Role Details">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-36" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								{Array.from({ length: 3 }).map((_, index) => (
									<div
										key={`role-detail-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-6 w-32" />
									</div>
								))}
								<div className="space-y-2 md:col-span-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						</CardContent>
					</Card>
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
							<a href={`/config/organisation/roles/${role.id}/permissions`}>
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
					<SubmitErrorAlert error={submitError} title="Role action failed" />
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

			{/* Edit Sheet */}
			<Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<SheetContent side="right" className="sm:max-w-[450px]">
					<SheetHeader>
						<SheetTitle>Edit Role</SheetTitle>
						<SheetDescription>Modify the role details.</SheetDescription>
					</SheetHeader>
					<form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
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
						<SheetFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								<Save className="w-4 h-4 mr-2" />
								{updateMutation.isPending ? "Updating..." : "Update"}
							</Button>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>

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
