import { expect, test } from '@playwright/test';

test('Replay compares Sandbox Off and Sandbox On side by side', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sandbox Off' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sandbox On' })).toBeVisible();
  await expect(page.getByText('PUBLIC CASE REPLAY')).toBeVisible();
  await expect(page.getByText(/author is not widely recognized/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open source issue' })).toHaveAttribute('href', /ukend0464\/pacman\/issues\/1/);
  await page.getByRole('button', { name: /Run comparison/i }).click();
  await expect(page.getByRole('heading', { name: 'Breach reproduced' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contained · work completed' })).toBeVisible();
  await expect(page.getByText('SIMULATED CANARY')).toBeVisible();
  await expect(page.getByText('EGRESS DENIED')).toBeVisible();
  await expect(page.getByText('0 PULL REQUESTS')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open historical outcome PR' })).toHaveAttribute('href', /ukend0464\/pacman\/pull\/2/);
  await expect(page.getByText(/Replay did not create this PR/)).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'triage-report.md' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset comparison' }).click();
  await expect(page.getByText('Awaiting comparison')).toHaveCount(2);
  expect(pageErrors).toEqual([]);
});

test('comparison recovers after refresh without a stale Replay lock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Run comparison/i }).click();
  await expect(page.getByRole('heading', { name: 'Contained · work completed' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Run comparison/i }).click();
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
