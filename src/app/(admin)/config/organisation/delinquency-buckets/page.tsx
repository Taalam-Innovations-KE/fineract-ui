"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	DeleteDelinquencyBucketResponse,
	DelinquencyBucketData,
	DelinquencyBucketRequest,
	DelinquencyRangeData,
	DelinquencyRangeRequest,
	PostDelinquencyBucketResponse,
	PostDelinquencyRangeResponse,
	PutDelinquencyBucketResponse,
	PutDelinquencyRangeResponse,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type EditableRange = {
	id?: number;
	minimumAgeDays: string;
	maximumAgeDays: string;
	classification: string;
};

type BucketDraft = {
	name: string;
	ranges: EditableRange[];
};

const EMPTY_RANGE: EditableRange = {
	minimumAgeDays: "",
	maximumAgeDays: "",
	classification: "",
};

const INITIAL_DRAFT: BucketDraft = {
	name: "",
	ranges: [{ ...EMPTY_RANGE }],
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getErrorMessage(payload: unknown, fallback: string): string {
	if (!isObjectRecord(payload)) {
		return fallback;
	}

	if (typeof payload.message === "string" && payload.message.trim()) {
		return payload.message;
	}

	if (Array.isArray(payload.errors) && payload.errors.length > 0) {
		const firstError = payload.errors[0];
		if (
			isObjectRecord(firstError) &&
			typeof firstError.defaultUserMessage === "string" &&
			firstError.defaultUserMessage.trim()
		) {
			return firstError.defaultUserMessage;
		}
	}

	return fallback;
}

async function parseJsonOrThrow<T>(
	response: Response,
	fallbackErrorMessage: string,
): Promise<T> {
	const rawPayload = await response.text();
	const payload = rawPayload ? (JSON.parse(rawPayload) as unknown) : null;

	if (!response.ok) {
		throw new Error(
			getErrorMessage(
				payload,
				response.statusText || fallbackErrorMessage || "Request failed",
			),
		);
	}

	return (payload ?? {}) as T;
}

async function fetchDelinquencyBuckets(
	tenantId: string,
): Promise<DelinquencyBucketData[]> {
	const response = await fetch(BFF_ROUTES.delinquencyBuckets, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	return parseJsonOrThrow<DelinquencyBucketData[]>(
		response,
		"Failed to fetch delinquency buckets",
	);
}

async function fetchDelinquencyRanges(
	tenantId: string,
): Promise<DelinquencyRangeData[]> {
	const response = await fetch(BFF_ROUTES.delinquencyRanges, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	return parseJsonOrThrow<DelinquencyRangeData[]>(
		response,
		"Failed to fetch delinquency ranges",
	);
}

async function createDelinquencyBucket(
	tenantId: string,
	payload: DelinquencyBucketRequest,
): Promise<PostDelinquencyBucketResponse> {
	const response = await fetch(BFF_ROUTES.delinquencyBuckets, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseJsonOrThrow<PostDelinquencyBucketResponse>(
		response,
		"Failed to create delinquency bucket",
	);
}

async function updateDelinquencyBucket(
	tenantId: string,
	bucketId: number,
	payload: DelinquencyBucketRequest,
): Promise<PutDelinquencyBucketResponse> {
	const response = await fetch(`${BFF_ROUTES.delinquencyBuckets}/${bucketId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseJsonOrThrow<PutDelinquencyBucketResponse>(
		response,
		"Failed to update delinquency bucket",
	);
}

async function deleteDelinquencyBucket(
	tenantId: string,
	bucketId: number,
): Promise<DeleteDelinquencyBucketResponse> {
	const response = await fetch(`${BFF_ROUTES.delinquencyBuckets}/${bucketId}`, {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	return parseJsonOrThrow<DeleteDelinquencyBucketResponse>(
		response,
		"Failed to delete delinquency bucket",
	);
}

async function createDelinquencyRange(
	tenantId: string,
	payload: DelinquencyRangeRequest,
): Promise<PostDelinquencyRangeResponse> {
	const response = await fetch(BFF_ROUTES.delinquencyRanges, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseJsonOrThrow<PostDelinquencyRangeResponse>(
		response,
		"Failed to create delinquency range",
	);
}

async function updateDelinquencyRange(
	tenantId: string,
	rangeId: number,
	payload: DelinquencyRangeRequest,
): Promise<PutDelinquencyRangeResponse> {
	const response = await fetch(`${BFF_ROUTES.delinquencyRanges}/${rangeId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	return parseJsonOrThrow<PutDelinquencyRangeResponse>(
		response,
		"Failed to update delinquency range",
	);
}

function parseInteger(value: string): number | null {
	if (!value.trim()) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed)) {
		return null;
	}

	return parsed;
}

function resolveBucketRanges(
	bucket: DelinquencyBucketData,
	rangeLookup: Map<number, DelinquencyRangeData>,
): DelinquencyRangeData[] {
	const bucketRanges = bucket.ranges || [];

	return bucketRanges
		.map((range) => {
			if (range.id !== undefined && rangeLookup.has(range.id)) {
				return {
					...rangeLookup.get(range.id),
					...range,
				} as DelinquencyRangeData;
			}
			return range;
		})
		.filter(
			(range): range is DelinquencyRangeData =>
				range.id !== undefined ||
				range.minimumAgeDays !== undefined ||
				range.maximumAgeDays !== undefined,
		)
		.sort((left, right) => {
			const leftMin = left.minimumAgeDays ?? Number.MAX_SAFE_INTEGER;
			const rightMin = right.minimumAgeDays ?? Number.MAX_SAFE_INTEGER;
			return leftMin - rightMin;
		});
}

function validateDraft(draft: BucketDraft): string | null {
	if (!draft.name.trim()) {
		return "Bucket name is required.";
	}

	if (draft.ranges.length === 0) {
		return "At least one range is required.";
	}

	const parsedRanges = draft.ranges.map((range, index) => {
		const minimumAgeDays = parseInteger(range.minimumAgeDays);
		const maximumAgeDays = parseInteger(range.maximumAgeDays);

		if (!range.classification.trim()) {
			return {
				error: `Range ${index + 1}: Classification is required.`,
			};
		}

		if (minimumAgeDays === null || maximumAgeDays === null) {
			return {
				error: `Range ${index + 1}: Enter valid whole numbers for min and max days.`,
			};
		}

		if (minimumAgeDays < 0 || maximumAgeDays < 0) {
			return {
				error: `Range ${index + 1}: Days cannot be negative.`,
			};
		}

		if (minimumAgeDays > maximumAgeDays) {
			return {
				error: `Range ${index + 1}: Min days cannot exceed max days.`,
			};
		}

		return {
			minimumAgeDays,
			maximumAgeDays,
		};
	});

	const firstError = parsedRanges.find(
		(entry): entry is { error: string } => "error" in entry,
	);
	if (firstError) {
		return firstError.error;
	}

	const normalizedRanges = parsedRanges
		.map((entry) => entry as { minimumAgeDays: number; maximumAgeDays: number })
		.sort((left, right) => left.minimumAgeDays - right.minimumAgeDays);

	for (let index = 1; index < normalizedRanges.length; index += 1) {
		const previous = normalizedRanges[index - 1];
		const current = normalizedRanges[index];
		if (current.minimumAgeDays <= previous.maximumAgeDays) {
			return "Ranges cannot overlap. Adjust day boundaries.";
		}
	}

	return null;
}

function mapBucketToDraft(bucket: DelinquencyBucketData): BucketDraft {
	const ranges = (bucket.ranges || []).map((range) => ({
		id: range.id,
		minimumAgeDays:
			range.minimumAgeDays !== undefined ? String(range.minimumAgeDays) : "",
		maximumAgeDays:
			range.maximumAgeDays !== undefined ? String(range.maximumAgeDays) : "",
		classification: range.classification || "",
	}));

	return {
		name: bucket.name || "",
		ranges: ranges.length > 0 ? ranges : [{ ...EMPTY_RANGE }],
	};
}

function DelinquencyBucketsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="pt-6">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-sm" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-20" />
									<Skeleton className="h-4 w-28" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-80" />
				</CardHeader>
				<CardContent>
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border/60 bg-muted/40">
							<tr>
								<th className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</th>
								<th className="px-3 py-2">
									<Skeleton className="h-4 w-20" />
								</th>
								<th className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</th>
								<th className="px-3 py-2">
									<Skeleton className="h-4 w-32" />
								</th>
								<th className="px-3 py-2">
									<Skeleton className="h-4 w-16" />
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/60">
							{Array.from({ length: 8 }).map((_, index) => (
								<tr key={index}>
									<td className="px-3 py-2">
										<Skeleton className="h-4 w-36" />
									</td>
									<td className="px-3 py-2">
										<Skeleton className="h-4 w-10" />
									</td>
									<td className="px-3 py-2">
										<Skeleton className="h-4 w-28" />
									</td>
									<td className="px-3 py-2">
										<Skeleton className="h-4 w-48" />
									</td>
									<td className="px-3 py-2">
										<Skeleton className="h-8 w-28" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}

export default function DelinquencyBucketsPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingBucket, setEditingBucket] =
		useState<DelinquencyBucketData | null>(null);
	const [draft, setDraft] = useState<BucketDraft>(INITIAL_DRAFT);
	const [formError, setFormError] = useState<string | null>(null);

	const {
		data: bucketsData = [],
		isLoading: isBucketsLoading,
		error: bucketsError,
	} = useQuery({
		queryKey: ["delinquency-buckets", tenantId],
		queryFn: () => fetchDelinquencyBuckets(tenantId),
	});

	const {
		data: rangesData = [],
		isLoading: isRangesLoading,
		error: rangesError,
	} = useQuery({
		queryKey: ["delinquency-ranges", tenantId],
		queryFn: () => fetchDelinquencyRanges(tenantId),
	});

	const rangeLookup = useMemo(
		() =>
			new Map<number, DelinquencyRangeData>(
				rangesData
					.filter(
						(range): range is DelinquencyRangeData & { id: number } =>
							range.id !== undefined,
					)
					.map((range) => [range.id, range]),
			),
		[rangesData],
	);

	const buckets = useMemo(
		() =>
			bucketsData.map((bucket) => ({
				...bucket,
				ranges: resolveBucketRanges(bucket, rangeLookup),
			})),
		[bucketsData, rangeLookup],
	);

	const upsertRanges = async (ranges: EditableRange[]): Promise<number[]> => {
		const rangeIds: number[] = [];

		for (const range of ranges) {
			const minimumAgeDays = parseInteger(range.minimumAgeDays);
			const maximumAgeDays = parseInteger(range.maximumAgeDays);

			if (minimumAgeDays === null || maximumAgeDays === null) {
				throw new Error("One or more ranges contain invalid day values.");
			}

			const payload: DelinquencyRangeRequest = {
				classification: range.classification.trim(),
				minimumAgeDays,
				maximumAgeDays,
				locale: "en",
			};

			if (range.id !== undefined) {
				await updateDelinquencyRange(tenantId, range.id, payload);
				rangeIds.push(range.id);
			} else {
				const response = await createDelinquencyRange(tenantId, payload);
				if (response.resourceId === undefined) {
					throw new Error("Failed to create delinquency range.");
				}
				rangeIds.push(response.resourceId);
			}
		}

		return rangeIds;
	};

	const createBucketMutation = useMutation({
		mutationFn: async (bucketDraft: BucketDraft) => {
			const rangeIds = await upsertRanges(bucketDraft.ranges);
			const payload: DelinquencyBucketRequest = {
				name: bucketDraft.name.trim(),
				ranges: rangeIds,
			};
			return createDelinquencyBucket(tenantId, payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["delinquency-buckets", tenantId],
			});
			queryClient.invalidateQueries({
				queryKey: ["delinquency-ranges", tenantId],
			});
			setDraft(INITIAL_DRAFT);
			setFormError(null);
			setIsSheetOpen(false);
		},
		onError: (error) => {
			setFormError((error as Error).message);
		},
	});

	const updateBucketMutation = useMutation({
		mutationFn: async ({
			bucketId,
			bucketDraft,
		}: {
			bucketId: number;
			bucketDraft: BucketDraft;
		}) => {
			const rangeIds = await upsertRanges(bucketDraft.ranges);
			const payload: DelinquencyBucketRequest = {
				name: bucketDraft.name.trim(),
				ranges: rangeIds,
			};
			return updateDelinquencyBucket(tenantId, bucketId, payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["delinquency-buckets", tenantId],
			});
			queryClient.invalidateQueries({
				queryKey: ["delinquency-ranges", tenantId],
			});
			setEditingBucket(null);
			setDraft(INITIAL_DRAFT);
			setFormError(null);
			setIsSheetOpen(false);
		},
		onError: (error) => {
			setFormError((error as Error).message);
		},
	});

	const deleteBucketMutation = useMutation({
		mutationFn: (bucketId: number) =>
			deleteDelinquencyBucket(tenantId, bucketId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["delinquency-buckets", tenantId],
			});
		},
		onError: (error) => {
			setFormError((error as Error).message);
		},
	});

	const openCreateSheet = () => {
		setEditingBucket(null);
		setDraft(INITIAL_DRAFT);
		setFormError(null);
		setIsSheetOpen(true);
	};

	const openEditSheet = (bucket: DelinquencyBucketData) => {
		setEditingBucket(bucket);
		setDraft(mapBucketToDraft(bucket));
		setFormError(null);
		setIsSheetOpen(true);
	};

	const addRangeRow = () => {
		setDraft((current) => ({
			...current,
			ranges: [...current.ranges, { ...EMPTY_RANGE }],
		}));
	};

	const removeRangeRow = (index: number) => {
		setDraft((current) => {
			if (current.ranges.length === 1) {
				return current;
			}

			return {
				...current,
				ranges: current.ranges.filter(
					(_, currentIndex) => currentIndex !== index,
				),
			};
		});
	};

	const updateRangeField = (
		index: number,
		field: keyof EditableRange,
		value: string,
	) => {
		setDraft((current) => ({
			...current,
			ranges: current.ranges.map((range, currentIndex) =>
				currentIndex === index ? { ...range, [field]: value } : range,
			),
		}));
	};

	const handleSave = () => {
		const validationError = validateDraft(draft);
		if (validationError) {
			setFormError(validationError);
			return;
		}

		setFormError(null);
		if (editingBucket?.id !== undefined) {
			updateBucketMutation.mutate({
				bucketId: editingBucket.id,
				bucketDraft: draft,
			});
			return;
		}

		createBucketMutation.mutate(draft);
	};

	const handleDelete = (bucket: DelinquencyBucketData) => {
		if (bucket.id === undefined) {
			return;
		}

		const shouldDelete = window.confirm(
			`Delete delinquency bucket "${bucket.name || bucket.id}"?`,
		);
		if (!shouldDelete) {
			return;
		}

		deleteBucketMutation.mutate(bucket.id);
	};

	const usedRangeIds = useMemo(() => {
		const ids = new Set<number>();
		buckets.forEach((bucket) => {
			(bucket.ranges || []).forEach((range) => {
				if (range.id !== undefined) {
					ids.add(range.id);
				}
			});
		});
		return ids;
	}, [buckets]);

	const totalRanges = useMemo(
		() => (usedRangeIds.size > 0 ? usedRangeIds.size : rangesData.length),
		[usedRangeIds, rangesData.length],
	);

	const isLoading = isBucketsLoading || isRangesLoading;
	const hasError = bucketsError || rangesError;

	const columns = [
		{
			header: "Bucket Name",
			cell: (bucket: DelinquencyBucketData) => (
				<span className="font-medium">{bucket.name || "Unnamed bucket"}</span>
			),
		},
		{
			header: "Ranges",
			cell: (bucket: DelinquencyBucketData) => (
				<Badge variant="secondary">{bucket.ranges?.length || 0}</Badge>
			),
		},
		{
			header: "Coverage",
			cell: (bucket: DelinquencyBucketData) => {
				const ranges = bucket.ranges || [];
				if (ranges.length === 0) {
					return <span className="text-muted-foreground">Not configured</span>;
				}

				const minimum = ranges
					.map((range) => range.minimumAgeDays)
					.filter((value): value is number => value !== undefined)
					.sort((left, right) => left - right)[0];
				const maximum = ranges
					.map((range) => range.maximumAgeDays)
					.filter((value): value is number => value !== undefined)
					.sort((left, right) => right - left)[0];

				if (minimum === undefined || maximum === undefined) {
					return <span className="text-muted-foreground">Not configured</span>;
				}

				return `${minimum}-${maximum} days`;
			},
		},
		{
			header: "Classifications",
			cell: (bucket: DelinquencyBucketData) => {
				const classifications = (bucket.ranges || [])
					.map((range) => range.classification)
					.filter((classification): classification is string =>
						Boolean(classification),
					);

				if (classifications.length === 0) {
					return <span className="text-muted-foreground">Not configured</span>;
				}

				return (
					<div className="flex flex-wrap gap-1">
						{classifications.slice(0, 3).map((classification) => (
							<Badge key={classification} variant="outline" className="text-xs">
								{classification}
							</Badge>
						))}
						{classifications.length > 3 && (
							<Badge variant="outline" className="text-xs">
								+{classifications.length - 3}
							</Badge>
						)}
					</div>
				);
			},
		},
		{
			header: "Actions",
			cell: (bucket: DelinquencyBucketData) => (
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => openEditSheet(bucket)}
					>
						<Pencil className="mr-1 h-3 w-3" />
						Edit
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleDelete(bucket)}
						disabled={deleteBucketMutation.isPending}
					>
						<Trash2 className="mr-1 h-3 w-3" />
						Delete
					</Button>
				</div>
			),
		},
	];

	if (isLoading) {
		return (
			<PageShell
				title="Delinquency Buckets"
				subtitle="Configure overdue classification policies"
			>
				<DelinquencyBucketsSkeleton />
			</PageShell>
		);
	}

	if (hasError) {
		return (
			<PageShell
				title="Delinquency Buckets"
				subtitle="Configure overdue classification policies"
			>
				<Alert>
					<AlertTitle>Error loading configuration</AlertTitle>
					<AlertDescription>
						Unable to load delinquency buckets. Refresh the page and try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Delinquency Buckets"
			subtitle="Define aging ranges and classifications used by loan products"
			actions={
				<Button onClick={openCreateSheet}>
					<Plus className="mr-2 h-4 w-4" />
					Add Bucket
				</Button>
			}
		>
			<div className="space-y-6">
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Template behavior</AlertTitle>
					<AlertDescription>
						Dedicated delinquency bucket template endpoints are not available.
						Loan product linkage uses{" "}
						<code className="mx-1">/v1/loanproducts/template</code>
						via <code>/api/fineract/loanproducts/template</code> for bucket
						options.
					</AlertDescription>
				</Alert>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{buckets.length}</div>
							<div className="text-sm text-muted-foreground">Total Buckets</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">{totalRanges}</div>
							<div className="text-sm text-muted-foreground">
								Total Linked Ranges
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="text-2xl font-bold">
								{
									buckets.filter((bucket) => (bucket.ranges?.length || 0) > 0)
										.length
								}
							</div>
							<div className="text-sm text-muted-foreground">
								Buckets With Ranges
							</div>
						</CardContent>
					</Card>
				</div>

				{formError && (
					<Alert variant="destructive">
						<AlertTitle>Action failed</AlertTitle>
						<AlertDescription>{formError}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Configured Buckets</CardTitle>
						<CardDescription>
							Create and maintain delinquency buckets used in loan product
							policies.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DataTable
							data={buckets}
							columns={columns}
							getRowId={(bucket) =>
								String(bucket.id ?? bucket.name ?? "bucket")
							}
							emptyMessage="No delinquency buckets found. Create one to get started."
						/>
					</CardContent>
				</Card>
			</div>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full overflow-y-auto sm:max-w-xl"
				>
					<SheetHeader>
						<SheetTitle>
							{editingBucket
								? "Edit Delinquency Bucket"
								: "Create Delinquency Bucket"}
						</SheetTitle>
						<SheetDescription>
							Define aging ranges and assign a classification to each range.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-6">
						<div className="space-y-2">
							<Label htmlFor="bucket-name">Bucket Name</Label>
							<Input
								id="bucket-name"
								value={draft.name}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								placeholder="e.g., Monthly Arrears Policy"
							/>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label>Ranges</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addRangeRow}
								>
									<Plus className="mr-1 h-3 w-3" />
									Add Range
								</Button>
							</div>

							<div className="space-y-3">
								{draft.ranges.map((range, index) => (
									<div
										key={range.id ?? `new-range-${index}`}
										className="rounded-sm border border-border/60 p-3"
									>
										<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
											<div className="space-y-2">
												<Label htmlFor={`range-min-${index}`}>Min Days</Label>
												<Input
													id={`range-min-${index}`}
													type="number"
													min={0}
													value={range.minimumAgeDays}
													onChange={(event) =>
														updateRangeField(
															index,
															"minimumAgeDays",
															event.target.value,
														)
													}
													placeholder="1"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`range-max-${index}`}>Max Days</Label>
												<Input
													id={`range-max-${index}`}
													type="number"
													min={0}
													value={range.maximumAgeDays}
													onChange={(event) =>
														updateRangeField(
															index,
															"maximumAgeDays",
															event.target.value,
														)
													}
													placeholder="30"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`range-classification-${index}`}>
													Classification
												</Label>
												<Input
													id={`range-classification-${index}`}
													value={range.classification}
													onChange={(event) =>
														updateRangeField(
															index,
															"classification",
															event.target.value,
														)
													}
													placeholder="e.g., Standard"
												/>
											</div>
										</div>

										<div className="mt-3 flex justify-end">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => removeRangeRow(index)}
												disabled={draft.ranges.length === 1}
											>
												<Trash2 className="mr-1 h-3 w-3" />
												Remove
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsSheetOpen(false);
									setFormError(null);
								}}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleSave}
								disabled={
									createBucketMutation.isPending ||
									updateBucketMutation.isPending
								}
							>
								{createBucketMutation.isPending ||
								updateBucketMutation.isPending
									? "Saving..."
									: "Save Bucket"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
