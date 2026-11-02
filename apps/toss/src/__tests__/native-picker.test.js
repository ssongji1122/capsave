import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNativeImage } from '../native-picker.js';

function deviceWith(handler, supported = true) {
  const getAlbumItems = handler;
  getAlbumItems.isSupported = () => supported;
  return { getAlbumItems };
}

test('지원하지 않는 토스 버전에서는 앨범을 호출하지 않습니다', async () => {
  let calls = 0;
  const device = deviceWith(async () => { calls++; return []; }, false);
  await assert.rejects(pickNativeImage(device), { code: 'UNSUPPORTED_APP_VERSION' });
  assert.equal(calls, 0);
});

test('앨범 선택을 취소하면 저장할 파일을 만들지 않습니다', async () => {
  assert.equal(await pickNativeImage(deviceWith(async () => [])), undefined);
});

test('사진 한 장만 요청하고 앨범이 반환한 바이트를 유지합니다', async () => {
  const bytes = Uint8Array.from([137,80,78,71,13,10,26,10,0,0]);
  let options;
  const device = deviceWith(async value => {
    options = value;
    return [{ type: 'PHOTO', dataUri: Buffer.from(bytes).toString('base64') }];
  });
  const file = await pickNativeImage(device);
  assert.deepEqual(options, { types: ['PHOTO'], maxCount: 1, base64: true, maxWidth: 4096 });
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
});

test('권한 거부 오류를 화면에서 구분할 수 있게 그대로 전달합니다', async () => {
  const error = Object.assign(new Error('denied'), { code: 'NOT_ALLOWED' });
  await assert.rejects(pickNativeImage(deviceWith(async () => { throw error; })), value => value === error);
});

test('앨범이 반환한 잘못된 이미지 데이터는 거부합니다', async () => {
  await assert.rejects(pickNativeImage(deviceWith(async () => [{ dataUri: 'invalid' }])), /사진|PNG/);
});
