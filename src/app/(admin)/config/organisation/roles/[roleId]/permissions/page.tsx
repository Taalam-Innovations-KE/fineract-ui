"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";
import {
	fetchRole,
	fetchRolePermissions,
	type RolePermissionUsage,
	updateRolePermissions,
} from "./actions";

const ALL_GROUPS_OPTION = "__all_groups__";
const ALL_ACTIONS_OPTION = "__all_actions__";

function toTitleCase(value: string): string {
	return value
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

function parsePermissionCode(code: string) {
	const normalized = code.replace(/[._-]+/g, " ").trim();
	const words = normalized.split(" ").filter(Boolean);
	const action = words[0] ? toTitleCase(words[0]) : "Action";
	const resource = words.slice(1).join(" ");

	return {
		label: toTitleCase(normalized || code),
		action,
		resource: resource ? toTitleCase(resource) : "General",
	};
}

function normalizePermission(
	permission: RolePermissionUsage,
): RolePermissionUsage {
	const parsed = parsePermissionCode(permission.code);

	return {
		...permission,
		grouping:
			permission.grouping.trim().length > 0 ? permission.grouping : "General",
		actionName:
			permission.actionName.trim().length > 0
				? permission.actionName
				: parsed.action,
		entityName:
			permission.entityName.trim().length > 0
				? permission.entityName
				: parsed.resource,
	};
}

function sortPermissionsByCode(
	permissions: RolePermissionUsage[],
): RolePermissionUsage[] {
	return [...permissions].sort((a, b) => a.code.localeCompare(b.code));
}

function toSelectionMap(
	permissions: RolePermissionUsage[],
): Record<string, boolean> {
	return Object.fromEntries(
		permissions.map((permission) => [permission.code, permission.selected]),
	);
}

function RolePermissionsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={`role-permissions-stat-skeleton-${index}`}>
						<CardContent className="pt-6">
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-8 w-20" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-52" />
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={`role-permissions-filter-skeleton-${index}`}
								className="space-y-2"
							>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`role-permissions-group-skeleton-${index}`}
							className="space-y-3 rounded-sm border border-border/60 p-4"
						>
							<div className="flex items-center justify-between">
								<Skeleton className="h-5 w-56" />
								<Skeleton className="h-8 w-28" />
							</div>
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export default function RolePermissionsPage() {
	const params = useParams();
	const roleId = String(params.roleId ?? "");
	const parsedRoleId = Number.parseInt(roleId, 10);
	const queryClient = useQueryClient();
	const { tenantId } = useTenantStore();
	const [workingPermissions, setWorkingPermissions] = useState<
		RolePermissionUsage[]
	>([]);
	const [baselinePermissions, setBaselinePermissions] = useState<
		RolePermissionUsage[]
	>([]);
	const [groupFilter, setGroupFilter] = useState(ALL_GROUPS_OPTION);
	const [actionFilter, setActionFilter] = useState(ALL_ACTIONS_OPTION);
	const [searchTerm, setSearchTerm] = useState("");
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const {
		data: role,
		isLoading: roleLoading,
		error: roleError,
	} = useQuery({
		queryKey: ["role", roleId],
		queryFn: () => fetchRole(roleId),
		enabled: roleId.length > 0,
	});

	const {
		data: permissionsData,
		isLoading: permissionsLoading,
		error: permissionsError,
	} = useQuery({
		queryKey: ["role-permissions", roleId],
		queryFn: () => fetchRolePermissions(roleId),
		enabled: roleId.length > 0,
	});

	useEffect(() => {
		if (!permissionsData) return;

		const normalized = sortPermissionsByCode(
			permissionsData.map(normalizePermission),
		);
		setWorkingPermissions(normalized);
		setBaselinePermissions(normalized);
	}, [permissionsData]);

	const saveMutation = useMutation({
		mutationFn: (permissions: RolePermissionUsage[]) =>
			updateRolePermissions(
				parsedRoleId,
				Object.fromEntries(
					permissions.map((permission) => [
						permission.code,
						permission.selected,
					]),
				),
			),
		onSuccess: (_data, permissions) => {
			setSubmitError(null);
			setBaselinePermissions(sortPermissionsByCode(permissions));
			queryClient.invalidateQueries({ queryKey: ["role-permissions", roleId] });
		},
		onError: (error) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateRolePermissions",
					endpoint: `/v1/roles/${roleId}/permissions`,
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const baselineSelectionMap = useMemo(
		() => toSelectionMap(baselinePermissions),
		[baselinePermissions],
	);
	const workingSelectionMap = useMemo(
		() => toSelectionMap(workingPermissions),
		[workingPermissions],
	);

	const isDirty = useMemo(() => {
		const keys = Object.keys(workingSelectionMap);
		return keys.some(
			(key) => baselineSelectionMap[key] !== workingSelectionMap[key],
		);
	}, [baselineSelectionMap, workingSelectionMap]);

	const groups = useMemo(() => {
		return Array.from(
			new Set(workingPermissions.map((permission) => permission.grouping)),
		).sort((a, b) => a.localeCompare(b));
	}, [workingPermissions]);

	const actions = useMemo(() => {
		return Array.from(
			new Set(workingPermissions.map((permission) => permission.actionName)),
		).sort((a, b) => a.localeCompare(b));
	}, [workingPermissions]);

	const visiblePermissions = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();

		return workingPermissions.filter((permission) => {
			if (
				groupFilter !== ALL_GROUPS_OPTION &&
				permission.grouping !== groupFilter
			) {
				return false;
			}

			if (
				actionFilter !== ALL_ACTIONS_OPTION &&
				permission.actionName !== actionFilter
			) {
				return false;
			}

			if (!query) return true;

			const parsed = parsePermissionCode(permission.code);
			const haystack = [
				permission.code,
				permission.grouping,
				permission.actionName,
				permission.entityName,
				parsed.label,
			]
				.join(" ")
				.toLowerCase();

			return haystack.includes(query);
		});
	}, [actionFilter, groupFilter, searchTerm, workingPermissions]);

	const groupedVisiblePermissions = useMemo(() => {
		return visiblePermissions.reduce<Record<string, RolePermissionUsage[]>>(
			(acc, permission) => {
				const group = permission.grouping || "General";
				if (!acc[group]) acc[group] = [];
				acc[group].push(permission);
				return acc;
			},
			{},
		);
	}, [visiblePermissions]);

	const totalCount = workingPermissions.length;
	const assignedCount = workingPermissions.filter(
		(permission) => permission.selected,
	).length;
	const visibleAssignedCount = visiblePermissions.filter(
		(permission) => permission.selected,
	).length;

	const updatePermission = (code: string, selected: boolean) => {
		setWorkingPermissions((current) =>
			current.map((permission) =>
				permission.code === code ? { ...permission, selected } : permission,
			),
		);
	};

	const updateManyPermissions = (codes: string[], selected: boolean) => {
		const codeSet = new Set(codes);
		setWorkingPermissions((current) =>
			current.map((permission) =>
				codeSet.has(permission.code) ? { ...permission, selected } : permission,
			),
		);
	};

	const resetChanges = () => {
		setWorkingPermissions(sortPermissionsByCode(baselinePermissions));
		setSubmitError(null);
	};

	if (roleLoading || permissionsLoading) {
		return (
			<PageShell
				title="Role Permissions"
				subtitle="Configure permissions for this role"
			>
				<RolePermissionsSkeleton />
			</PageShell>
		);
	}

	if (roleError || permissionsError) {
		return (
			<PageShell
				title="Role Permissions"
				subtitle="Configure permissions for this role"
			>
				<Alert variant="destructive">
					<AlertTitle>Unable to load role permissions</AlertTitle>
					<AlertDescription>
						Refresh and try again. If the issue persists, verify API
						availability and your current access level.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	if (!role) {
		return (
			<PageShell
				title="Role Permissions"
				subtitle="Configure permissions for this role"
			>
				<Alert variant="destructive">
					<AlertTitle>Role not found</AlertTitle>
					<AlertDescription>
						The selected role could not be loaded. Return to Roles and try
						again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`${role.name} Permissions`}
			subtitle="Review and update role access with searchable, grouped controls."
			actions={
				<Button variant="outline" asChild>
					<Link href={`/config/organisation/roles/${roleId}`}>
						<ArrowLeft className="h-4 w-4" />
						Back to Role Details
					</Link>
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">Total Permissions</p>
							<p className="text-2xl font-bold">{totalCount}</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">Assigned</p>
							<p className="text-2xl font-bold">{assignedCount}</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">Visible Results</p>
							<p className="text-2xl font-bold">
								{visibleAssignedCount}
								<span className="text-sm font-medium text-muted-foreground">
									{" "}
									/ {visiblePermissions.length}
								</span>
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<p className="text-sm text-muted-foreground">Unsaved Changes</p>
							<p className="text-2xl font-bold">{isDirty ? "Yes" : "No"}</p>
						</CardContent>
					</Card>
				</div>

				<SubmitErrorAlert
					error={submitError}
					title="Role permissions update failed"
				/>

				<Card>
					<CardHeader>
						<CardTitle>Find and Bulk Edit</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							<div className="space-y-2">
								<label
									htmlFor="role-permissions-search"
									className="text-sm font-medium"
								>
									Search
								</label>
								<Input
									id="role-permissions-search"
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Filter by code, action, or entity"
								/>
							</div>
							<div className="space-y-2">
								<label
									htmlFor="role-permissions-group"
									className="text-sm font-medium"
								>
									Group
								</label>
								<Select value={groupFilter} onValueChange={setGroupFilter}>
									<SelectTrigger id="role-permissions-group">
										<SelectValue placeholder="All Groups" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={ALL_GROUPS_OPTION}>
											All Groups
										</SelectItem>
										{groups.map((group) => (
											<SelectItem key={group} value={group}>
												{group}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<label
									htmlFor="role-permissions-action"
									className="text-sm font-medium"
								>
									Action
								</label>
								<Select value={actionFilter} onValueChange={setActionFilter}>
									<SelectTrigger id="role-permissions-action">
										<SelectValue placeholder="All Actions" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={ALL_ACTIONS_OPTION}>
											All Actions
										</SelectItem>
										{actions.map((action) => (
											<SelectItem key={action} value={action}>
												{action}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={() =>
										updateManyPermissions(
											visiblePermissions.map((permission) => permission.code),
											true,
										)
									}
									disabled={visiblePermissions.length === 0}
								>
									Assign Visible
								</Button>
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={() =>
										updateManyPermissions(
											visiblePermissions.map((permission) => permission.code),
											false,
										)
									}
									disabled={visiblePermissions.length === 0}
								>
									Unassign Visible
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Permission Groups</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{Object.keys(groupedVisiblePermissions).length === 0 ? (
							<div className="rounded-sm border border-border/60 px-4 py-6 text-sm text-muted-foreground">
								No permissions match the current filters.
							</div>
						) : (
							Object.entries(groupedVisiblePermissions)
								.sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
								.map(([group, permissions]) => {
									const selectedCount = permissions.filter(
										(permission) => permission.selected,
									).length;
									const allSelected = selectedCount === permissions.length;

									return (
										<div
											key={group}
											className="space-y-3 rounded-sm border border-border/60 p-4"
										>
											<div className="flex items-center justify-between gap-3">
												<div className="flex items-center gap-2">
													<h3 className="font-semibold">{group}</h3>
													<Badge variant="secondary">
														{selectedCount}/{permissions.length} assigned
													</Badge>
												</div>
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															updateManyPermissions(
																permissions.map(
																	(permission) => permission.code,
																),
																true,
															)
														}
														disabled={allSelected}
													>
														Assign Group
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															updateManyPermissions(
																permissions.map(
																	(permission) => permission.code,
																),
																false,
															)
														}
														disabled={selectedCount === 0}
													>
														Unassign Group
													</Button>
												</div>
											</div>

											<div className="space-y-2">
												{sortPermissionsByCode(permissions).map(
													(permission) => {
														const parsed = parsePermissionCode(permission.code);
														const permissionId = `role-permission-${permission.code.replace(
															/[^a-zA-Z0-9_-]/g,
															"-",
														)}`;

														return (
															<div
																key={permission.code}
																className="flex items-start gap-3 rounded-sm border border-border/60 p-3"
															>
																<Checkbox
																	id={permissionId}
																	checked={permission.selected}
																	onCheckedChange={(checked) =>
																		updatePermission(
																			permission.code,
																			checked === true,
																		)
																	}
																/>
																<div className="min-w-0 flex-1 space-y-1">
																	<label
																		htmlFor={permissionId}
																		className="text-sm font-medium leading-5"
																	>
																		{parsed.label}
																	</label>
																	<div className="flex flex-wrap items-center gap-1.5">
																		<Badge variant="secondary">
																			{permission.actionName}
																		</Badge>
																		<Badge variant="outline">
																			{permission.entityName}
																		</Badge>
																		<Badge
																			variant={
																				permission.selected
																					? "success"
																					: "secondary"
																			}
																		>
																			{permission.selected
																				? "Assigned"
																				: "Unassigned"}
																		</Badge>
																	</div>
																	<p className="break-all font-mono text-xs text-muted-foreground">
																		{permission.code}
																	</p>
																</div>
															</div>
														);
													},
												)}
											</div>
										</div>
									);
								})
						)}

						<Separator />

						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={resetChanges}
								disabled={!isDirty || saveMutation.isPending}
							>
								<RotateCcw className="h-4 w-4" />
								Reset
							</Button>
							<Button
								type="button"
								onClick={() => saveMutation.mutate(workingPermissions)}
								disabled={
									!isDirty ||
									saveMutation.isPending ||
									!Number.isFinite(parsedRoleId)
								}
							>
								<Save className="h-4 w-4" />
								{saveMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
