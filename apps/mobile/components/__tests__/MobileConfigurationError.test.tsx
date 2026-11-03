import React from 'react';
import { MobileConfigurationError } from '../MobileConfigurationError';

const renderer = require('react-test-renderer');
const { act } = renderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../ScraveText', () => ({ Text: require('react-native').Text }));

function getText(tree: any): string {
  return tree.root
    .findAll((node: any) => typeof node.children?.[0] === 'string')
    .map((node: any) => node.children.join(''))
    .join('\n');
}

it('shows a controlled setup screen with key names but no secret values', async () => {
  let tree: any;
  await act(async () => {
    tree = renderer.create(
      <MobileConfigurationError
        missingKeys={[
          'EXPO_PUBLIC_SUPABASE_URL=',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY=',
          'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=',
        ]}
      />
    );
  });

  const text = getText(tree);
  expect(text).toContain('앱 설정이 필요합니다');
  expect(text).toContain('EXPO_PUBLIC_SUPABASE_URL=');
  expect(text).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY=');
  expect(text).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=');
  expect(text).toContain('설정을 추가한 뒤 앱을 다시 실행해 주세요.');
  expect(text).not.toContain('example.supabase.co');

  await act(async () => tree.unmount());
});
