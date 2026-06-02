import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Flow 3: 게스트 업로드 & AI 분석
 * 실제 이미지 파일을 업로드해서 분석 모달까지 확인
 */

// 테스트용 1x1 PNG 픽셀 이미지 (base64)
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function createTinyPng(fileName = 'scrave_test.png'): Promise<string> {
  const tmpPath = path.join('/tmp', fileName);
  const buf = Buffer.from(TINY_PNG_B64, 'base64');
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function createTextFile(fileName = 'scrave_not_image.txt'): Promise<string> {
  const tmpPath = path.join('/tmp', fileName);
  fs.writeFileSync(tmpPath, 'not an image');
  return tmpPath;
}

async function mockAnalyze(page: Page) {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category: 'place',
        title: '테스트 장소',
        summary: '테스트용 장소 분석 결과',
        places: [{ name: '테스트 카페', address: '서울시 중구' }],
        extractedText: '',
        links: [],
        tags: ['테스트'],
        source: 'other',
        confidence: 0.9,
      }),
    });
  });
}

async function mockBatchAnalyze(page: Page) {
  await page.route('**/api/analyze-batch', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            category: 'place',
            title: '첫 번째 장소',
            summary: '첫 번째 테스트 결과',
            places: [{ name: '첫 번째 카페', address: '서울시 중구' }],
            extractedText: '',
            links: [],
            tags: ['장소'],
            source: 'other',
            confidence: 0.9,
          },
          {
            category: 'text',
            title: '두 번째 텍스트',
            summary: '두 번째 테스트 결과',
            places: [],
            extractedText: '테스트 텍스트',
            links: [],
            tags: ['텍스트'],
            source: 'other',
            confidence: 0.88,
          },
        ],
      }),
    });
  });
}

async function uploadTinyPngAndSave(page: Page, fileName: string) {
  const imgPath = await createTinyPng(fileName);
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: '스크린샷 업로드' }).click(),
  ]);
  await fileChooser.setFiles(imgPath);
  const saveBtn = page.getByRole('button', { name: /저장/ });
  await expect(saveBtn).toBeVisible({ timeout: 20000 });
  await saveBtn.click();
}

test.describe('게스트 업로드 & AI 분석', () => {
  test('업로드존 클릭 시 파일 picker가 활성화된다', async ({ page }) => {
    await page.goto('/');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    expect(fileChooser).toBeTruthy();
  });

  test('업로드존은 키보드로 파일 picker를 열 수 있다', async ({ page }) => {
    await page.goto('/');
    const uploadButton = page.getByRole('button', { name: '스크린샷 업로드' });
    await uploadButton.focus();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      uploadButton.press('Enter'),
    ]);

    expect(fileChooser).toBeTruthy();
  });

  test('이미지 업로드 시 AnalyzeModal이 열린다', async ({ page }) => {
    await mockAnalyze(page);
    await page.goto('/');
    const imgPath = await createTinyPng();

    // 파일 입력에 직접 세팅
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles(imgPath);

    // 모달 등장 확인 (AI 분석 중 or 완료 or 에러)
    await expect(
      page.getByRole('dialog', { name: 'AI 분석 결과' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('미지원 파일 선택 시 분석 모달을 열지 않고 경고를 표시한다', async ({ page }) => {
    await page.goto('/');
    const textPath = await createTextFile();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles(textPath);

    await expect(page.getByText('지원하지 않는 파일 형식입니다. jpeg, png, webp만 가능합니다.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'AI 분석 결과' })).toHaveCount(0);
  });

  test('게스트 업로드 후 캡처 수 증가', async ({ page }) => {
    await mockAnalyze(page);
    await page.goto('/');
    await uploadTinyPngAndSave(page, 'scrave_single_save.png');

    // 슬롯이 1 줄었는지 확인
    await expect(page.getByText('무료 체험: 2회 남음')).toBeVisible();
    await expect(page.getByText('테스트 장소')).toBeVisible();
  });

  test('게스트 캡처 삭제 시 목록에서 제거되고 체험 횟수가 복구된다', async ({ page }) => {
    await mockAnalyze(page);
    await page.goto('/');
    await uploadTinyPngAndSave(page, 'scrave_delete.png');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('삭제');
      await dialog.accept();
    });
    await page.getByRole('button', { name: '테스트 장소 삭제' }).click();

    await expect(page.getByText('무료 체험: 3회 남음')).toBeVisible();
    await expect(page.getByText('테스트 장소')).toHaveCount(0);
  });

  test('게스트 한도 도달 후 추가 업로드 시 가입 유도 모달을 표시한다', async ({ page }) => {
    await mockAnalyze(page);
    await page.goto('/');

    await uploadTinyPngAndSave(page, 'scrave_limit_1.png');
    await uploadTinyPngAndSave(page, 'scrave_limit_2.png');
    await uploadTinyPngAndSave(page, 'scrave_limit_3.png');

    await expect(page.getByText('체험 한도에 도달했습니다')).toBeVisible();

    const imgPath = await createTinyPng('scrave_limit_4.png');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles(imgPath);

    await expect(page.getByRole('heading', { name: '캡처 3개를 분석했어요!' })).toBeVisible();
    await expect(page.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/login');
  });

  test('여러 이미지 업로드 후 배치 분석 결과를 저장한다', async ({ page }) => {
    await mockBatchAnalyze(page);
    await page.goto('/');
    const firstPath = await createTinyPng('scrave_batch_1.png');
    const secondPath = await createTinyPng('scrave_batch_2.png');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles([firstPath, secondPath]);

    await expect(page.getByRole('dialog', { name: '통합 분석 결과' })).toBeVisible({ timeout: 15000 });
    const saveAllButton = page.getByRole('button', { name: '2개 모두 저장' });
    await expect(saveAllButton).toBeVisible({ timeout: 20000 });
    await saveAllButton.click();

    await expect(page.getByText('첫 번째 장소')).toBeVisible();
    await expect(page.getByText('두 번째 텍스트')).toBeVisible();
    await expect(page.getByText('무료 체험: 1회 남음')).toBeVisible();
  });

  test('게스트 남은 슬롯보다 배치 결과가 많으면 부분 저장하지 않고 가입 유도한다', async ({ page }) => {
    await mockAnalyze(page);
    await mockBatchAnalyze(page);
    await page.goto('/');

    await uploadTinyPngAndSave(page, 'scrave_batch_capacity_1.png');
    await uploadTinyPngAndSave(page, 'scrave_batch_capacity_2.png');
    await expect(page.getByText('무료 체험: 1회 남음')).toBeVisible();

    const firstPath = await createTinyPng('scrave_batch_capacity_over_1.png');
    const secondPath = await createTinyPng('scrave_batch_capacity_over_2.png');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '스크린샷 업로드' }).click(),
    ]);
    await fileChooser.setFiles([firstPath, secondPath]);

    await expect(page.getByRole('dialog', { name: '통합 분석 결과' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: '2개 모두 저장' }).click();

    await expect(page.getByRole('heading', { name: '캡처 3개를 분석했어요!' })).toBeVisible();
    await expect(page.getByText('첫 번째 장소')).toHaveCount(0);
    await expect(page.getByText('두 번째 텍스트')).toHaveCount(0);
    await expect(page.getByText('무료 체험: 1회 남음')).toBeVisible();
  });
});
