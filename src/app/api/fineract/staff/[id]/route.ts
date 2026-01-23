import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { Staff } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/staff/[id]
 * Fetches a single staff member by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const staff = await fineractFetch<Staff>(
			`${FINERACT_ENDPOINTS.staff}/${id}`,
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
