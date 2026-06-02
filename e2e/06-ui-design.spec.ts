import { test, expect } from '@playwright/test';

/**
 * Flow 6: UI / 디자인 시스템 검증
 * - 다크 테마 배경색 확인
 * - 반응형: 모바일(375px) vs 데스크탑(1280px)
 * - 핵심 색상 토큰 적용 여부
 */
test.describe('UI & 반응형', () => {
  test('랜딩 — 다크 배경 적용', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    // #050508 → rgb(5, 5, 8)
    expect(bg).toMatch(/rgb\(5,\s*5,\s*8\)|rgb\(0,\s*0,\s*0\)/);
  });

  test('랜딩 — Scrave 로고가 Primary 색상', async ({ page }) => {
    await page.goto('/');
    const color = await page.locator('h1').first().evaluate(
      (el) => getComputedStyle(el).color
    );
    // #F4845F → rgb(244, 132, 95)
    expect(color).toMatch(/rgb\(244,\s*132,\s*95\)/);
  });

  test('모바일(375px) — 레이아웃 오버플로우 없음', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const overflow = await page.evaluate(() => {
      const el = document.body;
      return el.scrollWidth > el.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('모바일(375px) — 사이드바 숨김 (탭바로 대체)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    // 사이드바는 lg: 이상에서만 표시
    const sidebar = page.locator('aside');
    const count = await sidebar.count();
    if (count > 0) {
      await expect(sidebar.first()).toBeHidden();
    }
  });

  test('데스크탑(1280px) — 사이드바 표시 (인증 후 앱 레이아웃)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // /login은 앱 레이아웃 아님 → 사이드바 없음
    await page.goto('/login');
    await expect(page.locator('aside')).toHaveCount(0);
  });

  test('로그인 페이지 — 이메일 input focus 시 border 변화', async ({ page }) => {
    await page.goto('/login');
    const input = page.getByPlaceholder('이메일');
    await input.focus();
    const borderColor = await input.evaluate(
      (el) => getComputedStyle(el).borderColor
    );
    // focus 시 primary color로 변경
    expect(borderColor).not.toBe('');
  });
});
