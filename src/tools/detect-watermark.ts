import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const detectWatermarkSchema = urlSchema;

export async function detectWatermark(client: PicDefenseClient, params: UrlParams) {
  return format(await client.watermark(params.url));
}
