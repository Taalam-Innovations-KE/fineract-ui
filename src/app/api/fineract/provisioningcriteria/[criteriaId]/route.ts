import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DeleteProvisioningCriteriaResponse,
	GetProvisioningCriteriaCriteriaIdResponse,
	PutProvisioningCriteriaRequest,
	PutProvisioningCriteriaResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/provisioningcriteria/[criteriaId]
 * Fetches a single provisioning criteria record
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ criteriaId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { criteriaId } = await params;

		const criteria =
			await fineractFetch<GetProvisioningCriteriaCriteriaIdResponse>(
				FINERACT_ENDPOINTS.provisioningCriteriaById(criteriaId),
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
 * PUT /api/fineract/provisioningcriteria/[criteriaId]
 * Updates a provisioning criteria record
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ criteriaId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { criteriaId } = await params;
		const body = (await request.json()) as PutProvisioningCriteriaRequest;

		const result = await fineractFetch<PutProvisioningCriteriaResponse>(
			FINERACT_ENDPOINTS.provisioningCriteriaById(criteriaId),
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

/**
 * DELETE /api/fineract/provisioningcriteria/[criteriaId]
 * Deletes a provisioning criteria record
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ criteriaId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { criteriaId } = await params;

		const result = await fineractFetch<DeleteProvisioningCriteriaResponse>(
			FINERACT_ENDPOINTS.provisioningCriteriaById(criteriaId),
			{
				method: "DELETE",
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
