import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { Staff } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/staff
 * Fetches all staff members
 * Supports query params: officeId, loanOfficersOnly, status
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const searchParams = request.nextUrl.searchParams;

		// Build query string
		const params = new URLSearchParams();
		if (searchParams.get("officeId")) {
			params.set("officeId", searchParams.get("officeId")!);
		}
		if (searchParams.get("loanOfficersOnly")) {
			params.set("loanOfficersOnly", searchParams.get("loanOfficersOnly")!);
		}
		if (searchParams.get("status")) {
			params.set("status", searchParams.get("status")!);
		}

		const queryString = params.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.staff}?${queryString}`
			: FINERACT_ENDPOINTS.staff;

		const staff = await fineractFetch<Staff[]>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(staff);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/staff
 * Creates a new staff member
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = await request.json();

		const result = await fineractFetch(FINERACT_ENDPOINTS.staff, {
			method: "POST",
			body,
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
