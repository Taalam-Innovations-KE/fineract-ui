"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	BadgeCheck,
	KeyRound,
	Lock,
	Plus,
	RefreshCw,
	Save,
	Shield,
	UserRound,
	UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetUsersTemplateResponse } from "@/lib/fineract/generated/types.gen";
import {
	buildRolePermissionUpdate,
	type ClientOption,
	createSelfServiceUser,
	getRolePermissions,
	getSelfServiceConfiguration,
	getUserById,
	getUsersTemplate,
	hasSelfServiceFlag,
	listClientsForSelection,
	listSelfServiceUsers,
	readUserClientIds,
	SELF_SERVICE_PERMISSION_PRESETS,
	type SelfServicePermissionPreset,
	setRoleStatus,
	updateRolePermissions,
	updateSelfServiceConfiguration,
	updateSelfServiceUser,
} from "@/lib/fineract/self-service";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitFieldError,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import {
	type SelfServiceUserFormData,
	selfServiceUserSchema,
} from "@/lib/schemas/self-service-user";
import { useTenantStore } from "@/store/tenant";

type RoleOption = {
	id: number;
	name: string;
	description?: string;
};

function normalizeRoleOptions(template: GetUsersTemplateResponse | undefined) {
	const selfServiceRoles = (template?.selfServiceRoles ?? []).filter(
		(role): role is RoleOption =>
			typeof role.id === "number" && typeof role.name === "string",
	);

	if (selfServiceRoles.length > 0) {
		return selfServiceRoles;
	}

	return (template?.availableRoles ?? []).filter(
		(role): role is RoleOption =>
			typeof role.id === "number" && typeof role.name === "string",
	);
}

function getLinkedClientLabel(clientId: number, clients: ClientOption[]) {
	const linkedClient = clients.find((client) => client.id === clientId);
	return linkedClient?.displayName ?? `Client #${clientId}`;
}

function getDefaultUserFormValues(
	roles: RoleOption[],
	clients: ClientOption[],
	allowedOffices: Array<{ id?: number }> = [],
	selectedRoleId: number | null = null,
): SelfServiceUserFormData {
	const firstOfficeId = allowedOffices.find(
		(office) => typeof office.id === "number",
	)?.id;
	const firstRoleId = roles.find((role) => typeof role.id === "number")?.id;
	const firstClientId = clients.find(
		(client) => typeof client.id === "number",
	)?.id;

	return {
		username: "",
		firstname: "",
		lastname: "",
		email: "",
		officeId: firstOfficeId ?? 0,
		roleId: selectedRoleId ?? firstRoleId ?? 0,
		clientId: firstClientId ?? 0,
		password: "",
		repeatPassword: "",
		sendPasswordToEmail: false,
		passwordNeverExpires: false,
	};
}

export default function SelfServicePage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
	const [selectedPresetId, setSelectedPresetId] =
		useState<SelfServicePermissionPreset["id"]>("loan-basic");
	const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);
	const [editingUserId, setEditingUserId] = useState<number | null>(null);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [userFormError, setUserFormError] = useState<SubmitActionError | null>(
		null,
	);

	const {
		register,
		handleSubmit,
		reset,
		setError,
		control,
		formState: { errors },
	} = useForm<SelfServiceUserFormData>({
		resolver: zodResolver(selfServiceUserSchema),
		defaultValues: {
			username: "",
			firstname: "",
			lastname: "",
			email: "",
			officeId: 0,
			roleId: 0,
			clientId: 0,
			password: "",
			repeatPassword: "",
			sendPasswordToEmail: false,
			passwordNeverExpires: false,
		},
	});

	const {
		data: usersTemplate,
		isLoading: isTemplateLoading,
		error: templateError,
	} = useQuery({
		queryKey: ["self-service", "template", tenantId],
		queryFn: () => getUsersTemplate(tenantId),
	});

	const {
		data: selfServiceConfig,
		isLoading: isConfigLoading,
		error: configError,
	} = useQuery({
		queryKey: ["self-service", "global-config", tenantId],
		queryFn: () => getSelfServiceConfiguration(tenantId),
	});

	const {
		data: selfServiceUsers = [],
		isLoading: isUsersLoading,
		error: usersError,
	} = useQuery({
		queryKey: ["self-service", "users", tenantId],
		queryFn: () => listSelfServiceUsers(tenantId),
	});

	const {
		data: clients = [],
		isLoading: isClientsLoading,
		error: clientsError,
	} = useQuery({
		queryKey: ["self-service", "clients", tenantId],
		queryFn: () => listClientsForSelection(tenantId),
	});

	const roleOptions = useMemo(
		() => normalizeRoleOptions(usersTemplate),
		[usersTemplate],
	);
	const selectedPreset = useMemo(
		() =>
			SELF_SERVICE_PERMISSION_PRESETS.find(
				(preset) => preset.id === selectedPresetId,
			) ?? SELF_SERVICE_PERMISSION_PRESETS[0],
		[selectedPresetId],
	);
	const enabledUserCount = selfServiceUsers.filter((user) =>
		hasSelfServiceFlag(user),
	).length;

	useEffect(() => {
		if (selectedRoleId !== null || roleOptions.length === 0) {
			return;
		}

		setSelectedRoleId(roleOptions[0].id);
	}, [selectedRoleId, roleOptions]);

	const {
		data: selectedRolePermissions,
		isLoading: isPermissionsLoading,
		error: permissionsError,
	} = useQuery({
		queryKey: ["self-service", "role-permissions", tenantId, selectedRoleId],
		queryFn: () => getRolePermissions(tenantId, selectedRoleId as number),
		enabled: selectedRoleId !== null,
	});

	const { data: editingUserDetails, isLoading: isEditingUserLoading } =
		useQuery({
			queryKey: ["self-service", "user-details", tenantId, editingUserId],
			queryFn: () => getUserById(tenantId, editingUserId as number),
			enabled: editingUserId !== null && isUserSheetOpen,
		});

	const permissionData = selectedRolePermissions?.permissionUsageData ?? [];
	const selectedPermissionCodes = new Set(
		permissionData
			.filter((permission) => permission.selected === true && permission.code)
			.map((permission) => String(permission.code)),
	);
	const missingRequiredCodes = selectedPreset.requiredCodes.filter(
		(code) => !selectedPermissionCodes.has(code),
	);

	const defaultUserValues = useMemo(
		() =>
			getDefaultUserFormValues(
				roleOptions,
				clients,
				usersTemplate?.allowedOffices ?? [],
				selectedRoleId,
			),
		[clients, roleOptions, selectedRoleId, usersTemplate],
	);

	useEffect(() => {
		if (!isUserSheetOpen || editingUserId !== null) {
			return;
		}

		reset(defaultUserValues);
	}, [defaultUserValues, editingUserId, isUserSheetOpen, reset]);

	useEffect(() => {
		if (!editingUserDetails || editingUserId === null) {
			return;
		}

		const linkedClientId = readUserClientIds(editingUserDetails)[0];
		const linkedRoleId = editingUserDetails.selectedRoles?.find(
			(role) => typeof role.id === "number",
		)?.id;

		reset({
			username: editingUserDetails.username ?? "",
			firstname: editingUserDetails.firstname ?? "",
			lastname: editingUserDetails.lastname ?? "",
			email: editingUserDetails.email ?? "",
			officeId: editingUserDetails.officeId ?? defaultUserValues.officeId,
			roleId:
				linkedRoleId ??
				selectedRoleId ??
				defaultUserValues.roleId ??
				roleOptions[0]?.id ??
				0,
			clientId:
				linkedClientId ?? defaultUserValues.clientId ?? clients[0]?.id ?? 0,
			password: "",
			repeatPassword: "",
			sendPasswordToEmail: false,
			passwordNeverExpires: editingUserDetails.passwordNeverExpires ?? false,
		});
	}, [
		clients,
		defaultUserValues,
		editingUserDetails,
		editingUserId,
		reset,
		roleOptions,
		selectedRoleId,
	]);

	const toggleConfigMutation = useMutation({
		mutationFn: async () => {
			if (!selfServiceConfig?.id) {
				throw new Error(
					"self-service-user-enabled configuration was not found.",
				);
			}

			return updateSelfServiceConfiguration(
				tenantId,
				selfServiceConfig.id,
				!(selfServiceConfig.enabled === true),
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["self-service", "global-config", tenantId],
			});
			setSubmitError(null);
			toast.success("Self-service global configuration updated.");
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateSelfServiceGlobalConfiguration",
					endpoint: "/api/fineract/configurations/{id}",
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const applyPresetMutation = useMutation({
		mutationFn: async () => {
			if (!selectedRoleId) {
				throw new Error("Select a role before applying a preset.");
			}

			const nextPermissions = buildRolePermissionUpdate(
				permissionData,
				new Set(selectedPreset.requiredCodes),
			);

			return updateRolePermissions(tenantId, selectedRoleId, nextPermissions);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [
					"self-service",
					"role-permissions",
					tenantId,
					selectedRoleId,
				],
			});
			setSubmitError(null);
			toast.success(`Preset applied to role "${selectedRoleId}".`);
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "applySelfServicePermissionPreset",
					endpoint: "/api/fineract/roles/{roleId}/permissions",
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const roleStatusMutation = useMutation({
		mutationFn: (command: "enable" | "disable") => {
			if (!selectedRoleId) {
				throw new Error("Select a role before changing role status.");
			}

			return setRoleStatus(tenantId, selectedRoleId, command);
		},
		onSuccess: (_result, command) => {
			setSubmitError(null);
			toast.success(
				command === "enable"
					? "Role enabled for self-service use."
					: "Role disabled.",
			);
		},
		onError: (error, command) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: command === "enable" ? "enableRole" : "disableRole",
					endpoint: "/api/fineract/roles/{roleId}?command={command}",
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const upsertUserMutation = useMutation({
		mutationFn: async (values: SelfServiceUserFormData) => {
			if (editingUserId !== null) {
				return updateSelfServiceUser(tenantId, editingUserId, {
					username: values.username,
					firstname: values.firstname,
					lastname: values.lastname,
					email: values.email || undefined,
					officeId: values.officeId,
					roleId: values.roleId,
					clientId: values.clientId,
					password: values.password || undefined,
					repeatPassword: values.repeatPassword || undefined,
					sendPasswordToEmail: values.sendPasswordToEmail ?? false,
					passwordNeverExpires: values.passwordNeverExpires ?? false,
				});
			}

			return createSelfServiceUser(tenantId, {
				username: values.username,
				firstname: values.firstname,
				lastname: values.lastname,
				email: values.email || undefined,
				officeId: values.officeId,
				roleId: values.roleId,
				clientId: values.clientId,
				password: values.password || undefined,
				repeatPassword: values.repeatPassword || undefined,
				sendPasswordToEmail: values.sendPasswordToEmail ?? false,
				passwordNeverExpires: values.passwordNeverExpires ?? false,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["self-service", "users", tenantId],
			});
			if (editingUserId !== null) {
				queryClient.invalidateQueries({
					queryKey: ["self-service", "user-details", tenantId, editingUserId],
				});
			}
			setUserFormError(null);
			setIsUserSheetOpen(false);
			setEditingUserId(null);
			toast.success(
				editingUserId === null
					? "Self-service user created."
					: "Self-service user updated.",
			);
		},
		onError: (error) => {
			setUserFormError(
				toSubmitActionError(error, {
					action:
						editingUserId === null
							? "createSelfServiceUser"
							: "updateSelfServiceUser",
					endpoint:
						editingUserId === null
							? "/api/fineract/users"
							: `/api/fineract/users/${editingUserId}`,
					method: editingUserId === null ? "POST" : "PUT",
					tenantId,
				}),
			);
		},
	});

	const openCreateUserSheet = () => {
		setEditingUserId(null);
		setUserFormError(null);
		setIsUserSheetOpen(true);
		reset(defaultUserValues);
	};

	const openEditUserSheet = (userId: number) => {
		setEditingUserId(userId);
		setUserFormError(null);
		setIsUserSheetOpen(true);
	};

	const handleUserSheetChange = (open: boolean) => {
		setIsUserSheetOpen(open);
		if (!open) {
			setEditingUserId(null);
			setUserFormError(null);
		}
	};

	const userColumns: DataTableColumn<(typeof selfServiceUsers)[number]>[] = [
		{
			header: "Customer Login",
			cell: (user) => (
				<div>
					<div className="font-medium">{user.username ?? "—"}</div>
					<div className="text-xs text-muted-foreground">
						{user.firstname ?? "—"} {user.lastname ?? ""}
					</div>
				</div>
			),
		},
		{
			header: "Linked Client",
			cell: (user) => {
				const linkedClientIds = readUserClientIds(user);
				if (linkedClientIds.length === 0) {
					return (
						<span className="text-muted-foreground">View profile mapping</span>
					);
				}

				return (
					<div className="flex flex-wrap gap-1">
						{linkedClientIds.slice(0, 2).map((clientId) => (
							<Badge key={`${user.id}-${clientId}`} variant="secondary">
								{getLinkedClientLabel(clientId, clients)}
							</Badge>
						))}
						{linkedClientIds.length > 2 && (
							<Badge variant="outline">+{linkedClientIds.length - 2}</Badge>
						)}
					</div>
				);
			},
		},
		{
			header: "Roles",
			cell: (user) => (
				<div className="flex flex-wrap gap-1">
					{user.selectedRoles?.length ? (
						user.selectedRoles.slice(0, 2).map((role) => (
							<Badge key={`${user.id}-${role.id}`} variant="secondary">
								{role.name}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			header: "Actions",
			className: "text-right",
			headerClassName: "text-right",
			cell: (user) =>
				typeof user.id === "number" ? (
					<Button
						variant="outline"
						size="sm"
						onClick={() => openEditUserSheet(user.id as number)}
					>
						<UserRound className="mr-1 h-3.5 w-3.5" />
						Edit
					</Button>
				) : (
					<span className="text-muted-foreground">N/A</span>
				),
		},
	];

	return (
		<PageShell
			title="Self-Service Access"
			subtitle="Configure customer-facing permissions and provision self-service users."
			actions={
				<Button onClick={openCreateUserSheet}>
					<Plus className="mr-2 h-4 w-4" />
					Add Self-Service User
				</Button>
			}
		>
			<div className="space-y-6">
				<SubmitErrorAlert
					error={submitError}
					title="Unable to complete action"
				/>

				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<UsersRound className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{enabledUserCount}</div>
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
									<div className="text-2xl font-bold">{roleOptions.length}</div>
									<div className="text-sm text-muted-foreground">
										Role Options
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<KeyRound className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">
										{selectedPermissionCodes.size}
									</div>
									<div className="text-sm text-muted-foreground">
										Active Permissions
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Global Self-Service Setting</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{isConfigLoading ? (
							<Skeleton className="h-10 w-full" />
						) : (
							<>
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={
											selfServiceConfig?.enabled ? "success" : "secondary"
										}
									>
										{selfServiceConfig?.enabled ? "Enabled" : "Disabled"}
									</Badge>
									<span className="text-sm text-muted-foreground">
										Configuration key: `self-service-user-enabled`
									</span>
								</div>
								{!selfServiceConfig && (
									<Alert variant="destructive">
										<AlertTitle>Configuration not found</AlertTitle>
										<AlertDescription>
											The backend did not return `self-service-user-enabled`.
										</AlertDescription>
									</Alert>
								)}
								<Button
									variant="outline"
									onClick={() => toggleConfigMutation.mutate()}
									disabled={
										toggleConfigMutation.isPending || !selfServiceConfig?.id
									}
								>
									<RefreshCw className="mr-2 h-4 w-4" />
									{toggleConfigMutation.isPending
										? "Updating..."
										: selfServiceConfig?.enabled
											? "Disable Self-Service"
											: "Enable Self-Service"}
								</Button>
							</>
						)}
						{configError && (
							<p className="text-sm text-destructive">
								Unable to load global configuration.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Role Permission Presets</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{isTemplateLoading ? (
							<div className="grid gap-4 md:grid-cols-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : (
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="roleId">Self-Service Role</Label>
									<Select
										value={selectedRoleId ? String(selectedRoleId) : undefined}
										onValueChange={(value) => setSelectedRoleId(Number(value))}
									>
										<SelectTrigger id="roleId">
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent>
											{roleOptions.map((role) => (
												<SelectItem key={role.id} value={String(role.id)}>
													{role.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="presetId">Preset</Label>
									<Select
										value={selectedPresetId}
										onValueChange={(value) =>
											setSelectedPresetId(
												value as SelfServicePermissionPreset["id"],
											)
										}
									>
										<SelectTrigger id="presetId">
											<SelectValue placeholder="Select preset" />
										</SelectTrigger>
										<SelectContent>
											{SELF_SERVICE_PERMISSION_PRESETS.map((preset) => (
												<SelectItem key={preset.id} value={preset.id}>
													{preset.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						<p className="text-sm text-muted-foreground">
							{selectedPreset.description}
						</p>

						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() => applyPresetMutation.mutate()}
								disabled={
									!selectedRoleId ||
									applyPresetMutation.isPending ||
									isPermissionsLoading
								}
							>
								<Save className="mr-2 h-4 w-4" />
								{applyPresetMutation.isPending ? "Applying..." : "Apply Preset"}
							</Button>
							<Button
								variant="outline"
								onClick={() => roleStatusMutation.mutate("enable")}
								disabled={!selectedRoleId || roleStatusMutation.isPending}
							>
								<BadgeCheck className="mr-2 h-4 w-4" />
								Enable Role
							</Button>
							<Button
								variant="outline"
								onClick={() => roleStatusMutation.mutate("disable")}
								disabled={!selectedRoleId || roleStatusMutation.isPending}
							>
								<Lock className="mr-2 h-4 w-4" />
								Disable Role
							</Button>
						</div>

						<div className="rounded-sm border border-border/60 p-3">
							<div className="mb-2 text-sm font-medium">
								Preset coverage for selected role
							</div>
							{isPermissionsLoading ? (
								<Skeleton className="h-8 w-full" />
							) : (
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={
											missingRequiredCodes.length === 0 ? "success" : "warning"
										}
									>
										{missingRequiredCodes.length === 0
											? "All required permissions present"
											: `${missingRequiredCodes.length} missing`}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{
											permissionData.filter((permission) => permission.selected)
												.length
										}
										/{permissionData.length} permissions selected
									</span>
								</div>
							)}
							{missingRequiredCodes.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1">
									{missingRequiredCodes.slice(0, 8).map((code) => (
										<Badge key={code} variant="outline">
											{code}
										</Badge>
									))}
									{missingRequiredCodes.length > 8 && (
										<Badge variant="outline">
											+{missingRequiredCodes.length - 8} more
										</Badge>
									)}
								</div>
							)}
						</div>

						{templateError && (
							<p className="text-sm text-destructive">
								Unable to load roles from users template.
							</p>
						)}
						{permissionsError && (
							<p className="text-sm text-destructive">
								Unable to load permissions for the selected role.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Provisioned Self-Service Users</CardTitle>
					</CardHeader>
					<CardContent>
						{isUsersLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: 8 }).map((_, index) => (
									<Skeleton
										key={`self-service-user-row-skeleton-${index}`}
										className="h-12 w-full"
									/>
								))}
							</div>
						) : (
							<DataTable
								data={selfServiceUsers}
								columns={userColumns}
								getRowId={(user) =>
									user.id ?? user.username ?? "self-service-row"
								}
								emptyMessage="No self-service users found."
							/>
						)}
						{usersError && (
							<p className="mt-3 text-sm text-destructive">
								Unable to load self-service users.
							</p>
						)}
						{clientsError && (
							<p className="mt-2 text-sm text-destructive">
								Client lookup failed. Client names may be incomplete.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isUserSheetOpen} onOpenChange={handleUserSheetChange}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>
							{editingUserId === null
								? "Create Self-Service User"
								: "Update Self-Service User"}
						</SheetTitle>
						<SheetDescription>
							Map this login to one client record and a self-service role.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						<SubmitErrorAlert
							error={userFormError}
							title={
								editingUserId === null
									? "Unable to create self-service user"
									: "Unable to update self-service user"
							}
						/>

						{isEditingUserLoading && editingUserId !== null ? (
							<div className="space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : (
							<form
								onSubmit={handleSubmit((values) => {
									if (
										editingUserId === null &&
										!values.sendPasswordToEmail &&
										(!values.password || !values.repeatPassword)
									) {
										setError("password", {
											type: "manual",
											message:
												"Password is required when send password to email is off.",
										});
										setError("repeatPassword", {
											type: "manual",
											message: "Confirm password is required.",
										});
										return;
									}

									setUserFormError(null);
									upsertUserMutation.mutate(values);
								})}
								className="space-y-4"
							>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="username">
											Username <span className="text-destructive">*</span>
										</Label>
										<Input
											id="username"
											disabled={editingUserId !== null}
											{...register("username")}
										/>
										{(errors.username?.message ||
											getSubmitFieldError(userFormError, "username")) && (
											<p className="text-sm text-destructive">
												{errors.username?.message ||
													getSubmitFieldError(userFormError, "username")}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="email">Email</Label>
										<Input id="email" type="email" {...register("email")} />
										{(errors.email?.message ||
											getSubmitFieldError(userFormError, "email")) && (
											<p className="text-sm text-destructive">
												{errors.email?.message ||
													getSubmitFieldError(userFormError, "email")}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="firstname">
											First Name <span className="text-destructive">*</span>
										</Label>
										<Input id="firstname" {...register("firstname")} />
										{(errors.firstname?.message ||
											getSubmitFieldError(userFormError, "firstname")) && (
											<p className="text-sm text-destructive">
												{errors.firstname?.message ||
													getSubmitFieldError(userFormError, "firstname")}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="lastname">
											Last Name <span className="text-destructive">*</span>
										</Label>
										<Input id="lastname" {...register("lastname")} />
										{(errors.lastname?.message ||
											getSubmitFieldError(userFormError, "lastname")) && (
											<p className="text-sm text-destructive">
												{errors.lastname?.message ||
													getSubmitFieldError(userFormError, "lastname")}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="officeId">
											Office <span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="officeId"
											render={({ field }) => (
												<Select
													value={
														field.value > 0 ? String(field.value) : undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="officeId">
														<SelectValue placeholder="Select office" />
													</SelectTrigger>
													<SelectContent>
														{(usersTemplate?.allowedOffices ?? [])
															.filter(
																(office) =>
																	typeof office.id === "number" &&
																	typeof office.name === "string",
															)
															.map((office) => (
																<SelectItem
																	key={office.id}
																	value={String(office.id)}
																>
																	{office.nameDecorated ?? office.name}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
											)}
										/>
										{(errors.officeId?.message ||
											getSubmitFieldError(userFormError, "officeId")) && (
											<p className="text-sm text-destructive">
												{errors.officeId?.message ||
													getSubmitFieldError(userFormError, "officeId")}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="roleId">
											Self-Service Role{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Controller
											control={control}
											name="roleId"
											render={({ field }) => (
												<Select
													value={
														field.value > 0 ? String(field.value) : undefined
													}
													onValueChange={(value) =>
														field.onChange(Number(value))
													}
												>
													<SelectTrigger id="roleId">
														<SelectValue placeholder="Select role" />
													</SelectTrigger>
													<SelectContent>
														{roleOptions.map((role) => (
															<SelectItem key={role.id} value={String(role.id)}>
																{role.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										{(errors.roleId?.message ||
											getSubmitFieldError(userFormError, "roles")) && (
											<p className="text-sm text-destructive">
												{errors.roleId?.message ||
													getSubmitFieldError(userFormError, "roles")}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="clientId">
										Client <span className="text-destructive">*</span>
									</Label>
									<Controller
										control={control}
										name="clientId"
										render={({ field }) => (
											<Select
												value={
													field.value > 0 ? String(field.value) : undefined
												}
												onValueChange={(value) => field.onChange(Number(value))}
												disabled={isClientsLoading}
											>
												<SelectTrigger id="clientId">
													<SelectValue
														placeholder={
															isClientsLoading
																? "Loading clients..."
																: "Select client"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{clients.map((client) => (
														<SelectItem
															key={client.id}
															value={String(client.id)}
														>
															{client.displayName}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{(errors.clientId?.message ||
										getSubmitFieldError(userFormError, "clients")) && (
										<p className="text-sm text-destructive">
											{errors.clientId?.message ||
												getSubmitFieldError(userFormError, "clients")}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="password">
											Password
											{editingUserId === null && (
												<span className="text-destructive"> *</span>
											)}
										</Label>
										<Input
											id="password"
											type="password"
											{...register("password")}
										/>
										{(errors.password?.message ||
											getSubmitFieldError(userFormError, "password")) && (
											<p className="text-sm text-destructive">
												{errors.password?.message ||
													getSubmitFieldError(userFormError, "password")}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="repeatPassword">
											Confirm Password
											{editingUserId === null && (
												<span className="text-destructive"> *</span>
											)}
										</Label>
										<Input
											id="repeatPassword"
											type="password"
											{...register("repeatPassword")}
										/>
										{(errors.repeatPassword?.message ||
											getSubmitFieldError(userFormError, "repeatPassword")) && (
											<p className="text-sm text-destructive">
												{errors.repeatPassword?.message ||
													getSubmitFieldError(userFormError, "repeatPassword")}
											</p>
										)}
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2">
										<Controller
											control={control}
											name="sendPasswordToEmail"
											render={({ field }) => (
												<Checkbox
													id="sendPasswordToEmail"
													checked={field.value ?? false}
													onCheckedChange={(value) =>
														field.onChange(Boolean(value))
													}
												/>
											)}
										/>
										<Label htmlFor="sendPasswordToEmail">
											Send password to email
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<Controller
											control={control}
											name="passwordNeverExpires"
											render={({ field }) => (
												<Checkbox
													id="passwordNeverExpires"
													checked={field.value ?? false}
													onCheckedChange={(value) =>
														field.onChange(Boolean(value))
													}
												/>
											)}
										/>
										<Label htmlFor="passwordNeverExpires">
											Password never expires
										</Label>
									</div>
								</div>

								<div className="flex items-center justify-end gap-2 pt-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => handleUserSheetChange(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={upsertUserMutation.isPending}>
										{upsertUserMutation.isPending
											? editingUserId === null
												? "Creating..."
												: "Updating..."
											: editingUserId === null
												? "Create User"
												: "Save Changes"}
									</Button>
								</div>
							</form>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
