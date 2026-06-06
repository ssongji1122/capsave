import type { NextRequest } from 'next/server';

export const INVALID_JSON_BODY_ERROR = 'Invalid JSON body';

type JsonBodyParseResult =
  | { valid: true; body: unknown }
  | { valid: false; error: typeof INVALID_JSON_BODY_ERROR };

export async function parseJsonBody(request: NextRequest): Promise<JsonBodyParseResult> {
  try {
    return { valid: true, body: await request.json() };
  } catch {
    return { valid: false, error: INVALID_JSON_BODY_ERROR };
  }
}

export function getJsonRecord(body: unknown): Record<string, unknown> {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }

  return {};
}
