import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	ClientDataWritable,
	DeleteClientsClientIdResponse,
	PostClientsClientIdRequest,
	PostClientsClientIdResponse,
	PutClientsClientIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/clients/[clientId]
 * Fetches a single client by ID
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
			? `${FINERACT_ENDPOINTS.clients}/${clientId}?${queryString}`
			: `${FINERACT_ENDPOINTS.clients}/${clientId}`;

		const client = await fineractFetch<ClientDataWritable>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(client);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/clients/[clientId]
 * Updates editable client attributes
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const body = (await request.json()) as Record<string, unknown>;

		const result = await fineractFetch<PutClientsClientIdResponse>(
			`${FINERACT_ENDPOINTS.clients}/${clientId}`,
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
 * DELETE /api/fineract/clients/[clientId]
 * Deletes a client (allowed by Fineract in pending state)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;

		const result = await fineractFetch<DeleteClientsClientIdResponse>(
			`${FINERACT_ENDPOINTS.clients}/${clientId}`,
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

/**
 * POST /api/fineract/clients/[clientId]?command=<command>
 * Executes client lifecycle commands (activate, close, reject, withdraw, etc.)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;
		const command = request.nextUrl.searchParams.get("command");

		if (!command) {
			return invalidRequestResponse(
				"Missing required query parameter: command",
			);
		}

		const rawBody = await request.text();
		const body = rawBody
			? (JSON.parse(rawBody) as PostClientsClientIdRequest)
			: undefined;

		const commandAliases: Record<string, string[]> = {
			undoReject: ["undoReject", "undoRejection"],
			undoWithdraw: ["undoWithdraw", "undoWithdrawal"],
		};
		const candidateCommands = commandAliases[command] || [command];

		let lastError: unknown;
		for (const candidate of candidateCommands) {
			try {
				const result = await fineractFetch<PostClientsClientIdResponse>(
					`${FINERACT_ENDPOINTS.clients}/${clientId}?command=${encodeURIComponent(candidate)}`,
					{
						method: "POST",
						body,
						tenantId,
					},
				);

				return NextResponse.json(result);
			} catch (error) {
				lastError = error;
			}
		}

		throw lastError;
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
