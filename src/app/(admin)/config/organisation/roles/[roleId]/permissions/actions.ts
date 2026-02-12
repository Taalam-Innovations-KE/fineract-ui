"use server";

import { fineractFetch } from "@/lib/fineract/client.server";
import type {
	GetRolesResponse,
	GetRolesRoleIdPermissionsResponse,
	PutRolesRoleIdPermissionsRequest,
} from "@/lib/fineract/generated/types.gen";

export async function fetchRole(roleId: string): Promise<GetRolesResponse> {
	return fineractFetch(`/v1/roles/${roleId}`, { method: "GET" });
}

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
	const response = await fineractFetch<GetRolesRoleIdPermissionsResponse>(
		`/v1/roles/${roleId}/permissions`,
		{ method: "GET" },
	);

	return (
		response.permissionUsageData
			?.filter(
				(permission): permission is { selected: true; code: string } =>
					permission.selected === true && typeof permission.code === "string",
			)
			.map((permission) => permission.code) || []
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
