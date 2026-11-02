import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
describe('approved slate archive design', () => {
 it('keeps the same white surface and slate primary on web and native', () => {
  expect(read('src/app/globals.css')).toContain('--color-background: #FFFFFF');
  expect(read('src/app/globals.css')).toContain('--color-primary: #526985');
  expect(read('../mobile/constants/Colors.ts')).toContain("primary: '#526985'");
  expect(read('../mobile/constants/Colors.ts')).toContain("background: '#FFFFFF'");
 });
 it('aligns cards instead of staggering and expands the desktop grid', () => {
  const css=read('src/components/captures/EditorialArchive.module.css');
  expect(css).not.toContain(':nth-child(even)');
  expect(css).toContain('repeat(3, minmax(0, 1fr))');
  expect(css).toContain('repeat(4, minmax(0, 1fr))');
 });
 it('bundles SUIT for both platforms instead of a network-only UI font', () => {
  expect(read('src/app/globals.css')).toContain("'SUIT'");
  expect(read('../mobile/app/_layout.tsx')).toContain('SUIT-Regular');
 });
});
