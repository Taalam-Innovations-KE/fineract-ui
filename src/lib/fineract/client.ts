// Client-side fetch functions for Fineract API
// These are safe to import in client components

import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";

const BFF_ROUTES = {
	clients: "/api/fineract/clients",
	clientsTemplate: "/api/fineract/clients/template",
};

export type FineractRequestError = SubmitActionError;

export async function fetchClients(tenantId: string) {
	const response = await fetch(BFF_ROUTES.clients, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch clients");
	}

	return response.json();
}

export async function fetchClientTemplate(tenantId: string) {
	const response = await fetch(BFF_ROUTES.clientsTemplate, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch client template");
	}

	return response.json();
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

	const data = await response.json();

	if (!response.ok) {
		throw toSubmitActionError(
			{
				...(data as Record<string, unknown>),
				statusCode: response.status,
				httpStatusCode: response.status,
				statusText: response.statusText,
				message:
					typeof data.message === "string"
						? data.message
						: "Failed to create client",
			},
			{
				action: "createClient",
				endpoint: BFF_ROUTES.clients,
				method: "POST",
				tenantId,
			},
		);
	}

	return data;
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
		throw new Error("Failed to fetch identifier template");
	}

	return response.json();
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
		const data = await response.json();
		throw toSubmitActionError(
			{
				...(data as Record<string, unknown>),
				statusCode: response.status,
				httpStatusCode: response.status,
				statusText: response.statusText,
				message:
					typeof data.message === "string"
						? data.message
						: "Failed to create client identifier",
			},
			{
				action: "createClientIdentifier",
				endpoint: `/api/fineract/clients/${clientId}/identifiers`,
				method: "POST",
				tenantId,
			},
		);
	}

	return response.json();
}
