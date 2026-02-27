import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetLoanProductsProductIdResponse,
	GetLoansLoanIdResponse,
	PostLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import { validateTopupRules } from "@/lib/fineract/loan-rule-validations";
import { validationErrorResponse } from "@/lib/fineract/api-error-response";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

type PostLoansRequestExtended = PostLoansRequest & {
	isTopup?: boolean;
	loanIdToClose?: number;
};

const UNSUPPORTED_LOAN_LIST_FIELDS = new Set(["clientname", "productname"]);

function sanitizeLoansQueryParams(
	searchParams: URLSearchParams,
): URLSearchParams {
	const sanitized = new URLSearchParams(searchParams);
	const fieldsRaw = sanitized.get("fields");

	if (!fieldsRaw) {
		return sanitized;
	}

	const requestedFields = fieldsRaw
		.split(",")
		.map((field) => field.trim())
		.filter(Boolean);

	// Fineract list endpoint rejects these names in `fields` even though they can
	// appear in full response payloads. Drop `fields` entirely to avoid 400 loops.
	const hasUnsupportedField = requestedFields.some((field) =>
		UNSUPPORTED_LOAN_LIST_FIELDS.has(field.toLowerCase()),
	);
	if (hasUnsupportedField) {
		sanitized.delete("fields");
	}

	return sanitized;
}

/**
 * GET /api/fineract/loans
 * Fetches loans
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = sanitizeLoansQueryParams(
			request.nextUrl.searchParams,
		).toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loans}?${queryString}`
			: FINERACT_ENDPOINTS.loans;

		const loans = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(loans);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/loans
 * Creates a new loan
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostLoansRequestExtended;

		if (body.isTopup) {
			const newLoanProduct =
				typeof body.productId === "number"
					? await fineractFetch<GetLoanProductsProductIdResponse>(
							`${FINERACT_ENDPOINTS.loanProducts}/${body.productId}`,
							{
								method: "GET",
								tenantId,
							},
						)
					: null;

			let loanToClose: GetLoansLoanIdResponse | null = null;
			if (typeof body.loanIdToClose === "number" && body.loanIdToClose > 0) {
				try {
					loanToClose = await fineractFetch<GetLoansLoanIdResponse>(
						`${FINERACT_ENDPOINTS.loans}/${body.loanIdToClose}?associations=transactions`,
						{
							method: "GET",
							tenantId,
						},
					);
				} catch {
					loanToClose = null;
				}
			}

			const loanToCloseProduct =
				loanToClose?.loanProductId !== undefined
					? await fineractFetch<GetLoanProductsProductIdResponse>(
							`${FINERACT_ENDPOINTS.loanProducts}/${loanToClose.loanProductId}`,
							{
								method: "GET",
								tenantId,
							},
						)
					: null;

			const topupIssues = validateTopupRules({
				payload: body,
				newLoanProduct,
				loanToClose,
				loanToCloseProduct,
			});

			if (topupIssues.length > 0) {
				return validationErrorResponse("Top-up validation failed.", topupIssues);
			}
		}

		const result = await fineractFetch(FINERACT_ENDPOINTS.loans, {
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
