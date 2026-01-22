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
import { fineractFetch } from "@/lib/fineract/client.server";
import type { GetRolesResponse } from "@/lib/fineract/generated/types.gen";
import type {
	MakerCheckerEntry,
	Permission,
} from "@/lib/fineract/maker-checker";
import { getPermissions } from "@/lib/fineract/maker-checker";

async function fetchRole(roleId: string): Promise<GetRolesResponse> {
	return fineractFetch(`/v1/roles/${roleId}`, { method: "GET" });
}

async function fetchRolePermissions(roleId: string): Promise<number[]> {
	return fineractFetch(`/v1/roles/${roleId}/permissions`, { method: "GET" });
}

async function updateRolePermissions(
	roleId: number,
	permissionIds: number[],
): Promise<void> {
	await fineractFetch(`/v1/roles/${roleId}/permissions`, {
		method: "PUT",
		body: permissionIds,
	});
}

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

	const { data: rolePermissionIds = [], isLoading: permissionsLoading } =
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
		mutationFn: ({ permissionIds }: { permissionIds: number[] }) =>
			updateRolePermissions(parseInt(roleId), permissionIds),
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

	const handlePermissionToggle = (permissionId: number, checked: boolean) => {
		const currentIds = rolePermissionIds;
		let newIds: number[];
		if (checked) {
			newIds = [...currentIds, permissionId];
		} else {
			newIds = currentIds.filter((id) => id !== permissionId);
		}
		updateMutation.mutate({ permissionIds: newIds });
	};

	const permissionModules = {
		Loans: allPermissions.filter((p) => p.code.includes("LOAN")),
		Savings: allPermissions.filter(
			(p) => p.code.includes("SAVINGS") || p.code.includes("SAVING"),
		),
		Clients: allPermissions.filter((p) => p.code.includes("CLIENT")),
		Products: allPermissions.filter(
			(p) =>
				p.code.includes("PRODUCT") ||
				p.code.includes("DEPOSIT") ||
				p.code.includes("SHARE"),
		),
		System: allPermissions.filter(
			(p) =>
				!p.code.includes("LOAN") &&
				!p.code.includes("SAVINGS") &&
				!p.code.includes("SAVING") &&
				!p.code.includes("CLIENT") &&
				!p.code.includes("PRODUCT") &&
				!p.code.includes("DEPOSIT") &&
				!p.code.includes("SHARE"),
		),
	};

	if (roleLoading || permissionsLoading) {
		return (
			<PageShell title="Role Permissions">
				<div>Loading...</div>
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
						rolePermissionIds.includes(p.id),
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
											const isAssigned = rolePermissionIds.includes(perm.id);
											const requiresApproval = perm.selected; // From maker checker

											return (
												<div
													key={perm.code}
													className="flex items-center space-x-2"
												>
													<Checkbox
														checked={isAssigned}
														onCheckedChange={(checked) =>
															handlePermissionToggle(
																perm.id,
																checked as boolean,
															)
														}
														disabled={updateMutation.isPending}
													/>
													<div className="flex-1">
														<label className="text-sm font-medium">
															{perm.code}
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
