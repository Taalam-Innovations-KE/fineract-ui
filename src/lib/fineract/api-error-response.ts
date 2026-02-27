import { NextResponse } from "next/server";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export function invalidRequestResponse(message: string) {
	const error = normalizeApiError({
		status: 400,
		data: {
			code: "INVALID_REQUEST",
			message,
		},
	});

	return NextResponse.json(error, {
		status: error.httpStatus || 400,
	});
}

export interface ValidationFieldIssue {
	field: string;
	message: string;
	code?: string;
}

export function validationErrorResponse(
	message: string,
	issues: ValidationFieldIssue[],
	status = 400,
) {
	const error = normalizeApiError({
		status,
		data: {
			code: "VALIDATION_ERROR",
			message,
			fieldErrors: issues.map((issue) => ({
				field: issue.field,
				message: issue.message,
				code: issue.code || "VALIDATION_ERROR",
			})),
		},
	});

	return NextResponse.json(error, {
		status: error.httpStatus || status,
	});
}
