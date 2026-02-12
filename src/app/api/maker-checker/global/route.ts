import { NextRequest, NextResponse } from "next/server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import {
	getGlobalConfig,
	updateGlobalConfig,
} from "@/lib/fineract/maker-checker";

export async function GET() {
	try {
		const config = await getGlobalConfig();
		return NextResponse.json(config);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { enabled } = await request.json();
		if (typeof enabled !== "boolean") {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "enabled must be a boolean",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}
		await updateGlobalConfig(enabled);
		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
