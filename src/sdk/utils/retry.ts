/**
 * @module utils/retry
 * Shared HTTP retry utilities: exponential backoff with jitter,
 * retryable status detection, and Retry-After header handling.
 * Used by all LLM provider implementations.
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Default retry configuration: 5 retries, 1 s initial delay,
 * 60 s cap, 2× exponential backoff with 10 % jitter.
 */
export const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1_000,
  maxDelayMs: 60_000,
  backoffMultiplier: 2.0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the delay for a given retry attempt (0-based).
 * Adds ±10 % random jitter to reduce thundering-herd effects.
 */
export function delayForAttempt(config: RetryConfig, attempt: number): number {
  const base = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const jitter = base * 0.1 * Math.random();
  return Math.min(base + jitter, config.maxDelayMs);
}

/**
 * Whether an HTTP status code warrants an automatic retry.
 *
 * - 429: rate limited
 * - 529: Anthropic-specific overloaded signal
 * - 5xx: server-side errors
 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 529 || (status >= 500 && status < 600);
}

/**
 * Parse the `Retry-After` response header and return the delay in ms.
 * Returns `undefined` when the header is absent or unparseable.
 *
 * The header value may be a delta-seconds integer or an HTTP-date string.
 */
export function parseRetryAfterMs(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  if (!value) return undefined;

  // Try delta-seconds form first (e.g. "30")
  const seconds = parseFloat(value);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.ceil(seconds) * 1_000;
  }

  // Try HTTP-date form (e.g. "Thu, 01 Jan 2026 00:00:00 GMT")
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const deltaMs = date.getTime() - Date.now();
    return deltaMs > 0 ? deltaMs : undefined;
  }

  return undefined;
}

/**
 * Sleep for `ms` milliseconds, respecting an optional abort signal.
 * Rejects with the signal's reason if aborted during the wait.
 */
export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}
