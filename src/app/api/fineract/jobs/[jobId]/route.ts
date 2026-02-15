import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	ExecuteJobRequest,
	GetJobsResponse,
	PutJobsJobIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		jobId: string;
	}>;
}

/**
 * GET /api/fineract/jobs/[jobId]
 * Fetches a scheduler job by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { jobId } = await context.params;

		const job = await fineractFetch<GetJobsResponse>(
			`${FINERACT_ENDPOINTS.jobs}/${jobId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(job);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/jobs/[jobId]
 * Updates scheduler job details
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { jobId } = await context.params;
		const body = (await request.json()) as PutJobsJobIdRequest;

		const result = await fineractFetch<unknown>(
			`${FINERACT_ENDPOINTS.jobs}/${jobId}`,
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/jobs/[jobId]?command=<command>
 * Executes job commands (e.g. executeJob)
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { jobId } = await context.params;
		const command = request.nextUrl.searchParams.get("command");

		if (!command) {
			return invalidRequestResponse(
				"Missing required query parameter: command",
			);
		}

		const rawBody = await request.text();
		const body = rawBody
			? (JSON.parse(rawBody) as ExecuteJobRequest)
			: undefined;

		const result = await fineractFetch<unknown>(
			`${FINERACT_ENDPOINTS.jobs}/${jobId}?command=${encodeURIComponent(command)}`,
			{
				method: "POST",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
