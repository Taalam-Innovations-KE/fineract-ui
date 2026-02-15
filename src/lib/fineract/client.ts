// Client-side fetch functions for Fineract API
// These are safe to import in client components

import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";

const BFF_ROUTES = {
	clients: "/api/fineract/clients",
	clientsTemplate: "/api/fineract/clients/template",
};

export type FineractRequestError = SubmitActionError;

async function parseJsonSafely(response: Response): Promise<unknown> {
	const raw = await response.text();
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return raw;
	}
}

export async function fetchClients(tenantId: string) {
	const response = await fetch(BFF_ROUTES.clients, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return parseJsonSafely(response);
}

export async function fetchClientTemplate(tenantId: string) {
	const response = await fetch(BFF_ROUTES.clientsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return parseJsonSafely(response);
}

export async function createClient(tenantId: string, payload: unknown) {
	const response = await fetch(BFF_ROUTES.clients, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw toSubmitActionError(await normalizeFailedResponse(response), {
			action: "createClient",
			endpoint: BFF_ROUTES.clients,
			method: "POST",
			tenantId,
		});
	}

	return parseJsonSafely(response);
}

export async function fetchClientIdentifierTemplate(
	tenantId: string,
	clientId: number,
) {
	const response = await fetch(
		`/api/fineract/clients/${clientId}/identifiers/template`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return parseJsonSafely(response);
}

export async function createClientIdentifier(
	tenantId: string,
	clientId: number,
	payload: {
		documentTypeId: number;
		documentKey: string;
		status?: string;
		description?: string;
	},
) {
	const response = await fetch(
		`/api/fineract/clients/${clientId}/identifiers`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	if (!response.ok) {
		throw toSubmitActionError(await normalizeFailedResponse(response), {
			action: "createClientIdentifier",
			endpoint: `/api/fineract/clients/${clientId}/identifiers`,
			method: "POST",
			tenantId,
		});
	}

	return parseJsonSafely(response);
}
