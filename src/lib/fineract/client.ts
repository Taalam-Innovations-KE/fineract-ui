// Client-side fetch functions for Fineract API
// These are safe to import in client components

const BFF_ROUTES = {
	clients: "/api/fineract/clients",
	clientsTemplate: "/api/fineract/clients/template",
};

export type FineractRequestError = Error & {
	code?: string;
	details?: Record<string, string[]>;
	statusCode?: number;
};

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
		const error = new Error(
			data.message || "Failed to create client",
		) as FineractRequestError;
		error.code = data.code;
		error.details = data.details;
		error.statusCode = data.statusCode;
		throw error;
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
		const error = new Error(
			data.message || "Failed to create client identifier",
		) as FineractRequestError;
		error.code = data.code;
		error.details = data.details;
		error.statusCode = data.statusCode;
		throw error;
	}

	return response.json();
}
