// API Response Types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  total: number;
  page?: number;
  perPage?: number;
  hasMore?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// Request validation types
export interface ValidationError {
  field: string;
  message: string;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  path: string;
  method: ApiMethod;
  requiresAuth: boolean;
  requiresAdmin?: boolean;
}

