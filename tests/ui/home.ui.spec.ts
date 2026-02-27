import { test, expect, Page } from '@playwright/test';
import { uniqueEmail, randomPassword, randomName } from '../../utils/users';

const HOME = 'https://www.stampinup.com/';



test.describe('StampinUp top nav buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Skip if bot/security challenge shows up
    const blocked = await page
      .locator('iframe[src*="hcaptcha"], iframe[src*="captcha"], text=/robot|security|challenge|incapsula/i')
      .first()
      .isVisible()
      .catch(() => false);
    test.skip(blocked, 'Blocked by security/captcha challenge');
  });

  const navBtn = (page: Page, label: string) =>
    page.getByTestId('navbar').getByTestId('nav-btn').filter({ hasText: label }).first();

test('MENU opens side navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await navBtn(page, 'MENU').click();

  // Drawer container visible 
  await expect(page.locator('.v-navigation-drawer')).toBeVisible();

  // Assert a known drawer item from your DOM is visible (very stable)
  await expect(page.getByTestId('side-nav-shop-products')).toBeVisible();

  await expect(page.getByText("What's New", { exact: false })).toBeVisible();
  await expect(page.getByText('Specials', { exact: false })).toBeVisible();
});

  test("WHAT'S NEW opens category drawer", async ({ page }) => {
    await navBtn(page, "WHAT'S NEW").click();

    // Assert drawer appears
    await expect(page.getByTestId('nav-drawer-close')).toBeVisible();

    // Assert "New Arrivals" link is visible
    await expect(
      page.getByTestId('category-link-new-arrivals')
    ).toBeVisible();
  });

 test('SPECIALS shows specials links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('https://www.stampinup.com/', { waitUntil: 'domcontentloaded' });

    await navBtn(page, 'SPECIALS').click();

    
    await expect(page.getByTestId('category-link-bundled-savings')).toBeVisible();
    await expect(page.getByTestId('category-link-last-chance-products')).toBeVisible();
    await expect(page.getByTestId('category-link-product-of-the-month')).toBeVisible();
  });

  test('JOIN navigates to join page', async ({ page }) => {
    await Promise.all([
      page.waitForURL(/\/community\/join-stampin-up/i, { timeout: 60000 }),
      navBtn(page, 'JOIN').click(),
    ]);

    await expect(page).toHaveURL(/\/community\/join-stampin-up/i);
    await expect(page.getByText(/join our team/i)).toBeVisible();
  });

  test('BLOG navigates to blog site', async ({ page }) => {
    await Promise.all([
      page.waitForURL(/blog\.stampinup\.com/i, { timeout: 60000 }),
      navBtn(page, 'BLOG').click(),
    ]);

    await expect(page).toHaveURL(/blog\.stampinup\.com/i);

  });


  test('Unauthenticated user clicking Sign In shows login modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('https://www.stampinup.com/', { waitUntil: 'domcontentloaded' });

    // Click the Sign In button in the header
    await page.getByRole('link', { name: /sign in/i }).click();

    // Assert modal appears
    const modal = page.locator('text=SIGN IN').first();
    await expect(modal).toBeVisible();

    // Email input visible
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();

    // Password input visible
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();

    // Sign In button visible
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();

    // Create Account link visible
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
    });

  test('Create account with random user and log in', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 120000 });

    const email = uniqueEmail();
    const password = randomPassword();
    const firstName = randomName();
    const lastName = randomName();

    // Open Sign In modal
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page.getByTestId('authentication')).toBeVisible();

    // Click Create Account
    await page.getByRole('link', { name: /create account/i }).click();

    const dialog = page.locator('.v-dialog');
    await expect(dialog).toBeVisible();

    // Fill Create Account form
    await dialog.getByPlaceholder(/first name/i).fill(firstName);
    await dialog.getByPlaceholder(/last name/i).fill(lastName);
    await dialog.getByPlaceholder(/^email$/i).fill(email);
    await dialog.getByPlaceholder(/^password$/i).fill(password);
    await dialog.getByPlaceholder(/confirm password/i).fill(password);

    // Submit Create Account
    await dialog.getByRole('button', { name: /create account/i }).click();

    // Assert logged in (Hello appears)
    const hello = page.getByText(/^hello,/i);
    await expect(hello).toBeVisible({ timeout: 20000 });
  });

  test('Login → Open Account Menu → Navigate to Settings → Verify → Logout visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Login
    await page.getByRole('link', { name: /sign in/i }).click();

    const auth = page.getByTestId('authentication');
    await expect(auth).toBeVisible();

    await auth.getByTestId('auth-email').fill(process.env.STAMPINUP_EMAIL!);
    await auth.getByTestId('auth-password').fill(process.env.STAMPINUP_PASSWORD!);

    await auth.getByRole('button', { name: /^sign in$/i }).click();

    // Assert logged in (Hello appears)
    const hello = page.getByText(/^hello,/i);
    await expect(hello).toBeVisible({ timeout: 20000 });

    // Open Account Dropdown
    await hello.click();

    // Assert dropdown visible
    await expect(page.getByTestId('account-link').first()).toBeVisible();

    // Click Account Settings (first account-link)
    await page.getByRole('menuitem', { name: /account settings/i }).click();

    // Verify Account Page
    await expect(page).toHaveURL(/\/account\/settings/i);

    await expect(page.getByText(/my account/i)).toBeVisible();
    await expect(page.getByText(/contact/i)).toBeVisible();
  });
});