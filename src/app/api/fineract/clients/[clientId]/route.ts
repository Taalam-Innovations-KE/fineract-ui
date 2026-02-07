import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	ClientDataWritable,
	PutClientsClientIdResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/clients/[clientId]
 * Fetches a single client by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.clients}/${clientId}?${queryString}`
			: `${FINERACT_ENDPOINTS.clients}/${clientId}`;

		const client = await fineractFetch<ClientDataWritable>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(client);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/clients/[clientId]
 * Updates editable client attributes
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const body = (await request.json()) as Record<string, unknown>;

		const result = await fineractFetch<PutClientsClientIdResponse>(
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
