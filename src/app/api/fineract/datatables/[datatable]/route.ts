import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetDataTablesResponse } from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: {
		datatable: string;
	};
}

/**
 * GET /api/fineract/datatables/{datatable}
 * Fetches datatable definition
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable } = context.params;

		const result = await fineractFetch<GetDataTablesResponse>(
			`${FINERACT_ENDPOINTS.datatables}/${datatable}`,
			{
				method: "GET",
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
