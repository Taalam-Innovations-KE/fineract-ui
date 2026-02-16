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

const ALLOWED_CLIENT_COMMANDS = new Set([
	"activate",
	"assignStaff",
	"unassignStaff",
	"close",
	"proposeTransfer",
	"proposeAndAcceptTransfer",
	"withdrawTransfer",
	"acceptTransfer",
	"rejectTransfer",
	"updateSavingsAccount",
	"reject",
	"withdraw",
	"reactivate",
	"undoRejection",
	"undoWithdrawal",
]);

const COMMAND_ALIASES: Record<string, string> = {
	undoReject: "undoRejection",
	undoWithdraw: "undoWithdrawal",
};

const COMMAND_ALLOWED_FIELDS: Partial<Record<string, ReadonlyArray<string>>> = {
	activate: ["activationDate", "dateFormat", "locale"],
	assignStaff: ["staffId"],
	unassignStaff: ["staffId"],
	close: ["closureDate", "closureReasonId", "dateFormat", "locale"],
	updateSavingsAccount: ["savingsAccountId"],
	reject: ["rejectionDate", "rejectionReasonId", "dateFormat", "locale"],
	withdraw: ["withdrawalDate", "withdrawalReasonId", "dateFormat", "locale"],
	reactivate: ["reactivationDate", "dateFormat", "locale"],
	undoRejection: ["reopenedDate", "dateFormat", "locale"],
	undoWithdrawal: ["reopenedDate", "dateFormat", "locale"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCommandBody(
	rawBody: string,
): Record<string, unknown> | undefined {
	if (!rawBody) {
		return undefined;
	}

	const parsed = JSON.parse(rawBody) as unknown;
	if (!isRecord(parsed)) {
		throw new Error("Command body must be a JSON object.");
	}
	return parsed;
}

function ensureRequiredString(
	body: Record<string, unknown> | undefined,
	field: string,
): string | null {
	if (!body || typeof body[field] !== "string" || !body[field]?.trim()) {
		return `Missing required field: ${field}`;
	}
	return null;
}

function ensureRequiredPositiveNumber(
	body: Record<string, unknown> | undefined,
	field: string,
): string | null {
	const value = body?.[field];
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return `Missing or invalid required field: ${field}`;
	}
	return null;
}

function validateCommandPayload(
	command: string,
	body: Record<string, unknown> | undefined,
): string | null {
	const allowedFields = COMMAND_ALLOWED_FIELDS[command];
	if (allowedFields && body) {
		const unsupportedFields = Object.keys(body).filter(
			(field) => !allowedFields.includes(field),
		);
		if (unsupportedFields.length > 0) {
			return `Unsupported fields for command ${command}: ${unsupportedFields.join(", ")}`;
		}
	}

	switch (command) {
		case "activate":
			return ensureRequiredString(body, "activationDate");
		case "assignStaff":
		case "unassignStaff":
			return ensureRequiredPositiveNumber(body, "staffId");
		case "close": {
			const dateError = ensureRequiredString(body, "closureDate");
			if (dateError) return dateError;
			return ensureRequiredPositiveNumber(body, "closureReasonId");
		}
		case "updateSavingsAccount":
			return ensureRequiredPositiveNumber(body, "savingsAccountId");
		case "reject": {
			const dateError = ensureRequiredString(body, "rejectionDate");
			if (dateError) return dateError;
			return ensureRequiredPositiveNumber(body, "rejectionReasonId");
		}
		case "withdraw": {
			const dateError = ensureRequiredString(body, "withdrawalDate");
			if (dateError) return dateError;
			return ensureRequiredPositiveNumber(body, "withdrawalReasonId");
		}
		case "reactivate":
			return ensureRequiredString(body, "reactivationDate");
		case "undoRejection":
		case "undoWithdrawal":
			return ensureRequiredString(body, "reopenedDate");
		default:
			return null;
	}
}

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
		const rawCommand = request.nextUrl.searchParams.get("command");

		if (!rawCommand) {
			return invalidRequestResponse(
				"Missing required query parameter: command",
			);
		}

		const command = COMMAND_ALIASES[rawCommand] || rawCommand;
		if (!ALLOWED_CLIENT_COMMANDS.has(command)) {
			return invalidRequestResponse(`Unsupported command: ${rawCommand}`);
		}

		const rawBody = await request.text();
		let body: Record<string, unknown> | undefined;
		try {
			body = parseCommandBody(rawBody);
		} catch {
			return invalidRequestResponse("Invalid JSON payload.");
		}

		const commandPayloadError = validateCommandPayload(command, body);
		if (commandPayloadError) {
			return invalidRequestResponse(commandPayloadError);
		}

		const result = await fineractFetch<PostClientsClientIdResponse>(
			`${FINERACT_ENDPOINTS.clients}/${clientId}?command=${encodeURIComponent(command)}`,
			{
				method: "POST",
				body: body as PostClientsClientIdRequest | undefined,
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
