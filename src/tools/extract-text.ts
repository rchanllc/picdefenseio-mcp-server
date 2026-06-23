import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const extractTextSchema = urlSchema;

export async function extractText(client: PicDefenseClient, params: UrlParams) {
  return format(await client.text(params.url));
}
