import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inspectInstagramEmbed,
  normalizeInstagramPostUrl,
} from './social-link.mjs';

const INSTAGRAM_URL =
  'https://www.instagram.com/p/DbUbg03k4xj/?img_index=2&igsh=test';

const EMBED_HTML = `
  <div class="Caption">
    <a data-log-event="captionProfileClick">luxmag.kr</a><br /><br />
    예비 마케터가 역모집 영상으로 기업의 연락을 받은 취업 사례입니다.
    기존 체계를 뚫는 아이디어와 콘텐츠 전략을 소개합니다.
    <div class="CaptionComments"></div>
  </div>
  <script>
    {\\"is_video\\":false,\\"display_url\\":\\"https:\\/\\/cdn.example.com\\/first.jpg?token=one\\"}
    {\\"is_video\\":false,\\"display_url\\":\\"https:\\/\\/cdn.example.com\\/second.jpg?token=two\\"}
  </script>
`;

test('normalizes an Instagram post URL without losing the selected slide', () => {
  assert.deepEqual(normalizeInstagramPostUrl(INSTAGRAM_URL), {
    platform: 'instagram',
    shortcode: 'DbUbg03k4xj',
    mediaKind: 'p',
    selectedIndex: 2,
    canonicalUrl: 'https://www.instagram.com/p/DbUbg03k4xj/',
    embedUrl: 'https://www.instagram.com/p/DbUbg03k4xj/embed/captioned/',
  });
});

test('extracts original media and routes the post to the marketing library', () => {
  const result = inspectInstagramEmbed(INSTAGRAM_URL, EMBED_HTML);

  assert.equal(result.author, 'luxmag.kr');
  assert.equal(result.media.length, 2);
  assert.equal(result.selectedMedia?.index, 2);
  assert.equal(result.selectedMedia?.url, 'https://cdn.example.com/second.jpg?token=two');
  assert.equal(result.route.kind, 'marketing_reference');
  assert.equal(result.route.destination, 'marketing-library');
  assert.equal(result.promotion.status, 'captured');
  assert.match(result.caption, /역모집 영상/);
});

test('does not substitute another image when the requested slide is missing', () => {
  const result = inspectInstagramEmbed(
    'https://www.instagram.com/p/DbUbg03k4xj/?img_index=3',
    EMBED_HTML
  );

  assert.equal(result.source.selectedIndex, 3);
  assert.equal(result.selectedMedia, null);
});

test('rejects unrelated or malformed URLs', () => {
  assert.throws(
    () => normalizeInstagramPostUrl('https://example.com/post/DbUbg03k4xj'),
    /지원하지 않는 링크/
  );
});
