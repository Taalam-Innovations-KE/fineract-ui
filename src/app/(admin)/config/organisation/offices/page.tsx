'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/config/page-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { OfficeForm } from '@/components/config/forms/office-form';
import { BFF_ROUTES } from '@/lib/fineract/endpoints';
import { useTenantStore } from '@/store/tenant';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import type { OfficeData } from '@/lib/fineract/generated/types.gen';

async function fetchOffices(tenantId: string): Promise<OfficeData[]> {
  const response = await fetch(BFF_ROUTES.offices, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch offices');
  }

  return response.json();
}

async function createOffice(tenantId: string, data: any) {
  const response = await fetch(BFF_ROUTES.offices, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create office');
  }

  return response.json();
}

function buildOfficeTree(offices: OfficeData[]): OfficeData[] {
  const officeMap = new Map<number, OfficeData & { children: OfficeData[] }>();

  offices.forEach((office) => {
    officeMap.set(office.id!, { ...office, children: [] });
  });

  const tree: OfficeData[] = [];

  offices.forEach((office) => {
    const node = officeMap.get(office.id!);
    if (!node) return;

    if (office.parentId) {
      const parent = officeMap.get(office.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        tree.push(node);
      }
    } else {
      tree.push(node);
    }
  });

  return tree;
}

function OfficeTreeNode({ office, level = 0 }: { office: any; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = office.children && office.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
        {!hasChildren && <div className="w-4" />}
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-medium">{office.name}</span>
        {level === 0 && <Badge variant="outline">Head Office</Badge>}
        {office.externalId && (
          <Badge variant="secondary" className="ml-auto">
            {office.externalId}
          </Badge>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {office.children.map((child: any) => (
            <OfficeTreeNode key={child.id} office={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficesPage() {
  const { tenantId } = useTenantStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: offices = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['offices', tenantId],
    queryFn: () => fetchOffices(tenantId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createOffice(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices', tenantId] });
      setIsCreateDialogOpen(false);
    },
  });

  const officeTree = buildOfficeTree(offices);

  return (
    <PageShell
      title="Offices"
      subtitle="Manage your organization's office hierarchy"
      actions={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Office
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Office Hierarchy</CardTitle>
            <CardDescription>
              Tree view of all offices in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading offices...
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-destructive">
                Failed to load offices. Please try again.
              </div>
            )}
            {!isLoading && !error && offices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No offices found. Create your first office to get started.
              </div>
            )}
            {!isLoading && !error && officeTree.length > 0 && (
              <div className="space-y-1">
                {officeTree.map((office) => (
                  <OfficeTreeNode key={office.id} office={office} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Office statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Offices
              </span>
              <span className="text-2xl font-bold">{offices.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Head Offices
              </span>
              <span className="text-2xl font-bold">
                {offices.filter((o) => !o.parentId).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Branch Offices
              </span>
              <span className="text-2xl font-bold">
                {offices.filter((o) => o.parentId).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogHeader>
          <DialogTitle>Create New Office</DialogTitle>
          <DialogDescription>
            Add a new office to your organization hierarchy
          </DialogDescription>
        </DialogHeader>
        <OfficeForm
          offices={offices}
          onSubmit={(data) => createMutation.mutateAsync(data)}
          onCancel={() => setIsCreateDialogOpen(false)}
        />
      </Dialog>
    </PageShell>
  );
}
