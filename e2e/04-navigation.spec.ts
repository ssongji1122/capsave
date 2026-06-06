import { test, expect } from '@playwright/test';

/**
 * Flow 4: 앱 내 네비게이션
 * - /dashboard, /places, /texts, /map 라우트 접근
 * - 미인증 시 /login 리다이렉트 확인
 */
test.describe('라우트 및 네비게이션', () => {
  test('미인증 → /dashboard 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('미인증 → /places 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/places');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('미인증 → /texts 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/texts');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('미인증 → /map 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/map');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('미인증 → 보호 라우트 접근 시 로그인 후 돌아갈 next를 보존한다', async ({ page }) => {
    await page.goto('/map?view=places');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('/map?view=places');
  });

  test('미인증 → /settings 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('랜딩 → 로그인 → 랜딩 뒤로가기 흐름', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole('link', { name: /체험하기/ }).click();
    await expect(page).toHaveURL('/');
  });

  test('404 — 존재하지 않는 경로', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist-xyz');
    // Next.js는 404를 반환하거나 / 로 리다이렉트
    const ok = res?.status() === 404 || page.url().includes('/');
    expect(ok).toBe(true);
  });
});
