import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? { channel: 'chrome' } : {}),
      },
    },
  ],
  webServer: {
    command: 'scrave_repo=$(dirname "$(git rev-parse --git-common-dir)"); set -a; if [ -f "$scrave_repo/apps/web/.env.local" ]; then . "$scrave_repo/apps/web/.env.local"; fi; set +a; SCRAVE_E2E_AUTH_BYPASS=1 NEXT_PUBLIC_SCRAVE_E2E_CLIENT_BYPASS=1 npm run dev --workspace=@scrave/web',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
