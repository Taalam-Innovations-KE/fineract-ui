import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetUsersUserIdResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/users/[id]
 * Fetches a single user by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const user = await fineractFetch<GetUsersUserIdResponse>(
			`${FINERACT_ENDPOINTS.users}/${id}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(user);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
