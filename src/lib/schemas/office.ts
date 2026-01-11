import { z } from 'zod';
import { FINERACT_DATE_FORMAT, FINERACT_LOCALE } from '@/lib/date-utils';

/**
 * Zod schema for creating an office
 * Aligned with PostOfficesRequest from OpenAPI
 */
export const createOfficeSchema = z.object({
  name: z.string().min(2, 'Office name must be at least 2 characters'),
  parentId: z.number().positive('Parent office is required'),
  openingDate: z.date(),
  externalId: z.string().optional(),
});

export type CreateOfficeFormData = z.infer<typeof createOfficeSchema>;

/**
 * Converts form data to API request format
 */
export function officeFormToRequest(data: CreateOfficeFormData) {
  return {
    name: data.name,
    parentId: data.parentId,
    openingDate: data.openingDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    dateFormat: FINERACT_DATE_FORMAT,
    locale: FINERACT_LOCALE,
    externalId: data.externalId || undefined,
  };
}
