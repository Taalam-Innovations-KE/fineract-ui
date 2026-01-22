import { NextRequest, NextResponse } from "next/server";
import {
	approveRejectEntry,
	getFilteredInbox,
} from "@/lib/fineract/maker-checker";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		const entries = await getFilteredInbox(
			userId ? parseInt(userId) : undefined,
		);
		return NextResponse.json(entries);
	} catch (error) {
		console.error("Failed to get inbox:", error);
		return NextResponse.json({ error: "Failed to get inbox" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const { auditId, command } = await request.json();
		await approveRejectEntry(auditId, command);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to approve/reject entry:", error);
		return NextResponse.json(
			{ error: "Failed to approve/reject entry" },
			{ status: 500 },
		);
	}
}
