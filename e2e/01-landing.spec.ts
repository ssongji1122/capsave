import { test, expect } from '@playwright/test';

/**
 * Flow 1: 랜딩 페이지 (게스트 진입점)
 */
test.describe('랜딩 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('헤더 — 로고와 로그인 버튼', async ({ page }) => {
    await expect(page.getByText('Scrave').first()).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  });

  test('히어로 — 메인 카피', async ({ page }) => {
    await expect(page.getByText('스크린샷을 올려보세요')).toBeVisible();
    await expect(page.getByText('AI가 장소와 텍스트를 자동으로 분류합니다')).toBeVisible();
  });

  test('업로드존 — 드래그앤드롭 영역', async ({ page }) => {
    await expect(page.getByText('드래그, 클릭 또는 붙여넣기')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('게스트 체험 잔여 횟수 표시', async ({ page }) => {
    await expect(page.getByText(/무료 체험.+남음/)).toBeVisible();
  });

  test('로그인 버튼 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
