import { defineConfig } from '@apps-in-toss/web-framework/config';

const appName = process.env.TOSS_APP_NAME;
if (!appName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(appName)) {
  throw new Error('TOSS_APP_NAME= 값에 콘솔의 앱 이름을 지정해야 합니다. 로컬 번들 검사에는 scrave-capture-pilot을 사용할 수 있습니다.');
}

export default defineConfig({
  appName,
  brand: { primaryColor: '#A83F20' },
  permissions: [{ name: 'photos', access: 'read' }],
  navigationBar: {
    withBackButton: true, withHomeButton: true, withTitle: true,
    transparentBackground: false, theme: 'light',
  },
  webView: { bounces: false, pullToRefreshEnabled: false, overScrollMode: 'never' },
  webBundleDir: 'dist-toss',
});
