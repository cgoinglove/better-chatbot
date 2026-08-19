/**
 * Whether a failed loopback /api/chat call is worth retrying. Timeouts, rate
 * limits, and server errors can heal on their own; other 4xx responses
 * (auth, validation, policy) will fail identically on every attempt.
 */
export function isTransientChatFailure(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
