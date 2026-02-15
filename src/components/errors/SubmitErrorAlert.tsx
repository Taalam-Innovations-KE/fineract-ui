"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toastApiError } from "@/lib/fineract/error-toast";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { getSubmitErrorDetails } from "@/lib/fineract/submit-error";

interface SubmitErrorAlertProps {
	error: SubmitActionError | null;
	title?: string;
}

export function SubmitErrorAlert({
	error,
	title = "Unable to complete request",
}: SubmitErrorAlertProps) {
	useEffect(() => {
		if (!error) {
			return;
		}

		toastApiError(error, {
			title,
		});
	}, [error, title]);

	if (!error) {
		return null;
	}

	const detailMessages = getSubmitErrorDetails(error);

	return (
		<Alert variant="destructive">
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription className="space-y-2">
				<p>{error.message}</p>
				{detailMessages.length > 0 && (
					<ul className="list-disc space-y-1 pl-5 text-xs">
						{detailMessages.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				)}
			</AlertDescription>
		</Alert>
	);
}
