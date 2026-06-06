export const E2E_AUTH_BYPASS_ENV_VALUE = '1';
export const E2E_AUTH_BYPASS_HEADER = 'x-scrave-e2e-auth';

export function shouldBypassAuthForE2E(envValue: string | undefined, headerValue: string | null): boolean {
  return envValue === E2E_AUTH_BYPASS_ENV_VALUE && headerValue === E2E_AUTH_BYPASS_ENV_VALUE;
}
