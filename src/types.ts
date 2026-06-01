/**
 * Response shapes for the PicDefense.io API v2.
 * Every endpoint returns the same envelope; `data` varies per endpoint and is
 * largely free-form (image-detection payloads, EXIF maps, picrisk objects), so it
 * is typed loosely and surfaced to the agent as pretty-printed JSON.
 */

export interface ApiEnvelope<T = unknown> {
  status: number; // 1 = success, -1 = failure
  message: string; // "succeeded" | "failed"
  error: string; // "none" on success, otherwise the failure reason
  data: T;
}

export interface CreditsData {
  credits: number;
}
