import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { ClientIdentifierRequest } from "@/lib/fineract/generated/types.gen";

type IdentifierRouteContext = {
	params: Promise<{ clientId: string; identifierId: string }>;
};

/**
 * PUT /api/fineract/clients/:clientId/identifiers/:identifierId
 * Updates a client identifier
 */
export async function PUT(
	request: NextRequest,
	context: IdentifierRouteContext,
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId, identifierId } = await context.params;
		const body = (await request.json()) as ClientIdentifierRequest;
		const result = await fineractFetch(
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
