import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const checkImageRiskSchema = urlSchema;

export async function checkImageRisk(client: PicDefenseClient, params: UrlParams) {
  return format(await client.checkImageRisk(params.url));
}
