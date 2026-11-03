import React from 'react';
import type { AnalysisResult } from '@/services/ai-analyzer';
import { AnalysisResultEditor } from '../AnalysisResultEditor';

const renderer = require('react-test-renderer');
const { act } = renderer;

const RESULT: AnalysisResult = {
  category: 'place',
  title: '서울 여행',
  summary: '하루 코스',
  places: [{ name: '서울시청', address: '서울 중구' }],
  extractedText: '원문',
  links: [],
  tags: [],
  source: 'instagram',
  confidence: 0.9,
  sourceAccountId: null,
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AnalysisResultEditor', () => {
  it('exposes labeled inputs and accessible category radios', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AnalysisResultEditor value={RESULT} onChange={jest.fn()} error={null} />);
    });

    expect(tree.root.findByProps({ accessibilityLabel: '제목' }).props.value).toBe('서울 여행');
    expect(tree.root.findByProps({ accessibilityLabel: '요약' }).props.value).toBe('하루 코스');
    expect(tree.root.findByProps({ accessibilityLabel: '추출한 글' }).props.value).toBe('원문');
    expect(tree.root.findByProps({ accessibilityLabel: '장소' }).props.accessibilityState.selected).toBe(true);
    expect(tree.root.findByProps({ accessibilityLabel: '텍스트' }).props.accessibilityState.selected).toBe(false);
    act(() => tree.unmount());
  });

  it('passes title changes and add-place actions to the parent draft', () => {
    const onChange = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<AnalysisResultEditor value={RESULT} onChange={onChange} error={null} />);
    });

    act(() => tree.root.findByProps({ accessibilityLabel: '제목' }).props.onChangeText('수정한 제목'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ title: '수정한 제목' }));

    act(() => tree.root.findByProps({ accessibilityLabel: '장소 추가' }).props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      places: [RESULT.places[0], { name: '', address: '', date: '' }],
    }));
    act(() => tree.unmount());
  });

  it('announces validation errors', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AnalysisResultEditor value={RESULT} onChange={jest.fn()} error="제목을 입력해 주세요." />);
    });

    expect(tree.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('제목을 입력해 주세요.');
    act(() => tree.unmount());
  });
});
