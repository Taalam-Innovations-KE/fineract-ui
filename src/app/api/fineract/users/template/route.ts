import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetUsersTemplateResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/users/template
 * Fetches user creation template metadata
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const template = await fineractFetch<GetUsersTemplateResponse>(
			FINERACT_ENDPOINTS.usersTemplate,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
