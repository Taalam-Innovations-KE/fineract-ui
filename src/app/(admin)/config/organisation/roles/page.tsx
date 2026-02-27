"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { ActionSubmitButton } from "@/components/forms/action-submit-button";
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
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetRolesResponse,
	PostRolesRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	failedSubmitActionState,
	INITIAL_SUBMIT_ACTION_STATE,
	type SubmitActionState,
	successSubmitActionState,
} from "@/lib/fineract/submit-action-state";
import { getSubmitFieldError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

interface RoleTemplate {
	name: string;
	description: string;
}

const ROLE_TEMPLATES: RoleTemplate[] = [
	{ name: "Super User", description: "Full system access" },
	{ name: "Loan Officer", description: "Manage loans and clients" },
	{ name: "Teller", description: "Handle transactions" },
	{ name: "Auditor", description: "View reports and logs" },
];

const EMPTY_ROLE_FORM = {
	name: "",
	description: "",
};

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

async function createRole(
	tenantId: string,
	data: PostRolesRequest,
): Promise<GetRolesResponse> {
	const response = await fetch(BFF_ROUTES.roles, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const payload = await response
			.json()
			.catch(() => ({ message: "Failed to create role" }));
		throw payload;
	}

	return response.json();
}

interface CreateRoleSheetFormProps {
	tenantId: string;
	onCancel: () => void;
	onSuccess: () => void;
}

function CreateRoleSheetForm({
	tenantId,
	onCancel,
	onSuccess,
}: CreateRoleSheetFormProps) {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState(EMPTY_ROLE_FORM);

	const [submitState, submitCreateRole] = useActionState(
		async (
			_previousState: SubmitActionState,
			formPayload: FormData,
		): Promise<SubmitActionState> => {
			const name = String(formPayload.get("name") ?? "").trim();
			const description = String(formPayload.get("description") ?? "").trim();

			if (!name) {
				return failedSubmitActionState(
					{ message: "Name is required" },
					{
						action: "createRole",
						endpoint: BFF_ROUTES.roles,
						method: "POST",
						tenantId,
					},
				);
			}

			try {
				await createRole(tenantId, {
					name,
					description: description || undefined,
				});
				await queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
				setFormData(EMPTY_ROLE_FORM);
				onSuccess();
				return successSubmitActionState();
			} catch (error) {
				return failedSubmitActionState(error, {
					action: "createRole",
					endpoint: BFF_ROUTES.roles,
					method: "POST",
					tenantId,
				});
			}
		},
		INITIAL_SUBMIT_ACTION_STATE,
	);

	const nameError = getSubmitFieldError(submitState.error, "name");
	const descriptionError = getSubmitFieldError(
		submitState.error,
		"description",
	);

	return (
		<form action={submitCreateRole} className="mt-6 space-y-4">
			<SubmitErrorAlert
				error={submitState.error}
				title="Failed to create role"
			/>
			<div className="space-y-2">
				<Label htmlFor="role-template">Template (Optional)</Label>
				<Select
					onValueChange={(value) => {
						const template = ROLE_TEMPLATES.find((item) => item.name === value);
						if (!template) {
							return;
						}
						setFormData({
							name: template.name,
							description: template.description,
						});
					}}
				>
					<SelectTrigger id="role-template">
						<SelectValue placeholder="Select a template" />
					</SelectTrigger>
					<SelectContent>
						{ROLE_TEMPLATES.map((template) => (
							<SelectItem key={template.name} value={template.name}>
								{template.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label htmlFor="role-name">Name</Label>
				<Input
					id="role-name"
					name="name"
					value={formData.name}
					onChange={(event) =>
						setFormData((current) => ({ ...current, name: event.target.value }))
					}
					required
				/>
				{nameError && <p className="text-xs text-destructive">{nameError}</p>}
			</div>
			<div className="space-y-2">
				<Label htmlFor="role-description">Description</Label>
				<Textarea
					id="role-description"
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
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<ActionSubmitButton pendingLabel="Creating...">
					Create
				</ActionSubmitButton>
			</SheetFooter>
		</form>
	);
}

export default function RolesPage() {
	const { tenantId } = useTenantStore();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createFormKey, setCreateFormKey] = useState(0);

	const {
		data: roles = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["roles", tenantId],
		queryFn: () => fetchRoles(tenantId),
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
	];

	return (
		<PageShell
			title="Roles & Permissions"
			subtitle="View and manage system roles and their permissions"
		>
			<div className="space-y-6">
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
							<Sheet
								open={createDialogOpen}
								onOpenChange={(open) => {
									setCreateDialogOpen(open);
									if (open) {
										setCreateFormKey((value) => value + 1);
									}
								}}
							>
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
									<CreateRoleSheetForm
										key={createFormKey}
										tenantId={tenantId}
										onCancel={() => setCreateDialogOpen(false)}
										onSuccess={() => setCreateDialogOpen(false)}
									/>
								</SheetContent>
							</Sheet>
						</CardTitle>
						<CardDescription>
							{roles.length} role{roles.length !== 1 ? "s" : ""} in the system
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: 8 }).map((_, index) => (
									<Skeleton
										key={`roles-row-skeleton-${index}`}
										className="h-12 w-full"
									/>
								))}
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
