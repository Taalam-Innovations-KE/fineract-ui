import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DeleteGlClosuresResponse,
	GetGlClosureResponse,
	PutGlClosuresRequest,
	PutGlClosuresResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/glclosures/[glClosureId]
 * Fetches an accounting closure by id
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ glClosureId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glClosureId } = await params;

		const closure = await fineractFetch<GetGlClosureResponse>(
			FINERACT_ENDPOINTS.glClosureById(glClosureId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(closure);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/glclosures/[glClosureId]
 * Updates accounting closure comments
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ glClosureId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glClosureId } = await params;
		const body = (await request.json()) as PutGlClosuresRequest;

		const result = await fineractFetch<PutGlClosuresResponse>(
			FINERACT_ENDPOINTS.glClosureById(glClosureId),
			{
				method: "PUT",
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

/**
 * DELETE /api/fineract/glclosures/[glClosureId]
 * Deletes an accounting closure
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ glClosureId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glClosureId } = await params;

		const result = await fineractFetch<DeleteGlClosuresResponse>(
			FINERACT_ENDPOINTS.glClosureById(glClosureId),
			{
				method: "DELETE",
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
