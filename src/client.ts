import type { ApiEnvelope, CreditsData } from './types.js';

/**
 * Thin client for the PicDefense.io API v2 (https://app.picdefense.io/api/v2).
 *
 * Auth is a single `X-API-TOKEN` header in the form `USERID:APIKEY` (the server
 * splits on the colon and validates the API key against the user). The token is
 * supplied per-user and never stored server-side beyond the lifetime of a request
 * / SSE connection.
 *
 * Most endpoints deduct account credits per successful call.
 */
export class PicDefenseClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * Issue a request and unwrap the API envelope. Non-2xx responses and
   * `status: -1` bodies (e.g. "insufficient credits", "unauthorized") are
   * thrown as Errors carrying the API's own message.
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'X-API-TOKEN': this.token,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('PicDefense API request timed out after 30 seconds');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const envelope = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;

    if (!response.ok || envelope.status === -1) {
      const reason = envelope.error || envelope.message || `HTTP ${response.status}`;
      const err = new Error(reason) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    return envelope.data as T;
  }

  /** Remaining account credits. */
  getCredits(): Promise<CreditsData> {
    return this.request<CreditsData>('GET', '/credits');
  }

  /** Reverse-image-search risk analysis + picrisk score for an image URL. */
  checkImageRisk(url: string): Promise<unknown> {
    return this.request('POST', '/checkImageRisk', { url });
  }

  /** Extract EXIF metadata from an image. */
  exif(url: string): Promise<unknown> {
    return this.request('POST', '/exif', { url });
  }

  /** Detect whether an image contains a face. */
  face(url: string): Promise<unknown> {
    return this.request('POST', '/face', { url });
  }

  /** Detect whether an image contains a recognizable landmark. */
  landmark(url: string): Promise<unknown> {
    return this.request('POST', '/landmark', { url });
  }

  /** Detect whether an image contains a brand logo. */
  logo(url: string): Promise<unknown> {
    return this.request('POST', '/logo', { url });
  }

  /** SafeSearch content-safety assessment for an image. */
  safesearch(url: string): Promise<unknown> {
    return this.request('POST', '/safesearch', { url });
  }

  /** Find backlinks / other places an image appears online. */
  backlinks(url: string): Promise<unknown> {
    return this.request('POST', '/backlinks', { url });
  }

  /** Detect descriptive labels for the contents of an image. */
  labels(url: string): Promise<unknown> {
    return this.request('POST', '/labels', { url });
  }

  /** Extract text from an image via OCR. */
  text(url: string): Promise<unknown> {
    return this.request('POST', '/text', { url });
  }

  /** Detect a visible stock/photographer watermark in an image. */
  watermark(url: string): Promise<unknown> {
    return this.request('POST', '/watermark', { url });
  }
}
