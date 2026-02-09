import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetSavingsProductsProductIdResponse,
	GetSavingsProductsResponse,
	GetSavingsProductsTemplateResponse,
	PostSavingsProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import type { SavingsProductFormData } from "@/lib/schemas/savings-product";

export type SavingsProductRequestPayload = PostSavingsProductsRequest & {
	lockinPeriodFrequency?: number;
	lockinPeriodFrequencyType?: number;
	savingsReferenceAccountId?: number;
	savingsControlAccountId?: number;
	interestOnSavingsAccountId?: number;
	incomeFromFeeAccountId?: number;
	transfersInSuspenseAccountId?: number;
	incomeFromPenaltyAccountId?: number;
	overdraftPortfolioControlId?: number;
	incomeFromInterestId?: number;
	writeOffAccountId?: number;
	feesReceivableAccountId?: number;
	penaltiesReceivableAccountId?: number;
	interestPayableAccountId?: number;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const rawPayload = await response.text();
	const payload = rawPayload ? (JSON.parse(rawPayload) as unknown) : null;

	if (!response.ok) {
		throw (
			payload ?? {
				message: response.statusText || "Request failed",
				statusCode: response.status,
			}
		);
	}

	return (payload ?? {}) as T;
}

function readUnknownProperty(source: object, property: string): unknown {
	const record = source as Record<string, unknown>;
	return record[property];
}

function readUnknownBooleanProperty(source: object, property: string): boolean {
	const value = readUnknownProperty(source, property);
	return typeof value === "boolean" ? value : false;
}

function readUnknownNumberProperty(
	source: object,
	property: string,
): number | undefined {
	const value = readUnknownProperty(source, property);
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function readAccountMappingId(
	product: GetSavingsProductsProductIdResponse,
	mappingKey: string,
): number | undefined {
	const accountingMappings = readUnknownProperty(product, "accountingMappings");
	if (!accountingMappings || typeof accountingMappings !== "object") {
		return undefined;
	}

	const mapping = readUnknownProperty(accountingMappings as object, mappingKey);
	if (!mapping || typeof mapping !== "object") {
		return undefined;
	}

	return readUnknownNumberProperty(mapping as object, "id");
}

function extractChargeIds(
	product: GetSavingsProductsProductIdResponse,
): number[] {
	const charges = readUnknownProperty(product, "charges");
	if (!Array.isArray(charges)) {
		return [];
	}

	return charges
		.map((charge) => {
			if (typeof charge === "number") return charge;
			if (charge && typeof charge === "object") {
				const chargeId = readUnknownNumberProperty(charge as object, "id");
				return chargeId;
			}
			return undefined;
		})
		.filter((chargeId): chargeId is number => chargeId !== undefined);
}

export const savingsProductsApi = {
	async list(tenantId: string): Promise<GetSavingsProductsResponse[]> {
		const response = await fetch(BFF_ROUTES.savingsProducts, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
	async get(
		tenantId: string,
		id: string,
	): Promise<GetSavingsProductsProductIdResponse> {
		const response = await fetch(`${BFF_ROUTES.savingsProducts}/${id}`, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
	async getTemplate(
		tenantId: string,
	): Promise<GetSavingsProductsTemplateResponse> {
		const response = await fetch(BFF_ROUTES.savingsProductTemplate, {
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
	async create(tenantId: string, payload: SavingsProductRequestPayload) {
		const response = await fetch(BFF_ROUTES.savingsProducts, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async update(
		tenantId: string,
		id: string,
		payload: SavingsProductRequestPayload,
	) {
		const response = await fetch(`${BFF_ROUTES.savingsProducts}/${id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		});

		return parseJsonResponse(response);
	},
	async delete(tenantId: string, id: string) {
		const response = await fetch(`${BFF_ROUTES.savingsProducts}/${id}`, {
			method: "DELETE",
			headers: {
				"x-tenant-id": tenantId,
			},
		});

		return parseJsonResponse(response);
	},
};

export function buildSavingsProductRequest(
	data: SavingsProductFormData,
): SavingsProductRequestPayload {
	const payload: SavingsProductRequestPayload = {
		locale: "en",
		name: data.name,
		shortName: data.shortName,
		description: data.description,
		currencyCode: data.currencyCode,
		digitsAfterDecimal: data.digitsAfterDecimal,
		inMultiplesOf: data.inMultiplesOf,
		nominalAnnualInterestRate: data.nominalAnnualInterestRate,
		interestCompoundingPeriodType: data.interestCompoundingPeriodType,
		interestPostingPeriodType: data.interestPostingPeriodType,
		interestCalculationType: data.interestCalculationType,
		interestCalculationDaysInYearType: data.interestCalculationDaysInYearType,
		accountingRule: data.accountingRule,
		withdrawalFeeForTransfers: data.withdrawalFeeForTransfers,
		withHoldTax: data.withHoldTax,
		allowOverdraft: data.allowOverdraft,
		isDormancyTrackingActive: data.isDormancyTrackingActive,
		charges: data.charges.map((id) => ({ id })),
	};

	if (
		data.lockinPeriodFrequency !== undefined &&
		data.lockinPeriodFrequencyType !== undefined
	) {
		payload.lockinPeriodFrequency = data.lockinPeriodFrequency;
		payload.lockinPeriodFrequencyType = data.lockinPeriodFrequencyType;
	}

	if (data.accountingRule >= 2) {
		payload.savingsReferenceAccountId = data.savingsReferenceAccountId;
		payload.savingsControlAccountId = data.savingsControlAccountId;
		payload.interestOnSavingsAccountId = data.interestOnSavingsAccountId;
		payload.incomeFromFeeAccountId = data.incomeFromFeeAccountId;
		payload.transfersInSuspenseAccountId = data.transfersInSuspenseAccountId;
		payload.incomeFromPenaltyAccountId = data.incomeFromPenaltyAccountId;
		payload.overdraftPortfolioControlId = data.overdraftPortfolioControlId;
		payload.incomeFromInterestId = data.incomeFromInterestId;
		payload.writeOffAccountId = data.writeOffAccountId;
	}

	if (data.accountingRule >= 3) {
		payload.feesReceivableAccountId = data.feesReceivableAccountId;
		payload.penaltiesReceivableAccountId = data.penaltiesReceivableAccountId;
		payload.interestPayableAccountId = data.interestPayableAccountId;
	}

	return payload;
}

export function mapSavingsProductToFormData(
	product: GetSavingsProductsProductIdResponse,
): Partial<SavingsProductFormData> {
	const lockinPeriodFrequencyTypeValue = readUnknownProperty(
		product,
		"lockinPeriodFrequencyType",
	);

	const lockinPeriodFrequencyType =
		lockinPeriodFrequencyTypeValue &&
		typeof lockinPeriodFrequencyTypeValue === "object"
			? readUnknownNumberProperty(lockinPeriodFrequencyTypeValue, "id")
			: readUnknownNumberProperty(product, "lockinPeriodFrequencyType");

	return {
		name: product.name || "",
		shortName: product.shortName || "",
		description: product.description || "",
		currencyCode: product.currency?.code || "",
		digitsAfterDecimal: product.currency?.decimalPlaces ?? 2,
		inMultiplesOf: product.currency?.inMultiplesOf ?? 1,
		nominalAnnualInterestRate: product.nominalAnnualInterestRate ?? 0,
		interestCompoundingPeriodType:
			product.interestCompoundingPeriodType?.id ?? 1,
		interestPostingPeriodType: product.interestPostingPeriodType?.id ?? 4,
		interestCalculationType: product.interestCalculationType?.id ?? 1,
		interestCalculationDaysInYearType:
			product.interestCalculationDaysInYearType?.id ?? 365,
		accountingRule: product.accountingRule?.id ?? 1,
		withdrawalFeeForTransfers: Boolean(product.withdrawalFeeForTransfers),
		allowOverdraft: readUnknownBooleanProperty(product, "allowOverdraft"),
		withHoldTax: readUnknownBooleanProperty(product, "withHoldTax"),
		isDormancyTrackingActive: readUnknownBooleanProperty(
			product,
			"isDormancyTrackingActive",
		),
		lockinPeriodFrequency: readUnknownNumberProperty(
			product,
			"lockinPeriodFrequency",
		),
		lockinPeriodFrequencyType,
		charges: extractChargeIds(product),
		savingsReferenceAccountId: readAccountMappingId(
			product,
			"savingsReferenceAccount",
		),
		savingsControlAccountId: readAccountMappingId(
			product,
			"savingsControlAccount",
		),
		interestOnSavingsAccountId: readAccountMappingId(
			product,
			"interestOnSavingsAccount",
		),
		incomeFromFeeAccountId: readAccountMappingId(
			product,
			"incomeFromFeeAccount",
		),
		transfersInSuspenseAccountId: readAccountMappingId(
			product,
			"transfersInSuspenseAccount",
		),
		incomeFromPenaltyAccountId: readAccountMappingId(
			product,
			"incomeFromPenaltyAccount",
		),
		overdraftPortfolioControlId: readAccountMappingId(
			product,
			"overdraftPortfolioControl",
		),
		incomeFromInterestId: readAccountMappingId(product, "incomeFromInterest"),
		writeOffAccountId: readAccountMappingId(product, "writeOffAccount"),
		feesReceivableAccountId: readAccountMappingId(
			product,
			"feesReceivableAccount",
		),
		penaltiesReceivableAccountId: readAccountMappingId(
			product,
			"penaltiesReceivableAccount",
		),
		interestPayableAccountId: readAccountMappingId(
			product,
			"interestPayableAccount",
		),
	};
}
