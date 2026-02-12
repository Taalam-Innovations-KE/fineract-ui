"use server";

import { fineractFetch } from "@/lib/fineract/client.server";
import type {
	GetRolesResponse,
	GetRolesRoleIdPermissionsResponse,
	PutRolesRoleIdPermissionsRequest,
} from "@/lib/fineract/generated/types.gen";

export interface RolePermissionUsage {
	code: string;
	grouping: string;
	actionName: string;
	entityName: string;
	selected: boolean;
}

export async function fetchRole(roleId: string): Promise<GetRolesResponse> {
	return fineractFetch(`/v1/roles/${roleId}`, { method: "GET" });
}

export async function fetchRolePermissions(
	roleId: string,
): Promise<RolePermissionUsage[]> {
	const response = await fineractFetch<GetRolesRoleIdPermissionsResponse>(
		`/v1/roles/${roleId}/permissions`,
		{ method: "GET" },
	);

	return (
		response.permissionUsageData
			?.map((permission) => ({
				code: String(permission.code ?? ""),
				grouping: String(permission.grouping ?? "General"),
				actionName: String(permission.actionName ?? ""),
				entityName: String(permission.entityName ?? ""),
				selected: permission.selected === true,
			}))
			.filter((permission) => permission.code.length > 0)
			.sort((a, b) => a.code.localeCompare(b.code)) ?? []
	);
}

export async function updateRolePermissions(
	roleId: number,
	permissions: Record<string, boolean>,
): Promise<void> {
	const payload: PutRolesRoleIdPermissionsRequest = { permissions };

	await fineractFetch(`/v1/roles/${roleId}/permissions`, {
		method: "PUT",
		body: payload,
	});
}
