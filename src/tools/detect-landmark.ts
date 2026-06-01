import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const detectLandmarkSchema = urlSchema;

export async function detectLandmark(client: PicDefenseClient, params: UrlParams) {
  return format(await client.landmark(params.url));
}
