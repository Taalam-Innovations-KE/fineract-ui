import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	approveRejectEntry,
	deleteMakerCheckerEntry,
	findUserByUsername,
	getInbox,
	getMakerCheckerSearchTemplate,
	getMakerCheckerSummary,
	matchesMakerCheckerQuery,
	sortMakerCheckerEntries,
} from "@/lib/fineract/maker-checker";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

function parseNumber(value: string | null): number | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;
		const scope = params.get("scope") === "mine" ? "mine" : "pending";
		const processingResult = params.get("processingResult");
		const searchQuery = params.get("q") ?? "";

		const session = await getSession();
		const currentUser = await findUserByUsername(session?.username);
		const searchTemplate = await getMakerCheckerSearchTemplate();

		const entries = await getInbox({
			actionName: params.get("actionName") || undefined,
			entityName: params.get("entityName") || undefined,
			resourceId: parseNumber(params.get("resourceId")),
			makerId:
				scope === "mine" ? currentUser?.id : parseNumber(params.get("makerId")),
			makerDateTimeFrom: params.get("makerDateTimeFrom") || undefined,
			makerDateTimeTo: params.get("makerDateTimeTo") || undefined,
			officeId: parseNumber(params.get("officeId")),
			clientId: parseNumber(params.get("clientId")),
			loanId: parseNumber(params.get("loanId")),
			groupId: parseNumber(params.get("groupId")),
			savingsAccountId: parseNumber(params.get("savingsAccountId")),
			includeJson: params.get("includeJson") === "true",
		});

		const scopedEntries =
			scope === "mine"
				? currentUser
					? entries
					: []
				: currentUser?.isSuperChecker
					? entries
					: entries.filter((entry) =>
							entry.entityName
								? searchTemplate.entityNames.includes(entry.entityName)
								: false,
						);

		const statusFilteredEntries = processingResult
			? scopedEntries.filter(
					(entry) =>
						entry.processingResult.toLowerCase() ===
						processingResult.toLowerCase(),
				)
			: scopedEntries;

		const textFilteredEntries = searchQuery
			? statusFilteredEntries.filter((entry) =>
					matchesMakerCheckerQuery(entry, searchQuery),
				)
			: statusFilteredEntries;

		const sortedEntries = sortMakerCheckerEntries(textFilteredEntries);

		return NextResponse.json({
			items: sortedEntries,
			searchTemplate,
			summary: getMakerCheckerSummary(sortedEntries),
			currentUser: currentUser
				? {
						id: currentUser.id,
						username: currentUser.username,
						isSuperChecker: currentUser.isSuperChecker,
					}
				: null,
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

export async function POST(request: NextRequest) {
	try {
		const { auditId, command } = await request.json();
		if (
			typeof auditId !== "number" ||
			(command !== "approve" && command !== "reject")
		) {
			return invalidRequestResponse("auditId and command are required");
		}
		await approveRejectEntry(auditId, command);
		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { auditId } = await request.json();
		if (typeof auditId !== "number") {
			return invalidRequestResponse("auditId is required");
		}

		await deleteMakerCheckerEntry(auditId);
		return NextResponse.json({ success: true });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
