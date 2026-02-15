import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		datatable: string;
		apptableId: string;
	}>;
}

/**
 * GET /api/fineract/datatables/{datatable}/{apptableId}
 * Fetches datatable entry
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { datatable, apptableId } = await context.params;
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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
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
		const { datatable, apptableId } = await context.params;
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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
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
		const { datatable, apptableId } = await context.params;
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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
