import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations
      .filter(({ impact }) => impact === 'serious' || impact === 'critical')
      .flatMap((violation) =>
        violation.nodes.map((node) => ({
          rule: violation.id,
          impact: violation.impact,
          target: node.target.join(' '),
          html: node.html,
        })),
      ),
  ).toEqual([]);
}

test('protects workspace routes and exposes an accessible sign-in form', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fproducts$/);
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('signs in and renders responsive, accessible workspace navigation', async ({
  page,
}, testInfo) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: /Good afternoon/ })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation' }).first().click();
  }
  await expectNoSeriousAccessibilityViolations(page);
});

test('completes the demo POS checkout with announced feedback', async ({ page }) => {
  await signIn(page);
  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: 'New sale' })).toBeVisible();
  await page.getByRole('button', { name: /Charge/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose payment method' });
  await expect(dialog).toBeFocused();
  await dialog.getByRole('button', { name: 'Cash' }).click();
  await expect(page.getByRole('status').filter({ hasText: /WBL-/ })).toBeVisible();
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
