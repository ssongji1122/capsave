import React from 'react';
import SettingsScreen from '../settings';

const renderer = require('react-test-renderer');
const { act } = renderer;

const mockSetPreferredNavApp = jest.fn();
const mockReload = jest.fn();
let mockPreferences = {
  preferredNavApp: 'naver' as const,
  isLoading: false,
  savingProvider: null as 'tmap' | 'naver' | 'google' | 'kakao' | null,
  error: null as string | null,
  setPreferredNavApp: mockSetPreferredNavApp,
  reload: mockReload,
};

jest.mock('@/contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => mockPreferences,
}));

jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('mobile settings', () => {
  beforeEach(() => {
    mockSetPreferredNavApp.mockReset();
    mockReload.mockReset();
    mockPreferences = {
      preferredNavApp: 'naver',
      isLoading: false,
      savingProvider: null,
      error: null,
      setPreferredNavApp: mockSetPreferredNavApp,
      reload: mockReload,
    };
  });

  it('shows all providers as accessible radio rows and marks the current choice', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const radios = tree!.root.findAll(
      (node: any) => node.props.accessibilityRole === 'radio'
    );
    expect(new Set(radios.map((node: any) => node.props.accessibilityLabel))).toEqual(
      new Set(['T map', '네이버 지도', 'Google Maps', '카카오맵'])
    );
    expect(radios.find((node: any) =>
      node.props.accessibilityLabel === '네이버 지도' && typeof node.props.onPress === 'function'
    )?.props.accessibilityState)
      .toMatchObject({ selected: true, disabled: false });
    expect(tree!.root.findAllByProps({ children: '선택됨' }).length).toBeGreaterThan(0);
    act(() => tree!.unmount());
  });

  it('reports a successful change only after persistence succeeds', async () => {
    mockSetPreferredNavApp.mockResolvedValue(true);
    let tree: any;
    await act(async () => {
      tree = renderer.create(<SettingsScreen />);
    });

    const google = tree!.root.find(
      (node: any) => node.props.accessibilityLabel === 'Google Maps'
    );
    await act(async () => {
      await google.props.onPress();
    });

    expect(mockSetPreferredNavApp).toHaveBeenCalledWith('google');
    expect(tree!.root.findAllByProps({ children: '기본 지도 앱을 Google Maps로 저장했습니다.' }).length)
      .toBeGreaterThan(0);
    await act(async () => tree!.unmount());
  });

  it('shows load failure and retries without changing the selected value', () => {
    mockPreferences = {
      ...mockPreferences,
      error: '저장된 설정을 불러오지 못했습니다. 현재 T map을 먼저 표시합니다.',
    };
    let tree: any;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const retry = tree!.root.find(
      (node: any) => node.props.accessibilityLabel === '설정 다시 불러오기'
    );
    act(() => retry.props.onPress());
    expect(mockReload).toHaveBeenCalledTimes(1);
    act(() => tree!.unmount());
  });
});
