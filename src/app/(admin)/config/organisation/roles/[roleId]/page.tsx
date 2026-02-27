"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Save, Settings, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useActionState, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { ActionSubmitButton } from "@/components/forms/action-submit-button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PutRolesRoleIdRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	failedSubmitActionState,
	INITIAL_SUBMIT_ACTION_STATE,
	type SubmitActionState,
	successSubmitActionState,
} from "@/lib/fineract/submit-action-state";
import { getSubmitFieldError } from "@/lib/fineract/submit-error";
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
	const router = useRouter();
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

	const [updateState, submitUpdateRole] = useActionState(
		async (
			_previousState: SubmitActionState,
			formPayload: FormData,
		): Promise<SubmitActionState> => {
			const description = String(formPayload.get("description") ?? "").trim();

			try {
				await updateRole(tenantId, Number(roleId), { description });
				await queryClient.invalidateQueries({
					queryKey: ["role", tenantId, roleId],
				});
				await queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
				setEditDialogOpen(false);
				return successSubmitActionState();
			} catch (submitError) {
				return failedSubmitActionState(submitError, {
					action: "updateRole",
					endpoint: `${BFF_ROUTES.roles}/${roleId}`,
					method: "PUT",
					tenantId,
				});
			}
		},
		INITIAL_SUBMIT_ACTION_STATE,
	);

	const [deleteState, submitDeleteRole] = useActionState(
		async (_previousState: SubmitActionState): Promise<SubmitActionState> => {
			try {
				await deleteRole(tenantId, Number(roleId));
				await queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
				setDeleteDialogOpen(false);
				router.push("/config/organisation/roles");
				return successSubmitActionState();
			} catch (submitError) {
				return failedSubmitActionState(submitError, {
					action: "deleteRole",
					endpoint: `${BFF_ROUTES.roles}/${roleId}`,
					method: "DELETE",
					tenantId,
				});
			}
		},
		INITIAL_SUBMIT_ACTION_STATE,
	);

	const submitError = deleteState.error ?? updateState.error;
	const descriptionError = getSubmitFieldError(
		updateState.error,
		"description",
	);

	const isAdminRole =
		role?.name?.toLowerCase().includes("admin") ||
		role?.name?.toLowerCase().includes("super");

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

			<Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<SheetContent side="right" className="sm:max-w-[450px]">
					<SheetHeader>
						<SheetTitle>Edit Role</SheetTitle>
						<SheetDescription>Modify the role details.</SheetDescription>
					</SheetHeader>
					<form action={submitUpdateRole} className="mt-6 space-y-4">
						<SubmitErrorAlert
							error={updateState.error}
							title="Failed to update role"
						/>
						<div className="space-y-2">
							<Label htmlFor="edit-role-name">Name</Label>
							<Input
								id="edit-role-name"
								value={formData.name}
								onChange={(event) =>
									setFormData((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								disabled
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-role-description">Description</Label>
							<Textarea
								id="edit-role-description"
								name="description"
								rows={3}
								value={formData.description}
								onChange={(event) =>
									setFormData((current) => ({
										...current,
										description: event.target.value,
									}))
								}
							/>
							{descriptionError && (
								<p className="text-xs text-destructive">{descriptionError}</p>
							)}
						</div>
						<SheetFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
							>
								Cancel
							</Button>
							<ActionSubmitButton pendingLabel="Updating...">
								<Save className="w-4 h-4 mr-2" />
								Update
							</ActionSubmitButton>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Role</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{role.name}"? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<form action={submitDeleteRole} className="space-y-4">
						<SubmitErrorAlert
							error={deleteState.error}
							title="Failed to delete role"
						/>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setDeleteDialogOpen(false)}
							>
								Cancel
							</Button>
							<ActionSubmitButton
								variant="destructive"
								pendingLabel="Deleting..."
							>
								Delete
							</ActionSubmitButton>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
