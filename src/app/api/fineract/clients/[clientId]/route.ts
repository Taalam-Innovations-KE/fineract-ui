import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetClientsClientIdResponse } from "@/lib/fineract/generated/types.gen";

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
