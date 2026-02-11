import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import { onboardStaffAndUser } from "@/lib/fineract/onboarding.server";

type OnboardingError = Error & {
	orphanedStaffId?: number;
	cause?: unknown;
};

/**
 * POST /api/fineract/onboarding
 * Creates a staff member and linked user in sequence
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = await request.json();

		if (!body?.staff || !body?.user) {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "Staff and user payloads are required.",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}

		const result = await onboardStaffAndUser({
			staff: body.staff,
			user: body.user,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const onboardingError = error as OnboardingError;
		const orphanedStaffId = onboardingError.orphanedStaffId;
		const cause = onboardingError.cause ?? error;
		const mappedError = mapFineractError(cause);
		const responseBody: Record<string, unknown> = {
			...mappedError,
		};

		if (orphanedStaffId) {
			responseBody.orphanedStaffId = orphanedStaffId;
			responseBody.rollbackSuggestion = `User creation failed after staff ${orphanedStaffId} was created. Consider removing the staff record if needed.`;
			console.warn(
				`Onboarding failed after staff creation. Orphaned staffId: ${orphanedStaffId}`,
			);
		}

		return NextResponse.json(responseBody, {
			status: mappedError.statusCode || 500,
		});
	}
}
