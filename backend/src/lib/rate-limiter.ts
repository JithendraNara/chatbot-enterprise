class RateLimiter {
  private window = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  private maxRequests = 4500;
  private requests: Map<string, number[]> = new Map();

  allow(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Filter out requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.window
    );

    if (validRequests.length >= this.maxRequests) {
      this.requests.set(userId, validRequests);
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }

  retryAfter(userId: string): number {
    const userRequests = this.requests.get(userId) || [];
    if (userRequests.length === 0) return 0;

    const now = Date.now();
    const oldestRequest = Math.min(...userRequests);
    const oldestValid = userRequests.filter(
      timestamp => now - timestamp < this.window
    );

    if (oldestValid.length === 0) return 0;

    const oldestStillValid = Math.min(...oldestValid);
    const expiresAt = oldestStillValid + this.window;
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  getRemaining(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.window
    );
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  reset(userId: string): void {
    this.requests.delete(userId);
  }

  // Internal method for testing
  getRequestCount(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    return userRequests.filter(timestamp => now - timestamp < this.window).length;
  }
}

export const rateLimiter = new RateLimiter();
