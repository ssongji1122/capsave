import React from 'react';
import { TouchableOpacity } from 'react-native';
import { CaptureSyncNotice } from '../CaptureSyncNotice';

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

it('renders nothing without a sync message', async () => {
  let tree: any;
  await act(async () => {
    tree = renderer.create(<CaptureSyncNotice message={null} onRetry={jest.fn()} retrying={false} />);
  });

  expect(tree.toJSON()).toBeNull();
  await act(async () => tree.unmount());
});

it('announces the sync state and provides a 44-point retry action', async () => {
  const onRetry = jest.fn();
  let tree: any;
  await act(async () => {
    tree = renderer.create(
      <CaptureSyncNotice message="오프라인 사본을 보여 주고 있습니다." onRetry={onRetry} retrying={false} />
    );
  });

  expect(getText(tree)).toContain('오프라인 사본을 보여 주고 있습니다.');
  const button = tree.root.findByType(TouchableOpacity);
  expect(button.props.accessibilityLabel).toBe('보관함 다시 불러오기');
  expect(button.props.style).toEqual(expect.arrayContaining([
    expect.objectContaining({ minHeight: 44 }),
  ]));
  await act(async () => button.props.onPress());
  expect(onRetry).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});
