import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import type {
	AddressData,
	ClientAddressRequest,
	PostClientClientIdAddressesResponse,
	PutClientClientIdAddressesResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAddressPayload(value: unknown): {
	body: ClientAddressRequest;
	typeId?: number;
} {
	if (!isRecord(value)) {
		return { body: {} };
	}

	const body = { ...value } as Record<string, unknown>;
	const rawType = body.type;
	const rawAddressTypeId = body.addressTypeId;
	const typeFromBody =
		typeof rawType === "number"
			? rawType
			: typeof rawAddressTypeId === "number"
				? rawAddressTypeId
				: undefined;

	if (typeFromBody !== undefined) {
		body.type = typeFromBody;
	}

	delete body.addressTypeId;

	return {
		body: body as ClientAddressRequest,
		typeId: typeFromBody,
	};
}

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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
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
		const normalized = normalizeAddressPayload(await request.json());
		const searchParams = new URLSearchParams(request.nextUrl.searchParams);
		if (!searchParams.has("type") && normalized.typeId !== undefined) {
			searchParams.set("type", String(normalized.typeId));
		}
		const queryString = searchParams.toString();
		const path = queryString
			? `/v1/client/${clientId}/addresses?${queryString}`
			: `/v1/client/${clientId}/addresses`;

		const result = await fineractFetch<PostClientClientIdAddressesResponse>(
			path,
			{
				method: "POST",
				body: normalized.body,
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
		const normalized = normalizeAddressPayload(await request.json());
		const searchParams = new URLSearchParams(request.nextUrl.searchParams);
		if (!searchParams.has("type") && normalized.typeId !== undefined) {
			searchParams.set("type", String(normalized.typeId));
		}
		const queryString = searchParams.toString();
		const path = queryString
			? `/v1/client/${clientId}/addresses?${queryString}`
			: `/v1/client/${clientId}/addresses`;

		const result = await fineractFetch<PutClientClientIdAddressesResponse>(
			path,
			{
				method: "PUT",
				body: normalized.body,
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
