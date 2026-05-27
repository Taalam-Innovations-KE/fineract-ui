"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetTaxesComponentsResponse,
	GetTaxesGroupResponse,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import {
	buildTaxComponentCreateRequest,
	buildTaxComponentUpdateRequest,
	buildTaxGroupCreateRequest,
	buildTaxGroupUpdateRequest,
	taxComponentsApi,
	taxGroupsApi,
} from "@/lib/fineract/taxes";
import {
	type TaxComponentFormData,
	type TaxGroupFormData,
	taxComponentSchema,
	taxGroupSchema,
} from "@/lib/schemas/tax";
import { useTenantStore } from "@/store/tenant";
import { TaxComponentSheet } from "./tax-component-sheet";
import { TaxConfigurationTables } from "./tax-configuration-tables";
import { TaxGroupSheet } from "./tax-group-sheet";
import {
	componentToFormValues,
	EMPTY_COMPONENT_VALUES,
	EMPTY_GROUP_VALUES,
	groupToFormValues,
	toInputDate,
} from "./tax-ui-utils";

export function TaxConfigurationClient() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [componentSearch, setComponentSearch] = useState("");
	const [groupSearch, setGroupSearch] = useState("");
	const [isComponentSheetOpen, setIsComponentSheetOpen] = useState(false);
	const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
	const [editingComponent, setEditingComponent] =
		useState<GetTaxesComponentsResponse | null>(null);
	const [editingGroup, setEditingGroup] =
		useState<GetTaxesGroupResponse | null>(null);
	const [componentSubmitError, setComponentSubmitError] =
		useState<SubmitActionError | null>(null);
	const [groupSubmitError, setGroupSubmitError] =
		useState<SubmitActionError | null>(null);

	const componentForm = useForm<TaxComponentFormData>({
		resolver: zodResolver(taxComponentSchema) as Resolver<TaxComponentFormData>,
		defaultValues: EMPTY_COMPONENT_VALUES,
	});

	const groupForm = useForm<TaxGroupFormData>({
		resolver: zodResolver(taxGroupSchema) as Resolver<TaxGroupFormData>,
		defaultValues: EMPTY_GROUP_VALUES,
	});

	const groupComponentsFieldArray = useFieldArray({
		control: groupForm.control,
		name: "taxComponents",
		keyName: "fieldId",
	});

	const componentsQuery = useQuery({
		queryKey: ["tax-components", tenantId],
		queryFn: () => taxComponentsApi.list(tenantId),
		enabled: Boolean(tenantId),
	});

	const componentTemplateQuery = useQuery({
		queryKey: ["tax-component-template", tenantId],
		queryFn: () => taxComponentsApi.getTemplate(tenantId),
		enabled: Boolean(tenantId),
	});

	const groupsQuery = useQuery({
		queryKey: ["tax-groups", tenantId],
		queryFn: () => taxGroupsApi.list(tenantId),
		enabled: Boolean(tenantId),
	});

	const groupTemplateQuery = useQuery({
		queryKey: ["tax-group-template", tenantId],
		queryFn: () => taxGroupsApi.getTemplate(tenantId),
		enabled: Boolean(tenantId),
	});

	const componentDetailQuery = useQuery({
		queryKey: ["tax-component", tenantId, editingComponent?.id],
		queryFn: () => taxComponentsApi.get(tenantId, Number(editingComponent?.id)),
		enabled:
			Boolean(tenantId) &&
			isComponentSheetOpen &&
			editingComponent?.id !== undefined,
	});

	const groupDetailQuery = useQuery({
		queryKey: ["tax-group", tenantId, editingGroup?.id],
		queryFn: () =>
			taxGroupsApi.getWithTemplate(tenantId, Number(editingGroup?.id)),
		enabled:
			Boolean(tenantId) && isGroupSheetOpen && editingGroup?.id !== undefined,
	});

	const taxComponents = componentsQuery.data || [];
	const taxGroups = groupsQuery.data || [];

	const taxComponentOptions = useMemo(
		() =>
			groupDetailQuery.data?.taxComponents ||
			groupTemplateQuery.data?.taxComponents ||
			taxComponents,
		[groupDetailQuery.data, groupTemplateQuery.data, taxComponents],
	);

	const filteredComponents = useMemo(() => {
		const normalizedSearch = componentSearch.trim().toLowerCase();
		if (!normalizedSearch) {
			return taxComponents;
		}

		return taxComponents.filter((component) =>
			[component.name, String(component.percentage ?? "")]
				.filter(Boolean)
				.some((value) =>
					String(value).toLowerCase().includes(normalizedSearch),
				),
		);
	}, [componentSearch, taxComponents]);

	const filteredGroups = useMemo(() => {
		const normalizedSearch = groupSearch.trim().toLowerCase();
		if (!normalizedSearch) {
			return taxGroups;
		}

		return taxGroups.filter((group) =>
			[group.name]
				.filter(Boolean)
				.some((value) =>
					String(value).toLowerCase().includes(normalizedSearch),
				),
		);
	}, [groupSearch, taxGroups]);

	useEffect(() => {
		if (!isComponentSheetOpen || !editingComponent) {
			return;
		}

		componentForm.reset(
			componentToFormValues(componentDetailQuery.data || editingComponent),
		);
	}, [
		componentDetailQuery.data,
		componentForm,
		editingComponent,
		isComponentSheetOpen,
	]);

	useEffect(() => {
		if (!isGroupSheetOpen || !editingGroup || !groupDetailQuery.data) {
			return;
		}

		groupForm.reset(groupToFormValues(groupDetailQuery.data));
	}, [editingGroup, groupDetailQuery.data, groupForm, isGroupSheetOpen]);

	const createComponentMutation = useMutation({
		mutationFn: (values: TaxComponentFormData) =>
			taxComponentsApi.create(tenantId, buildTaxComponentCreateRequest(values)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tax-components", tenantId] });
			queryClient.invalidateQueries({ queryKey: ["tax-groups", tenantId] });
			setComponentSubmitError(null);
			setIsComponentSheetOpen(false);
			toast.success("Tax component created successfully");
		},
		onError: (error) => {
			setComponentSubmitError(
				toSubmitActionError(error, {
					action: "createTaxComponent",
					endpoint: BFF_ROUTES.taxComponents,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const updateComponentMutation = useMutation({
		mutationFn: (values: TaxComponentFormData) =>
			taxComponentsApi.update(
				tenantId,
				Number(editingComponent?.id),
				buildTaxComponentUpdateRequest(values),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tax-components", tenantId] });
			queryClient.invalidateQueries({
				queryKey: ["tax-component", tenantId, editingComponent?.id],
			});
			queryClient.invalidateQueries({ queryKey: ["tax-groups", tenantId] });
			setComponentSubmitError(null);
			setIsComponentSheetOpen(false);
			toast.success("Tax component updated successfully");
		},
		onError: (error) => {
			setComponentSubmitError(
				toSubmitActionError(error, {
					action: "updateTaxComponent",
					endpoint: BFF_ROUTES.taxComponentById(editingComponent?.id || 0),
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const createGroupMutation = useMutation({
		mutationFn: (values: TaxGroupFormData) =>
			taxGroupsApi.create(tenantId, buildTaxGroupCreateRequest(values)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tax-groups", tenantId] });
			setGroupSubmitError(null);
			setIsGroupSheetOpen(false);
			toast.success("Tax group created successfully");
		},
		onError: (error) => {
			setGroupSubmitError(
				toSubmitActionError(error, {
					action: "createTaxGroup",
					endpoint: BFF_ROUTES.taxGroups,
					method: "POST",
					tenantId,
				}),
			);
		},
	});

	const updateGroupMutation = useMutation({
		mutationFn: (values: TaxGroupFormData) =>
			taxGroupsApi.update(
				tenantId,
				Number(editingGroup?.id),
				buildTaxGroupUpdateRequest(values),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tax-groups", tenantId] });
			queryClient.invalidateQueries({
				queryKey: ["tax-group", tenantId, editingGroup?.id],
			});
			setGroupSubmitError(null);
			setIsGroupSheetOpen(false);
			toast.success("Tax group updated successfully");
		},
		onError: (error) => {
			setGroupSubmitError(
				toSubmitActionError(error, {
					action: "updateTaxGroup",
					endpoint: BFF_ROUTES.taxGroupById(editingGroup?.id || 0),
					method: "PUT",
					tenantId,
				}),
			);
		},
	});

	const isComponentSubmitting =
		createComponentMutation.isPending || updateComponentMutation.isPending;
	const isGroupSubmitting =
		createGroupMutation.isPending || updateGroupMutation.isPending;

	const openCreateComponentSheet = () => {
		setEditingComponent(null);
		setComponentSubmitError(null);
		componentForm.reset(EMPTY_COMPONENT_VALUES);
		setIsComponentSheetOpen(true);
	};

	const openEditComponentSheet = (component: GetTaxesComponentsResponse) => {
		if (component.id === undefined) {
			return;
		}

		setEditingComponent(component);
		setComponentSubmitError(null);
		componentForm.reset(componentToFormValues(component));
		setIsComponentSheetOpen(true);
	};

	const openCreateGroupSheet = () => {
		setEditingGroup(null);
		setGroupSubmitError(null);
		groupForm.reset(EMPTY_GROUP_VALUES);
		setIsGroupSheetOpen(true);
	};

	const openEditGroupSheet = (group: GetTaxesGroupResponse) => {
		if (group.id === undefined) {
			return;
		}

		setEditingGroup(group);
		setGroupSubmitError(null);
		groupForm.reset({
			name: group.name || "",
			taxComponents:
				group.taxAssociations?.map((association) => ({
					id: association.id,
					taxComponentId: association.taxComponent?.id,
					startDate: toInputDate(association.startDate),
				})) || EMPTY_GROUP_VALUES.taxComponents,
		});
		setIsGroupSheetOpen(true);
	};

	const closeComponentSheet = (open: boolean) => {
		setIsComponentSheetOpen(open);
		if (!open) {
			setEditingComponent(null);
			setComponentSubmitError(null);
		}
	};

	const closeGroupSheet = (open: boolean) => {
		setIsGroupSheetOpen(open);
		if (!open) {
			setEditingGroup(null);
			setGroupSubmitError(null);
		}
	};

	const onSubmitComponent = (values: TaxComponentFormData) => {
		setComponentSubmitError(null);
		if (editingComponent) {
			updateComponentMutation.mutate(values);
			return;
		}

		createComponentMutation.mutate(values);
	};

	const onSubmitGroup = (values: TaxGroupFormData) => {
		setGroupSubmitError(null);
		if (editingGroup) {
			updateGroupMutation.mutate(values);
			return;
		}

		createGroupMutation.mutate(values);
	};

	const currentComponentDetail =
		componentDetailQuery.data || editingComponent || undefined;

	return (
		<PageShell
			title="Tax Configuration"
			subtitle="Manage tax components and tax groups used by charges and savings withholding."
		>
			<TaxConfigurationTables
				componentSearch={componentSearch}
				componentsError={componentsQuery.error}
				componentsLoading={componentsQuery.isLoading}
				filteredComponents={filteredComponents}
				filteredGroups={filteredGroups}
				groupSearch={groupSearch}
				groupsError={groupsQuery.error}
				groupsLoading={groupsQuery.isLoading}
				onCreateComponent={openCreateComponentSheet}
				onCreateGroup={openCreateGroupSheet}
				onEditComponent={openEditComponentSheet}
				onEditGroup={openEditGroupSheet}
				onSetComponentSearch={setComponentSearch}
				onSetGroupSearch={setGroupSearch}
			/>

			<TaxComponentSheet
				currentComponent={currentComponentDetail}
				editingComponent={editingComponent}
				form={componentForm}
				isLoading={componentDetailQuery.isLoading}
				isOpen={isComponentSheetOpen}
				isSubmitting={isComponentSubmitting}
				onOpenChange={closeComponentSheet}
				onSubmit={onSubmitComponent}
				submitError={componentSubmitError}
				template={componentTemplateQuery.data}
				templateLoading={componentTemplateQuery.isLoading}
			/>

			<TaxGroupSheet
				components={taxComponentOptions}
				editingGroup={editingGroup}
				fieldArray={groupComponentsFieldArray}
				form={groupForm}
				isLoading={groupDetailQuery.isLoading}
				isOpen={isGroupSheetOpen}
				isSubmitting={isGroupSubmitting}
				onOpenChange={closeGroupSheet}
				onSubmit={onSubmitGroup}
				submitError={groupSubmitError}
			/>
		</PageShell>
	);
}
