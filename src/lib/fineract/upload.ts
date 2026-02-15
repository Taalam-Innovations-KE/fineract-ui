import { BFF_ROUTES } from "./endpoints";
import { toSubmitActionError } from "./submit-error";
import { normalizeFailedResponse } from "./ui-api-error";

interface UploadDocumentOptions {
	loanId: number;
	file: File;
	name: string;
	description?: string;
	tenantId: string;
}

interface UploadDocumentResult {
	resourceId: number;
	resourceIdentifier?: string;
}

/**
 * Uploads a document to a loan via the BFF route
 */
export async function uploadDocument({
	loanId,
	file,
	name,
	description,
	tenantId,
}: UploadDocumentOptions): Promise<UploadDocumentResult> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", name);
	if (description) {
		formData.append("description", description);
	}

	const response = await fetch(BFF_ROUTES.loanDocuments(loanId), {
		method: "POST",
		headers: {
			"fineract-platform-tenantid": tenantId,
		},
		body: formData,
	});

	const responseText = await response.text();
	let data: UploadDocumentResult = { resourceId: 0 };
	if (responseText) {
		try {
			data = JSON.parse(responseText) as UploadDocumentResult;
		} catch {
			data = { resourceId: 0 };
		}
	}

	if (!response.ok) {
		throw toSubmitActionError(await normalizeFailedResponse(response), {
			action: "uploadLoanDocument",
			endpoint: BFF_ROUTES.loanDocuments(loanId),
			method: "POST",
			tenantId,
		});
	}

	return data;
}

/**
 * Downloads a document attachment from a loan
 */
export async function downloadDocument(
	loanId: number,
	documentId: number,
	tenantId: string,
): Promise<Blob> {
	const response = await fetch(
		`${BFF_ROUTES.loanDocuments(loanId)}/${documentId}/attachment`,
		{
			headers: {
				"fineract-platform-tenantid": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return response.blob();
}

/**
 * Deletes a document from a loan
 */
export async function deleteDocument(
	loanId: number,
	documentId: number,
	tenantId: string,
): Promise<void> {
	const response = await fetch(
		`${BFF_ROUTES.loanDocuments(loanId)}/${documentId}`,
		{
			method: "DELETE",
			headers: {
				"fineract-platform-tenantid": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw toSubmitActionError(await normalizeFailedResponse(response), {
			action: "deleteLoanDocument",
			endpoint: `${BFF_ROUTES.loanDocuments(loanId)}/${documentId}`,
			method: "DELETE",
			tenantId,
		});
	}
}
