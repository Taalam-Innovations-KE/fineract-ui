import { NextRequest, NextResponse } from "next/server";
import { validationErrorResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetLoanRescheduleRequestResponse,
	GetLoansLoanIdResponse,
	PostUpdateRescheduleLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import { validateRescheduleDecisionRules } from "@/lib/fineract/loan-rule-validations";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/rescheduleloans/[scheduleId]
 * Fetches a reschedule request by ID, with optional command passthrough.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ scheduleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { scheduleId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.rescheduleLoanById(scheduleId)}?${queryString}`
			: FINERACT_ENDPOINTS.rescheduleLoanById(scheduleId);

		const rescheduleRequest =
			await fineractFetch<GetLoanRescheduleRequestResponse>(path, {
				method: "GET",
				tenantId,
			});

		return NextResponse.json(rescheduleRequest);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/rescheduleloans/[scheduleId]
 * Updates/acts on a reschedule request (approve/reject/preview via command).
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ scheduleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { scheduleId } = await params;
		const body = (await request.json()) as PostUpdateRescheduleLoansRequest;
		const command = request.nextUrl.searchParams.get("command");
		const normalizedCommand = (command || "").toLowerCase();

		if (normalizedCommand === "approve" || normalizedCommand === "reject") {
			const rescheduleRequest =
				await fineractFetch<GetLoanRescheduleRequestResponse>(
					FINERACT_ENDPOINTS.rescheduleLoanById(scheduleId),
					{
						method: "GET",
						tenantId,
					},
				);
			const loan =
				typeof rescheduleRequest.loanId === "number"
					? await fineractFetch<GetLoansLoanIdResponse>(
							`${FINERACT_ENDPOINTS.loans}/${rescheduleRequest.loanId}?associations=repaymentSchedule,transactions,charges`,
							{
								method: "GET",
								tenantId,
							},
						)
					: null;

			const validationIssues = validateRescheduleDecisionRules({
				command: normalizedCommand,
				payload: body,
				request: rescheduleRequest,
				loan,
			});
			if (validationIssues.length > 0) {
				return validationErrorResponse(
					"Restructure decision validation failed.",
					validationIssues,
				);
			}
		}

		const path = command
			? `${FINERACT_ENDPOINTS.rescheduleLoanById(scheduleId)}?command=${encodeURIComponent(command)}`
			: FINERACT_ENDPOINTS.rescheduleLoanById(scheduleId);

		const result = await fineractFetch<unknown>(path, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
