"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Building2,
	Edit,
	Shield,
	Trash,
	UserCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { UserForm } from "@/components/config/forms/user-form";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetUsersTemplateResponse,
	PutUsersUserIdRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";
import type { UserFormRecord } from "@/lib/schemas/user";
import { useTenantStore } from "@/store/tenant";

type UserDetailTemplateResponse = UserFormRecord;

async function fetchUserDetail(
	tenantId: string,
	id: string,
): Promise<UserDetailTemplateResponse> {
	const response = await fetch(`${BFF_ROUTES.users}/${id}?template=true`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function fetchUsersTemplate(
	tenantId: string,
): Promise<GetUsersTemplateResponse> {
	const response = await fetch(BFF_ROUTES.usersTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function updateUser(
	tenantId: string,
	userId: number,
	payload: PutUsersUserIdRequest,
) {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

async function deleteUser(tenantId: string, userId: number) {
	const response = await fetch(`${BFF_ROUTES.users}/${userId}`, {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.json();
}

function UserDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={`user-stat-skeleton-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-8 w-20" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-60" />
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 6 }).map((_, index) => (
						<div key={`user-field-skeleton-${index}`} className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-36" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

function linkedStaffName(user: UserDetailTemplateResponse) {
	const explicitDisplayName = user.staff?.displayName?.trim();
	if (explicitDisplayName) {
		return explicitDisplayName;
	}

	return [user.staff?.firstname, user.staff?.lastname]
		.filter(Boolean)
		.join(" ")
		.trim();
}

function roleIdsForUser(user: UserDetailTemplateResponse) {
	return (user.selectedRoles ?? [])
		.map((role) => role.id)
		.filter((roleId): roleId is number => typeof roleId === "number");
}

export default function UserDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const router = useRouter();
	const [editSheetOpen, setEditSheetOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteError, setDeleteError] = useState<SubmitActionError | null>(
		null,
	);

	const {
		data: user,
		isLoading: userLoading,
		error: userError,
	} = useQuery({
		queryKey: ["user", tenantId, id],
		queryFn: () => fetchUserDetail(tenantId, id),
		enabled: Boolean(tenantId && id),
	});

	const { data: template } = useQuery({
		queryKey: ["users-template", tenantId],
		queryFn: () => fetchUsersTemplate(tenantId),
		enabled: Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutUsersUserIdRequest) =>
			updateUser(tenantId, Number(id), payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["user", tenantId, id] });
			await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			setEditSheetOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteUser(tenantId, Number(id)),
		onSuccess: async () => {
			setDeleteError(null);
			await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			router.push("/config/organisation/users");
		},
		onError: (error) => {
			setDeleteError(
				toSubmitActionError(error, {
					action: "deleteUser",
					endpoint: `${BFF_ROUTES.users}/${id}`,
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	if (userLoading) {
		return (
			<PageShell
				title="User Details"
				subtitle="Review account profile and access"
			>
				<UserDetailSkeleton />
			</PageShell>
		);
	}

	if (userError || !user) {
		return (
			<PageShell
				title="User Details"
				subtitle="Review account profile and access"
				actions={
					<Button variant="outline" asChild>
						<Link href="/config/organisation/users">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Users
						</Link>
					</Button>
				}
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load user details</AlertTitle>
					<AlertDescription>
						Check connectivity and your permissions, then retry.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	const selfServiceRoleIds = new Set(
		(user.selfServiceRoles ?? template?.selfServiceRoles ?? [])
			.map((role) => role.id)
			.filter((roleId): roleId is number => typeof roleId === "number"),
	);
	const isSelfService = roleIdsForUser(user).some((roleId) =>
		selfServiceRoleIds.has(roleId),
	);
	const staffName = linkedStaffName(user);
	const allowedOffices = user.allowedOffices ?? template?.allowedOffices ?? [];
	const availableRoles = user.availableRoles ?? template?.availableRoles ?? [];

	return (
		<>
			<PageShell
				title={`User: ${user.username}`}
				subtitle="Review account profile, role assignments, and linked staff membership."
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/organisation/users">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Users
							</Link>
						</Button>
						<Button variant="outline" onClick={() => setEditSheetOpen(true)}>
							<Edit className="mr-2 h-4 w-4" />
							Edit User
						</Button>
						<Button
							variant="destructive"
							onClick={() => setDeleteDialogOpen(true)}
						>
							<Trash className="mr-2 h-4 w-4" />
							Delete User
						</Button>
					</div>
				}
			>
				<div className="space-y-6">
					<Alert>
						<AlertTitle>User deletion is soft-delete behavior</AlertTitle>
						<AlertDescription>
							Deleting a user disables the account and removes role access
							rather than removing the staff record behind it.
						</AlertDescription>
					</Alert>

					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<UserCog className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-lg font-semibold">
											{user.username || "Unknown"}
										</div>
										<div className="text-sm text-muted-foreground">
											Login Username
										</div>
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
										<div className="text-lg font-semibold">
											{user.officeName || "Unassigned"}
										</div>
										<div className="text-sm text-muted-foreground">Office</div>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-warning/10">
										<Shield className="h-5 w-5 text-warning" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<Badge variant={isSelfService ? "outline" : "secondary"}>
												{isSelfService ? "Self Service" : "Admin"}
											</Badge>
											{user.passwordNeverExpires && (
												<Badge variant="warning">No Expiry</Badge>
											)}
										</div>
										<div className="mt-1 text-sm text-muted-foreground">
											{user.selectedRoles?.length ?? 0} assigned role
											{(user.selectedRoles?.length ?? 0) === 1 ? "" : "s"}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Account Profile</CardTitle>
							<CardDescription>
								Identity, office alignment, and optional staff linkage.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="space-y-1">
								<div className="text-sm font-medium">Full Name</div>
								<div>
									{[user.firstname, user.lastname].filter(Boolean).join(" ") ||
										"Not provided"}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Email</div>
								<div>{user.email || "Not provided"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Office</div>
								<div>{user.officeName || "Unassigned"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Linked Staff</div>
								<div>{staffName || "No staff link"}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm font-medium">Password Policy</div>
								<div>
									{user.passwordNeverExpires
										? "Password never expires"
										: "Default password expiry applies"}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Assigned Roles</CardTitle>
							<CardDescription>
								Permissions are inherited through roles only.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{(user.selectedRoles?.length ?? 0) === 0 ? (
								<div className="text-sm text-muted-foreground">
									No roles are currently assigned.
								</div>
							) : (
								<div className="flex flex-wrap gap-2">
									{(user.selectedRoles ?? []).map((role) => (
										<Badge key={role.id} variant="secondary">
											{role.name}
										</Badge>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</PageShell>

			<Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>Edit User</SheetTitle>
						<SheetDescription>
							Update core account fields, office assignment, roles, and optional
							password reset details.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<UserForm
							mode="edit"
							offices={allowedOffices}
							roles={availableRoles}
							selfServiceRoleIds={Array.from(selfServiceRoleIds)}
							initialData={user}
							onSubmit={(payload) =>
								updateMutation.mutateAsync(payload as PutUsersUserIdRequest)
							}
							onCancel={() => setEditSheetOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete user account</AlertDialogTitle>
						<AlertDialogDescription>
							This will soft-delete <strong>{user.username}</strong>, disable
							the login, and clear assigned roles. The linked staff record is
							not deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<SubmitErrorAlert error={deleteError} title="Unable to delete user" />
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								setDeleteError(null);
								deleteMutation.mutate();
							}}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete User"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
