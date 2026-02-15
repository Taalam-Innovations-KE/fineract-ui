import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetDataTablesResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		datatable: string;
	}>;
}

/**
 * GET /api/fineract/datatables/{datatable}
 * Fetches datatable definition
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable } = await context.params;

		const result = await fineractFetch<GetDataTablesResponse>(
			`${FINERACT_ENDPOINTS.datatables}/${datatable}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
