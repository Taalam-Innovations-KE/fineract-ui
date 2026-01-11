import 'server-only';

/**
 * Server-side Fineract client
 * This file can only be imported in server components and API routes
 */

const FINERACT_BASE_URL = process.env.FINERACT_BASE_URL || 'https://demo.fineract.dev/fineract-provider/api';
const FINERACT_USERNAME = process.env.FINERACT_USERNAME || 'mifos';
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || 'password';

interface FineractRequestOptions {
  method?: string;
  body?: any;
  tenantId: string;
  headers?: Record<string, string>;
}

/**
 * Makes authenticated requests to Fineract API
 */
export async function fineractFetch<T = any>(
  path: string,
  options: FineractRequestOptions
): Promise<T> {
  const { method = 'GET', body, tenantId, headers = {} } = options;

  // Create Basic Auth header
  const authHeader = Buffer.from(`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`).toString('base64');

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authHeader}`,
    'fineract-platform-tenantid': tenantId,
    ...headers,
  };

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
    cache: 'no-store', // Always fetch fresh data for admin operations
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  const url = `${FINERACT_BASE_URL}${path}`;

  const response = await fetch(url, requestInit);

  // Handle non-JSON responses (e.g., 204 No Content)
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw {
      ...data,
      httpStatusCode: response.status,
      statusText: response.statusText,
    };
  }

  return data as T;
}

/**
 * Validates tenant ID header from request
 */
export function getTenantFromRequest(request: Request): string {
  const tenantId = request.headers.get('x-tenant-id');

  if (!tenantId) {
    throw new Error('Missing tenant ID header');
  }

  return tenantId;
}
