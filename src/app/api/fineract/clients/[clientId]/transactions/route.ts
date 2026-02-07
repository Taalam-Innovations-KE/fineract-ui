import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetClientsClientIdTransactionsResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/clients/[clientId]/transactions
 * Fetches client transactions with optional pagination
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
			? `/v1/clients/${clientId}/transactions?${queryString}`
			: `/v1/clients/${clientId}/transactions`;

		const transactions =
			await fineractFetch<GetClientsClientIdTransactionsResponse>(path, {
				method: "GET",
				tenantId,
			});

		return NextResponse.json(transactions);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
