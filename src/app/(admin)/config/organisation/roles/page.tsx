'use client';

import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/config/page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BFF_ROUTES } from '@/lib/fineract/endpoints';
import { useTenantStore } from '@/store/tenant';
import { Shield, Users } from 'lucide-react';
import type { GetRolesResponse } from '@/lib/fineract/generated/types.gen';

async function fetchRoles(tenantId: string): Promise<GetRolesResponse[]> {
  const response = await fetch(BFF_ROUTES.roles, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }

  return response.json();
}

export default function RolesPage() {
  const { tenantId } = useTenantStore();

  const {
    data: roles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: () => fetchRoles(tenantId),
  });

  // Categorize roles by type (based on common naming patterns)
  const adminRoles = roles.filter(r =>
    r.name?.toLowerCase().includes('admin') ||
    r.name?.toLowerCase().includes('super')
  );
  const operationalRoles = roles.filter(r =>
    !r.name?.toLowerCase().includes('admin') &&
    !r.name?.toLowerCase().includes('super')
  );

  return (
    <PageShell
      title="Roles & Permissions"
      subtitle="View and manage system roles and their permissions"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Admin Roles */}
          {adminRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Administrative Roles</CardTitle>
                <CardDescription>
                  High-privilege roles for system administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading roles...
                  </div>
                )}
                {!isLoading && (
                  <div className="space-y-2">
                    {adminRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
                            <Shield className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-lg">{role.name}</div>
                            {role.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {role.description}
                              </div>
                            )}
                            <Badge variant="destructive" className="mt-2">
                              Admin Role
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Operational Roles */}
          {operationalRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Operational Roles</CardTitle>
                <CardDescription>
                  Standard roles for day-to-day operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading roles...
                  </div>
                )}
                {error && (
                  <div className="text-center py-8 text-destructive">
                    Failed to load roles. Please try again.
                  </div>
                )}
                {!isLoading && !error && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {operationalRoles.map((role) => (
                      <div
                        key={role.id}
                        className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{role.name}</div>
                            {role.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && roles.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No roles found in the system.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Role statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{roles.length}</div>
                <div className="text-sm text-muted-foreground">Total Roles</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{adminRoles.length}</div>
                <div className="text-sm text-muted-foreground">Admin Roles</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{operationalRoles.length}</div>
                <div className="text-sm text-muted-foreground">Operational</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
