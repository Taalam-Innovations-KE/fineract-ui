import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetUsersResponse,
	PostUsersRequest,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/users
 * Fetches all users
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const users = await fineractFetch<GetUsersResponse[]>(
			FINERACT_ENDPOINTS.users,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(users);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/users
 * Creates a new user
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostUsersRequest;

		const result = await fineractFetch(FINERACT_ENDPOINTS.users, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
