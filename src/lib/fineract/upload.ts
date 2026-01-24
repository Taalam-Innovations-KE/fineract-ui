import { BFF_ROUTES } from "./endpoints";

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

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			data.message || data.errors?.[0]?.defaultUserMessage || "Upload failed",
		);
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
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "Download failed");
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
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "Delete failed");
	}
}
