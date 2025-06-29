/**
 * Modern API Client for EyeTask
 * Handles authentication, retries, and error handling automatically
 * Based on 2025 best practices
 */

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  retries?: number;
  timeout?: number;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private maxRetries: number = 3;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    // Check for admin token first, then regular user token
    return localStorage.getItem('adminToken') || localStorage.getItem('token');
  }

  /**
   * Create headers with authentication
   */
  private prepareHeaders(headers: HeadersInit = {}): HeadersInit {
    const preparedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>)
    };

    // Only add Authorization header if not already present
    if (!preparedHeaders['Authorization']) {
      const token = this.getAuthToken();
      if (token) {
        preparedHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    return preparedHeaders;
  }

  /**
   * Handle API errors with modern error handling
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData: any = {};

      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // JSON parsing failed, use default message
      }

      // Log error for debugging
      console.error('[API Client] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorMessage
      });

      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        code: errorData.code
      };

      throw error;
    }

    return response.json();
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && error.status !== 401 && error.status !== 403) {
        console.log(`[API Client] Retrying request... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.retryRequest(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Add timeout to fetch requests
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  /**
   * Main request method
   */
  private async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries ?? this.maxRetries;

    // Separate custom options from standard fetch options
    const { skipAuth, retries: _, timeout: __, ...fetchOptions } = options;

    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers: this.prepareHeaders(fetchOptions.headers)
    };

    const executeRequest = async () => {
      const response = await this.fetchWithTimeout(url, requestOptions, timeout);
      return this.handleResponse<T>(response);
    };

    return this.retryRequest(executeRequest, retries);
  }

  /**
   * Public API methods
   */
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient; 