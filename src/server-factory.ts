import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PicDefenseClient } from './client.js';

import { getCreditsSchema, getCredits } from './tools/get-credits.js';
import { checkImageRiskSchema, checkImageRisk } from './tools/check-image-risk.js';
import { extractExifSchema, extractExif } from './tools/extract-exif.js';
import { detectFaceSchema, detectFace } from './tools/detect-face.js';
import { detectLandmarkSchema, detectLandmark } from './tools/detect-landmark.js';
import { detectLogoSchema, detectLogo } from './tools/detect-logo.js';
import { safeSearchSchema, safeSearch } from './tools/safesearch.js';
import { findBacklinksSchema, findBacklinks } from './tools/find-backlinks.js';
import { detectLabelsSchema, detectLabels } from './tools/detect-labels.js';

export const SERVER_NAME = 'picdefenseio_mcp';
export const SERVER_VERSION = '1.0.0';

/** Wrap a tool handler so it returns MCP content and reports failures cleanly. */
function wrapTool(fn: (...args: any[]) => Promise<string>) {
  return async (...args: any[]) => {
    try {
      const text = await fn(...args);
      return { content: [{ type: 'text' as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

/**
 * Build an MCP server bound to a single PicDefense API token. A fresh instance
 * is created per stdio process and per SSE/HTTP connection so each user's token
 * stays isolated.
 */
export function createServer(client: PicDefenseClient): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.tool(
    'picdefense_get_credits',
    `Get the remaining credit balance on your PicDefense.io account.

Most analysis tools consume credits per call — check this first if calls start failing with "insufficient credits".`,
    getCreditsSchema,
    wrapTool(() => getCredits(client))
  );

  server.tool(
    'picdefense_check_image_risk',
    `Run PicDefense's core image-risk analysis on an image URL. Returns reverse-image-search findings and a "picrisk" score indicating how widely / riskily the image appears online.

This is the primary tool for assessing whether an image has been misused or scraped. Consumes account credits.`,
    checkImageRiskSchema,
    wrapTool((params: any) => checkImageRisk(client, params))
  );

  server.tool(
    'picdefense_extract_exif',
    `Extract EXIF metadata (camera, timestamps, GPS, etc.) embedded in an image at the given URL. Consumes account credits.`,
    extractExifSchema,
    wrapTool((params: any) => extractExif(client, params))
  );

  server.tool(
    'picdefense_detect_face',
    `Detect whether an image contains a human face. Consumes account credits.`,
    detectFaceSchema,
    wrapTool((params: any) => detectFace(client, params))
  );

  server.tool(
    'picdefense_detect_landmark',
    `Detect whether an image contains a recognizable landmark (and where). Consumes account credits.`,
    detectLandmarkSchema,
    wrapTool((params: any) => detectLandmark(client, params))
  );

  server.tool(
    'picdefense_detect_logo',
    `Detect whether an image contains a brand logo. Consumes account credits.`,
    detectLogoSchema,
    wrapTool((params: any) => detectLogo(client, params))
  );

  server.tool(
    'picdefense_safesearch',
    `Assess the content safety of an image (adult, violence, racy, medical, spoof likelihoods) via SafeSearch. Consumes account credits.`,
    safeSearchSchema,
    wrapTool((params: any) => safeSearch(client, params))
  );

  server.tool(
    'picdefense_find_backlinks',
    `Find backlinks for an image — other web pages where the image appears. Useful for tracing where a photo has been republished. Consumes account credits.`,
    findBacklinksSchema,
    wrapTool((params: any) => findBacklinks(client, params))
  );

  server.tool(
    'picdefense_detect_labels',
    `Detect descriptive labels for the contents of an image (objects, scenes, concepts). Consumes account credits.`,
    detectLabelsSchema,
    wrapTool((params: any) => detectLabels(client, params))
  );

  return server;
}
