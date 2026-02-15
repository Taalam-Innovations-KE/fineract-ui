import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetPermissionsResponse,
	PutPermissionsRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const permissions = await fineractFetch<GetPermissionsResponse[]>(
			`${FINERACT_ENDPOINTS.permissions}?makerCheckerable=true`,
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(
			permissions.map((permission, index) => ({
				id: index + 1,
				code: permission.code || "",
				grouping: permission.grouping || "",
				selected: permission.selected || false,
			})),
		);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

export async function PUT(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const permissions = await request.json();
		let body: PutPermissionsRequest;

		if (Array.isArray(permissions)) {
			body = {
				permissions: Object.fromEntries(
					permissions
						.filter(
							(permission): permission is { code: string; selected: boolean } =>
								typeof permission?.code === "string" &&
								typeof permission?.selected === "boolean",
						)
						.map((permission) => [permission.code, permission.selected]),
				),
			};
		} else {
			body = permissions as PutPermissionsRequest;
		}

		await fineractFetch(FINERACT_ENDPOINTS.permissions, {
			method: "PUT",
			tenantId,
			body,
			useBasicAuth: true,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
