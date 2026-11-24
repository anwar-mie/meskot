import { expect, test } from '@playwright/test';

test.describe('market. E-Commerce E2E Flows', () => {
  test('Storefront home loads, switches EN/AM locale, and navigates to Shop & Product details', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Good things for')).toBeVisible();

    // Switch to Amharic
    await page.getByRole('button', { name: 'አማርኛ' }).click();
    await expect(page.getByText('ለዕለት ተዕለት ኑሮዎ')).toBeVisible();

    // Switch back to English and open Shop
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('link', { name: 'Explore the collection →' }).click();
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByText('Find your everyday favorites')).toBeVisible();

    // Open product details
    await page.getByText('Woven everyday tote').first().click();
    await expect(page).toHaveURL(/\/products\/woven-everyday-tote/);
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
  });

  test('Admin signs in via email/password and accesses Staff Dashboard Roles & Orders', async ({
    page,
  }) => {
    await page.goto('/auth/sign-in');
    await page.getByRole('button', { name: 'Email' }).click();
    await page.getByPlaceholder('meron@market.et').fill('meron@market.et');
    await page.getByPlaceholder('••••••••••••').fill('Password123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('A clear view of your business')).toBeVisible();

    await page.getByRole('link', { name: 'Roles & permissions' }).click();
    await expect(page).toHaveURL(/\/dashboard\/roles/);
    await expect(page.getByText('Give each person the access they need.')).toBeVisible();
  });
});
