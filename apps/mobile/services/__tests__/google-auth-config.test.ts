import { resolveGoogleAuthConfiguration } from '../google-auth-config';

describe('resolveGoogleAuthConfiguration', () => {
  it('requires the iOS client ID on iOS even when the generic client ID exists', () => {
    expect(resolveGoogleAuthConfiguration(
      'ios',
      { googleClientId: 'web-client-id' },
      {}
    )).toEqual({
      status: 'missing',
      missingKeys: ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID='],
    });
  });

  it('accepts the iOS client ID from Expo extra', () => {
    expect(resolveGoogleAuthConfiguration(
      'ios',
      { googleIosClientId: ' ios-client-id ' },
      {}
    )).toEqual({ status: 'ready' });
  });

  it('requires the generic client ID on Android and web', () => {
    expect(resolveGoogleAuthConfiguration('android', {}, {})).toEqual({
      status: 'missing',
      missingKeys: ['EXPO_PUBLIC_GOOGLE_CLIENT_ID='],
    });
    expect(resolveGoogleAuthConfiguration('web', {}, {})).toEqual({
      status: 'missing',
      missingKeys: ['EXPO_PUBLIC_GOOGLE_CLIENT_ID='],
    });
  });

  it('accepts the generic client ID from the environment', () => {
    expect(resolveGoogleAuthConfiguration('android', {}, {
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: 'android-client-id',
    })).toEqual({ status: 'ready' });
  });
});
