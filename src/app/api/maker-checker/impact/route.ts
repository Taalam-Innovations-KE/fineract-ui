import { NextResponse } from "next/server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import { getMakerCheckerImpact } from "@/lib/fineract/maker-checker";

export async function GET() {
	try {
		const impact = await getMakerCheckerImpact();
		return NextResponse.json(impact);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
