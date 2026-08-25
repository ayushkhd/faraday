import { expect, test } from '@playwright/test';

test('protected replay proves both walls and resets', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('/');
  await expect(page.getByText('Same agent.')).toBeVisible();
  await expect(page.getByText('REPLAY', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Run fixed issue/ }).click();
  await expect(page.getByRole('heading', { name: 'Attack contained.' })).toBeVisible();
  await expect(page.getByText('Least privilege', { exact: true })).toBeVisible();
  await expect(page.getByText('Egress wall', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset replay' }).click();
  await expect(page.getByText('Machine evidence will appear here.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('completed Replay recovers after a refresh without an empty response', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Run fixed issue/ }).click();
  await expect(page.getByRole('heading', { name: 'Attack contained.' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Run fixed issue/ }).click();
  await expect(page.getByRole('heading', { name: 'Attack contained.' })).toBeVisible();
});

test('unsafe replay shows constrained publication proof and locks controls while running', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('/');
  const unsafe = page.getByRole('button', { name: /Containment off/ });
  await unsafe.click();
  await expect(unsafe).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Run fixed issue/ }).click();
  await expect(page.getByRole('button', { name: /Containment on/ })).toBeDisabled({ timeout: 1_000 });
  await expect(page.getByRole('heading', { name: 'Boundary breached.' })).toBeVisible();
  await expect(page.getByText('Fake canary published in a real PR')).toBeVisible();
  await expect(page.getByText('REPLAY', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
