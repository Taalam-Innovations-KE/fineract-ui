import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	ApproveMakerCheckerEntryResponse,
	DeleteMakerCheckerEntryResponse,
} from "@/lib/fineract/generated/types.gen";

type MakerCheckerRouteContext = {
	params: Promise<{ auditId: string }>;
};

/**
 * POST /api/fineract/makercheckers/:auditId
 * Approve or reject a maker-checker entry
 */
export async function POST(
	request: NextRequest,
	context: MakerCheckerRouteContext,
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { auditId } = await context.params;
		const { searchParams } = request.nextUrl;
		const command = searchParams.get("command");

		if (!command || !["approve", "reject"].includes(command)) {
			return NextResponse.json(
				{ message: "Invalid command. Must be 'approve' or 'reject'" },
				{ status: 400 },
			);
		}

		const result = await fineractFetch<ApproveMakerCheckerEntryResponse>(
			`${FINERACT_ENDPOINTS.makercheckers}/${auditId}?command=${command}`,
			{
				method: "POST",
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
 * DELETE /api/fineract/makercheckers/:auditId
 * Delete a maker-checker entry
 */
export async function DELETE(
	request: NextRequest,
	context: MakerCheckerRouteContext,
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { auditId } = await context.params;

		const result = await fineractFetch<DeleteMakerCheckerEntryResponse>(
			`${FINERACT_ENDPOINTS.makercheckers}/${auditId}`,
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
