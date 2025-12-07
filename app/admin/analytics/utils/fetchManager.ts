// Singleton fetch manager to prevent duplicate API calls

type FetchFunction<T> = () => Promise<T>;

class FetchManager {
  private static instance: FetchManager;
  private activeRequests: Map<string, Promise<unknown>> = new Map();

  private constructor() {}

  static getInstance(): FetchManager {
    if (!FetchManager.instance) {
      FetchManager.instance = new FetchManager();
    }
    return FetchManager.instance;
  }

  async fetch<T = unknown>(key: string, fetchFn: FetchFunction<T>): Promise<T> {
    // If there's already an active request with this key, return it
    const activeRequest = this.activeRequests.get(key) as Promise<T> | undefined;
    if (activeRequest) {
      return activeRequest;
    }

    // Create new request
    const requestPromise = fetchFn()
      .finally(() => {
        // Clean up after request completes
        this.activeRequests.delete(key);
      });

    this.activeRequests.set(key, requestPromise);
    return requestPromise;
  }

  clearAll(): void {
    this.activeRequests.clear();
  }
}

export const fetchManager = FetchManager.getInstance();
