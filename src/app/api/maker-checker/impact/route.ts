import { NextResponse } from "next/server";
import { getMakerCheckerImpact } from "@/lib/fineract/maker-checker";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET() {
	try {
		const impact = await getMakerCheckerImpact();
		return NextResponse.json(impact);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
