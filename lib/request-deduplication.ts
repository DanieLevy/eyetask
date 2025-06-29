// Request deduplication to prevent multiple identical API calls
interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
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
    
    // If the request is still fresh, return the existing promise
    if (age < DEDUPE_WINDOW) {
      // Silently reuse the pending request
      return pending.promise.then(res => res.clone());
    } else {
      // Request is stale, remove it
      pendingRequests.delete(key);
    }
  }
  
  // Create new request
  const promise = fetch(url, options);
  
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