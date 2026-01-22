import { NextRequest, NextResponse } from "next/server";
import {
	getMakerCheckerImpact,
	getUsersForSuperChecker,
	updateSuperCheckerStatus,
} from "@/lib/fineract/maker-checker";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type");

		if (type === "impact") {
			const impact = await getMakerCheckerImpact();
			return NextResponse.json(impact);
		}

		const users = await getUsersForSuperChecker();
		return NextResponse.json(users);
	} catch (error) {
		console.error("Failed to get super checker data:", error);
		return NextResponse.json(
			{ error: "Failed to get super checker data" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { userId, isSuperChecker } = await request.json();
		await updateSuperCheckerStatus(userId, isSuperChecker);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to update super checker status:", error);
		return NextResponse.json(
			{ error: "Failed to update super checker status" },
			{ status: 500 },
		);
	}
}
