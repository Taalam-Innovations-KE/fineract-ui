import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	AddressData,
	ClientAddressRequest,
	PostClientClientIdAddressesResponse,
	PutClientClientIdAddressesResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/clients/[clientId]/addresses
 * Fetches all addresses for a client
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
			? `/v1/client/${clientId}/addresses?${queryString}`
			: `/v1/client/${clientId}/addresses`;

		const addresses = await fineractFetch<AddressData[]>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(addresses);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/clients/[clientId]/addresses
 * Creates an address for a client
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const body = (await request.json()) as ClientAddressRequest;
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `/v1/client/${clientId}/addresses?${queryString}`
			: `/v1/client/${clientId}/addresses`;

		const result = await fineractFetch<PostClientClientIdAddressesResponse>(
			path,
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

/**
 * PUT /api/fineract/clients/[clientId]/addresses
 * Updates an existing client address
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const body = (await request.json()) as ClientAddressRequest;

		const result = await fineractFetch<PutClientClientIdAddressesResponse>(
			`/v1/client/${clientId}/addresses`,
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
