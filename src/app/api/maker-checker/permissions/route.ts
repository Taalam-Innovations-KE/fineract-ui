import { NextRequest, NextResponse } from "next/server";

export async function GET() {
	try {
		const response = await fetch(
			`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/fineract/permissions?makerCheckerable=true`,
		);

		if (!response.ok) {
			throw new Error("Failed to fetch permissions");
		}

		const permissions = await response.json();
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

		const response = await fetch(
			`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/fineract/permissions`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(permissions),
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to update permissions");
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to update permissions:", error);
		return NextResponse.json(
			{ error: "Failed to update permissions" },
			{ status: 500 },
		);
	}
}
