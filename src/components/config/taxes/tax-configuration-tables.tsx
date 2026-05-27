"use client";

import { Pencil, Plus } from "lucide-react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	GetTaxesComponentsResponse,
	GetTaxesGroupResponse,
} from "@/lib/fineract/generated/types.gen";
import {
	DataTableSkeleton,
	formatDateValue,
	formatPercentage,
	readAccountLabel,
	readOptionLabel,
} from "./tax-ui-utils";

interface TaxConfigurationTablesProps {
	componentSearch: string;
	componentsError: unknown;
	componentsLoading: boolean;
	filteredComponents: GetTaxesComponentsResponse[];
	filteredGroups: GetTaxesGroupResponse[];
	groupSearch: string;
	groupsError: unknown;
	groupsLoading: boolean;
	onCreateComponent: () => void;
	onCreateGroup: () => void;
	onEditComponent: (component: GetTaxesComponentsResponse) => void;
	onEditGroup: (group: GetTaxesGroupResponse) => void;
	onSetComponentSearch: (value: string) => void;
	onSetGroupSearch: (value: string) => void;
}

export function TaxConfigurationTables({
	componentSearch,
	componentsError,
	componentsLoading,
	filteredComponents,
	filteredGroups,
	groupSearch,
	groupsError,
	groupsLoading,
	onCreateComponent,
	onCreateGroup,
	onEditComponent,
	onEditGroup,
	onSetComponentSearch,
	onSetGroupSearch,
}: TaxConfigurationTablesProps) {
	const componentColumns: DataTableColumn<GetTaxesComponentsResponse>[] = [
		{
			header: "Name",
			cell: (component) => (
				<div>
					<div className="font-medium">{component.name || "N/A"}</div>
					<div className="text-xs text-muted-foreground">
						Starts {formatDateValue(component.startDate)}
					</div>
				</div>
			),
		},
		{
			header: "Rate",
			cell: (component) => (
				<Badge variant="warning">
					{formatPercentage(component.percentage)}
				</Badge>
			),
		},
		{
			header: "Credit Account",
			cell: (component) => (
				<span>{readAccountLabel(component.creditAccount)}</span>
			),
		},
		{
			header: "Credit Type",
			cell: (component) => (
				<span>{readOptionLabel(component.creditAccountType)}</span>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (component) => (
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={component.id === undefined}
					onClick={(event) => {
						event.stopPropagation();
						onEditComponent(component);
					}}
				>
					<Pencil className="mr-1.5 h-3.5 w-3.5" />
					Edit
				</Button>
			),
		},
	];

	const groupColumns: DataTableColumn<GetTaxesGroupResponse>[] = [
		{
			header: "Name",
			cell: (group) => (
				<span className="font-medium">{group.name || "N/A"}</span>
			),
		},
		{
			header: "Components",
			cell: (group) => (
				<span>
					{group.taxAssociations?.length || 0} component
					{group.taxAssociations?.length === 1 ? "" : "s"}
				</span>
			),
		},
		{
			header: "Current Associations",
			cell: (group) => (
				<div className="flex flex-wrap gap-1">
					{group.taxAssociations?.length ? (
						group.taxAssociations.slice(0, 3).map((association) => (
							<Badge key={association.id} variant="outline">
								{association.taxComponent?.name || "Component"}
							</Badge>
						))
					) : (
						<span>N/A</span>
					)}
				</div>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (group) => (
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={group.id === undefined}
					onClick={(event) => {
						event.stopPropagation();
						onEditGroup(group);
					}}
				>
					<Pencil className="mr-1.5 h-3.5 w-3.5" />
					Edit
				</Button>
			),
		},
	];

	return (
		<Tabs defaultValue="components" className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<TabsList>
					<TabsTrigger value="components">Tax Components</TabsTrigger>
					<TabsTrigger value="groups">Tax Groups</TabsTrigger>
				</TabsList>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={onCreateGroup}>
						<Plus className="mr-2 h-4 w-4" />
						Create Tax Group
					</Button>
					<Button type="button" onClick={onCreateComponent}>
						<Plus className="mr-2 h-4 w-4" />
						Create Tax Component
					</Button>
				</div>
			</div>

			<TabsContent value="components">
				<Card>
					<CardHeader>
						<CardTitle>Tax Components</CardTitle>
						<CardDescription>
							Define tax rates and optional GL accounts used when tax is
							calculated.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="max-w-lg space-y-2">
							<Label htmlFor="tax-component-search">
								Search Tax Components
							</Label>
							<Input
								id="tax-component-search"
								placeholder="Search by name or rate"
								value={componentSearch}
								onChange={(event) => onSetComponentSearch(event.target.value)}
							/>
						</div>

						{componentsLoading ? (
							<DataTableSkeleton />
						) : componentsError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load tax components</AlertTitle>
								<AlertDescription>
									Tax components could not be loaded right now. Refresh the page
									and try again.
								</AlertDescription>
							</Alert>
						) : (
							<DataTable
								data={filteredComponents}
								columns={componentColumns}
								getRowId={(component) =>
									component.id || `tax-component-${component.name}`
								}
								pageSize={8}
								onRowClick={onEditComponent}
								emptyMessage="No tax components found."
							/>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="groups">
				<Card>
					<CardHeader>
						<CardTitle>Tax Groups</CardTitle>
						<CardDescription>
							Group tax components into effective tax rules referenced by
							products and charges.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="max-w-lg space-y-2">
							<Label htmlFor="tax-group-search">Search Tax Groups</Label>
							<Input
								id="tax-group-search"
								placeholder="Search by name"
								value={groupSearch}
								onChange={(event) => onSetGroupSearch(event.target.value)}
							/>
						</div>

						{groupsLoading ? (
							<DataTableSkeleton columns={4} />
						) : groupsError ? (
							<Alert variant="destructive">
								<AlertTitle>Unable to load tax groups</AlertTitle>
								<AlertDescription>
									Tax groups could not be loaded right now. Refresh the page and
									try again.
								</AlertDescription>
							</Alert>
						) : (
							<DataTable
								data={filteredGroups}
								columns={groupColumns}
								getRowId={(group) => group.id || `tax-group-${group.name}`}
								pageSize={8}
								onRowClick={onEditGroup}
								emptyMessage="No tax groups found."
							/>
						)}
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
