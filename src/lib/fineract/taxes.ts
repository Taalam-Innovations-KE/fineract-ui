import {
	FINERACT_DATE_FORMAT,
	FINERACT_LOCALE,
	formatDateStringToFormat,
} from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetTaxesComponentsResponse,
	GetTaxesGroupResponse,
	PostTaxesComponentsRequest,
	PostTaxesComponentsResponse,
	PostTaxesGroupRequest,
	PostTaxesGroupResponse,
	PutTaxesComponentsTaxComponentIdRequest,
	PutTaxesComponentsTaxComponentIdResponse,
	PutTaxesGroupTaxComponents,
	PutTaxesGroupTaxGroupIdRequest,
	PutTaxesGroupTaxGroupIdResponse,
	TaxComponentData,
	TaxGroupData,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";
import type { TaxComponentFormData, TaxGroupFormData } from "@/lib/schemas/tax";

type TaxGroupUpdateComponentPayload = PutTaxesGroupTaxComponents & {
	startDate?: string;
};

export type TaxGroupUpdateRequestPayload = PutTaxesGroupTaxGroupIdRequest & {
	taxComponents?: TaxGroupUpdateComponentPayload[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const rawPayload = await response.text();
	let payload: unknown = null;
	if (rawPayload) {
		try {
			payload = JSON.parse(rawPayload) as unknown;
		} catch {
			payload = rawPayload;
		}
	}

	if (!response.ok) {
		throw normalizeApiError({
			status: response.status,
			data: payload ?? response.statusText,
			headers: response.headers,
			message: response.statusText || "Request failed",
		});
	}

	return (payload ?? {}) as T;
}

function requestHeaders(tenantId: string, hasBody = false) {
	return {
		...(hasBody ? { "Content-Type": "application/json" } : {}),
		"x-tenant-id": tenantId,
	};
}

function toFineractDate(value?: string) {
	return value
		? formatDateStringToFormat(value, FINERACT_DATE_FORMAT)
		: undefined;
}

export const taxComponentsApi = {
	async list(tenantId: string): Promise<GetTaxesComponentsResponse[]> {
		const response = await fetch(BFF_ROUTES.taxComponents, {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async get(
		tenantId: string,
		id: number | string,
	): Promise<GetTaxesComponentsResponse> {
		const response = await fetch(BFF_ROUTES.taxComponentById(id), {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async getTemplate(tenantId: string): Promise<TaxComponentData> {
		const response = await fetch(BFF_ROUTES.taxComponentTemplate, {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async create(
		tenantId: string,
		payload: PostTaxesComponentsRequest,
	): Promise<PostTaxesComponentsResponse> {
		const response = await fetch(BFF_ROUTES.taxComponents, {
			method: "POST",
			headers: requestHeaders(tenantId, true),
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async update(
		tenantId: string,
		id: number | string,
		payload: PutTaxesComponentsTaxComponentIdRequest,
	): Promise<PutTaxesComponentsTaxComponentIdResponse> {
		const response = await fetch(BFF_ROUTES.taxComponentById(id), {
			method: "PUT",
			headers: requestHeaders(tenantId, true),
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
};

export const taxGroupsApi = {
	async list(tenantId: string): Promise<GetTaxesGroupResponse[]> {
		const response = await fetch(BFF_ROUTES.taxGroups, {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async get(
		tenantId: string,
		id: number | string,
	): Promise<GetTaxesGroupResponse> {
		const response = await fetch(BFF_ROUTES.taxGroupById(id), {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async getWithTemplate(
		tenantId: string,
		id: number | string,
	): Promise<TaxGroupData> {
		const response = await fetch(
			`${BFF_ROUTES.taxGroupById(id)}?template=true`,
			{
				headers: requestHeaders(tenantId),
			},
		);

		return parseJsonResponse(response);
	},
	async getTemplate(tenantId: string): Promise<TaxGroupData> {
		const response = await fetch(BFF_ROUTES.taxGroupTemplate, {
			headers: requestHeaders(tenantId),
		});

		return parseJsonResponse(response);
	},
	async create(
		tenantId: string,
		payload: PostTaxesGroupRequest,
	): Promise<PostTaxesGroupResponse> {
		const response = await fetch(BFF_ROUTES.taxGroups, {
			method: "POST",
			headers: requestHeaders(tenantId, true),
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async update(
		tenantId: string,
		id: number | string,
		payload: TaxGroupUpdateRequestPayload,
	): Promise<PutTaxesGroupTaxGroupIdResponse> {
		const response = await fetch(BFF_ROUTES.taxGroupById(id), {
			method: "PUT",
			headers: requestHeaders(tenantId, true),
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
};

export function buildTaxComponentCreateRequest(
	data: TaxComponentFormData,
): PostTaxesComponentsRequest {
	return {
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
		name: data.name.trim(),
		percentage: data.percentage,
		startDate: toFineractDate(data.startDate),
		debitAccountType: data.debitAccountType,
		debitAccountId: data.debitAccountId,
		creditAccountType: data.creditAccountType,
		creditAccountId: data.creditAccountId,
	};
}

export function buildTaxComponentUpdateRequest(
	data: TaxComponentFormData,
): PutTaxesComponentsTaxComponentIdRequest {
	return {
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
		name: data.name.trim(),
		percentage: data.percentage,
		startDate: toFineractDate(data.startDate),
	};
}

export function buildTaxGroupCreateRequest(
	data: TaxGroupFormData,
): PostTaxesGroupRequest {
	return {
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
		name: data.name.trim(),
		taxComponents: data.taxComponents.map((component) => ({
			taxComponentId: component.taxComponentId,
			startDate: toFineractDate(component.startDate),
		})),
	};
}

export function buildTaxGroupUpdateRequest(
	data: TaxGroupFormData,
): TaxGroupUpdateRequestPayload {
	return {
		dateFormat: FINERACT_DATE_FORMAT,
		locale: FINERACT_LOCALE,
		name: data.name.trim(),
		taxComponents: data.taxComponents.map((component) => {
			if (component.id !== undefined) {
				return {
					id: component.id,
					taxComponentId: component.taxComponentId,
					endDate: toFineractDate(component.endDate),
				};
			}

			return {
				taxComponentId: component.taxComponentId,
				startDate: toFineractDate(component.startDate),
			};
		}),
	};
}
