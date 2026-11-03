import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { SocialLinkCapture } from '../SocialLinkCapture';

const renderer = require('react-test-renderer');
const { act } = renderer;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../ScraveText', () => ({ Text: require('react-native').Text }));

const result = {
  post: {
    url: 'https://www.instagram.com/p/Abcd/',
    author: 'seoulpick',
    caption: '서울 카페 여행 기록',
    selectedIndex: 2,
    images: [],
  },
  captures: [0, 1].map((index) => ({
    imageUrl: `https://scontent.cdninstagram.com/${index}.jpg`,
    imageKind: index === 0 ? 'image' as const : 'video-preview' as const,
    selected: index === 1,
    analysis: {
      category: 'place' as const, title: '서울 카페', summary: '서울 카페', extractedText: '서울 카페',
      tags: ['수집됨', '검증 전', '여행·장소'], links: ['https://www.instagram.com/p/Abcd/'],
      places: [], source: 'instagram' as const, confidence: 0, sourceAccountId: 'seoulpick', sourceIndices: [index],
    },
  })),
};

const textContent = (tree: any) => tree.root.findAll((node: any) => typeof node.children?.[0] === 'string').map((node: any) => node.children.join('')).join('\n');
const button = (tree: any, label: string) => tree.root.findAllByType(TouchableOpacity).find((node: any) => node.props.accessibilityLabel === label);

it('shows exact supported scope and ordered inspection result on native', async () => {
  const inspect = jest.fn().mockResolvedValue(result);
  let tree: any;
  await act(async () => { tree = renderer.create(<SocialLinkCapture inspect={inspect} saveAll={jest.fn()} />); });
  const input = tree.root.findByType(TextInput);
  await act(async () => input.props.onChangeText('https://instagram.com/p/Abcd/?img_index=2'));
  await act(async () => button(tree, '링크 확인').props.onPress());

  expect(inspect).toHaveBeenCalledWith('https://instagram.com/p/Abcd/?img_index=2');
  const text = textContent(tree);
  expect(text).toContain('현재 공개 게시물과 릴스를 지원합니다.');
  expect(text).toContain('수집됨 · 확인 전');
  expect(text).toContain('@seoulpick');
  expect(text).toContain('1 / 2');
  expect(text).toContain('2 / 2 · 선택한 이미지');
  expect(button(tree, '원본 2장 계정에 저장')).toBeTruthy();
  await act(async () => tree.unmount());
});

it('keeps partial progress and retries only the remaining media', async () => {
  const saveAll = jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('network'), { completed: 1 }))
    .mockResolvedValueOnce(2);
  let tree: any;
  await act(async () => { tree = renderer.create(<SocialLinkCapture inspect={jest.fn().mockResolvedValue(result)} saveAll={saveAll} />); });
  await act(async () => tree.root.findByType(TextInput).props.onChangeText('https://instagram.com/p/Abcd/'));
  await act(async () => button(tree, '링크 확인').props.onPress());
  await act(async () => button(tree, '원본 2장 계정에 저장').props.onPress());
  expect(textContent(tree)).toContain('1장은 저장했고 1장은 중단되었습니다.');
  expect(button(tree, '남은 1장 다시 저장')).toBeTruthy();
  await act(async () => button(tree, '남은 1장 다시 저장').props.onPress());
  expect(saveAll).toHaveBeenNthCalledWith(2, result.captures, 1);
  expect(textContent(tree)).toContain('원본 2장을 보관함에 저장했습니다. 아직 확인 전 자료입니다.');
  await act(async () => tree.unmount());
});
