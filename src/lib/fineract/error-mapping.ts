/**
 * Standard error response format from BFF
 */
export interface FineractError {
	code: string;
	message: string;
	details?: Record<string, string[]>;
	statusCode?: number;
}

/**
 * Fineract API error response structure
 */
interface FineractApiError {
	errors?: Array<{
		parameterName?: string;
		field?: string;
		defaultUserMessage?: string;
		message?: string;
		userMessageGlobalisationCode?: string;
	}>;
	errorCode?: string;
	userMessageGlobalisationCode?: string;
	userMessage?: string;
	defaultUserMessage?: string;
	developerMessage?: string;
	httpStatusCode?: number;
	code?: string;
	message?: string;
	statusText?: string;
	statusCode?: number;
	status?: number;
}

const FINERACT_ERROR_CODE_MAP: Record<string, string> = {
	"error.msg.user.password.invalid":
		"Password must be 12-50 characters, include uppercase, lowercase, number, and symbol, and cannot contain spaces or repeating characters.",
	"error.msg.user.password.repeating":
		"Fineract does not allow repeating characters in passwords.",
	"error.msg.user.password.spaces": "Passwords cannot contain spaces.",
	"error.msg.user.password.length": "Password must be at least 12 characters.",
	"error.msg.user.duplicate.username": "A user with this email already exists.",
	"error.msg.user.duplicate.email": "A user with this email already exists.",
	"error.msg.user.staff.required":
		"A staff member must exist before creating a user.",
};

export function mapFineractMessage(code?: string, fallback?: string): string {
	if (!code) {
		return fallback || "Validation failed";
	}

	if (FINERACT_ERROR_CODE_MAP[code]) {
		return FINERACT_ERROR_CODE_MAP[code];
	}

	const normalized = code.toLowerCase();

	if (
		normalized.includes("password") &&
		(normalized.includes("repeat") ||
			normalized.includes("consecutive") ||
			normalized.includes("repeating"))
	) {
		return "Fineract does not allow repeating characters in passwords.";
	}

	if (normalized.includes("password") && normalized.includes("space")) {
		return "Passwords cannot contain spaces.";
	}

	if (normalized.includes("password") && normalized.includes("length")) {
		return "Password must be at least 12 characters.";
	}

	if (normalized.includes("password")) {
		return "Password must be 12-50 characters, include uppercase, lowercase, number, and symbol, and cannot contain spaces or repeating characters.";
	}

	if (
		(normalized.includes("username") || normalized.includes("email")) &&
		normalized.includes("duplicate")
	) {
		return "A user with this email already exists.";
	}

	if (normalized.includes("staff") && normalized.includes("required")) {
		return "A staff member must exist before creating a user.";
	}

	return fallback || code;
}

/**
 * Maps Fineract API errors to a normalized error format
 */
export function mapFineractError(error: unknown): FineractError {
	if (error instanceof Response) {
		return {
			code: `HTTP_${error.status}`,
			message: error.statusText || "An error occurred",
			statusCode: error.status,
		};
	}

	if (error && typeof error === "object") {
		const err = error as FineractApiError;

		// Fineract error format
		if (err.errors && Array.isArray(err.errors)) {
			const fieldErrors: Record<string, string[]> = {};

			err.errors.forEach((e) => {
				const field = e.parameterName || e.field || "general";
				if (!fieldErrors[field]) {
					fieldErrors[field] = [];
				}
				const fallbackMessage = e.defaultUserMessage || e.message;
				fieldErrors[field].push(
					mapFineractMessage(e.userMessageGlobalisationCode, fallbackMessage),
				);
			});

			return {
				code: err.errorCode || "VALIDATION_ERROR",
				message:
					mapFineractMessage(
						err.userMessageGlobalisationCode,
						err.userMessage || err.defaultUserMessage,
					) || "Validation failed",
				details: fieldErrors,
				statusCode: err.httpStatusCode || 400,
			};
		}

		// Generic error with message
		if (
			err.message ||
			err.defaultUserMessage ||
			err.userMessage ||
			err.developerMessage ||
			err.statusText
		) {
			return {
				code: err.code || "UNKNOWN_ERROR",
				message:
					err.message ||
					err.defaultUserMessage ||
					err.userMessage ||
					err.developerMessage ||
					err.statusText ||
					"An unexpected error occurred",
				statusCode: err.statusCode || err.status || err.httpStatusCode || 500,
			};
		}
	}

	// Fallback
	return {
		code: "UNKNOWN_ERROR",
		message: "An unexpected error occurred",
		statusCode: 500,
	};
}

/**
 * Formats field errors for display in forms
 */
export function getFieldError(
	error: FineractError | null,
	field: string,
): string | undefined {
	if (!error?.details) return undefined;
	const errors = error.details[field];
	return errors && errors.length > 0 ? errors[0] : undefined;
}
