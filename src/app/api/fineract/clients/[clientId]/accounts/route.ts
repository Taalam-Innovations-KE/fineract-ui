import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetClientsClientIdAccountsResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/clients/[clientId]/accounts
 * Fetches a client's loan and savings accounts overview
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
			? `/v1/clients/${clientId}/accounts?${queryString}`
			: `/v1/clients/${clientId}/accounts`;

		const accounts = await fineractFetch<GetClientsClientIdAccountsResponse>(
			path,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(accounts);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
