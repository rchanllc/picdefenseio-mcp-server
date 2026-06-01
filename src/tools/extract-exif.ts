import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const extractExifSchema = urlSchema;

export async function extractExif(client: PicDefenseClient, params: UrlParams) {
  return format(await client.exif(params.url));
}
