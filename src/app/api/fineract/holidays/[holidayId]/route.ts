import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DeleteHolidaysHolidayIdResponse,
	GetHolidaysResponse,
	PostHolidaysHolidayIdRequest,
	PostHolidaysHolidayIdResponse,
	PutHolidaysHolidayIdRequest,
	PutHolidaysHolidayIdResponse,
} from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: Promise<{
		holidayId: string;
	}>;
}

/**
 * GET /api/fineract/holidays/[holidayId]
 * Fetches a holiday by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { holidayId } = await context.params;

		const holiday = await fineractFetch<GetHolidaysResponse>(
			`${FINERACT_ENDPOINTS.holidays}/${holidayId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(holiday);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/holidays/[holidayId]
 * Updates a holiday
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { holidayId } = await context.params;
		const body = (await request.json()) as PutHolidaysHolidayIdRequest;

		const result = await fineractFetch<PutHolidaysHolidayIdResponse>(
			`${FINERACT_ENDPOINTS.holidays}/${holidayId}`,
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

/**
 * DELETE /api/fineract/holidays/[holidayId]
 * Deletes a holiday
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { holidayId } = await context.params;

		const result = await fineractFetch<DeleteHolidaysHolidayIdResponse>(
			`${FINERACT_ENDPOINTS.holidays}/${holidayId}`,
			{
				method: "DELETE",
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
 * POST /api/fineract/holidays/[holidayId]?command=<command>
 * Executes holiday commands (e.g. activate)
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { holidayId } = await context.params;
		const command = request.nextUrl.searchParams.get("command");

		if (!command) {
			return NextResponse.json(
				{ message: "Missing required query parameter: command" },
				{ status: 400 },
			);
		}

		const rawBody = await request.text();
		const body = rawBody
			? (JSON.parse(rawBody) as PostHolidaysHolidayIdRequest)
			: undefined;

		const result = await fineractFetch<PostHolidaysHolidayIdResponse>(
			`${FINERACT_ENDPOINTS.holidays}/${holidayId}?command=${encodeURIComponent(command)}`,
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
