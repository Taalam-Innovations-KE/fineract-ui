import { NextRequest, NextResponse } from "next/server";
import {
	getPermissions,
	updatePermissions,
} from "@/lib/fineract/maker-checker";

export async function GET() {
	try {
		const permissions = await getPermissions();
		return NextResponse.json(permissions);
	} catch (error) {
		console.error("Failed to get permissions:", error);
		return NextResponse.json(
			{ error: "Failed to get permissions" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const permissions = await request.json();
		await updatePermissions(permissions);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to update permissions:", error);
		return NextResponse.json(
			{ error: "Failed to update permissions" },
			{ status: 500 },
		);
	}
}
