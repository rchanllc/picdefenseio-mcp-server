import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const detectLogoSchema = urlSchema;

export async function detectLogo(client: PicDefenseClient, params: UrlParams) {
  return format(await client.logo(params.url));
}
