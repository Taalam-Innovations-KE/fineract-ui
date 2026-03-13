"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Shield, UserCog } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { UserForm } from "@/components/config/forms/user-form";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetUsersResponse,
	GetUsersTemplateResponse,
	PostUsersRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";
import { useTenantStore } from "@/store/tenant";

type AccountScopeFilter = "all" | "admin" | "self-service";

async function fetchUsers(tenantId: string): Promise<GetUsersResponse[]> {
	const response = await fetch(BFF_ROUTES.users, {
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

async function createUser(tenantId: string, payload: PostUsersRequest) {
	const response = await fetch(BFF_ROUTES.users, {
		method: "POST",
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

function UsersTableSkeleton() {
	return (
		<div className="space-y-2">
			<div className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
							<th className="px-3 py-2">
								<Skeleton className="h-4 w-20" />
							</th>
							<th className="px-3 py-2 text-right">
								<Skeleton className="ml-auto h-4 w-12" />
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 8 }).map((_, index) => (
							<tr key={`users-row-skeleton-${index}`}>
								<td className="px-3 py-2">
									<div className="space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-40" />
									</div>
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</td>
								<td className="px-3 py-2">
									<Skeleton className="h-4 w-28" />
								</td>
								<td className="px-3 py-2">
									<div className="flex gap-1">
										<Skeleton className="h-6 w-16" />
										<Skeleton className="h-6 w-14" />
									</div>
								</td>
								<td className="px-3 py-2 text-right">
									<Skeleton className="ml-auto h-8 w-16" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function roleIdsForUser(user: GetUsersResponse) {
	return (user.selectedRoles ?? [])
		.map((role) => role.id)
		.filter((roleId): roleId is number => typeof roleId === "number");
}

function linkedStaffName(user: GetUsersResponse) {
	const explicitDisplayName = user.staff?.displayName?.trim();
	if (explicitDisplayName) {
		return explicitDisplayName;
	}

	return [user.staff?.firstname, user.staff?.lastname]
		.filter(Boolean)
		.join(" ")
		.trim();
}

function isSelfServiceUser(
	user: GetUsersResponse,
	selfServiceRoleIds: Set<number>,
) {
	return roleIdsForUser(user).some((roleId) => selfServiceRoleIds.has(roleId));
}

export default function UsersPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [officeFilter, setOfficeFilter] = useState("all");
	const [accountScopeFilter, setAccountScopeFilter] =
		useState<AccountScopeFilter>("all");
	const deferredSearchValue = useDeferredValue(searchValue);

	const {
		data: users = [],
		isLoading: usersLoading,
		error: usersError,
	} = useQuery({
		queryKey: ["users", tenantId],
		queryFn: () => fetchUsers(tenantId),
		enabled: Boolean(tenantId),
	});

	const {
		data: template,
		isLoading: templateLoading,
		error: templateError,
	} = useQuery({
		queryKey: ["users-template", tenantId],
		queryFn: () => fetchUsersTemplate(tenantId),
		enabled: Boolean(tenantId),
		staleTime: 5 * 60 * 1000,
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostUsersRequest) => createUser(tenantId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users", tenantId] });
			setIsCreateSheetOpen(false);
		},
	});

	const selfServiceRoleIds = new Set(
		(template?.selfServiceRoles ?? [])
			.map((role) => role.id)
			.filter((roleId): roleId is number => typeof roleId === "number"),
	);
	const linkedUsersCount = users.filter((user) =>
		Boolean(user.staff?.id),
	).length;
	const selfServiceUsersCount = users.filter((user) =>
		isSelfServiceUser(user, selfServiceRoleIds),
	).length;
	const normalizedSearch = deferredSearchValue.trim().toLowerCase();

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			normalizedSearch.length === 0 ||
			[
				user.username,
				user.firstname,
				user.lastname,
				user.email,
				user.officeName,
				linkedStaffName(user),
			]
				.filter(Boolean)
				.some((value) => value?.toLowerCase().includes(normalizedSearch));

		const matchesOffice =
			officeFilter === "all" || String(user.officeId) === officeFilter;

		const matchesScope =
			accountScopeFilter === "all"
				? true
				: accountScopeFilter === "self-service"
					? isSelfServiceUser(user, selfServiceRoleIds)
					: !isSelfServiceUser(user, selfServiceRoleIds);

		return matchesSearch && matchesOffice && matchesScope;
	});

	const columns: DataTableColumn<GetUsersResponse>[] = [
		{
			header: "User",
			cell: (user) => (
				<div className="space-y-1">
					<div className="font-medium">
						{[user.firstname, user.lastname].filter(Boolean).join(" ") ||
							user.username ||
							"Unnamed User"}
					</div>
					<div className="text-xs text-muted-foreground">
						@{user.username || "unknown"} {user.email ? `• ${user.email}` : ""}
					</div>
				</div>
			),
		},
		{
			header: "Office",
			cell: (user) => (
				<span className={user.officeName ? "" : "text-muted-foreground"}>
					{user.officeName || "No office"}
				</span>
			),
		},
		{
			header: "Linked Staff",
			cell: (user) => {
				const staffName = linkedStaffName(user);
				return (
					<span className={staffName ? "" : "text-muted-foreground"}>
						{staffName || "Not linked"}
					</span>
				);
			},
		},
		{
			header: "Access",
			cell: (user) => (
				<div className="flex flex-wrap gap-1">
					{isSelfServiceUser(user, selfServiceRoleIds) ? (
						<Badge variant="outline">Self Service</Badge>
					) : (
						<Badge variant="secondary">Admin</Badge>
					)}
					{user.passwordNeverExpires && (
						<Badge variant="warning">No Expiry</Badge>
					)}
					{(user.selectedRoles ?? []).slice(0, 2).map((role) => (
						<Badge key={`${user.id}-${role.id}`} variant="secondary">
							{role.name}
						</Badge>
					))}
					{(user.selectedRoles?.length ?? 0) > 2 && (
						<Badge variant="outline">
							+{(user.selectedRoles?.length ?? 0) - 2}
						</Badge>
					)}
				</div>
			),
		},
	];

	return (
		<PageShell
			title="Users"
			subtitle="Manage application logins, roles, and optional staff links without coupling account creation to staff onboarding."
			actions={
				<Button onClick={() => setIsCreateSheetOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create User
				</Button>
			}
		>
			<div className="space-y-6">
				<Alert>
					<AlertTitle>Separate user accounts from staff records</AlertTitle>
					<AlertDescription>
						Create staff records independently, then provision system access
						only where a login is required.
					</AlertDescription>
				</Alert>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
									<UserCog className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="text-2xl font-bold">{users.length}</div>
									<div className="text-sm text-muted-foreground">
										Total Users
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-success/10">
									<Building2 className="h-5 w-5 text-success" />
								</div>
								<div>
									<div className="text-2xl font-bold">{linkedUsersCount}</div>
									<div className="text-sm text-muted-foreground">
										Linked to Staff
									</div>
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
									<div className="text-2xl font-bold">
										{selfServiceUsersCount}
									</div>
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
									<div className="text-2xl font-bold">
										{template?.availableRoles?.length ?? 0}
									</div>
									<div className="text-sm text-muted-foreground">
										Assignable Roles
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Filters</CardTitle>
						<CardDescription>
							Refine the user list by office, account type, and search terms.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="users-search">Search</Label>
								<Input
									id="users-search"
									value={searchValue}
									onChange={(event) => setSearchValue(event.target.value)}
									placeholder="Search username, email, office, or linked staff"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="users-office-filter">Office</Label>
								<Select value={officeFilter} onValueChange={setOfficeFilter}>
									<SelectTrigger id="users-office-filter">
										<SelectValue placeholder="All offices" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All offices</SelectItem>
										{(template?.allowedOffices ?? []).map((office) => (
											<SelectItem key={office.id} value={String(office.id)}>
												{office.nameDecorated || office.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="users-scope-filter">Account Scope</Label>
								<Select
									value={accountScopeFilter}
									onValueChange={(value) =>
										setAccountScopeFilter(value as AccountScopeFilter)
									}
								>
									<SelectTrigger id="users-scope-filter">
										<SelectValue placeholder="All accounts" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All accounts</SelectItem>
										<SelectItem value="admin">Admin accounts</SelectItem>
										<SelectItem value="self-service">
											Self-service accounts
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>System Users</CardTitle>
						<CardDescription>
							{filteredUsers.length} user
							{filteredUsers.length === 1 ? "" : "s"} match the current filters.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{usersLoading ? <UsersTableSkeleton /> : null}
						{usersError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load users</AlertTitle>
								<AlertDescription>
									Check connectivity and your access to the users resource, then
									retry.
								</AlertDescription>
							</Alert>
						) : null}
						{templateError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load user template data</AlertTitle>
								<AlertDescription>
									Role and office setup could not be loaded from the backend
									template.
								</AlertDescription>
							</Alert>
						) : null}
						{!usersLoading && !usersError ? (
							<DataTable
								data={filteredUsers}
								columns={columns}
								getRowId={(user) => user.id ?? user.username ?? "user-row"}
								enableActions={true}
								getViewUrl={(user) => `/config/organisation/users/${user.id}`}
								emptyMessage="No users match the current filters."
							/>
						) : null}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>Create User</SheetTitle>
						<SheetDescription>
							Provision a login account, assign roles, and optionally link the
							account to an active staff member in the same office.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						{templateLoading ? (
							<div className="space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : templateError || !template ? (
							<Alert variant="destructive">
								<AlertTitle>User template unavailable</AlertTitle>
								<AlertDescription>
									The backend template is required before a new user can be
									provisioned.
								</AlertDescription>
							</Alert>
						) : (
							<UserForm
								mode="create"
								offices={template.allowedOffices ?? []}
								roles={template.availableRoles ?? []}
								selfServiceRoleIds={Array.from(selfServiceRoleIds)}
								onSubmit={(payload) =>
									createMutation.mutateAsync(payload as PostUsersRequest)
								}
								onCancel={() => setIsCreateSheetOpen(false)}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
