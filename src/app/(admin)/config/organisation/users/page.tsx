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
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { UserForm } from '@/components/config/forms/user-form';
import { BFF_ROUTES } from '@/lib/fineract/endpoints';
import { useTenantStore } from '@/store/tenant';
import { Plus, UserCog, Shield, Building2 } from 'lucide-react';
import type { GetUsersResponse, OfficeData, Staff, GetRolesResponse } from '@/lib/fineract/generated/types.gen';

async function fetchUsers(tenantId: string): Promise<GetUsersResponse[]> {
  const response = await fetch(BFF_ROUTES.users, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

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

async function fetchStaff(tenantId: string): Promise<Staff[]> {
  const response = await fetch(BFF_ROUTES.staff, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch staff');
  }

  return response.json();
}

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

async function createUser(tenantId: string, data: any) {
  const response = await fetch(BFF_ROUTES.users, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

export default function UsersPage() {
  const { tenantId } = useTenantStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['users', tenantId],
    queryFn: () => fetchUsers(tenantId),
  });

  const { data: offices = [] } = useQuery({
    queryKey: ['offices', tenantId],
    queryFn: () => fetchOffices(tenantId),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', tenantId],
    queryFn: () => fetchStaff(tenantId),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: () => fetchRoles(tenantId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createUser(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setIsDrawerOpen(false);
    },
  });

  return (
    <PageShell
      title="Users"
      subtitle="Manage system users and their access permissions"
      actions={
        <Button onClick={() => setIsDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? 's' : ''} in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-destructive">
                Failed to load users. Please try again.
              </div>
            )}
            {!isLoading && !error && users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Create your first user to get started.
              </div>
            )}
            {!isLoading && !error && users.length > 0 && (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <UserCog className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.firstname} {user.lastname}</div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username} • {user.officeName || 'No office'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.selectedRoles && user.selectedRoles.length > 0 && (
                        <div className="flex gap-1">
                          {user.selectedRoles.slice(0, 2).map((role) => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                          {user.selectedRoles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.selectedRoles.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      {user.email && (
                        <Badge variant="outline" className="text-xs">
                          {user.email}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>User statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserCog className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Shield className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{roles.length}</div>
                <div className="text-sm text-muted-foreground">Available Roles</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Building2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{offices.length}</div>
                <div className="text-sm text-muted-foreground">Offices</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerHeader>
          <div className="flex items-center justify-between flex-1">
            <div>
              <DrawerTitle>Create New User</DrawerTitle>
              <DrawerDescription className="mt-1">
                Add a new user to the system with assigned roles
              </DrawerDescription>
            </div>
            <DrawerClose onClick={() => setIsDrawerOpen(false)} />
          </div>
        </DrawerHeader>
        <DrawerContent>
          <UserForm
            offices={offices}
            staff={staff}
            roles={roles}
            onSubmit={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setIsDrawerOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </PageShell>
  );
}
