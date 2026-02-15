import {
	getErrorMessages,
	getFieldError as getUiFieldError,
	groupFieldErrorsByField,
	normalizeApiError,
	type UiApiError,
} from "@/lib/fineract/ui-api-error";

export type SubmitMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface SubmitActionError extends UiApiError {
	action: string;
	endpoint: string;
	method: SubmitMethod;
	timestamp: string;
	tenantId?: string;
}

export interface SubmitActionContext {
	action: string;
	endpoint: string;
	method: SubmitMethod;
	tenantId?: string;
}

function dedupeMessages(messages: string[]): string[] {
	return [...new Set(messages.filter(Boolean))];
}

export function getSubmitErrorDetails(
	error: Pick<UiApiError, "fieldErrors"> | null | undefined,
): string[] {
	return dedupeMessages(getErrorMessages(error));
}

export function getSubmitFieldError(
	error: Pick<UiApiError, "fieldErrors"> | null | undefined,
	field: string,
): string | undefined {
	return getUiFieldError(error as UiApiError | null | undefined, field);
}

export function getSubmitErrorsByField(
	error: Pick<UiApiError, "fieldErrors"> | null | undefined,
): Record<string, string[]> {
	return groupFieldErrorsByField(error);
}

export function toSubmitActionError(
	error: unknown,
	context: SubmitActionContext,
): SubmitActionError {
	const mapped = normalizeApiError(error);
	const trackedError: SubmitActionError = {
		...mapped,
		...context,
		timestamp: new Date().toISOString(),
	};

	console.error("submit-error", trackedError);

	return trackedError;
}
