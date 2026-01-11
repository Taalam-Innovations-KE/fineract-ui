'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserFormData, userFormToRequest } from '@/lib/schemas/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { OfficeData, Staff, GetRolesResponse } from '@/lib/fineract/generated/types.gen';
import { useState } from 'react';

interface UserFormProps {
  offices: OfficeData[];
  staff: Staff[];
  roles: GetRolesResponse[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ offices, staff, roles, onSubmit, onCancel }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      roles: [],
    },
  });

  const selectedOfficeId = watch('officeId');
  const filteredStaff = selectedOfficeId
    ? staff.filter(s => s.office?.id === selectedOfficeId)
    : staff;

  const toggleRole = (roleId: number) => {
    const newSet = new Set(selectedRoles);
    if (newSet.has(roleId)) {
      newSet.delete(roleId);
    } else {
      newSet.add(roleId);
    }
    setSelectedRoles(newSet);
    setValue('roles', Array.from(newSet));
  };

  const onFormSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      const requestData = userFormToRequest(data);
      await onSubmit(requestData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username">
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="username"
            {...register('username')}
            placeholder="Enter username"
          />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="user@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstname">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstname"
            {...register('firstname')}
            placeholder="Enter first name"
          />
          {errors.firstname && (
            <p className="text-sm text-destructive">{errors.firstname.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastname">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastname"
            {...register('lastname')}
            placeholder="Enter last name"
          />
          {errors.lastname && (
            <p className="text-sm text-destructive">{errors.lastname.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="officeId">
            Office <span className="text-destructive">*</span>
          </Label>
          <Select
            id="officeId"
            {...register('officeId', { valueAsNumber: true })}
          >
            <option value="">Select office</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.nameDecorated || office.name}
              </option>
            ))}
          </Select>
          {errors.officeId && (
            <p className="text-sm text-destructive">{errors.officeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="staffId">Link to Staff (Optional)</Label>
          <Select
            id="staffId"
            {...register('staffId', { valueAsNumber: true })}
            disabled={!selectedOfficeId}
          >
            <option value="">None</option>
            {filteredStaff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Roles <span className="text-destructive">*</span>
        </Label>
        <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.id}`}
                checked={selectedRoles.has(role.id!)}
                onChange={() => toggleRole(role.id!)}
              />
              <Label htmlFor={`role-${role.id}`} className="cursor-pointer flex-1">
                <div className="font-medium">{role.name}</div>
                {role.description && (
                  <div className="text-xs text-muted-foreground">{role.description}</div>
                )}
              </Label>
            </div>
          ))}
        </div>
        {errors.roles && (
          <p className="text-sm text-destructive">{errors.roles.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            placeholder="Enter password"
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="repeatPassword">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="repeatPassword"
            type="password"
            {...register('repeatPassword')}
            placeholder="Confirm password"
          />
          {errors.repeatPassword && (
            <p className="text-sm text-destructive">{errors.repeatPassword.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="sendPasswordToEmail"
            {...register('sendPasswordToEmail')}
          />
          <Label htmlFor="sendPasswordToEmail" className="cursor-pointer">
            Send password to email
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="passwordNeverExpires"
            {...register('passwordNeverExpires')}
          />
          <Label htmlFor="passwordNeverExpires" className="cursor-pointer">
            Password never expires
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="isSelfServiceUser"
            {...register('isSelfServiceUser')}
          />
          <Label htmlFor="isSelfServiceUser" className="cursor-pointer">
            Self-service user
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
