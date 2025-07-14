// Singleton fetch manager to prevent duplicate API calls
class FetchManager {
  private static instance: FetchManager;
  private activeRequests: Map<string, Promise<any>> = new Map();

  private constructor() {}

  static getInstance(): FetchManager {
    if (!FetchManager.instance) {
      FetchManager.instance = new FetchManager();
    }
    return FetchManager.instance;
  }

  async fetch(key: string, fetchFn: () => Promise<any>): Promise<any> {
    // If there's already an active request with this key, return it
    const activeRequest = this.activeRequests.get(key);
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

  clearAll() {
    this.activeRequests.clear();
  }
}

export const fetchManager = FetchManager.getInstance(); 