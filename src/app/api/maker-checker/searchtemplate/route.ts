import { NextResponse } from "next/server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import { getMakerCheckerSearchTemplate } from "@/lib/fineract/maker-checker";

export async function GET() {
	try {
		const template = await getMakerCheckerSearchTemplate();
		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
