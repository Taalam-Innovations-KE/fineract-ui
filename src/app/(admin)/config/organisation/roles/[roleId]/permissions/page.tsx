"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { Permission } from "@/lib/fineract/maker-checker";
import { getPermissions } from "@/lib/fineract/maker-checker";
import {
	fetchRole,
	fetchRolePermissions,
	updateRolePermissions,
} from "./actions";

export default function RolePermissionsPage() {
	const params = useParams();
	const roleId = params.roleId as string;
	const queryClient = useQueryClient();

	const [expandedModules, setExpandedModules] = useState<Set<string>>(
		new Set(),
	);

	const { data: role, isLoading: roleLoading } = useQuery({
		queryKey: ["role", roleId],
		queryFn: () => fetchRole(roleId),
		enabled: !!roleId,
	});

	const { data: rolePermissionCodes = [], isLoading: permissionsLoading } =
		useQuery({
			queryKey: ["role-permissions", roleId],
			queryFn: () => fetchRolePermissions(roleId),
			enabled: !!roleId,
		});

	const { data: allPermissions = [] } = useQuery({
		queryKey: ["permissions"],
		queryFn: getPermissions,
	});

	const updateMutation = useMutation({
		mutationFn: ({ permissions }: { permissions: Record<string, boolean> }) =>
			updateRolePermissions(Number.parseInt(roleId, 10), permissions),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["role-permissions", roleId] });
		},
	});

	const toggleModule = (module: string) => {
		const newExpanded = new Set(expandedModules);
		if (newExpanded.has(module)) {
			newExpanded.delete(module);
		} else {
			newExpanded.add(module);
		}
		setExpandedModules(newExpanded);
	};

	const getPermissionCode = (permission: Permission): string =>
		String(permission.code ?? "");

	const handlePermissionToggle = (permissionCode: string, checked: boolean) => {
		const currentCodes = rolePermissionCodes;
		let nextCodes: string[];
		if (checked) {
			nextCodes = currentCodes.includes(permissionCode)
				? currentCodes
				: [...currentCodes, permissionCode];
		} else {
			nextCodes = currentCodes.filter((code) => code !== permissionCode);
		}

		const permissions = Object.fromEntries(
			allPermissions
				.map((permission) => {
					const code = getPermissionCode(permission);
					return [code, nextCodes.includes(code)] as const;
				})
				.filter(([code]) => code.length > 0),
		);

		updateMutation.mutate({ permissions });
	};

	const permissionModules = {
		Loans: allPermissions.filter((p) => getPermissionCode(p).includes("LOAN")),
		Savings: allPermissions.filter(
			(p) =>
				getPermissionCode(p).includes("SAVINGS") ||
				getPermissionCode(p).includes("SAVING"),
		),
		Clients: allPermissions.filter((p) =>
			getPermissionCode(p).includes("CLIENT"),
		),
		Products: allPermissions.filter(
			(p) =>
				getPermissionCode(p).includes("PRODUCT") ||
				getPermissionCode(p).includes("DEPOSIT") ||
				getPermissionCode(p).includes("SHARE"),
		),
		System: allPermissions.filter(
			(p) =>
				!getPermissionCode(p).includes("LOAN") &&
				!getPermissionCode(p).includes("SAVINGS") &&
				!getPermissionCode(p).includes("SAVING") &&
				!getPermissionCode(p).includes("CLIENT") &&
				!getPermissionCode(p).includes("PRODUCT") &&
				!getPermissionCode(p).includes("DEPOSIT") &&
				!getPermissionCode(p).includes("SHARE"),
		),
	};

	if (roleLoading || permissionsLoading) {
		return (
			<PageShell
				title="Role Permissions"
				subtitle="Configure permissions for this role"
			>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
					</Card>
					{Array.from({ length: 3 }).map((_, index) => (
						<Card key={`role-permission-skeleton-${index}`}>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<Skeleton className="h-6 w-44" />
									<Skeleton className="h-6 w-24" />
								</div>
								<Skeleton className="h-4 w-64" />
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
									{Array.from({ length: 6 }).map((__, itemIndex) => (
										<div
											key={`role-permission-item-skeleton-${index}-${itemIndex}`}
											className="flex items-center gap-2"
										>
											<Skeleton className="h-4 w-4 rounded-sm" />
											<Skeleton className="h-4 w-40" />
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</PageShell>
		);
	}

	if (!role) {
		return (
			<PageShell title="Role Permissions">
				<div>Role not found</div>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`${role.name} - Permissions`}
			subtitle="Configure permissions for this role"
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Role Information</CardTitle>
						<CardDescription>
							{role.description || "No description"}
						</CardDescription>
					</CardHeader>
				</Card>

				{Object.entries(permissionModules).map(([module, perms]) => {
					if (perms.length === 0) return null;
					const isExpanded = expandedModules.has(module);
					const assignedCount = perms.filter((p) =>
						rolePermissionCodes.includes(getPermissionCode(p)),
					).length;

					return (
						<Card key={module}>
							<CardHeader>
								<CardTitle
									className="flex items-center justify-between cursor-pointer"
									onClick={() => toggleModule(module)}
								>
									<div className="flex items-center gap-2">
										{isExpanded ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
										{module}
									</div>
									<Badge variant="secondary">
										{assignedCount}/{perms.length} assigned
									</Badge>
								</CardTitle>
								<CardDescription>
									Permissions related to {module.toLowerCase()} operations
								</CardDescription>
							</CardHeader>
							{isExpanded && (
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{perms.map((perm) => {
											const permissionCode = getPermissionCode(perm);
											const isAssigned =
												rolePermissionCodes.includes(permissionCode);
											const requiresApproval = perm.selected; // From maker checker

											return (
												<div
													key={permissionCode || `permission-${perm.id}`}
													className="flex items-center space-x-2"
												>
													<Checkbox
														checked={isAssigned}
														onCheckedChange={(checked) =>
															handlePermissionToggle(
																permissionCode,
																checked as boolean,
															)
														}
														disabled={
															updateMutation.isPending ||
															permissionCode.length === 0
														}
													/>
													<div className="flex-1">
														<label className="text-sm font-medium">
															{permissionCode || "Unnamed permission"}
														</label>
														{requiresApproval && (
															<Badge variant="outline" className="ml-2 text-xs">
																Requires Approval
															</Badge>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							)}
						</Card>
					);
				})}
			</div>
		</PageShell>
	);
}
