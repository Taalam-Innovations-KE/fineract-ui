import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetchResponse,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

type RouteContext = {
	params: Promise<{
		reportName: string;
	}>;
};

function buildRunReportPath(reportName: string, request: NextRequest) {
	const search = new URL(request.url).searchParams.toString();
	const endpoint = FINERACT_ENDPOINTS.runReport(reportName);
	return search ? `${endpoint}?${search}` : endpoint;
}

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { reportName } = await context.params;
		const decodedReportName = decodeURIComponent(reportName);
		const upstreamResponse = await fineractFetchResponse(
			buildRunReportPath(decodedReportName, request),
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
				headers: {
					Accept:
						"application/json, text/csv, application/pdf, text/plain, */*",
				},
			},
		);

		if (!upstreamResponse.ok) {
			const rawError = await upstreamResponse.text();
			const mappedError = normalizeApiError({
				status: upstreamResponse.status,
				data: rawError || upstreamResponse.statusText,
				headers: upstreamResponse.headers,
				message: upstreamResponse.statusText,
			});

			return NextResponse.json(mappedError, {
				status: mappedError.httpStatus || 500,
			});
		}

		const body = await upstreamResponse.arrayBuffer();
		const headers = new Headers();
		const contentType = upstreamResponse.headers.get("content-type");
		const contentDisposition = upstreamResponse.headers.get(
			"content-disposition",
		);
		const cacheControl = upstreamResponse.headers.get("cache-control");

		if (contentType) {
			headers.set("content-type", contentType);
		}
		if (contentDisposition) {
			headers.set("content-disposition", contentDisposition);
		}
		if (cacheControl) {
			headers.set("cache-control", cacheControl);
		}

		return new NextResponse(body, {
			status: upstreamResponse.status,
			headers,
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
