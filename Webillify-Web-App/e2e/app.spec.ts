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

test('signs in and renders real workspace navigation and catalogue data', async ({
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
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  const productRow = page.getByRole('row').filter({ hasText: 'RICE-PREMIUM-1KG' });
  await expect(productRow).toContainText('Premium Rice');
  await expect(productRow).toContainText(/\d+(?:\.\d+)?/);

  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: 'New sale' })).toBeVisible();
  const openRegister = page.getByRole('button', { name: 'Open register' });
  if (await openRegister.isVisible().catch(() => false)) {
    await openRegister.click();
    await expect(page.getByText('Register open')).toBeVisible();
  }
  const productCard = page.getByRole('button', { name: /Premium Rice/ });
  const stockText = (await productCard.locator('em').textContent()) ?? '';
  const stockBefore = Number(stockText.match(/\d+(?:\.\d+)?/)?.[0]);
  expect(stockBefore).toBeGreaterThan(0);
  await productCard.click();
  await expect(page.getByRole('button', { name: /Charge ₹63/ })).toBeVisible();
  await page.getByRole('button', { name: /Charge/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose payment method' });
  await expect(dialog).toBeFocused();
  await dialog.getByRole('button', { name: 'Cash' }).click();
  const receipt = page.locator('.pos-receipt');
  await expect(receipt).toContainText('Stock and payment recorded');
  await expect(receipt).toContainText('₹63');
  const invoiceNumber = (await receipt.locator('strong').textContent())?.trim();
  expect(invoiceNumber).toMatch(/^WBL-\d+$/);
  await expect
    .poll(async () => {
      const value = (await productCard.locator('em').textContent()) ?? '';
      return Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
    })
    .toBeLessThan(stockBefore);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Recent sales activity' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: invoiceNumber ?? '' })).toContainText(
    'Paid',
  );

  await page.goto('/sales');
  await expect(page.getByRole('heading', { name: 'Invoice history' })).toBeVisible();
  const saleInvoice = page
    .locator('.invoice-list article')
    .filter({ hasText: invoiceNumber ?? '' });
  await expect(saleInvoice).toContainText('₹63');
  if (testInfo.project.name === 'desktop') {
    await saleInvoice.getByRole('button', { name: 'Return items' }).click();
    const salesDialog = page.getByRole('dialog', { name: new RegExp(invoiceNumber ?? '') });
    await salesDialog.locator('input[type="number"]').fill('1');
    await salesDialog.getByLabel('Reason').fill('Connected browser sales return verification');
    await salesDialog.getByRole('button', { name: 'Post sales return' }).click();
    await expect(saleInvoice).toContainText('₹63 returned');
    await expect(saleInvoice).toContainText('Returned in full');
  } else {
    await saleInvoice.getByRole('button', { name: 'Cancel invoice' }).click();
    const salesDialog = page.getByRole('dialog', { name: new RegExp(invoiceNumber ?? '') });
    await salesDialog
      .getByLabel('Reason')
      .fill('Connected browser sales cancellation verification');
    await salesDialog.getByRole('button', { name: 'Confirm cancellation' }).click();
    await expect(saleInvoice).toContainText('CANCELLED');
    await expect(saleInvoice).toContainText('Cancelled with linked refund');
  }
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto('/purchases');
  await expect(page.getByRole('heading', { name: 'Purchase bills' })).toBeVisible();
  const seededBill = page.locator('.bill-list article').filter({ hasText: 'DEMO-INV-001' });
  await expect(seededBill).toContainText('Demo Wholesale Supplier');
  await expect(seededBill.getByRole('button', { name: 'Post bill' })).toBeVisible();

  const compensationReference = `E2E-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('Supplier invoice reference').fill(compensationReference);
  await page.getByRole('button', { name: 'Create draft' }).click();
  const compensationBill = page
    .locator('.bill-list article')
    .filter({ hasText: compensationReference });
  await expect(compensationBill).toContainText('DRAFT');
  await compensationBill.getByRole('button', { name: 'Post bill' }).click();
  const postDialog = page.getByRole('alertdialog', { name: new RegExp(compensationReference) });
  await postDialog.getByRole('button', { name: 'Post purchase' }).click();
  await expect(compensationBill).toContainText('POSTED');

  if (testInfo.project.name === 'desktop') {
    await compensationBill
      .getByRole('button', {
        name: new RegExp(`Return remaining items from ${compensationReference}`),
      })
      .click();
    await compensationBill.getByLabel('Reason').fill('Connected browser return verification');
    await compensationBill.getByRole('button', { name: 'Post purchase return' }).click();
    await expect(compensationBill).toContainText('Returned in full');
  } else {
    await compensationBill
      .getByRole('button', { name: `Cancel bill ${compensationReference}` })
      .click();
    await compensationBill.getByLabel('Reason').fill('Connected browser cancellation verification');
    await compensationBill.getByRole('button', { name: 'Confirm cancellation' }).click();
    await expect(compensationBill).toContainText('Cancelled with reversal');
  }
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Business' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Webillify AI' })).toBeVisible();
  await expect(page.getByText('₹799')).toBeVisible();
  await expect(page.getByText('300', { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});
