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
			{ error: "Failed to get global configuration" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { enabled } = await request.json();
		await updateGlobalConfig(enabled);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to update global config:", error);
		return NextResponse.json(
			{ error: "Failed to update global configuration" },
			{ status: 500 },
		);
	}
}
