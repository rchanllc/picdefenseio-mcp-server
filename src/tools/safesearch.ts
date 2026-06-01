import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const safeSearchSchema = urlSchema;

export async function safeSearch(client: PicDefenseClient, params: UrlParams) {
  return format(await client.safesearch(params.url));
}
