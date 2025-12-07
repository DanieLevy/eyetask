/**
 * Circuit Breaker Pattern Implementation
 * Prevents overwhelming APIs with failed requests and implements backoff strategies
 */

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - requests are blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to fully recover
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

// Global circuit breakers for different API endpoints
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(key: string): CircuitBreaker {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, new CircuitBreaker({
      failureThreshold: 5,     // Allow 5 failures before opening
      recoveryTimeout: 30000,  // Wait 30 seconds before attempting recovery
      monitoringPeriod: 60000  // Monitor failures over 1 minute periods
    }));
  }
  const breaker = circuitBreakers.get(key);
  if (!breaker) {
    throw new Error(`Circuit breaker not found for key: ${key}`);
  }
  return breaker;
}

export { CircuitBreaker }; 