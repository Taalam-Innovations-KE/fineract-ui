"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function getErrorStatusCode(error: unknown): number | null {
	if (!error || typeof error !== "object") return null;

	if ("status" in error && typeof error.status === "number") {
		return error.status;
	}

	if ("statusCode" in error && typeof error.statusCode === "number") {
		return error.statusCode;
	}

	if ("httpStatusCode" in error && typeof error.httpStatusCode === "number") {
		return error.httpStatusCode;
	}

	return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute
						refetchOnWindowFocus: false,
						retry: (failureCount, error) => {
							const statusCode = getErrorStatusCode(error);

							// Do not retry 4xx client errors; they are unlikely to succeed on retry.
							if (
								statusCode !== null &&
								statusCode >= 400 &&
								statusCode < 500
							) {
								return false;
							}

							return failureCount < 2;
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
