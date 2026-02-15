import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	getGlobalConfig,
	updateGlobalConfig,
} from "@/lib/fineract/maker-checker";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET() {
	try {
		const config = await getGlobalConfig();
		return NextResponse.json(config);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { enabled } = await request.json();
		if (typeof enabled !== "boolean") {
			return invalidRequestResponse("enabled must be a boolean");
		}
		await updateGlobalConfig(enabled);
		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
