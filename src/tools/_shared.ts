import { z } from 'zod';

/** Input schema shared by every image-analysis tool: a single public image URL. */
export const urlSchema = {
  url: z
    .string()
    .url()
    .describe('Publicly accessible image URL to analyze (http/https), e.g. https://example.com/photo.jpg'),
};

export type UrlParams = { url: string };

/** Pretty-print an API `data` payload for return to the agent. */
export function format(data: unknown): string {
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}
