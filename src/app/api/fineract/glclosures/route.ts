import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetGlClosureResponse,
	PostGlClosuresRequest,
	PostGlClosuresResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/glclosures
 * Fetches accounting closures
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const searchParams = request.nextUrl.searchParams.toString();
		const path = searchParams
			? `${FINERACT_ENDPOINTS.glClosures}?${searchParams}`
			: FINERACT_ENDPOINTS.glClosures;

		const closures = await fineractFetch<GetGlClosureResponse[]>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(closures);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/glclosures
 * Creates an accounting closure
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostGlClosuresRequest;

		const result = await fineractFetch<PostGlClosuresResponse>(
			FINERACT_ENDPOINTS.glClosures,
			{
				method: "POST",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
