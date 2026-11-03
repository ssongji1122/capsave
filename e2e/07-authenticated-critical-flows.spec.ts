import { test, expect } from '@playwright/test';
import path from 'path';
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

const ANALYZE_DELAY_MS = 800;

test.describe('인증 사용자 핵심 플로우', () => {
  test('Instagram 링크의 원문과 전체 미디어를 순서대로 검사하고 저장한다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await mockAuthenticatedBackend(page, createCaptureRows());
    const downloaded: string[] = [];
    let uploadCount = 0;

    await page.route('https://scontent.cdninstagram.com/**', async (route) => {
      const fixture = route.request().url().includes('two.jpg') ? '11-live-place-filter.jpg' : '15-live-map.jpg';
      await route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        path: path.join(process.cwd(), 'apps/web/public/reports/sticker-check-assets', fixture),
      });
    });
    await page.route('**/api/social-link?src=**', async (route) => {
      const sourceUrl = new URL(route.request().url()).searchParams.get('src') ?? '';
      downloaded.push(sourceUrl);
      const fixture = sourceUrl.includes('two.jpg') ? '11-live-place-filter.jpg' : '15-live-map.jpg';
      await route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        path: path.join(process.cwd(), 'apps/web/public/reports/sticker-check-assets', fixture),
      });
    });
    await page.route('**/api/social-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          post: {
            url: 'https://www.instagram.com/p/Abcd/',
            author: 'seoulpick',
            caption: '서울 카페 여행 기록',
            selectedIndex: 2,
            images: [
              { url: 'https://scontent.cdninstagram.com/one.jpg', kind: 'image' },
              { url: 'https://scontent.cdninstagram.com/two.jpg', kind: 'video-preview' },
            ],
          },
          captures: [0, 1].map((index) => ({
            imageUrl: `https://scontent.cdninstagram.com/${index === 0 ? 'one' : 'two'}.jpg`,
            imageKind: index === 0 ? 'image' : 'video-preview',
            selected: index === 1,
            analysis: {
              category: 'place', title: '서울 카페 여행 기록', summary: '서울 카페 여행 기록',
              extractedText: '서울 카페 여행 기록', tags: ['수집됨', '검증 전', '여행·장소'],
              links: ['https://www.instagram.com/p/Abcd/'], places: [], source: 'instagram',
              confidence: 0, sourceAccountId: 'seoulpick', sourceIndices: [index],
            },
          })),
        }),
      });
    });
    await page.route('**/api/upload', async (route) => {
      if (route.request().method() === 'POST') uploadCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ path: `e2e-user-1/link-${uploadCount}.png` }),
      });
    });

    await page.goto('/import');
    await page.getByLabel('Instagram 게시물 링크').fill('https://instagram.com/p/Abcd/?img_index=2');
    await page.getByRole('button', { name: '링크 확인' }).click();

    await expect(page.getByText('@seoulpick')).toBeVisible();
    await expect(page.getByText('2 / 2 · 선택한 이미지')).toBeVisible();
    await expect(page.getByText('수집됨 · 확인 전')).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth)).toBe(false);
    if (process.env.SCRAVE_CAPTURE_STATUS_SCREENSHOT === '1') {
      await page.locator('nav').last().evaluate((element) => {
        (element as HTMLElement).style.display = 'none';
      });
      await page.getByRole('region', { name: 'Instagram 게시물 저장' }).screenshot({
        path: '_dogfood/assets/2026-11-04_scrave-product-status/link-import-mobile.png',
      });
    }

    await page.getByRole('button', { name: '원본 2장 계정에 저장' }).click();
    await expect(page.getByText('원본 2장과 본문·작성자·출처 링크를 보관함에 저장했습니다. 아직 확인 전 자료입니다.')).toBeVisible();
    expect(downloaded).toEqual([
      'https://scontent.cdninstagram.com/two.jpg',
      'https://scontent.cdninstagram.com/one.jpg',
    ]);
    await page.getByRole('link', { name: '보관함에서 보기' }).click();
    await expect(page.getByText('서울 카페 여행 기록').first()).toBeVisible();
    await expect(page.getByAltText('서울 카페 여행 기록 · 올린 캡처 1/2')).toBeVisible();
  });

  test('대시보드에서 AI 분석 결과를 저장하고 목록에 반영한다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await mockAuthenticatedBackend(page, createCaptureRows());
    // 분석 중 모달을 관찰할 수 있도록 분석 응답을 잠시 늦춥니다(응답 본문은 헬퍼의 모킹을 그대로 사용).
    await page.route('**/api/analyze', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ANALYZE_DELAY_MS));
      await route.fallback();
    });
    await page.goto('/dashboard');

    const imgPath = await createTinyPng('scrave_authenticated_save.png');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles(imgPath);

    const dialog = page.getByRole('dialog', { name: '분석 내용을 확인해 주세요' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect.poll(() => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    await dialog.getByRole('button', { name: '내용 수정' }).click();
    await dialog.getByLabel('제목').fill('사용자가 고친 장소');
    await dialog.getByRole('button', { name: '수정 완료' }).click();
    await dialog.getByRole('button', { name: '확인하고 저장' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText('사용자가 고친 장소')).toBeVisible();
    // 카드 사진 대체 텍스트는 갤러리 형식(제목 · 이미지 종류 번호/전체)을 따릅니다(CaptureGallery.tsx).
    await expect(page.getByAltText('사용자가 고친 장소 · 올린 캡처 1/1')).toBeVisible();
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
    // 후기·영상은 카드의 「더 보기」 안에 있습니다(DECISIONS.md 2026-11-01).
    const card = page.locator('article').filter({ hasText: '성수 카페 저장' });
    await card.getByRole('button', { name: '더 보기' }).click();
    await card.getByRole('button', { name: /이 장소의 후기·영상/ }).first().click();

    await expect(page.getByRole('link', { name: '성수 테스트 카페 내돈내산 후기' })).toBeVisible();
    await expect(page.getByText('YouTube API 키가 아직 없어 골라 드리지 못했습니다.')).toBeVisible();
    expect(requestedName).toBe('성수 테스트 카페');
  });

  test('저장된 장소가 지도에 표시되고 지도 공급자 전환과 장소 팝업이 동작한다', async ({ page }) => {
    const geocodedCaptureIds: number[] = [];
    await installMapSdkMocks(page);
    await mockAuthenticatedBackend(page, createCaptureRows());
    await page.route('**/api/geocode/capture', async (route) => {
      const { captureId } = route.request().postDataJSON() as { captureId: number };
      geocodedCaptureIds.push(captureId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          captureId,
          places: [{
            name: '을지로 테스트 식당',
            address: '서울 중구 을지로',
            lat: 37.5663,
            lng: 126.9918,
            geocodedAt: new Date().toISOString(),
          }],
        }),
      });
    });

    await page.goto('/map');

    await expect(page.getByText('2개 장소')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /성수 테스트 카페/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /을지로 테스트 식당/ })).toBeVisible();
    // Only the capture without coordinates is sent for geocoding.
    expect(geocodedCaptureIds).toEqual([502]);

    await page.getByRole('button', { name: /성수 테스트 카페/ }).click();
    await expect(page.getByRole('dialog', { name: '성수 테스트 카페 장소 정보' })).toBeVisible();
    await expect(page.getByRole('link', { name: /길찾기/ })).toBeVisible();
    await page.getByRole('button', { name: '팝업 닫기' }).click();
    await expect(page.getByRole('dialog', { name: '성수 테스트 카페 장소 정보' })).toHaveCount(0);

    await page.getByRole('button', { name: /구글/ }).click();
    await expect(page.getByText('2개 장소')).toBeVisible();
  });

  test('기본 내비게이션 앱을 저장하고 새로고침 뒤에도 같은 선택을 복원한다', async ({ page }) => {
    await mockAuthenticatedBackend(page, createCaptureRows());
    await page.goto('/settings');

    const naver = page.getByRole('radio', { name: '네이버 지도' });
    const google = page.getByRole('radio', { name: 'Google Maps' });
    await expect(naver).toHaveAttribute('aria-checked', 'true');

    await google.click();
    await expect(page.getByRole('status')).toContainText('기본 지도 앱을 Google Maps로 저장했습니다.');
    await expect(google).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(page.getByRole('radio', { name: 'Google Maps' })).toHaveAttribute('aria-checked', 'true');
  });
});
