import { test, expect } from '@playwright/test';

/**
 * Flow 2: 로그인 페이지
 */
test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 폼 렌더링', async ({ page }) => {
    await expect(page.getByText('Scrave').first()).toBeVisible();
    await expect(page.getByText('AI 캡처 오거나이저')).toBeVisible();
    await expect(page.getByPlaceholder('이메일')).toBeVisible();
    await expect(page.getByPlaceholder('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('← 체험하기 링크가 랜딩으로 돌아간다', async ({ page }) => {
    await page.getByRole('link', { name: /체험하기/ }).click();
    await expect(page).toHaveURL('/');
  });

  test('이메일/비밀번호 미입력 시 submit 안됨 (HTML validation)', async ({ page }) => {
    await page.getByRole('button', { name: '로그인' }).click();
    // HTML required 속성으로 막힘
    await expect(page).toHaveURL(/\/login/);
  });

  test('잘못된 이메일로 로그인 시 에러 표시', async ({ page }) => {
    await page.getByPlaceholder('이메일').fill('notexist@test.com');
    await page.getByPlaceholder('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();
    // Supabase 에러 메시지 등장
    await expect(page.locator('p.text-error, [class*=error]')).toBeVisible({ timeout: 10000 });
  });

  test('회원가입/로그인 모드 토글', async ({ page }) => {
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    await page.getByText(/계정이 없으신가요/).click();
    await expect(page.getByRole('button', { name: '회원가입' })).toBeVisible();
    await page.getByText(/이미 계정이 있으신가요/).click();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });
});
