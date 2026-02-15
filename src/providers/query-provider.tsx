"use client";

import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { toastApiError } from "@/lib/fineract/error-toast";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

function getErrorStatusCode(error: unknown): number | null {
	const normalized = normalizeApiError(error);
	return Number.isFinite(normalized.httpStatus) ? normalized.httpStatus : null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error, query) => {
						if (query.meta?.suppressErrorToast) {
							return;
						}

						toastApiError(error, {
							title: "Failed to load data",
						});
					},
				}),
				mutationCache: new MutationCache({
					onError: (error, _variables, _context, mutation) => {
						if (mutation.meta?.suppressErrorToast) {
							return;
						}

						toastApiError(error, {
							title: "Action failed",
						});
					},
				}),
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
