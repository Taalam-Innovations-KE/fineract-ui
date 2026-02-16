import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	DeletePaymentTypesPaymentTypeIdResponse,
	PaymentTypeData,
	PutPaymentTypesPaymentTypeIdRequest,
	PutPaymentTypesPaymentTypeIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		paymentTypeId: string;
	}>;
}

/**
 * GET /api/fineract/paymenttypes/[paymentTypeId]
 * Fetches a single payment type by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { paymentTypeId } = await context.params;

		const paymentType = await fineractFetch<PaymentTypeData>(
			FINERACT_ENDPOINTS.paymentTypeById(paymentTypeId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(paymentType);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/paymenttypes/[paymentTypeId]
 * Updates a payment type by ID
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { paymentTypeId } = await context.params;
		const body = (await request.json()) as PutPaymentTypesPaymentTypeIdRequest;

		const result = await fineractFetch<PutPaymentTypesPaymentTypeIdResponse>(
			FINERACT_ENDPOINTS.paymentTypeById(paymentTypeId),
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * DELETE /api/fineract/paymenttypes/[paymentTypeId]
 * Deletes a payment type by ID
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { paymentTypeId } = await context.params;

		const result = await fineractFetch<DeletePaymentTypesPaymentTypeIdResponse>(
			FINERACT_ENDPOINTS.paymentTypeById(paymentTypeId),
			{
				method: "DELETE",
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
