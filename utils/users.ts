import { APIRequestContext, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://az-api.stampinup.com';
const GLOBAL_CREDS_FILE = 'test-data/global-credentials.json';

// Global test credentials interface
interface GlobalCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

/**
 * Generate or retrieve global test credentials
 * Creates new credentials if file doesn't exist, otherwise reuses existing ones
 */
export function getGlobalTestCredentials(): GlobalCredentials {
  // Ensure test-data directory exists
  fs.mkdirSync('test-data', { recursive: true });

  // Check if credentials file already exists
  if (fs.existsSync(GLOBAL_CREDS_FILE)) {
    const data = fs.readFileSync(GLOBAL_CREDS_FILE, 'utf-8');
    return JSON.parse(data);
  }

  // Create new credentials
  const credentials: GlobalCredentials = {
    email: uniqueEmail(),
    password: randomPassword(),
    firstName: `testuser${Math.floor(Math.random() * 100000)}`,
    lastName: `qa${Math.floor(Math.random() * 100000)}`,
    createdAt: new Date().toISOString()
  };

  // Save to file
  fs.writeFileSync(GLOBAL_CREDS_FILE, JSON.stringify(credentials, null, 2));
  console.log(`✓ Global test credentials created and saved to ${GLOBAL_CREDS_FILE}`);

  return credentials;
}

/**
 * Reset global test credentials (creates new ones)
 */
export function resetGlobalTestCredentials(): GlobalCredentials {
  fs.mkdirSync('test-data', { recursive: true });
  const credentials: GlobalCredentials = {
    email: uniqueEmail(),
    password: randomPassword(),
    firstName: `testuser${Math.floor(Math.random() * 100000)}`,
    lastName: `qa${Math.floor(Math.random() * 100000)}`,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(GLOBAL_CREDS_FILE, JSON.stringify(credentials, null, 2));
  console.log(`✓ Global test credentials reset`);
  return credentials;
}

export function uniqueEmail() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rand = Math.random().toString(16).slice(2, 8);
  return `stampinup.qa+${stamp}_${rand}@gmail.com`;
}

export function randomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createAccount(api: APIRequestContext, email: string, password: string, firstName: string = 'test', lastName: string = 'user') {
  const res = await api.post(`${API_BASE}/en-us/account`, {
    data: { customer: { firstName, lastName, email, password } },
    failOnStatusCode: false
  });
  expect([200, 201]).toContain(res.status());
}

export async function signIn(api: APIRequestContext, email: string, password: string) {
  const res = await api.post(`${API_BASE}/en-us/account/sign-in`, {
    data: { username: email, password, persist: false },
    failOnStatusCode: false
  });
  expect(res.status()).toBe(200);
}

export async function updateContact(api: APIRequestContext, email: string, firstName: string = 'test', lastName: string = 'user') {
  const res = await api.put(`${API_BASE}/en-us/account/contact`, {
    data: {
      email,
      newEmail: email,
      firstName,
      lastName,
      birthday: '01 March',
      phoneNumber: '(123) 441 - 3241'
    },
    failOnStatusCode: false
  });
  expect(res.status()).toBe(200);

  const body = await res.json().catch(() => ({}));
  expect(body).toEqual(expect.objectContaining({ role: 'Customer' }));
  expect(typeof body.cookieExpiration).toBe('number');
}

export async function saveAddress(api: APIRequestContext) {
  const payload = {
    addressLine1: '1105 E Cedar Ridge Rd',
    addressLine2: '',
    addressLine3: '',
    city: 'Sandy',
    country: 'US',
    county: '',
    defaultAddress: false,
    firstName: 'test',
    lastName: 'user',
    phoneNumber: '(123) 441 - 3241',
    postalCode: '84094-5607',
    region: 'UT',
    suburb: ''
  };

  const res = await api.post(`${API_BASE}/en-us/address`, {
    data: payload,
    failOnStatusCode: false
  });

  // If POST isn't allowed, try PUT
  if (![200, 201, 204].includes(res.status())) {
    const putRes = await api.put(`${API_BASE}/en-us/address`, {
      data: payload,
      failOnStatusCode: false
    });
    expect([200, 201, 204]).toContain(putRes.status());
    const putBody = await putRes.json().catch(() => ({}));
    expect(putBody.statusCode).toBe(200);
    return;
  }

  const body = await res.json();
  expect(body.statusCode).toBe(200);
  expect(Array.isArray(body.savedAddresses)).toBeTruthy();
  expect(body.savedAddresses.length).toBeGreaterThan(0);

  const saved = body.savedAddresses[0];
  expect(body.savedAddressId).toBeTruthy();
  expect(saved.id).toBe(body.savedAddressId);
}

export async function verifyAddressExists(api: APIRequestContext, addressLine1: string) {
  const res = await api.get(`${API_BASE}/en-us/address`, { failOnStatusCode: false });
  expect(res.status()).toBe(200);

  const body = await res.json();
  const list = Array.isArray(body) ? body : body.savedAddresses ?? [];
  const exists = list.some((a: any) => a?.addressLine1 === addressLine1);
  expect(exists).toBeTruthy();
}

export async function saveStorageState(api: APIRequestContext, filePath: string) {
  const state = await api.storageState();
  fs.mkdirSync('test-data', { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

export function randomName() {
  return `user${Math.floor(Math.random() * 100000)}`;
}

export function makeContactPayload(email: string) {
  return {
    email,
    newEmail: email,
    firstName: randomName(),
    lastName: randomName(),
    birthday: `${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")} ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Math.floor(Math.random() * 12)]}`,
    phoneNumber: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100} - ${String(Math.floor(Math.random() * 9000) + 1000)}`,
  };
}

export function makeAddressPayload(firstName: string, lastName: string, phoneNumber: string) {
  // If your API allows duplicates, consider adding a unique suffix to addressLine2 or suburb.
  return {
    addressLine1: "1105 E Cedar Ridge Rd",
    addressLine2: "",
    addressLine3: "",
    city: "Sandy",
    country: "US",
    county: "",
    defaultAddress: false,
    firstName,
    lastName,
    phoneNumber,
    postalCode: "84094-5607",
    region: "UT",
    suburb: "",
  };
}