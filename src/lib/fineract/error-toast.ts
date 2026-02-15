import { toast } from "sonner";
import type { UiApiError } from "@/lib/fineract/ui-api-error";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

const RECENT_TOASTS = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2500;

type ToastContext = {
	title?: string;
	description?: string;
};

function buildToastKey(error: UiApiError): string {
	return [error.source, error.code, error.message, error.httpStatus].join("|");
}

function shouldToast(key: string): boolean {
	const now = Date.now();
	const previous = RECENT_TOASTS.get(key);
	if (previous && now - previous < DEDUPE_WINDOW_MS) {
		return false;
	}

	RECENT_TOASTS.set(key, now);

	if (RECENT_TOASTS.size > 100) {
		for (const [candidateKey, timestamp] of RECENT_TOASTS.entries()) {
			if (now - timestamp > DEDUPE_WINDOW_MS * 4) {
				RECENT_TOASTS.delete(candidateKey);
			}
		}
	}

	return true;
}

export function toastApiError(
	error: unknown,
	context?: ToastContext,
): UiApiError {
	const normalized = normalizeApiError(error);
	const key = buildToastKey(normalized);

	if (shouldToast(key)) {
		toast.error(context?.title ?? normalized.message, {
			description: context?.description ?? `Code: ${normalized.code}`,
		});
	}

	return normalized;
}
