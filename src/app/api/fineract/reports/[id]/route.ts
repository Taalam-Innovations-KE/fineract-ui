import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	DeleteReportsResponse,
	GetReportsResponse,
	PutReportRequest,
	PutReportResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

type RouteContext = {
	params: Promise<{
		id: string;
	}>;
};

function buildReportEndpoint(id: string, request: NextRequest) {
	const template = request.nextUrl.searchParams.get("template");
	const basePath = FINERACT_ENDPOINTS.reportById(id);

	if (template === "true") {
		return `${basePath}?template=true`;
	}

	return basePath;
}

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await context.params;
		const report = await fineractFetch<GetReportsResponse>(
			buildReportEndpoint(id, request),
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(report);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await context.params;
		const body = (await request.json()) as PutReportRequest;
		const result = await fineractFetch<PutReportResponse>(
			FINERACT_ENDPOINTS.reportById(id),
			{
				method: "PUT",
				body,
				tenantId,
				useBasicAuth: true,
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

export async function DELETE(_request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await context.params;
		const result = await fineractFetch<DeleteReportsResponse>(
			FINERACT_ENDPOINTS.reportById(id),
			{
				method: "DELETE",
				tenantId,
				useBasicAuth: true,
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
