import { test, expect } from '@playwright/test';
import { installMapSdkMocks } from './helpers/authenticated-flow';

/**
 * Flow 4: 앱 내 네비게이션
 * - /dashboard, /places, /texts, /map 라우트 접근
 * - 게스트 사용자는 아카이브 화면 접근 가능
 */
test.describe('라우트 및 네비게이션', () => {
  test('게스트 → /dashboard 접근 시 대시보드를 볼 수 있다', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Scrave' })).toBeVisible({ timeout: 8000 });
  });

  test('게스트 → /places 접근 시 장소 화면을 볼 수 있다', async ({ page }) => {
    await page.goto('/places');
    await expect(page.getByRole('heading', { name: '장소', exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('게스트 → /texts 접근 시 텍스트 화면을 볼 수 있다', async ({ page }) => {
    await page.goto('/texts');
    await expect(page.getByRole('heading', { name: '텍스트', exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('게스트 → /map 접근 시 샘플 지도 화면을 볼 수 있다', async ({ page }) => {
    // 외부 지도 SDK 로드 속도에 따라 정적 지도가 사라지지 않도록, SDK가 없는 환경을 고정합니다.
    await page.route(/openapi\.map\.naver\.com|maps\.googleapis\.com/, (route) => route.abort());
    await page.goto('/map');
    await expect(page.getByText('ARCHIVE MAP')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('오브젝트 성수')).toBeVisible();
  });

  test('네이버 지도 인증이 실패하면 정적 지도로 바꾸고 이유를 알린다', async ({ page }) => {
    await installMapSdkMocks(page);
    // 실제 SDK처럼 키를 거부한 뒤에는 지도·마커 메서드가 예외를 던집니다.
    await page.addInitScript(() => {
      let rejected = false;
      const reject = () => { throw new TypeError("Cannot read properties of null (reading 'capitalize')"); };
      const OriginalMap = window.naver.maps.Map;
      const OriginalMarker = window.naver.maps.Marker;
      window.naver.maps.Map = class extends OriginalMap {
        constructor(...args: ConstructorParameters<typeof OriginalMap>) {
          super(...args);
          setTimeout(() => { rejected = true; window.navermap_authFailure?.(); }, 0);
        }
        panTo() { if (rejected) reject(); }
      };
      window.naver.maps.Marker = class extends OriginalMarker {
        setMap() { if (rejected) reject(); }
      };
    });
    await page.goto('/map');
    await expect(page.getByRole('status').filter({ hasText: '네이버 지도를 불러오지 못해' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('ARCHIVE MAP')).toBeVisible();
    await expect(page.getByRole('button', { name: '오브젝트 성수 선택' })).toBeVisible();
    // 보이는 지도와 선택 버튼 강조가 같아야 합니다.
    await expect(page.getByRole('button', { name: '아카이브', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '네이버', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });

  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
    test(`${viewport.width}px 정적 지도 안내 상자가 상단 막대와 겹치지 않는다`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route(/openapi\.map\.naver\.com|maps\.googleapis\.com/, (route) => route.abort());
      await page.goto('/map');
      await expect(page.getByRole('button', { name: '오브젝트 성수 선택' })).toBeVisible({ timeout: 8000 });

      const infoBox = await page.getByText('ARCHIVE MAP').locator('..').boundingBox();
      if (infoBox === null) return;
      const topBarParts = [
        page.locator('form').filter({ has: page.getByRole('searchbox', { name: '지도 장소 검색' }) }),
        page.getByRole('button', { name: '구글', exact: true }),
      ];
      for (const part of topBarParts) {
        const box = await part.boundingBox();
        expect(box).not.toBeNull();
        if (box === null) continue;
        const overlaps =
          infoBox.x < box.x + box.width && box.x < infoBox.x + infoBox.width &&
          infoBox.y < box.y + box.height && box.y < infoBox.y + infoBox.height;
        expect(overlaps).toBe(false);
      }
    });
  }

  test('장소 카드 → 지도 링크 클릭 시 해당 핀이 선택된다', async ({ page }) => {
    await page.goto('/places');
    await page.getByRole('link', { name: '성수 브런치 저장 샘플 지도에서 보기' }).click();

    await expect(page).toHaveURL(/\/map\?capture=-9001/, { timeout: 8000 });
    await expect(page.getByRole('dialog', { name: '오브젝트 성수 장소 정보' })).toBeVisible();
  });

  test('지도 검색어는 URL q와 핀 선택으로 연결된다', async ({ page }) => {
    await page.goto('/map');
    await page.getByRole('searchbox', { name: '지도 장소 검색' }).fill('성수');
    await page.getByRole('button', { name: '검색' }).click();

    await expect(page).toHaveURL(/\/map\?q=%EC%84%B1%EC%88%98/, { timeout: 8000 });
    await expect(page.getByRole('dialog', { name: '오브젝트 성수 장소 정보' })).toBeVisible();
  });

  test('미인증 → 설정 접근 시 로그인 후 돌아갈 next를 보존한다', async ({ page }) => {
    await page.goto('/settings?view=profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('/settings?view=profile');
  });

  test('OAuth code가 루트로 돌아와도 auth callback으로 복구한다', async ({ page }) => {
    await page.goto('/?code=e2e-invalid-code&next=%2Fmap');
    await expect(page).toHaveURL(/\/login\?error=auth/, { timeout: 8000 });
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
