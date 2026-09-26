import { test, expect } from '@playwright/test';
import {
  createCaptureRows,
  createTinyPng,
  E2E_AUTH_HEADER,
  installMapSdkMocks,
  mockAuthenticatedBackend,
} from './helpers/authenticated-flow';

test.use({
  extraHTTPHeaders: {
    [E2E_AUTH_HEADER]: '1',
  },
});

test.describe('인증 사용자 핵심 플로우', () => {
  test('대시보드에서 AI 분석 결과를 저장하고 목록에 반영한다', async ({ page }) => {
    await mockAuthenticatedBackend(page, createCaptureRows());
    await page.goto('/dashboard');

    const imgPath = await createTinyPng('scrave_authenticated_save.png');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles(imgPath);

    const dialog = page.getByRole('dialog', { name: 'AI 분석 결과' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText('AI 저장 테스트 장소')).toBeVisible({ timeout: 15000 });
    await dialog.getByRole('button', { name: '저장하기' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('AI 저장 테스트 장소')).toBeVisible();
    await expect(page.getByAltText('AI 저장 테스트 장소 - AI 테스트 카페')).toBeVisible();
  });

  test('장소마다 협찬·AI 음성·얼굴 위주를 거른 후기와 영상을 불러온다', async ({ page }) => {
    await mockAuthenticatedBackend(page, createCaptureRows());
    let requestedName: unknown = null;
    await page.route('**/api/place-reviews', async (route) => {
      requestedName = route.request().postDataJSON().name;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          naver: {
            status: 'ok',
            searchUrl: 'https://search.naver.com/search.naver?query=test',
            posts: [
              {
                title: '성수 테스트 카페 내돈내산 후기',
                url: 'https://blog.naver.com/e2e/1',
                blogger: 'e2e',
                date: '2026-08-01',
                excerpt: '둘이 가서 커피 두 잔 1만 원',
                score: 8,
                reasons: ['2026년 8월 작성', '내돈내산', '가격'],
              },
            ],
          },
          youtube: {
            status: 'no-key',
            searchUrl: 'https://www.youtube.com/results?search_query=test',
            videos: [],
            dropped: [],
          },
        }),
      });
    });

    await page.goto('/places');
    await page.getByText('성수 카페 저장').click();
    await page.getByRole('button', { name: /골라 둔 후기·영상/ }).first().click();

    await expect(page.getByRole('link', { name: '성수 테스트 카페 내돈내산 후기' })).toBeVisible();
    await expect(page.getByText('YouTube API 키가 아직 없어 골라 드리지 못했습니다.')).toBeVisible();
    expect(requestedName).toBe('성수 테스트 카페');
  });

  test('저장된 장소가 지도에 표시되고 지도 공급자 전환과 장소 팝업이 동작한다', async ({ page }) => {
    let geocodeCalled = false;
    await installMapSdkMocks(page);
    await mockAuthenticatedBackend(page, createCaptureRows());
    await page.route('**/api/geocode', async (route) => {
      geocodeCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lat: 37.5663,
          lng: 126.9918,
          formattedAddress: '서울 중구 을지로',
        }),
      });
    });

    await page.goto('/map');

    await expect(page.getByText('2개 장소')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /성수 테스트 카페/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /을지로 테스트 식당/ })).toBeVisible();
    expect(geocodeCalled).toBe(true);

    await page.getByRole('button', { name: /성수 테스트 카페/ }).click();
    await expect(page.getByRole('dialog', { name: '성수 테스트 카페 장소 정보' })).toBeVisible();
    await expect(page.getByRole('link', { name: /길찾기/ })).toBeVisible();
    await page.getByRole('button', { name: '팝업 닫기' }).click();
    await expect(page.getByRole('dialog', { name: '성수 테스트 카페 장소 정보' })).toHaveCount(0);

    await page.getByRole('button', { name: /구글/ }).click();
    await expect(page.getByText('2개 장소')).toBeVisible();
  });
});
