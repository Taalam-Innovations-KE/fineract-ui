import type { FineractError } from "@/lib/fineract/error-mapping";
import { mapFineractError } from "@/lib/fineract/error-mapping";

export type SubmitMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface SubmitActionError extends FineractError {
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
	error: Pick<FineractError, "details"> | null | undefined,
): string[] {
	if (!error?.details) {
		return [];
	}

	const detailMessages = Object.values(error.details).flat();
	return dedupeMessages(detailMessages);
}

export function toSubmitActionError(
	error: unknown,
	context: SubmitActionContext,
): SubmitActionError {
	const mapped = mapFineractError(error);
	const trackedError: SubmitActionError = {
		...mapped,
		...context,
		timestamp: new Date().toISOString(),
	};

	console.error("submit-error", trackedError);

	return trackedError;
}
