import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	PutStaffRequest,
	Staff,
} from "@/lib/fineract/generated/types.gen";

type StaffRouteContext = {
	params: Promise<{ staffId: string }>;
};

/**
 * GET /api/fineract/staff/:staffId
 * Fetch a staff member
 */
export async function GET(request: NextRequest, context: StaffRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { staffId } = await context.params;

		const staff = await fineractFetch<Staff>(
			`${FINERACT_ENDPOINTS.staff}/${staffId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(staff);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/staff/:staffId
 * Update a staff member
 */
export async function PUT(request: NextRequest, context: StaffRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { staffId } = await context.params;
		const body = (await request.json()) as PutStaffRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.staff}/${staffId}`,
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
