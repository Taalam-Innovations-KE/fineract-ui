import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetJobsResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/jobs
 * Fetches scheduler jobs
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const jobs = await fineractFetch<GetJobsResponse[]>(
			FINERACT_ENDPOINTS.jobs,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(jobs);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
