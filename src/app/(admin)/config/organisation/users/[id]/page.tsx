"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash } from "lucide-react";
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
import type { GetUsersResponse } from "@/lib/fineract/generated/types.gen";
import type { TeamMemberRequestPayload } from "@/lib/schemas/team-member";
import { useTenantStore } from "@/store/tenant";

async function fetchUser(
	tenantId: string,
	id: string,
): Promise<GetUsersResponse> {
	const response = await fetch(`${BFF_ROUTES.users}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch user");
	}

	return response.json();
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

async function deleteUser(tenantId: string, userId: number) {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to delete user");
	}
}

export default function UserDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const {
		data: user,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["user", tenantId, id],
		queryFn: () => fetchUser(tenantId, id),
	});

	const _updateMutation = useMutation({
		mutationFn: (data: TeamMemberRequestPayload) =>
			updateUser(tenantId, Number(id), data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", tenantId, id] });
			queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			setEditDialogOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteUser(tenantId, Number(id)),
		onSuccess: () => {
			window.location.href = "/admin/config/organisation/users";
		},
	});

	const handleDeleteConfirm = () => {
		deleteMutation.mutate();
	};

	if (isLoading) {
		return (
			<PageShell title="User Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading user details...
				</div>
			</PageShell>
		);
	}

	if (error || !user) {
		return (
			<PageShell title="User Details">
				<div className="py-6 text-center text-destructive">
					Failed to load user details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<>
			<PageShell
				title={`User: ${user.username}`}
				subtitle="View and manage user details"
				actions={
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => setEditDialogOpen(true)}>
							<Edit className="mr-1 h-4 w-4" />
							Edit
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
							<CardTitle>User Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium">Username</label>
									<p className="text-lg font-semibold">{user.username}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Email</label>
									<p>{user.email || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">First Name</label>
									<p>{user.firstname || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Last Name</label>
									<p>{user.lastname || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Office</label>
									<p>{user.officeName || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Role</label>
									<p>{user.roleName || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Status</label>
									<p>
										{user.enabled ? (
											<Badge variant="success">Enabled</Badge>
										) : (
											<Badge variant="destructive">Disabled</Badge>
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{/* Edit Dialog - Placeholder for now */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit User</DialogTitle>
						<DialogDescription>
							Edit functionality not implemented yet.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end">
						<Button onClick={() => setEditDialogOpen(false)}>Close</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete User</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{user.username}"? This action
							cannot be undone.
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
