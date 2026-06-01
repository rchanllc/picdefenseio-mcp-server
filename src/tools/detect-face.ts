import type { PicDefenseClient } from '../client.js';
import { urlSchema, format, type UrlParams } from './_shared.js';

export const detectFaceSchema = urlSchema;

export async function detectFace(client: PicDefenseClient, params: UrlParams) {
  return format(await client.face(params.url));
}
