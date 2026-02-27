import { test, expect, Page } from '@playwright/test';

test.use({ storageState: 'test-data/state_profile.json' }); 

const BASE = 'https://www.stampinup.com';

function randomPhone() {
  return `801${Math.floor(1000000 + Math.random() * 9000000)}`;
}

function randomBirthdate() {
  const year = Math.floor(Math.random() * (2006 - 1970 + 1)) + 1970; // 1970..2006
  const month = Math.floor(Math.random() * 12) + 1;                 // 1..12
  const day = Math.floor(Math.random() * 28) + 1;                   // 1..28 (safe)
  return { year, month, day };
}

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

async function pickVuetifyBirthdate(page: Page, opts: { year: number; month: number; day: number }) {
  const { year, month, day } = opts;

  // Birthdate input 
  const birthdateField = page.getByPlaceholder(/birthdate/i);
  await expect(birthdateField).toBeVisible();
  await birthdateField.click();

  // Year 
  const yearText = page.getByText(String(year), { exact: true });
  const yearVisible = await yearText.isVisible().catch(() => false);

  if (!yearVisible) {
    // Try common year-toggle selectors 
    await page.locator('.v-date-picker-title__year').click().catch(() => {});
    await page.locator('[class*="v-date-picker-title"] button').first().click().catch(() => {});
  }

  await page.getByText(String(year), { exact: true }).click();

  // Month
  const monthName = MONTH_ABBR[month - 1];
  await page.getByText(monthName, { exact: true }).click();

  // Day
  const dayStr = String(day);

  // Vuetify date cells often are gridcells; fallback to button click
  const gridCell = page.getByRole('gridcell', { name: dayStr }).first();
  if (await gridCell.isVisible().catch(() => false)) {
    await gridCell.click();
  } else {
    await page.getByRole('button', { name: new RegExp(`^${dayStr}$`) }).first().click();
  }

  const expected = `${month}/${day}/${year}`; 
  await expect(birthdateField).toHaveValue(expected);
  return expected;
}

test('Account Settings: edit CONTACT phone + random birthdate and verify persistence', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // Go straight to settings (should be authenticated via storageState)
  await page.goto(`${BASE}/account/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  // Assert we're logged in by checking page header/account area
  await expect(page.getByText(/my account/i)).toBeVisible();

  // CONTACT card -> EDIT (this is the right edit button)
  const contactCard = page.getByTestId('card-contact');
  await expect(contactCard).toBeVisible();
  await contactCard.getByRole('link', { name: /^edit$/i }).click();

  // Phone
  const newPhone = randomPhone();
  const phoneInput = page.getByPlaceholder(/phone number/i);
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill(newPhone);

  // Birthdate
  const randomDate = randomBirthdate();
  const expectedBirthdate = await pickVuetifyBirthdate(page, randomDate);

  // Save
  await page.getByRole('button', { name: /save changes/i }).click();

  // Verify it sticks in the UI (often the edit view closes; so verify after reload)
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Re-enter edit mode and verify persistence
  await contactCard.getByRole('link', { name: /^edit$/i }).click();

  await expect(page.getByPlaceholder(/phone number/i)).toHaveValue(newPhone);
  await expect(page.getByPlaceholder(/birthdate/i)).toHaveValue(expectedBirthdate);
});