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
