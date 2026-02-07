import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	PutWorkingDaysRequest,
	PutWorkingDaysResponse,
	WorkingDaysData,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/workingdays
 * Fetches working days configuration
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const workingDays = await fineractFetch<WorkingDaysData>(
			FINERACT_ENDPOINTS.workingDays,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(workingDays);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/workingdays
 * Updates working days configuration
 */
export async function PUT(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PutWorkingDaysRequest;

		const result = await fineractFetch<PutWorkingDaysResponse>(
			FINERACT_ENDPOINTS.workingDays,
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
