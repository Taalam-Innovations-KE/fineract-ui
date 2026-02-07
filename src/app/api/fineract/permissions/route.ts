import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { PutPermissionsRequest } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/permissions
 * Fetches all permissions
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const url = new URL(request.url);
		const makerCheckerable = url.searchParams.get("makerCheckerable");

		let endpoint = FINERACT_ENDPOINTS.permissions;
		if (makerCheckerable === "true") {
			endpoint += "?makerCheckerable=true";
		}

		const permissions = await fineractFetch(endpoint, {
			method: "GET",
			tenantId,
			useBasicAuth: true,
		});

		return NextResponse.json(permissions);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/permissions
 * Updates permissions
 */
export async function PUT(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const updates = await request.json();
		let body: PutPermissionsRequest;

		if (Array.isArray(updates)) {
			body = {
				permissions: Object.fromEntries(
					updates
						.filter(
							(update): update is { code: string; selected: boolean } =>
								typeof update?.code === "string" &&
								typeof update?.selected === "boolean",
						)
						.map((update) => [update.code, update.selected]),
				),
			};
		} else {
			body = updates as PutPermissionsRequest;
		}

		await fineractFetch(FINERACT_ENDPOINTS.permissions, {
			method: "PUT",
			tenantId,
			body,
			useBasicAuth: true,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
