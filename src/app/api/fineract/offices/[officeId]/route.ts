import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	OfficeData,
	PutOfficesOfficeIdRequest,
} from "@/lib/fineract/generated/types.gen";

type OfficeRouteContext = {
	params: Promise<{ officeId: string }>;
};

/**
 * GET /api/fineract/offices/:officeId
 * Fetch an office
 */
export async function GET(request: NextRequest, context: OfficeRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { officeId } = await context.params;

		const office = await fineractFetch<OfficeData>(
			`${FINERACT_ENDPOINTS.offices}/${officeId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(office);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/offices/:officeId
 * Update an office
 */
export async function PUT(request: NextRequest, context: OfficeRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { officeId } = await context.params;
		const body = (await request.json()) as PutOfficesOfficeIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.offices}/${officeId}`,
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
