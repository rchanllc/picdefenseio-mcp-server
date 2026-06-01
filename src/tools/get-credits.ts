import type { PicDefenseClient } from '../client.js';

export const getCreditsSchema = {};

export async function getCredits(client: PicDefenseClient) {
  const data = await client.getCredits();
  return `Remaining account credits: ${data.credits}`;
}
