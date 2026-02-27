import { test, expect, Page } from '@playwright/test';

const BASE = 'https://www.stampinup.com';

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomAddress() {
  const id = Math.random().toString(16).slice(2, 7).toUpperCase();
  return {
    first: `Test${id}`,
    last: `User${id}`,
    street1: `${randInt(100, 9999)} Main St`,
    street2: `Apt ${randInt(1, 999)}`,
    city: 'Salt Lake City',
    state: 'UT',
    zip: String(randInt(84000, 84999)),
    phone: `801${randInt(1000000, 9999999)}`,
  };
}

test.describe('Addresses', () => {
  test.use({ storageState: 'test-data/state_address.json' });

  test('can add a new address', async ({ page }) => {
    const addr = randomAddress();

    await page.goto(`${BASE}/account/address`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /addresses/i })).toBeVisible();

    // open create form
    await page.getByText(/\+\s*add new address/i).click();
    await expect(page.getByRole('heading', { name: /add new address/i })).toBeVisible();

    await page.getByPlaceholder(/first name/i).fill(addr.first);
    await page.getByPlaceholder(/last name/i).fill(addr.last);
    await page.getByPlaceholder(/^address$/i).fill(addr.street1);
    await page.getByPlaceholder(/address 2/i).fill(addr.street2);
    await page.getByPlaceholder(/city/i).fill(addr.city);

    // State dropdown (try placeholder first)
    const stateField = page.getByPlaceholder(/state/i);
    await stateField.click();
    await page.getByRole('option', { name: new RegExp(`^${addr.state}$`, 'i') }).click();

    await page.getByPlaceholder(/zip code/i).fill(addr.zip);
    await page.getByPlaceholder(/phone number/i).fill(addr.phone);

    await page.getByRole('button', { name: /save address/i }).click();

    // verify it appears back on addresses page
    await expect(page.getByText(new RegExp(addr.street1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(new RegExp(addr.zip))).toBeVisible();
  });
});