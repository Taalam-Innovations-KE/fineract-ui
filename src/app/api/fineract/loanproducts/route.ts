import { NextRequest, NextResponse } from 'next/server';
import { fineractFetch, getTenantFromRequest } from '@/lib/fineract/client.server';
import { FINERACT_ENDPOINTS } from '@/lib/fineract/endpoints';
import { mapFineractError } from '@/lib/fineract/error-mapping';
import type { PostLoanProductsRequest } from '@/lib/fineract/generated/types.gen';

/**
 * GET /api/fineract/loanproducts
 * Fetches all loan products
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);

    const products = await fineractFetch(
      FINERACT_ENDPOINTS.loanProducts,
      {
        method: 'GET',
        tenantId,
      }
    );

    return NextResponse.json(products);
  } catch (error) {
    const mappedError = mapFineractError(error);
    return NextResponse.json(mappedError, {
      status: mappedError.statusCode || 500,
    });
  }
}

/**
 * POST /api/fineract/loanproducts
 * Creates a new loan product
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantFromRequest(request);
    const body = await request.json() as PostLoanProductsRequest;

    const result = await fineractFetch(
      FINERACT_ENDPOINTS.loanProducts,
      {
        method: 'POST',
        body,
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
