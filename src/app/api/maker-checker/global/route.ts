import { NextRequest, NextResponse } from "next/server";
import {
	getGlobalConfig,
	updateGlobalConfig,
} from "@/lib/fineract/maker-checker";

export async function GET() {
	try {
		const config = await getGlobalConfig();
		return NextResponse.json(config);
	} catch (error) {
		console.error("Failed to get global config:", error);
		return NextResponse.json(
			{
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to get global configuration",
				statusCode: 500,
			},
			{ status: 500 },
		);
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
		console.error("Failed to update global config:", error);
		return NextResponse.json(
			{
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update global configuration",
				statusCode: 500,
			},
			{ status: 500 },
		);
	}
}
