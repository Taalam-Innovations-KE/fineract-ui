import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import { getTenantFromRequest } from "@/lib/fineract/client.server";
import { onboardStaffAndUser } from "@/lib/fineract/onboarding.server";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

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
			return invalidRequestResponse("Staff and user payloads are required.");
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
		const mappedError = normalizeApiError(cause);
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
			status: mappedError.httpStatus || 500,
		});
	}
}
