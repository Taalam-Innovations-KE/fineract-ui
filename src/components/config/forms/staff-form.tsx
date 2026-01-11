'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStaffSchema, type CreateStaffFormData, staffFormToRequest } from '@/lib/schemas/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { OfficeData } from '@/lib/fineract/generated/types.gen';
import { useState } from 'react';

interface StaffFormProps {
  offices: OfficeData[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function StaffForm({ offices, onSubmit, onCancel }: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      isLoanOfficer: false,
      isActive: true,
    },
  });

  const onFormSubmit = async (data: CreateStaffFormData) => {
    setIsSubmitting(true);
    try {
      const requestData = staffFormToRequest(data);
      await onSubmit(requestData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mobileNo">Mobile Number</Label>
          <Input
            id="mobileNo"
            {...register('mobileNo')}
            placeholder="Enter mobile number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="joiningDate">Joining Date</Label>
          <Input
            id="joiningDate"
            type="date"
            {...register('joiningDate', { valueAsDate: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="externalId">External ID</Label>
        <Input
          id="externalId"
          {...register('externalId')}
          placeholder="Enter external ID"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isLoanOfficer"
            {...register('isLoanOfficer')}
          />
          <Label htmlFor="isLoanOfficer" className="cursor-pointer">
            Is Loan Officer
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="isActive"
            {...register('isActive')}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Is Active
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
          {isSubmitting ? 'Creating...' : 'Create Staff'}
        </Button>
      </div>
    </form>
  );
}
