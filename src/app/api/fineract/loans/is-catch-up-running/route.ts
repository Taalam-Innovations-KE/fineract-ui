import { NextRequest, NextResponse } from 'next/server';
import { fineractFetch, getTenantFromRequest } from '@/lib/fineract/client.server';
import { FINERACT_ENDPOINTS } from '@/lib/fineract/endpoints';
import { mapFineractError } from '@/lib/fineract/error-mapping';
import type { IsCatchUpRunningDto } from '@/lib/fineract/generated/types.gen';

/**
 * GET /api/fineract/loans/is-catch-up-running
 * Check if COB catch-up is currently running
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);

    const result = await fineractFetch<IsCatchUpRunningDto>(
      FINERACT_ENDPOINTS.loansCatchUpRunning,
      {
        method: 'GET',
        tenantId,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    const mappedError = mapFineractError(error);
    return NextResponse.json(mappedError, {
      status: mappedError.statusCode || 500,
    });
  }
}
