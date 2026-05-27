"use client";

import { format, parse, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { FINERACT_DATE_FORMAT } from "@/lib/date-utils";
import type {
	GetTaxesComponentsResponse,
	TaxComponentData,
	TaxComponentHistoryData,
	TaxGroupData,
} from "@/lib/fineract/generated/types.gen";
import type { TaxComponentFormData, TaxGroupFormData } from "@/lib/schemas/tax";

type OptionLabelSource = {
	code?: string;
	description?: string;
	value?: string;
};

type AccountLabelSource = {
	glCode?: string;
	id?: number;
	name?: string;
};

export const EMPTY_COMPONENT_VALUES: TaxComponentFormData = {
	name: "",
	percentage: 0,
	startDate: undefined,
	debitAccountType: undefined,
	debitAccountId: undefined,
	creditAccountType: undefined,
	creditAccountId: undefined,
};

export const EMPTY_GROUP_VALUES: TaxGroupFormData = {
	name: "",
	taxComponents: [{ taxComponentId: undefined }],
};

export function DataTableSkeleton({ columns = 5 }: { columns?: number }) {
	return (
		<div className="rounded-sm border border-border/60">
			<table className="w-full text-left text-sm">
				<thead className="border-b border-border/60 bg-muted/40">
					<tr>
						{Array.from({ length: columns }).map((_, index) => (
							<th key={`tax-skeleton-header-${index}`} className="px-3 py-2">
								<Skeleton className="h-4 w-24" />
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border/60">
					{Array.from({ length: 6 }).map((_, rowIndex) => (
						<tr key={`tax-skeleton-row-${rowIndex}`}>
							{Array.from({ length: columns }).map((_, colIndex) => (
								<td
									key={`tax-skeleton-cell-${rowIndex}-${colIndex}`}
									className="px-3 py-2"
								>
									<Skeleton className="h-4 w-28" />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function formatPercentage(value?: number) {
	return typeof value === "number" ? `${value}%` : "N/A";
}

export function formatDateValue(value?: string | null) {
	return value || "N/A";
}

export function toInputDate(value?: string | null) {
	if (!value) {
		return undefined;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	for (const parser of [
		() => parse(value, FINERACT_DATE_FORMAT, new Date()),
		() => parseISO(value),
	]) {
		try {
			const parsed = parser();
			if (!Number.isNaN(parsed.getTime())) {
				return format(parsed, "yyyy-MM-dd");
			}
		} catch {
			// Try the next supported input shape.
		}
	}

	return undefined;
}

export function readOptionLabel(option?: OptionLabelSource) {
	return option?.value || option?.description || option?.code || "N/A";
}

export function readAccountLabel(account?: AccountLabelSource) {
	if (!account) {
		return "N/A";
	}

	return [account.name, account.glCode].filter(Boolean).join(" - ") || "N/A";
}

export function getGlAccountOptions(
	template: TaxComponentData | undefined,
	accountTypeId?: number,
): AccountLabelSource[] {
	if (!template?.glAccountOptions || accountTypeId === undefined) {
		return [];
	}

	const accountOptions = template.glAccountOptions;
	const type = template.glAccountTypeOptions?.find(
		(option) => option.id === accountTypeId,
	) as OptionLabelSource | undefined;

	return (
		accountOptions[String(accountTypeId)] ||
		(type?.value ? accountOptions[type.value] : undefined) ||
		(type?.code ? accountOptions[type.code] : undefined) ||
		(type?.description ? accountOptions[type.description] : undefined) ||
		[]
	);
}

export function componentToFormValues(
	component?: GetTaxesComponentsResponse | null,
): TaxComponentFormData {
	return {
		name: component?.name || "",
		percentage: component?.percentage ?? 0,
		startDate: toInputDate(component?.startDate),
		debitAccountType: undefined,
		debitAccountId: undefined,
		creditAccountType: component?.creditAccountType?.id,
		creditAccountId: component?.creditAccount?.id,
	};
}

export function groupToFormValues(
	group?: TaxGroupData | null,
): TaxGroupFormData {
	const components =
		group?.taxAssociations?.map((association) => ({
			id: association.id,
			taxComponentId: association.taxComponent?.id,
			startDate: toInputDate(association.startDate),
			endDate: toInputDate(association.endDate),
		})) || [];

	return {
		name: group?.name || "",
		taxComponents:
			components.length > 0 ? components : [{ taxComponentId: undefined }],
	};
}

export function getComponentName(
	components: Array<GetTaxesComponentsResponse | TaxComponentData>,
	componentId?: number,
) {
	return (
		components.find((component) => component.id === componentId)?.name ||
		(componentId ? `Component ${componentId}` : "Select component")
	);
}

export function getTaxComponentHistories(
	component?: GetTaxesComponentsResponse | TaxComponentData,
): TaxComponentHistoryData[] {
	if (!component) {
		return [];
	}

	const typedComponent = component as TaxComponentData & {
		taxComponentsHistories?: TaxComponentHistoryData[];
	};

	return (
		typedComponent.taxComponentHistories ||
		typedComponent.taxComponentsHistories ||
		[]
	);
}
