import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetClientsClientIdIdentifiersResponse,
	PutClientsClientIdIdentifiersIdentifierIdResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/clients/[clientId]/identifiers/[identifierId]
 * Fetches one client identifier by id
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string; identifierId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId, identifierId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `/v1/clients/${clientId}/identifiers/${identifierId}?${queryString}`
			: `/v1/clients/${clientId}/identifiers/${identifierId}`;

		const identifier =
			await fineractFetch<GetClientsClientIdIdentifiersResponse>(path, {
				method: "GET",
				tenantId,
			});

		return NextResponse.json(identifier);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/clients/[clientId]/identifiers/[identifierId]
 * Updates one client identifier by id
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string; identifierId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId, identifierId } = await params;
		const body = (await request.json()) as Record<string, unknown>;

		const result =
			await fineractFetch<PutClientsClientIdIdentifiersIdentifierIdResponse>(
				`/v1/clients/${clientId}/identifiers/${identifierId}`,
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
