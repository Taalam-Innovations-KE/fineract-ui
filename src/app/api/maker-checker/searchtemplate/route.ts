import { NextResponse } from "next/server";
import { getMakerCheckerSearchTemplate } from "@/lib/fineract/maker-checker";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET() {
	try {
		const template = await getMakerCheckerSearchTemplate();
		return NextResponse.json(template);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
