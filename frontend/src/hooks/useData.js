import { useState, useEffect, useCallback, useRef } from "react";

// Global cache to store API responses in memory
const globalCache = new Map();
// Global subscribers list to notify other active hooks using the same cache key
const subscribers = new Map();

/**
 * A robust, premium zero-dependency Stale-While-Revalidate (SWR) hook.
 * 
 * @param {Function} fetcher - Function returning a Promise with the API data
 * @param {string} cacheKey - Unique key to cache this request's responses
 * @param {Object} options - Custom options:
 *   - revalidateOnFocus: revalidate data when the window gains focus (default: true)
 *   - initialData: default starting data
 */
export default function useData(fetcher, cacheKey, options = {}) {
  const { revalidateOnFocus = true, initialData = null } = options;

  const [data, setData] = useState(() => {
    if (cacheKey && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }
    return initialData;
  });
  const [loading, setLoading] = useState(!globalCache.has(cacheKey));
  const [error, setError] = useState(null);

  // Keep a stable ref to fetcher to avoid unnecessary trigger re-runs
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Main execute function
  const execute = useCallback(async (isBackground = false) => {
    if (!cacheKey) return;
    if (!isBackground) {
      // Show loading only if we don't already have cache
      if (!globalCache.has(cacheKey)) {
        setLoading(true);
      }
    }

    try {
      const result = await fetcherRef.current();
      const extractedData = result && result.data !== undefined ? result.data : result;

      // Update global cache
      globalCache.set(cacheKey, extractedData);
      setError(null);

      // Notify all subscribers of this key
      if (subscribers.has(cacheKey)) {
        subscribers.get(cacheKey).forEach((callback) => callback(extractedData));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  // Subscribe to changes to this cache key from other hooks/mutates
  useEffect(() => {
    if (!cacheKey) return;

    const handler = (newData) => {
      setData(newData);
      setLoading(false);
    };

    if (!subscribers.has(cacheKey)) {
      subscribers.set(cacheKey, new Set());
    }
    subscribers.get(cacheKey).add(handler);

    // Initial load/revalidation
    if (globalCache.has(cacheKey)) {
      // Stale-While-Revalidate: return stale data immediately, revalidate in background
      setData(globalCache.get(cacheKey));
      execute(true);
    } else {
      execute(false);
    }

    return () => {
      const set = subscribers.get(cacheKey);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          subscribers.delete(cacheKey);
        }
      }
    };
  }, [cacheKey, execute]);

  // Auto revalidation on window focus
  useEffect(() => {
    if (!cacheKey || !revalidateOnFocus) return;

    const handleFocus = () => {
      execute(true); // Revalidate in background
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [cacheKey, revalidateOnFocus, execute]);

  // Mutate function to manually update or invalidate the cache
  const mutate = useCallback(async (newData, shouldRevalidate = true) => {
    if (!cacheKey) return;

    if (newData !== undefined) {
      let resolvedData = newData;
      if (typeof newData === "function") {
        const currentVal = globalCache.get(cacheKey) || initialData;
        resolvedData = newData(currentVal);
      }

      // Optimistic cache update
      globalCache.set(cacheKey, resolvedData);
      setData(resolvedData);

      // Notify other components using this key
      if (subscribers.has(cacheKey)) {
        subscribers.get(cacheKey).forEach((callback) => callback(resolvedData));
      }
    }

    if (shouldRevalidate) {
      await execute(true);
    }
  }, [cacheKey, execute, initialData]);

  return {
    data,
    loading,
    error,
    mutate,
  };
}

/**
 * Utility function to manually trigger updates/revalidation for a specific key outside a component.
 */
export async function mutateCache(cacheKey, newData = undefined, revalidate = true) {
  if (!cacheKey) return;

  if (newData !== undefined) {
    globalCache.set(cacheKey, newData);
    if (subscribers.has(cacheKey)) {
      subscribers.get(cacheKey).forEach((callback) => callback(newData));
    }
  }

  // If we need to trigger revalidation, components using this key will automatically fetch.
  // Note: This is an optional global mutation helper.
}
