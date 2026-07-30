#!/usr/bin/env node

import { inspectSocialLink } from './lib/social-link.mjs';

const sourceUrl = process.argv[2];

if (!sourceUrl) {
  console.error('사용법: node scripts/inspect-social-link.mjs "<URL>"');
  process.exitCode = 1;
} else {
  try {
    const result = await inspectSocialLink(sourceUrl);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : '링크 분석에 실패했습니다.');
    process.exitCode = 1;
  }
}
