const { getGoogleIosUrlScheme, getIosUrlSchemeGroups } = require('../google-oauth');

describe('getGoogleIosUrlScheme', () => {
  it('converts a Google iOS client ID into the URL scheme expected by iOS', () => {
    expect(getGoogleIosUrlScheme('12345-abc.apps.googleusercontent.com')).toBe(
      'com.googleusercontent.apps.12345-abc'
    );
  });

  it('ignores missing or malformed client IDs', () => {
    expect(getGoogleIosUrlScheme(undefined)).toBeUndefined();
    expect(getGoogleIosUrlScheme('')).toBeUndefined();
    expect(getGoogleIosUrlScheme('not-a-google-ios-client-id')).toBeUndefined();
  });

  it('keeps app URL schemes separate from the Google callback scheme', () => {
    expect(getIosUrlSchemeGroups('12345-abc.apps.googleusercontent.com')).toEqual([
      ['scrave', 'com.anonymous.scrave'],
      ['com.googleusercontent.apps.12345-abc'],
    ]);
  });
});
