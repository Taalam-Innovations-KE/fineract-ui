import { NextRequest, NextResponse } from 'next/server';
import { fineractFetch, getTenantFromRequest } from '@/lib/fineract/client.server';
import { FINERACT_ENDPOINTS } from '@/lib/fineract/endpoints';
import { mapFineractError } from '@/lib/fineract/error-mapping';

/**
 * POST /api/fineract/loans/catch-up
 * Trigger COB catch-up process
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);

    const result = await fineractFetch(
      FINERACT_ENDPOINTS.loansCatchUp,
      {
        method: 'POST',
        body: {},
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
