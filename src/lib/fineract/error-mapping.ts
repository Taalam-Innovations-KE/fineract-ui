/**
 * Standard error response format from BFF
 */
export interface FineractError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode?: number;
}

/**
 * Maps Fineract API errors to a normalized error format
 */
export function mapFineractError(error: unknown): FineractError {
  if (error instanceof Response) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || 'An error occurred',
      statusCode: error.status,
    };
  }

  if (error && typeof error === 'object') {
    const err = error as any;

    // Fineract error format
    if (err.errors && Array.isArray(err.errors)) {
      const fieldErrors: Record<string, string[]> = {};

      err.errors.forEach((e: any) => {
        const field = e.parameterName || e.field || 'general';
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(e.userMessageGlobalisationCode || e.defaultUserMessage || e.message);
      });

      return {
        code: err.errorCode || 'VALIDATION_ERROR',
        message: err.userMessage || err.defaultUserMessage || 'Validation failed',
        details: fieldErrors,
        statusCode: err.httpStatusCode || 400,
      };
    }

    // Generic error with message
    if (err.message) {
      return {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
        statusCode: err.statusCode || err.status || 500,
      };
    }
  }

  // Fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

/**
 * Formats field errors for display in forms
 */
export function getFieldError(error: FineractError | null, field: string): string | undefined {
  if (!error?.details) return undefined;
  const errors = error.details[field];
  return errors && errors.length > 0 ? errors[0] : undefined;
}
