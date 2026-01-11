import { NextRequest, NextResponse } from 'next/server';
import { fineractFetch, getTenantFromRequest } from '@/lib/fineract/client.server';
import { FINERACT_ENDPOINTS } from '@/lib/fineract/endpoints';
import { mapFineractError } from '@/lib/fineract/error-mapping';
import type { GetRolesResponse } from '@/lib/fineract/generated/types.gen';

/**
 * GET /api/fineract/roles
 * Fetches all roles
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);

    const roles = await fineractFetch<GetRolesResponse[]>(
      FINERACT_ENDPOINTS.roles,
      {
        method: 'GET',
        tenantId,
      }
    );

    return NextResponse.json(roles);
  } catch (error) {
    const mappedError = mapFineractError(error);
    return NextResponse.json(mappedError, {
      status: mappedError.statusCode || 500,
    });
  }
}
