import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetClientsClientIdResponse,
	PutClientsClientIdRequest,
} from "@/lib/fineract/generated/types.gen";

type ClientRouteContext = {
	params: Promise<{ clientId: string }>;
};

/**
 * GET /api/fineract/clients/:clientId
 * Fetch client details
 */
export async function GET(request: NextRequest, context: ClientRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await context.params;

		const client = await fineractFetch<GetClientsClientIdResponse>(
			`${FINERACT_ENDPOINTS.clients}/${clientId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(client);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/clients/:clientId
 * Update client details
 */
export async function PUT(request: NextRequest, context: ClientRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await context.params;
		const body = (await request.json()) as PutClientsClientIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.clients}/${clientId}`,
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
