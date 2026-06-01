import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const detectLabelsSchema = urlSchema;

export async function detectLabels(client: PicDefenseClient, params: UrlParams) {
  return format(await client.labels(params.url));
}
