import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImage, makeCapture, filterCaptures, albumImage, MAX_IMAGE_BYTES } from '../archive.js';
const png = new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0])], '테스트.png', {type:'image/png'});
test('이미지 원본과 이름을 유지하고 분류와 메모를 강제하지 않습니다', async () => {
 const capture = await makeCapture(png);
 assert.equal(capture.image, png);
 assert.equal(capture.filename, '테스트.png');
 assert.equal(capture.section, 'unfiled');
 assert.equal(capture.note, '');
 assert.equal(capture.id, (await makeCapture(png)).id);
});
test('파일 이름과 확장자만으로 이미지를 신뢰하지 않습니다', async () => {
 await assert.rejects(validateImage(new File(['<svg/>'], 'fake.png', {type:'image/png'})), /PNG|JPEG|WebP/);
 await assert.rejects(validateImage(new File([], 'empty.png')), /비어/);
 await assert.rejects(validateImage(new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)])), /10MB/);
});
test('네이티브 앨범 응답의 원본 바이트를 보존합니다', async () => {
 const encoded = Buffer.from(await png.arrayBuffer()).toString('base64');
 for (const data of [encoded, `data:image/png;base64,${encoded}`]) {
  const file = await albumImage(data);
  assert.equal(file.type, 'image/png');
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), Buffer.from(await png.arrayBuffer()));
 }
 await assert.rejects(albumImage('https://invalid/image.png'), /사진을 읽/);
});
test('제목·메모·원본 이름에서 검색하고 선택한 분류만 보여 줍니다', () => {
 const records = [{id:'a', title:'제주', note:'바다', filename:'original.png', section:'places'}, {id:'b', title:'책', note:'선물', filename:'book.png', section:'shopping'}];
 assert.deepEqual(filterCaptures(records,' 바다 ','all').map(x=>x.id), ['a']);
 assert.deepEqual(filterCaptures(records,'ORIGINAL','all').map(x=>x.id), ['a']);
 assert.deepEqual(filterCaptures(records,'','shopping').map(x=>x.id), ['b']);
 assert.equal(filterCaptures(records,'제주','shopping').length,0);
});
