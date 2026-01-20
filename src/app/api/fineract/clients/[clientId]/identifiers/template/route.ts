import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/clients/[clientId]/identifiers/template
 * Fetches identifier template options for a client
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { clientId: string } },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `/v1/clients/${params.clientId}/identifiers/template?${queryString}`
			: `/v1/clients/${params.clientId}/identifiers/template`;

		const template = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
