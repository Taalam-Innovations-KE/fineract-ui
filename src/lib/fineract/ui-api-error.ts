type AnyRecord = Record<string, unknown>;

export type UiFieldError = {
	field?: string;
	code?: string;
	message: string;
	value?: unknown;
	args?: unknown[];
};

export type UiApiError = {
	source:
		| "fineract-global"
		| "fineract-param"
		| "fineract-default"
		| "fineract-batch"
		| "oauth2"
		| "servlet"
		| "unknown";
	httpStatus: number;
	code: string;
	message: string;
	developerMessage?: string;
	fieldErrors: UiFieldError[];
	retryable: boolean;
	auth: boolean;
	permission: boolean;
	servedFromCache?: boolean;
	requestId?: string | number;
	correlationId?: string;
	batchItems?: UiApiError[];
	raw: unknown;
};

export type ApiErrorNormalizationInput = {
	status?: number;
	data?: unknown;
	headers?: Record<string, string | string[] | undefined> | Headers;
	message?: string;
};

const RETRYABLE_STATUSES = new Set([409, 425, 429, 503]);

const isRecord = (value: unknown): value is AnyRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function isUiApiError(value: unknown): value is UiApiError {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.source === "string" &&
		typeof value.httpStatus === "number" &&
		typeof value.code === "string" &&
		typeof value.message === "string" &&
		Array.isArray(value.fieldErrors)
	);
}

function toNum(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (
		typeof value === "string" &&
		value.trim() !== "" &&
		!Number.isNaN(Number(value))
	) {
		return Number(value);
	}

	return fallback;
}

function toStr(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim() !== "") {
		return value;
	}

	return undefined;
}

function tryJson(value: unknown): unknown {
	if (typeof value !== "string") {
		return value;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}

	if (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return value;
		}
	}

	return value;
}

function stripHtml(value: string): string {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function isRetryable(status: number): boolean {
	return RETRYABLE_STATUSES.has(status);
}

function normalizeHeaders(
	headers?: Record<string, string | string[] | undefined> | Headers,
): Record<string, string | string[] | undefined> | undefined {
	if (!headers) {
		return undefined;
	}

	if (headers instanceof Headers) {
		const normalized: Record<string, string> = {};
		for (const [key, value] of headers.entries()) {
			normalized[key.toLowerCase()] = value;
		}
		return normalized;
	}

	const normalized: Record<string, string | string[] | undefined> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalized[key.toLowerCase()] = value;
	}
	return normalized;
}

function readHeaderValue(
	headers: Record<string, string | string[] | undefined> | undefined,
	key: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}

	const value = headers[key.toLowerCase()];
	if (Array.isArray(value)) {
		return value[0];
	}

	return typeof value === "string" ? value : undefined;
}

function baseError(raw: unknown, status: number): UiApiError {
	return {
		source: "unknown",
		httpStatus: status,
		code: `HTTP_${status || 0}`,
		message: "Request failed",
		fieldErrors: [],
		retryable: isRetryable(status),
		auth: status === 401,
		permission: status === 403,
		raw,
	};
}

function mapParamError(paramError: AnyRecord): UiFieldError {
	const argsRaw = Array.isArray(paramError.args) ? paramError.args : [];
	const args = argsRaw.map((arg) =>
		isRecord(arg) && "value" in arg ? (arg as AnyRecord).value : arg,
	);

	return {
		field: toStr(paramError.parameterName) ?? toStr(paramError.field),
		code:
			toStr(paramError.userMessageGlobalisationCode) ?? toStr(paramError.code),
		message:
			toStr(paramError.defaultUserMessage) ??
			toStr(paramError.message) ??
			toStr(paramError.developerMessage) ??
			"Validation error",
		value: "value" in paramError ? paramError.value : undefined,
		args,
	};
}

function mapUiFieldError(fieldError: AnyRecord): UiFieldError {
	return {
		field: toStr(fieldError.field) ?? toStr(fieldError.parameterName),
		code:
			toStr(fieldError.code) ?? toStr(fieldError.userMessageGlobalisationCode),
		message:
			toStr(fieldError.message) ??
			toStr(fieldError.defaultUserMessage) ??
			toStr(fieldError.developerMessage) ??
			"Validation error",
		value: "value" in fieldError ? fieldError.value : undefined,
		args: Array.isArray(fieldError.args) ? fieldError.args : undefined,
	};
}

function withHeaderMetadata(
	error: UiApiError,
	headers?: Record<string, string | string[] | undefined> | Headers,
): UiApiError {
	const normalizedHeaders = normalizeHeaders(headers);
	if (!normalizedHeaders) {
		return error;
	}

	const servedFromCache = readHeaderValue(
		normalizedHeaders,
		"x-served-from-cache",
	);
	const requestId =
		readHeaderValue(normalizedHeaders, "x-request-id") ||
		readHeaderValue(normalizedHeaders, "request-id");
	const correlationId =
		readHeaderValue(normalizedHeaders, "x-correlation-id") ||
		readHeaderValue(normalizedHeaders, "correlation-id");

	return {
		...error,
		servedFromCache: servedFromCache === "true",
		requestId: requestId ?? error.requestId,
		correlationId: correlationId ?? error.correlationId,
	};
}

function normalizePayload(
	payloadIn: unknown,
	statusIn: number,
	headers?: Record<string, string | string[] | undefined> | Headers,
): UiApiError {
	const payload = tryJson(payloadIn);
	const status = toNum(statusIn, 0);

	if (
		Array.isArray(payload) &&
		payload.every(isRecord) &&
		payload.some(
			(item) => "requestId" in item && "statusCode" in item && "body" in item,
		)
	) {
		const batchItems = payload.map((item) => {
			const itemStatus = toNum(item.statusCode, status || 500);
			const body = tryJson(item.body);
			const normalized = normalizePayload(body, itemStatus, headers);
			normalized.requestId =
				(item.requestId as string | number | undefined) ?? normalized.requestId;
			return normalized;
		});

		const primary =
			batchItems.find((item) => item.httpStatus >= 400) ??
			batchItems[0] ??
			baseError(payload, status || 500);

		return withHeaderMetadata(
			{
				...primary,
				source: "fineract-batch",
				message: primary.message || "Batch request failed",
				batchItems,
				raw: payload,
			},
			headers,
		);
	}

	if (isRecord(payload)) {
		const isGlobal =
			("developerMessage" in payload ||
				"defaultUserMessage" in payload ||
				"httpStatusCode" in payload) &&
			("userMessageGlobalisationCode" in payload || "errors" in payload);

		if (isGlobal) {
			const httpStatus = toNum(payload.httpStatusCode, status || 500);
			const errorsArray = Array.isArray(payload.errors)
				? payload.errors.filter(isRecord)
				: [];
			const fieldErrors = errorsArray.map(mapParamError);
			const code =
				toStr(payload.userMessageGlobalisationCode) ??
				fieldErrors[0]?.code ??
				`HTTP_${httpStatus}`;
			const message =
				toStr(payload.defaultUserMessage) ??
				toStr(payload.developerMessage) ??
				fieldErrors[0]?.message ??
				"Request failed";

			return withHeaderMetadata(
				{
					source: "fineract-global",
					httpStatus,
					code,
					message,
					developerMessage: toStr(payload.developerMessage),
					fieldErrors,
					retryable: isRetryable(httpStatus),
					auth: httpStatus === 401,
					permission: httpStatus === 403,
					raw: payload,
				},
				headers,
			);
		}

		const isParam =
			"userMessageGlobalisationCode" in payload &&
			("parameterName" in payload || "defaultUserMessage" in payload);

		if (isParam) {
			const fieldError = mapParamError(payload);
			const httpStatus = status || 400;
			return withHeaderMetadata(
				{
					source: "fineract-param",
					httpStatus,
					code: fieldError.code ?? `HTTP_${httpStatus}`,
					message: fieldError.message,
					developerMessage: toStr(payload.developerMessage),
					fieldErrors: [fieldError],
					retryable: isRetryable(httpStatus),
					auth: httpStatus === 401,
					permission: httpStatus === 403,
					raw: payload,
				},
				headers,
			);
		}

		if (typeof payload.Exception === "string") {
			const httpStatus = status || 500;
			return withHeaderMetadata(
				{
					source: "fineract-default",
					httpStatus,
					code: "Exception",
					message: payload.Exception,
					fieldErrors: [],
					retryable: isRetryable(httpStatus),
					auth: httpStatus === 401,
					permission: httpStatus === 403,
					raw: payload,
				},
				headers,
			);
		}

		if (typeof payload.error === "string") {
			const httpStatus = status || 400;
			return withHeaderMetadata(
				{
					source: "oauth2",
					httpStatus,
					code: payload.error,
					message: toStr(payload.error_description) ?? payload.error,
					fieldErrors: [],
					retryable: isRetryable(httpStatus),
					auth: httpStatus === 401,
					permission: httpStatus === 403,
					raw: payload,
				},
				headers,
			);
		}

		const genericMessage =
			toStr(payload.message) ??
			toStr(payload.defaultUserMessage) ??
			toStr(payload.userMessage);
		const genericCode = toStr(payload.code);
		const explicitFieldErrors = Array.isArray(payload.fieldErrors)
			? payload.fieldErrors.filter(isRecord).map(mapUiFieldError)
			: [];
		if (genericMessage || genericCode || explicitFieldErrors.length > 0) {
			const httpStatus = status || toNum(payload.status, 500);
			return withHeaderMetadata(
				{
					source: "unknown",
					httpStatus,
					code: genericCode ?? `HTTP_${httpStatus || 0}`,
					message:
						genericMessage ??
						explicitFieldErrors[0]?.message ??
						"Request failed",
					developerMessage: toStr(payload.developerMessage),
					fieldErrors: explicitFieldErrors,
					retryable: isRetryable(httpStatus),
					auth: httpStatus === 401,
					permission: httpStatus === 403,
					raw: payload,
				},
				headers,
			);
		}
	}

	const textPayload = typeof payloadIn === "string" ? payloadIn.trim() : "";
	const httpStatus = status || 500;
	if (textPayload) {
		return withHeaderMetadata(
			{
				source: "servlet",
				httpStatus,
				code: `HTTP_${httpStatus}`,
				message: stripHtml(textPayload).slice(0, 300) || "Request failed",
				fieldErrors: [],
				retryable: isRetryable(httpStatus),
				auth: httpStatus === 401,
				permission: httpStatus === 403,
				raw: payloadIn,
			},
			headers,
		);
	}

	return withHeaderMetadata(
		{
			...baseError(payloadIn, httpStatus),
			message: "Unexpected error response",
		},
		headers,
	);
}

function extractErrorInput(error: unknown): ApiErrorNormalizationInput {
	if (error instanceof Response) {
		return {
			status: error.status,
			message: error.statusText,
			headers: error.headers,
		};
	}

	if (isUiApiError(error)) {
		return {
			status: error.httpStatus,
			data: error.raw,
			message: error.message,
		};
	}

	if (isRecord(error)) {
		const headers = isRecord(error.headers)
			? (error.headers as Record<string, string | string[] | undefined>)
			: undefined;

		const status =
			toNum(error.httpStatus, NaN) ||
			toNum(error.httpStatusCode, NaN) ||
			toNum(error.statusCode, NaN) ||
			toNum(error.status, NaN);

		return {
			status: Number.isFinite(status) ? status : undefined,
			data: "data" in error ? error.data : "body" in error ? error.body : error,
			headers,
			message: toStr(error.message),
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
		};
	}

	return {
		data: error,
	};
}

function isNormalizationInput(
	input: unknown,
): input is ApiErrorNormalizationInput {
	if (!isRecord(input)) {
		return false;
	}

	return (
		"status" in input ||
		"data" in input ||
		"headers" in input ||
		"message" in input
	);
}

export function normalizeApiError(
	input: ApiErrorNormalizationInput | unknown,
): UiApiError {
	if (isUiApiError(input)) {
		return input;
	}

	const normalizedInput = isNormalizationInput(input)
		? input
		: extractErrorInput(input);

	const status = toNum(normalizedInput.status, 0);
	const payload =
		normalizedInput.data ?? normalizedInput.message ?? "Request failed";

	return normalizePayload(payload, status, normalizedInput.headers);
}

export async function normalizeFailedResponse(
	response: Response,
): Promise<UiApiError> {
	const rawBody = await response.text();
	const payload = rawBody ? tryJson(rawBody) : undefined;

	return normalizeApiError({
		status: response.status,
		data: payload ?? rawBody ?? response.statusText,
		headers: response.headers,
		message: response.statusText,
	});
}

export function getFieldError(
	error: UiApiError | null | undefined,
	field: string,
): string | undefined {
	if (!error) {
		return undefined;
	}

	const fieldError = error.fieldErrors.find(
		(item) =>
			typeof item.field === "string" &&
			item.field.toLowerCase() === field.toLowerCase(),
	);

	return fieldError?.message;
}

export function getErrorMessages(
	error: Pick<UiApiError, "fieldErrors"> | null | undefined,
): string[] {
	if (!error?.fieldErrors?.length) {
		return [];
	}

	return [
		...new Set(error.fieldErrors.map((fieldError) => fieldError.message)),
	];
}

export function groupFieldErrorsByField(
	error: Pick<UiApiError, "fieldErrors"> | null | undefined,
): Record<string, string[]> {
	if (!error?.fieldErrors?.length) {
		return {};
	}

	return error.fieldErrors.reduce<Record<string, string[]>>(
		(acc, fieldError) => {
			const key = fieldError.field || "general";
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(fieldError.message);
			return acc;
		},
		{},
	);
}
