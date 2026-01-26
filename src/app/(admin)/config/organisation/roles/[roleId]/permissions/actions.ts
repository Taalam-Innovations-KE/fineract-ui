"use server";

import { fineractFetch } from "@/lib/fineract/client.server";
import type { GetRolesResponse } from "@/lib/fineract/generated/types.gen";

export async function fetchRole(roleId: string): Promise<GetRolesResponse> {
	return fineractFetch(`/v1/roles/${roleId}`, { method: "GET" });
}

export async function fetchRolePermissions(roleId: string): Promise<number[]> {
	return fineractFetch(`/v1/roles/${roleId}/permissions`, { method: "GET" });
}

export async function updateRolePermissions(
	roleId: number,
	permissionIds: number[],
): Promise<void> {
	await fineractFetch(`/v1/roles/${roleId}/permissions`, {
		method: "PUT",
		body: permissionIds,
	});
}
