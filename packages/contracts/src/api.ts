// ── DealFlow360 API Contract Types ──
// Standard API envelope, pagination, and error shapes.

/** Standard success response */
export interface ApiResponse<T = unknown> {
  data: T;
  requestId?: string;
}

/** Standard error response */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  requestId?: string;
}

/** Paginated list response */
export interface PaginatedResponse<T = unknown> {
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  requestId?: string;
}

/** Pagination query params */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Common error codes */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  DUPLICATE_ACTION: 'DUPLICATE_ACTION',
} as const;
