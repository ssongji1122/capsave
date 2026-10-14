import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
const SOURCE_PATH = '../../_dogfood/2026-10-09_scrave_capture-intent_v1/source.jpg';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  try {
    const file = await readFile(path.resolve(process.cwd(), SOURCE_PATH));
    return new Response(new Uint8Array(file), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
  } catch { return new Response('원본을 불러오지 못했습니다.', { status: 404 }); }
}
