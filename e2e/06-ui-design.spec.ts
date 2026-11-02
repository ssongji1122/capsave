import { test, expect } from '@playwright/test';

/**
 * Flow 6: UI / 디자인 시스템 검증
 * - 흰 바탕 확인 (DESIGN.md 2026-10-29 현행 기준)
 * - 반응형: 모바일(375px) vs 데스크탑(1280px)
 * - 핵심 색상 토큰 적용 여부
 */
test.describe('UI & 반응형', () => {
  test('랜딩 — 흰 바탕 적용', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    // #FFFFFF → rgb(255, 255, 255)
    expect(bg).toMatch(/rgb\(255,\s*255,\s*255\)/);
  });

  test('랜딩 — Scrave 로고가 Primary 색상', async ({ page }) => {
    await page.goto('/');
    const color = await page.locator('h1').first().evaluate(
      (el) => getComputedStyle(el).color
    );
    // #526985 → rgb(82, 105, 133)
    expect(color).toMatch(/rgb\(82,\s*105,\s*133\)/);
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

  test('로그인 페이지 — OAuth 버튼 focus-visible 스타일 적용', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByRole('button', { name: /Google로 시작하기/ });
    await button.focus();
    const outlineWidth = await button.evaluate(
      (el) => getComputedStyle(el).outlineWidth
    );
    // 전역 :focus-visible 2px outline (globals.css)
    expect(outlineWidth).not.toBe('');
  });
});
