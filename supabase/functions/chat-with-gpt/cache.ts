
/**
 * Simple in-memory cache for database query results
 */
export class DatabaseCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get a value from cache or execute the fetch function if not available
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cachedItem = this.cache.get(key);
    const now = Date.now();

    // Return cached value if it exists and hasn't expired
    if (cachedItem && now - cachedItem.timestamp < ttl) {
      return cachedItem.data as T;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    this.cache.set(key, { data, timestamp: now });
    
    return data;
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries that start with the given prefix
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
}
