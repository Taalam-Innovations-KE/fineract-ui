import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GlobalConfigurationPropertyData,
	PutGlobalConfigurationsRequest,
	PutGlobalConfigurationsResponse,
} from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: Promise<{
		id: string;
	}>;
}

/**
 * GET /api/fineract/configurations/[id]
 * Fetches a global configuration by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await context.params;

		const configuration = await fineractFetch<GlobalConfigurationPropertyData>(
			`${FINERACT_ENDPOINTS.configurations}/${id}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(configuration);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/configurations/[id]
 * Updates a global configuration by ID
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await context.params;
		const body = (await request.json()) as PutGlobalConfigurationsRequest;

		const result = await fineractFetch<PutGlobalConfigurationsResponse>(
			`${FINERACT_ENDPOINTS.configurations}/${id}`,
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
