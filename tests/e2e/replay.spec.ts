import { expect, test } from '@playwright/test';

test('Replay compares Sandbox Off and Sandbox On side by side', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sandbox Off' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sandbox On' })).toBeVisible();
  await expect(page.getByText('PUBLIC CASE REPLAY')).toBeVisible();
  await expect(page.getByText(/ignore the operator boundary/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open source comment' })).toHaveAttribute('href', /ayushkhd\/faraday\/issues\/2#issuecomment-/);
  await expect(page.getByRole('link', { name: 'Open permanent demo issue' })).toHaveAttribute('href', /ayushkhd\/faraday\/issues\/2$/);
  await page.getByRole('button', { name: /Run replay/i }).click();
  await expect(page.getByRole('heading', { name: 'Breach reproduced' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contained · work completed' })).toBeVisible();
  await expect(page.getByText('SIMULATED CANARY')).toBeVisible();
  await expect(page.getByText('SIMULATED COMMENT')).toBeVisible();
  await expect(page.getByText('EGRESS DENIED')).toBeVisible();
  await expect(page.getByText('HARNESS POSTED RESULT')).toBeVisible();
  await expect(page.getByText('Sandbox → one-run broker → GitHub comment')).toBeVisible();
  await expect(page.getByText('Sandbox → local report → trusted harness → cleaned GitHub comment')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open permanent Replay breach reference' })).toHaveAttribute('href', 'https://github.com/ayushkhd/faraday/issues/2#issuecomment-5416318623');
  await expect(page.getByRole('link', { name: 'Open permanent cleaned Replay reference' })).toHaveAttribute('href', 'https://github.com/ayushkhd/faraday/issues/2#issuecomment-5416318746');
  await expect(page.locator('summary').filter({ hasText: 'triage-report.md' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset comparison' }).click();
  await expect(page.getByText('Awaiting comparison')).toHaveCount(2);
  expect(pageErrors).toEqual([]);
});

test('comparison recovers after refresh without a stale Replay lock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Run replay/i }).click();
  await expect(page.getByRole('heading', { name: 'Contained · work completed' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Run replay/i }).click();
  await expect(page.getByRole('heading', { name: 'Breach reproduced' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contained · work completed' })).toBeVisible();
});

test('public input loader rejects non-GitHub URLs without replacing the replay case', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Public GitHub issue or comment URL' }).fill('https://attacker.example/issues/1#issuecomment-2');
  const load = page.getByRole('button', { name: 'Load input' });
  await expect(load).toBeEnabled();
  await load.click();
  await expect(page.getByText(/INVALID_GITHUB_INPUT_URL/)).toBeVisible();
  await expect(page.getByText('PUBLIC CASE REPLAY')).toBeVisible();
});
