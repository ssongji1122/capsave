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
    await expect(page.getByRole('heading', { name: '스크린샷 아카이브' })).toBeVisible();
    await expect(page.getByText('SNS, 지도, 블로그 캡처를 선택하면 장소와 텍스트로 정리합니다.')).toBeVisible();
  });

  test('업로드존 — 드래그앤드롭 영역', async ({ page }) => {
    await expect(page.getByText('스크린샷 추가')).toBeVisible();
    await expect(page.getByText('붙여넣기 지원')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('게스트 체험 잔여 횟수 표시', async ({ page }) => {
    await expect(page.getByText('체험 3회 남음')).toBeVisible();
    await expect(page.getByText('0 / 3')).toBeVisible();
  });

  test('로그인 버튼 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
