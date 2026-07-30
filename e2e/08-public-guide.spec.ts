import { expect, test } from '@playwright/test';

const GUIDE_PATH = '/g/uluwatu-afterglow';

test.describe('공개 여행 가이드', () => {
  test('로그인 없이 울루와뚜 가이드와 확인 자료를 읽을 수 있다', async ({ page }) => {
    await page.goto(GUIDE_PATH);

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '울루와뚜, 하루의 끝을 따라가는 세 곳',
      })
    ).toBeVisible();
    await expect(page.getByText('3곳', { exact: true })).toBeVisible();
    await expect(page.getByText('6개', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Single Fin', exact: true })
    ).toBeVisible();
    await expect(page.locator('img[alt$="장소 사진"]')).toHaveCount(3);
    expect(
      await page
        .locator('img[alt$="장소 사진"]')
        .evaluateAll((images) => images.map((image) => image.getAttribute('loading')))
    ).toEqual(['eager', 'eager', 'eager']);
    await expect(
      page.getByRole('img', { name: 'Pantai Padang Padang 장소 사진' })
    ).toBeVisible();
    await expect(page.locator('a[aria-label*="사진 출처"]')).toHaveCount(3);
    await expect(page.locator('img[alt$="미리보기"]')).toHaveCount(6);
    await expect(page.getByAltText('Single Fin Bali 절벽 바 미리보기')).toBeVisible();
    await expect(page.locator('a[href*="google.com/maps"]')).toHaveCount(3);
    await expect(page.locator('a[href*="map.kakao.com"]')).toHaveCount(0);
    await expect(page.locator('a[href*="map.naver.com"]')).toHaveCount(0);
    await expect(page.locator('a[href*="tmap.life"]')).toHaveCount(0);
  });

  test('지구본에서 현지 지도로 전환하고 장소 핀을 선택할 수 있다', async ({ page }) => {
    await page.goto(GUIDE_PATH);

    await page.getByRole('button', { name: '현지 지도', exact: true }).click();
    await expect(
      page.getByRole('button', { name: '현지 지도', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');

    const pins = page.locator('button[aria-label$="선택"]');
    await expect(pins).toHaveCount(3);

    await page
      .getByRole('button', { name: '3. Single Fin 선택', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: '3. Single Fin 선택', exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#place-single-fin')).toBeInViewport();
  });

  test('모바일 화면에서 가로 넘침 없이 공유할 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(GUIDE_PATH);

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    await expect(page.getByRole('button', { name: '가이드 공유' }).first()).toBeVisible();
  });

  test('공유 미리보기 메타데이터와 정식 주소가 연결돼 있다', async ({ page }) => {
    await page.goto(GUIDE_PATH);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://scrave.vercel.app/g/uluwatu-afterglow'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /opengraph-image/
    );
  });
});
