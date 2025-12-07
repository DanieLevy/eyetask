// Request deduplication to prevent multiple identical API calls
interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
  // Store the response data instead of the Response object to avoid cloning issues
  responseData?: {
    status: number;
    statusText: string;
    headers: Headers;
    body: unknown;
  };
}

const pendingRequests = new Map<string, PendingRequest>();
const DEDUPE_WINDOW = 1000; // 1 second window for deduplication

export async function deduplicatedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Create a unique key for this request
  const key = `${options?.method || 'GET'}_${url}_${JSON.stringify(options?.body || '')}`;
  
  // Check if we have a pending request for this key
  const pending = pendingRequests.get(key);
  
  if (pending) {
    const age = Date.now() - pending.timestamp;
    
    // If the request is still fresh and has cached response data, return it
    if (age < DEDUPE_WINDOW && pending.responseData) {
      // Return a new Response object with the cached data
      return new Response(JSON.stringify(pending.responseData.body), {
        status: pending.responseData.status,
        statusText: pending.responseData.statusText,
        headers: pending.responseData.headers
      });
    } else if (age >= DEDUPE_WINDOW) {
      // Request is stale, remove it
      pendingRequests.delete(key);
    }
  }
  
  // Create new request
  const promise = fetch(url, options).then(async (response) => {
    // Cache the response data for future deduplicated calls
    try {
      const clonedResponse = response.clone();
      const body = await clonedResponse.json();
      
      const cached = pendingRequests.get(key);
      if (cached) {
        cached.responseData = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body
        };
      }
    } catch {
      // If response can't be cloned/parsed, don't cache it
      // This is fine - the original response will still be returned
    }
    
    return response;
  });
  
  // Store the pending request
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now()
  });
  
  // Clean up after request completes
  promise.finally(() => {
    // Remove after a short delay to handle rapid successive calls
    setTimeout(() => {
      pendingRequests.delete(key);
    }, 100);
  });
  
  return promise;
}

// Cleanup old pending requests periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, pending] of pendingRequests.entries()) {
      if (now - pending.timestamp > DEDUPE_WINDOW * 2) {
        pendingRequests.delete(key);
      }
    }
  }, 5000);
} 