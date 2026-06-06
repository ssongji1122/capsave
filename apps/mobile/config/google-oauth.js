const GOOGLE_IOS_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const APP_URL_SCHEMES = ['scrave', 'com.anonymous.scrave'];

function getGoogleIosUrlScheme(clientId) {
  if (typeof clientId !== 'string') return undefined;

  const trimmed = clientId.trim();
  if (!trimmed.endsWith(GOOGLE_IOS_CLIENT_ID_SUFFIX)) return undefined;

  const appId = trimmed.slice(0, -GOOGLE_IOS_CLIENT_ID_SUFFIX.length);
  if (!appId) return undefined;

  return `com.googleusercontent.apps.${appId}`;
}

function getIosUrlSchemeGroups(clientId) {
  const googleIosUrlScheme = getGoogleIosUrlScheme(clientId);
  return googleIosUrlScheme ? [APP_URL_SCHEMES, [googleIosUrlScheme]] : [APP_URL_SCHEMES];
}

module.exports = {
  getGoogleIosUrlScheme,
  getIosUrlSchemeGroups,
};
