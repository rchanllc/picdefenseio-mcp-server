import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const findBacklinksSchema = urlSchema;

export async function findBacklinks(client: PicDefenseClient, params: UrlParams) {
  return format(await client.backlinks(params.url));
}
