"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Shield, Trash } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { GetUsersResponse } from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import type { TeamMemberRequestPayload } from "@/lib/schemas/team-member";
import { useTenantStore } from "@/store/tenant";

function isSelfServiceUser(user: GetUsersResponse): boolean {
	const record = user as unknown as Record<string, unknown>;
	return record.isSelfServiceUser === true || record.selfServiceUser === true;
}

function readLinkedClients(user: GetUsersResponse): number[] {
	const record = user as unknown as Record<string, unknown>;
	const clients = record.clients;
	if (!Array.isArray(clients)) {
		return [];
	}

	return clients.filter(
		(client): client is number => typeof client === "number",
	);
}

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
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to delete user" }));
		throw payload;
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
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

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
			setSubmitError(null);
			window.location.href = "/config/organisation/users";
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteUser",
					endpoint: `${BFF_ROUTES.users}/${id}`,
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const handleDeleteConfirm = () => {
		setSubmitError(null);
		deleteMutation.mutate();
	};

	if (isLoading) {
		return (
			<PageShell title="User Details">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-36" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								{Array.from({ length: 7 }).map((_, index) => (
									<div
										key={`user-detail-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-6 w-36" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
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

	const linkedClients = readLinkedClients(user);

	return (
		<>
			<PageShell
				title={`User: ${user.username}`}
				subtitle="View and manage user details"
				actions={
					<div className="flex gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/organisation/users">
								<ArrowLeft className="mr-1 h-4 w-4" />
								Back to Users
							</Link>
						</Button>
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
									<p>
										{user.selectedRoles?.map((r) => r.name).join(", ") || "—"}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium">Status</label>
									<p>
										<span className="text-muted-foreground">N/A</span>
									</p>
								</div>
								<div>
									<label className="text-sm font-medium">Access Scope</label>
									<div className="mt-1">
										{isSelfServiceUser(user) ? (
											<Badge variant="success" className="inline-flex">
												<Shield className="mr-1 h-3.5 w-3.5" />
												Self-Service User
											</Badge>
										) : (
											<Badge variant="secondary">Back-office User</Badge>
										)}
									</div>
								</div>
								<div>
									<label className="text-sm font-medium">
										Linked Client IDs
									</label>
									<p>
										{linkedClients.length > 0 ? linkedClients.join(", ") : "—"}
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
					<SubmitErrorAlert error={submitError} title="Unable to delete user" />
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
