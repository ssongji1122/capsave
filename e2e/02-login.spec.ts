import { test, expect } from '@playwright/test';

/**
 * Flow 2: 로그인 페이지 (OAuth-only — U6)
 */
test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 카드 렌더링 — OAuth 버튼만 노출', async ({ page }) => {
    await expect(page.getByText('Scrave').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 캡처 보관함으로 들어가기' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('button', { name: /카카오로 시작하기/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google로 시작하기/ })).toBeVisible();
  });

  test('이메일/비밀번호 폼이 없다 (OAuth-only)', async ({ page }) => {
    await expect(page.getByPlaceholder('이메일')).toHaveCount(0);
    await expect(page.getByPlaceholder('비밀번호')).toHaveCount(0);
    await expect(page.getByText('소셜 계정으로 로그인하면 자동으로 계정이 생성됩니다.')).toBeVisible();
  });

  test('← 체험하기 링크가 랜딩으로 돌아간다', async ({ page }) => {
    await page.getByRole('link', { name: /체험하기/ }).click();
    await expect(page).toHaveURL('/');
  });
});
