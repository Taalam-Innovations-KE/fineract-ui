import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

interface RouteContext {
	params: {
		datatable: string;
		apptableId: string;
	};
}

/**
 * GET /api/fineract/datatables/{datatable}/{apptableId}
 * Fetches datatable entry
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable, apptableId } = context.params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.datatables}/${datatable}/${apptableId}?${queryString}`
			: `${FINERACT_ENDPOINTS.datatables}/${datatable}/${apptableId}`;

		const result = await fineractFetch(path, {
			method: "GET",
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

/**
 * POST /api/fineract/datatables/{datatable}/{apptableId}
 * Creates datatable entry
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable, apptableId } = context.params;
		const body = await request.json();

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.datatables}/${datatable}/${apptableId}`,
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

/**
 * PUT /api/fineract/datatables/{datatable}/{apptableId}
 * Updates datatable entry
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable, apptableId } = context.params;
		const body = await request.json();

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.datatables}/${datatable}/${apptableId}`,
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
