import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetProvisioningCriteriaResponse,
	PostProvisioningCriteriaRequest,
	PostProvisioningCriteriaResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/provisioningcriteria
 * Fetches all provisioning criteria records
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const criteria = await fineractFetch<GetProvisioningCriteriaResponse[]>(
			FINERACT_ENDPOINTS.provisioningCriteria,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(criteria);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/provisioningcriteria
 * Creates a provisioning criteria record
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostProvisioningCriteriaRequest;

		const result = await fineractFetch<PostProvisioningCriteriaResponse>(
			FINERACT_ENDPOINTS.provisioningCriteria,
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
