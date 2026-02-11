"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import {
	formatDateForFineract,
	getFineractDateConfig,
	parseFineractDate,
} from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetCodesResponse,
	GetCodeValuesDataResponse,
	GetDataTablesResponse,
	PostCodeValuesDataRequest,
	PostColumnHeaderData,
	PutCodeValuesDataRequest,
	ResultsetColumnHeaderData,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

const CODE_VALUE_APPTABLE = "m_code_value";
const DEFAULT_DATATABLE_NAME = "code_value_extra_info";
const DEFAULT_DATATABLE_COLUMNS: PostColumnHeaderData[] = [
	{ name: "Kenya_Local_Name", type: "String", length: 100 },
	{ name: "Risk_Weighting", type: "Decimal" },
];

type CodeValueRow = GetCodeValuesDataResponse & {
	systemDefined?: boolean;
	isOptimistic?: boolean;
};

type MetadataRecord = Record<string, unknown> | null;

type ParsedDatatableEntry = {
	record: MetadataRecord;
	exists: boolean;
};

async function fetchCode(
	tenantId: string,
	id: string,
): Promise<GetCodesResponse> {
	const response = await fetch(`${BFF_ROUTES.codes}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code");
	}

	return response.json();
}

async function fetchCodeValues(
	tenantId: string,
	codeId: number,
): Promise<CodeValueRow[]> {
	const response = await fetch(`${BFF_ROUTES.codes}/${codeId}/codevalues`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch code values");
	}

	return response.json();
}

async function createCodeValue(
	tenantId: string,
	codeId: number,
	payload: PostCodeValuesDataRequest,
) {
	const response = await fetch(`${BFF_ROUTES.codes}/${codeId}/codevalues`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to add code value");
	}

	return data;
}

async function updateCodeValue(
	tenantId: string,
	codeId: number,
	codeValueId: number,
	payload: PutCodeValuesDataRequest,
) {
	const response = await fetch(
		`${BFF_ROUTES.codes}/${codeId}/codevalues/${codeValueId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to update code value");
	}

	return data;
}

async function deleteCodeValue(
	tenantId: string,
	codeId: number,
	codeValueId: number,
) {
	const response = await fetch(
		`${BFF_ROUTES.codes}/${codeId}/codevalues/${codeValueId}`,
		{
			method: "DELETE",
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to deactivate code value");
	}

	return data;
}

async function fetchDatatables(
	tenantId: string,
	apptable: string,
): Promise<GetDataTablesResponse[]> {
	const response = await fetch(
		`${BFF_ROUTES.datatables}?apptable=${apptable}`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch datatables");
	}

	return response.json();
}

async function createDatatable(
	tenantId: string,
	payload: Record<string, unknown>,
) {
	const response = await fetch(BFF_ROUTES.datatables, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to create datatable");
	}

	return data;
}

async function fetchDatatableDefinition(
	tenantId: string,
	datatableName: string,
): Promise<GetDataTablesResponse> {
	const response = await fetch(`${BFF_ROUTES.datatables}/${datatableName}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch datatable definition");
	}

	return response.json();
}

async function fetchDatatableEntry(
	tenantId: string,
	datatableName: string,
	codeValueId: number,
): Promise<ParsedDatatableEntry> {
	const response = await fetch(
		`${BFF_ROUTES.datatables}/${datatableName}/${codeValueId}`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (response.status === 404) {
		return { record: null, exists: false };
	}

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to fetch metadata");
	}

	return { record: data as MetadataRecord, exists: true };
}

async function createDatatableEntry(
	tenantId: string,
	datatableName: string,
	codeValueId: number,
	payload: Record<string, unknown>,
) {
	const response = await fetch(
		`${BFF_ROUTES.datatables}/${datatableName}/${codeValueId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to save metadata");
	}

	return data;
}

async function updateDatatableEntry(
	tenantId: string,
	datatableName: string,
	codeValueId: number,
	payload: Record<string, unknown>,
) {
	const response = await fetch(
		`${BFF_ROUTES.datatables}/${datatableName}/${codeValueId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-tenant-id": tenantId,
			},
			body: JSON.stringify(payload),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || "Failed to update metadata");
	}

	return data;
}

function parseDatatableRecord(
	rawRecord: MetadataRecord,
	columnHeaders?: ResultsetColumnHeaderData[],
): MetadataRecord {
	if (!rawRecord) return null;

	if (Array.isArray(rawRecord)) {
		const firstRow = rawRecord[0];
		if (firstRow && typeof firstRow === "object" && !Array.isArray(firstRow)) {
			return firstRow as Record<string, unknown>;
		}
		return null;
	}

	const maybeRecord = rawRecord as Record<string, unknown>;

	if (Array.isArray(maybeRecord.data) && maybeRecord.data.length > 0) {
		const firstRow = maybeRecord.data[0] as unknown;
		if (Array.isArray(firstRow) && columnHeaders) {
			return columnHeaders.reduce<Record<string, unknown>>(
				(acc, column, index) => {
					if (column.columnName) {
						acc[column.columnName] = (firstRow as unknown[])[index];
					}
					return acc;
				},
				{},
			);
		}

		if (firstRow && typeof firstRow === "object" && !Array.isArray(firstRow)) {
			return firstRow as Record<string, unknown>;
		}
	}

	if (Array.isArray(maybeRecord.row) && columnHeaders) {
		return columnHeaders.reduce<Record<string, unknown>>(
			(acc, column, index) => {
				if (column.columnName) {
					acc[column.columnName] = (maybeRecord.row as unknown[])[index];
				}
				return acc;
			},
			{},
		);
	}

	return maybeRecord;
}

function buildMetadataPayload(
	values: Record<string, unknown>,
	columns: ResultsetColumnHeaderData[],
) {
	const payload: Record<string, unknown> = {};
	let hasDate = false;

	columns.forEach((column) => {
		const columnName = column.columnName;
		if (!columnName) return;
		if (column.isColumnPrimaryKey || columnName.toLowerCase() === "id") return;

		const value = values[columnName];
		if (value === "" || value === null || typeof value === "undefined") {
			return;
		}

		if (column.columnDisplayType === "DATE") {
			const dateValue = new Date(String(value));
			if (!Number.isNaN(dateValue.getTime())) {
				payload[columnName] = formatDateForFineract(dateValue);
				hasDate = true;
			}
			return;
		}

		if (
			column.columnDisplayType === "INTEGER" ||
			column.columnDisplayType === "FLOAT" ||
			column.columnDisplayType === "DECIMAL"
		) {
			const numericValue = Number(value);
			if (!Number.isNaN(numericValue)) {
				payload[columnName] = numericValue;
			}
			return;
		}

		if (column.columnDisplayType === "BOOLEAN") {
			payload[columnName] = Boolean(value);
			return;
		}

		payload[columnName] = value;
	});

	if (hasDate) {
		Object.assign(payload, getFineractDateConfig());
	}

	return payload;
}

function normalizeDateForInput(value?: unknown): string {
	if (!value || typeof value !== "string") return "";
	if (value.includes("-")) return value.slice(0, 10);
	const parsed = parseFineractDate(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toISOString().slice(0, 10);
}

export default function CodeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCodeValue, setSelectedCodeValue] =
		useState<CodeValueRow | null>(null);

	const [newValueName, setNewValueName] = useState("");
	const [newValueDescription, setNewValueDescription] = useState("");
	const [newValueActive, setNewValueActive] = useState(true);
	const [valueError, setValueError] = useState<string | null>(null);

	const [editingValueId, setEditingValueId] = useState<number | null>(null);
	const [editValueName, setEditValueName] = useState("");
	const [editValueDescription, setEditValueDescription] = useState("");
	const [editValueActive, setEditValueActive] = useState(true);

	const [datatableName, setDatatableName] = useState(DEFAULT_DATATABLE_NAME);
	const [metadataValues, setMetadataValues] = useState<Record<string, unknown>>(
		{},
	);
	const [metadataTouched, setMetadataTouched] = useState(false);
	const [datatableError, setDatatableError] = useState<string | null>(null);

	const {
		data: code,
		isLoading: isCodeLoading,
		error: codeError,
	} = useQuery({
		queryKey: ["code", tenantId, id],
		queryFn: () => fetchCode(tenantId, id),
	});

	const codeId = code?.id;

	const {
		data: codeValues = [],
		isLoading: isValuesLoading,
		error: codeValuesError,
	} = useQuery({
		queryKey: ["code-values", tenantId, codeId],
		queryFn: () => fetchCodeValues(tenantId, codeId!),
		enabled: Boolean(codeId),
	});

	const datatablesQuery = useQuery({
		queryKey: ["datatables", tenantId, CODE_VALUE_APPTABLE],
		queryFn: () => fetchDatatables(tenantId, CODE_VALUE_APPTABLE),
		enabled: Boolean(selectedCodeValue),
	});

	const datatableDefinitionQuery = useQuery({
		queryKey: ["datatable-definition", tenantId, datatableName],
		queryFn: () => fetchDatatableDefinition(tenantId, datatableName),
		enabled: Boolean(selectedCodeValue) && Boolean(datatableName),
	});

	const datatableEntryQuery = useQuery({
		queryKey: [
			"datatable-entry",
			tenantId,
			datatableName,
			selectedCodeValue?.id,
		],
		queryFn: () =>
			fetchDatatableEntry(tenantId, datatableName, selectedCodeValue!.id!),
		enabled: Boolean(selectedCodeValue?.id) && Boolean(datatableName),
	});

	const addValueMutation = useMutation({
		mutationFn: (payload: PostCodeValuesDataRequest) =>
			createCodeValue(tenantId, codeId!, payload),
		onMutate: async (payload) => {
			setValueError(null);
			await queryClient.cancelQueries({
				queryKey: ["code-values", tenantId, codeId],
			});
			const previousValues =
				queryClient.getQueryData<CodeValueRow[]>([
					"code-values",
					tenantId,
					codeId,
				]) || [];
			const optimisticValue: CodeValueRow = {
				id: Date.now() * -1,
				name: payload.name,
				description: payload.description,
				active: payload.isActive ?? true,
				isOptimistic: true,
			};
			queryClient.setQueryData(
				["code-values", tenantId, codeId],
				[optimisticValue, ...previousValues],
			);
			return { previousValues };
		},
		onError: (error, _payload, context) => {
			setValueError((error as Error).message);
			if (context?.previousValues) {
				queryClient.setQueryData(
					["code-values", tenantId, codeId],
					context.previousValues,
				);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ["code-values", tenantId, codeId],
			});
		},
	});

	const updateValueMutation = useMutation({
		mutationFn: ({
			codeValueId,
			payload,
		}: {
			codeValueId: number;
			payload: PutCodeValuesDataRequest;
		}) => updateCodeValue(tenantId, codeId!, codeValueId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["code-values", tenantId, codeId],
			});
			setEditingValueId(null);
		},
		onError: (error) => {
			setValueError((error as Error).message);
		},
	});

	const deleteValueMutation = useMutation({
		mutationFn: (codeValueId: number) =>
			deleteCodeValue(tenantId, codeId!, codeValueId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["code-values", tenantId, codeId],
			});
		},
		onError: (error) => {
			setValueError((error as Error).message);
		},
	});

	const createDatatableMutation = useMutation({
		mutationFn: (payload: Record<string, unknown>) =>
			createDatatable(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["datatables", tenantId, CODE_VALUE_APPTABLE],
			});
			setDatatableError(null);
		},
		onError: (error) => {
			setDatatableError((error as Error).message);
		},
	});

	const saveMetadataMutation = useMutation({
		mutationFn: ({
			payload,
			exists,
		}: {
			payload: Record<string, unknown>;
			exists: boolean;
		}) => {
			if (!selectedCodeValue?.id) {
				throw new Error("Missing code value selection");
			}
			return exists
				? updateDatatableEntry(
						tenantId,
						datatableName,
						selectedCodeValue.id,
						payload,
					)
				: createDatatableEntry(
						tenantId,
						datatableName,
						selectedCodeValue.id,
						payload,
					);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [
					"datatable-entry",
					tenantId,
					datatableName,
					selectedCodeValue?.id,
				],
			});
			setMetadataTouched(false);
		},
		onError: (error) => {
			setDatatableError((error as Error).message);
		},
	});

	useEffect(() => {
		if (!selectedCodeValue) {
			setDatatableName(DEFAULT_DATATABLE_NAME);
			setMetadataValues({});
			setMetadataTouched(false);
			setDatatableError(null);
		}
	}, [selectedCodeValue]);

	// Ensure datatableName is valid - compute available options
	const availableDatatables = useMemo(() => {
		if (!datatablesQuery.data) return [];
		return datatablesQuery.data
			.map((table) => table.registeredTableName)
			.filter((name): name is string => Boolean(name));
	}, [datatablesQuery.data]);

	// Validate and correct datatableName if needed
	const validDatatableName = useMemo(() => {
		if (availableDatatables.length === 0) return datatableName;
		if (availableDatatables.includes(datatableName)) return datatableName;
		return availableDatatables[0];
	}, [availableDatatables, datatableName]);

	// Update state if needed (do this in useEffect since we're changing state based on derived value)
	useEffect(() => {
		if (validDatatableName !== datatableName) {
			setDatatableName(validDatatableName);
		}
	}, [validDatatableName, datatableName]);

	const columnHeaders = useMemo(
		() => datatableDefinitionQuery.data?.columnHeaderData || [],
		[datatableDefinitionQuery.data],
	);
	const parsedEntry = useMemo(() => {
		if (!datatableEntryQuery.data) {
			return { record: null, exists: false };
		}
		return {
			record: parseDatatableRecord(
				datatableEntryQuery.data.record,
				columnHeaders,
			),
			exists: datatableEntryQuery.data.exists,
		};
	}, [datatableEntryQuery.data, columnHeaders]);

	useEffect(() => {
		if (!columnHeaders.length || metadataTouched) return;
		const nextValues: Record<string, unknown> = {};
		columnHeaders.forEach((column) => {
			const columnName = column.columnName;
			if (!columnName) return;
			if (column.isColumnPrimaryKey || columnName.toLowerCase() === "id")
				return;
			const recordValue = parsedEntry.record
				? parsedEntry.record[columnName]
				: "";
			if (column.columnDisplayType === "BOOLEAN") {
				nextValues[columnName] = Boolean(recordValue);
			} else if (column.columnDisplayType === "DATE") {
				nextValues[columnName] = normalizeDateForInput(recordValue);
			} else {
				nextValues[columnName] = recordValue ?? "";
			}
		});
		setMetadataValues(nextValues);
	}, [columnHeaders, parsedEntry.record, metadataTouched]);

	const filteredValues = useMemo(() => {
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) return codeValues;
		return codeValues.filter((value) =>
			(value.name || "").toLowerCase().includes(normalized),
		);
	}, [codeValues, searchTerm]);

	const handleAddValue = () => {
		if (!newValueName.trim() || !codeId) return;
		addValueMutation.mutate({
			name: newValueName.trim(),
			description: newValueDescription.trim() || undefined,
			isActive: newValueActive,
		});
		setNewValueName("");
		setNewValueDescription("");
		setNewValueActive(true);
	};

	const handleEditValue = (value: CodeValueRow) => {
		setEditingValueId(value.id || null);
		setEditValueName(value.name || "");
		setEditValueDescription(value.description || "");
		setEditValueActive(value.active ?? true);
	};

	const handleSaveEdit = () => {
		if (!editingValueId) return;
		updateValueMutation.mutate({
			codeValueId: editingValueId,
			payload: {
				name: editValueName.trim(),
				description: editValueDescription.trim() || undefined,
				isActive: editValueActive,
			},
		});
	};

	const handleDeleteValue = (value: CodeValueRow) => {
		if (!value.id) return;
		const confirmed = window.confirm("Deactivate this code value?");
		if (!confirmed) return;
		deleteValueMutation.mutate(value.id);
	};

	const handleMetadataSave = () => {
		if (!columnHeaders.length) return;
		const payload = buildMetadataPayload(metadataValues, columnHeaders);
		if (Object.keys(payload).length === 0) {
			setDatatableError("Enter at least one metadata value to save.");
			return;
		}
		saveMetadataMutation.mutate({ payload, exists: parsedEntry.exists });
	};

	const codeValueColumns = [
		{
			header: "Value Name",
			cell: (value: CodeValueRow) => value.name || "Unnamed value",
		},
		{
			header: "Description",
			cell: (value: CodeValueRow) => value.description || "—",
		},
		{
			header: "Status",
			cell: (value: CodeValueRow) => (
				<div className="flex gap-2">
					{value.active ? (
						<Badge>Active</Badge>
					) : (
						<Badge variant="outline">Inactive</Badge>
					)}
					{value.systemDefined && <Badge variant="secondary">System</Badge>}
				</div>
			),
		},
		{
			header: "Actions",
			cell: (value: CodeValueRow) => (
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setSelectedCodeValue(value)}
					>
						Metadata
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleEditValue(value)}
					>
						Edit
					</Button>
					{!value.systemDefined && (
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => handleDeleteValue(value)}
							disabled={deleteValueMutation.isPending}
						>
							Deactivate
						</Button>
					)}
				</div>
			),
		},
	];

	const datatableOptions =
		datatablesQuery.data
			?.map((table) => table.registeredTableName)
			.filter((name): name is string => Boolean(name)) || [];

	const datatableExists = datatableOptions.includes(datatableName);

	if (isCodeLoading) {
		return (
			<PageShell title="Code Details">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-40" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								{Array.from({ length: 2 }).map((_, index) => (
									<div
										key={`code-detail-skeleton-${index}`}
										className="space-y-2"
									>
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-6 w-36" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-10 w-full" />
							{Array.from({ length: 6 }).map((_, index) => (
								<Skeleton
									key={`code-values-table-skeleton-${index}`}
									className="h-12 w-full"
								/>
							))}
						</CardContent>
					</Card>
				</div>
			</PageShell>
		);
	}

	if (codeError || !code) {
		return (
			<PageShell title="Code Details">
				<div className="py-6 text-center text-destructive">
					Failed to load code details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell
			title={`Code: ${code.name}`}
			subtitle="View code details and manage values"
			actions={
				<Button
					variant="outline"
					onClick={() => router.push("/config/system/codes")}
				>
					← Back to Codes
				</Button>
			}
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Code Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Name</label>
								<p className="text-lg font-semibold">{code.name}</p>
							</div>
							<div>
								<label className="text-sm font-medium">System Defined</label>
								<p>
									{code.systemDefined ? (
										<Badge variant="secondary">Yes</Badge>
									) : (
										<Badge variant="outline">No</Badge>
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Code Values</CardTitle>
								<CardDescription>
									Manage values for this code category
								</CardDescription>
							</div>
							<Button onClick={() => setEditingValueId(-1)}>
								Add New Value
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="value-search">Search values</Label>
							<Input
								id="value-search"
								placeholder="Search by value name"
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
							/>
						</div>

						{isValuesLoading && (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								{Array.from({ length: 6 }).map((_, index) => (
									<Skeleton
										key={`code-values-skeleton-${index}`}
										className="h-12 w-full"
									/>
								))}
							</div>
						)}
						{codeValuesError && (
							<div className="py-6 text-center text-destructive">
								Failed to load code values.
							</div>
						)}
						{!isValuesLoading && !codeValuesError && (
							<DataTable
								data={filteredValues}
								columns={codeValueColumns}
								getRowId={(value) =>
									value.id?.toString() || value.name || "value-row"
								}
								emptyMessage="No code values found."
								enableActions={false}
							/>
						)}
					</CardContent>
				</Card>

				{/* Add/Edit Code Value Drawer */}
				<Sheet
					open={editingValueId !== null}
					onOpenChange={(open) => {
						if (!open) {
							setEditingValueId(null);
							setEditValueName("");
							setEditValueDescription("");
							setEditValueActive(true);
							setNewValueName("");
							setNewValueDescription("");
							setNewValueActive(true);
							setValueError(null);
						}
					}}
				>
					<SheetContent
						side="right"
						className="w-full sm:max-w-lg overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingValueId === -1 ? "Add Code Value" : "Edit Code Value"}
							</SheetTitle>
							<SheetDescription>
								{editingValueId === -1
									? "Add a new value to this code category."
									: "Edit the selected code value."}
							</SheetDescription>
						</SheetHeader>
						<div className="flex flex-col gap-4 mt-4">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="value-name">Value name *</Label>
									<Input
										id="value-name"
										placeholder="Enter value name"
										value={editingValueId === -1 ? newValueName : editValueName}
										onChange={(event) => {
											if (editingValueId === -1) {
												setNewValueName(event.target.value);
											} else {
												setEditValueName(event.target.value);
											}
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="value-description">Description</Label>
									<Input
										id="value-description"
										placeholder="Optional description"
										value={
											editingValueId === -1
												? newValueDescription
												: editValueDescription
										}
										onChange={(event) => {
											if (editingValueId === -1) {
												setNewValueDescription(event.target.value);
											} else {
												setEditValueDescription(event.target.value);
											}
										}}
									/>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="value-active"
										checked={
											editingValueId === -1 ? newValueActive : editValueActive
										}
										onCheckedChange={(checked) => {
											if (editingValueId === -1) {
												setNewValueActive(checked as boolean);
											} else {
												setEditValueActive(checked as boolean);
											}
										}}
									/>
									<Label htmlFor="value-active" className="cursor-pointer">
										Active
									</Label>
								</div>
								{valueError && (
									<div className="text-sm text-destructive">{valueError}</div>
								)}
							</div>
							<div className="flex items-center justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditingValueId(null)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={() => {
										if (editingValueId === -1) {
											handleAddValue();
										} else {
											handleSaveEdit();
										}
									}}
									disabled={
										editingValueId === -1
											? !newValueName.trim() || addValueMutation.isPending
											: updateValueMutation.isPending
									}
								>
									{editingValueId === -1
										? addValueMutation.isPending
											? "Adding..."
											: "Add Value"
										: updateValueMutation.isPending
											? "Saving..."
											: "Save Changes"}
								</Button>
							</div>
						</div>
					</SheetContent>
				</Sheet>

				{/* Metadata Drawer */}
				<Sheet
					open={Boolean(selectedCodeValue)}
					onOpenChange={(open) => {
						if (!open) setSelectedCodeValue(null);
					}}
				>
					<SheetContent
						side="right"
						className="w-full sm:max-w-lg overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Metadata for {selectedCodeValue?.name}</SheetTitle>
							<SheetDescription>
								Attach custom metadata fields to this code value.
							</SheetDescription>
						</SheetHeader>
						<div className="flex flex-col gap-4 mt-4">
							{datatablesQuery.isLoading && (
								<div className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-10 w-full" />
								</div>
							)}

							{datatableError && (
								<Alert variant="destructive">
									<AlertTitle>Metadata error</AlertTitle>
									<AlertDescription>{datatableError}</AlertDescription>
								</Alert>
							)}

							{!datatableExists && (
								<div className="space-y-3">
									<Alert variant="info">
										<AlertTitle>No datatable found</AlertTitle>
										<AlertDescription>
											Create a datatable linked to code values so you can
											capture extended metadata.
										</AlertDescription>
									</Alert>
									<div className="space-y-2">
										<Label htmlFor="datatable-name">Datatable name</Label>
										<Input
											id="datatable-name"
											value={datatableName}
											onChange={(event) => setDatatableName(event.target.value)}
										/>
									</div>
									<div className="rounded-sm border border-border/60 p-3 text-xs text-muted-foreground">
										Default columns: Kenya_Local_Name (String), Risk_Weighting
										(Decimal)
									</div>
									<Button
										type="button"
										onClick={() =>
											createDatatableMutation.mutate({
												apptableName: CODE_VALUE_APPTABLE,
												datatableName,
												columns: DEFAULT_DATATABLE_COLUMNS,
												multiRow: false,
											})
										}
										disabled={
											createDatatableMutation.isPending || !datatableName.trim()
										}
									>
										{createDatatableMutation.isPending
											? "Creating..."
											: "Create Datatable"}
									</Button>
								</div>
							)}

							{datatableExists && (
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="datatable-select">Datatable</Label>
										<Select
											value={datatableName}
											onValueChange={setDatatableName}
										>
											<SelectTrigger id="datatable-select">
												<SelectValue placeholder="Select datatable" />
											</SelectTrigger>
											<SelectContent>
												{datatableOptions.map((option) => (
													<SelectItem key={option} value={option}>
														{option}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{datatableDefinitionQuery.isLoading && (
										<div className="space-y-2">
											<Skeleton className="h-4 w-36" />
											<Skeleton className="h-10 w-full" />
											<Skeleton className="h-10 w-full" />
										</div>
									)}

									{datatableEntryQuery.isLoading && (
										<div className="space-y-2">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-10 w-full" />
										</div>
									)}

									{columnHeaders.length > 0 ? (
										<div className="space-y-3">
											{columnHeaders
												.filter(
													(column) =>
														!column.isColumnPrimaryKey &&
														column.columnName &&
														column.columnName.toLowerCase() !== "id",
												)
												.map((column, index) => {
													const columnName =
														column.columnName || `column-${index}`;
													const displayType =
														column.columnDisplayType || "STRING";
													const inputId = `metadata-${columnName}`;
													const value = metadataValues[columnName] ?? "";

													if (displayType === "BOOLEAN") {
														return (
															<div
																key={columnName}
																className="flex items-center gap-2"
															>
																<Checkbox
																	id={inputId}
																	checked={Boolean(value)}
																	onCheckedChange={() => {
																		setMetadataValues((prev) => ({
																			...prev,
																			[columnName]: !Boolean(value),
																		}));
																		setMetadataTouched(true);
																	}}
																/>
																<Label
																	htmlFor={inputId}
																	className="cursor-pointer"
																>
																	{columnName}
																</Label>
															</div>
														);
													}

													if (displayType === "DATE") {
														return (
															<div key={columnName} className="space-y-2">
																<Label htmlFor={inputId}>{columnName}</Label>
																<Input
																	id={inputId}
																	type="date"
																	value={String(value)}
																	onChange={(event) => {
																		setMetadataValues((prev) => ({
																			...prev,
																			[columnName]: event.target.value,
																		}));
																		setMetadataTouched(true);
																	}}
																/>
															</div>
														);
													}

													if (
														displayType === "INTEGER" ||
														displayType === "FLOAT" ||
														displayType === "DECIMAL"
													) {
														return (
															<div key={columnName} className="space-y-2">
																<Label htmlFor={inputId}>{columnName}</Label>
																<Input
																	id={inputId}
																	type="number"
																	value={String(value)}
																	onChange={(event) => {
																		setMetadataValues((prev) => ({
																			...prev,
																			[columnName]: event.target.value,
																		}));
																		setMetadataTouched(true);
																	}}
																/>
															</div>
														);
													}

													return (
														<div key={columnName} className="space-y-2">
															<Label htmlFor={inputId}>{columnName}</Label>
															<Input
																id={inputId}
																value={String(value)}
																onChange={(event) => {
																	setMetadataValues((prev) => ({
																		...prev,
																		[columnName]: event.target.value,
																	}));
																	setMetadataTouched(true);
																}}
															/>
														</div>
													);
												})}
										</div>
									) : (
										<div className="rounded-sm border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
											No editable metadata fields found.
										</div>
									)}

									<div className="flex items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => setSelectedCodeValue(null)}
										>
											Close
										</Button>
										<Button
											type="button"
											onClick={handleMetadataSave}
											disabled={
												saveMetadataMutation.isPending ||
												columnHeaders.length === 0
											}
										>
											{saveMetadataMutation.isPending
												? "Saving..."
												: "Save Metadata"}
										</Button>
									</div>
								</div>
							)}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</PageShell>
	);
}
