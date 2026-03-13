import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

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
		const searchParams = request.nextUrl.searchParams;
		const fineractParams = new URLSearchParams();

		if (searchParams.get("template") === "true") {
			fineractParams.set("template", "true");
		}

		const path = fineractParams.toString()
			? `${FINERACT_ENDPOINTS.staff}/${id}?${fineractParams.toString()}`
			: `${FINERACT_ENDPOINTS.staff}/${id}`;

		const staff = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(staff);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/staff/[id]
 * Updates a single staff member by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;
		const body = await request.json();

		const result = await fineractFetch(`${FINERACT_ENDPOINTS.staff}/${id}`, {
			method: "PUT",
			body,
			tenantId,
		});

		return NextResponse.json(result ?? {});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
