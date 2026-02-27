import { test, expect, APIRequestContext } from "@playwright/test";
import { getGlobalTestCredentials, uniqueEmail,  randomPassword, makeContactPayload, makeAddressPayload } from "../../utils/users"; 

const BASE = "https://az-api.stampinup.com/en-us";

let globalCreds: { email: string; password: string };

async function createAccount(request: APIRequestContext) {
  const email = uniqueEmail();
  const password = randomPassword();

  const contactSeed = makeContactPayload(email);

  const res = await request.post(`${BASE}/account`, {
    data: { customer: { firstName: contactSeed.firstName, lastName: contactSeed.lastName, email, password } },
    failOnStatusCode: false,
  });

  expect([200, 201]).toContain(res.status());
  return { email, password };
}

async function signIn(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BASE}/account/sign-in`, {
    data: { username: email, password, persist: false },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  return res;
}

async function updateContact(request: APIRequestContext, email: string) {
  const payload = makeContactPayload(email);

  const res = await request.put(`${BASE}/account/contact`, {
    data: payload,
    failOnStatusCode: false,
  });

  expect(res.status()).toBe(200);

  const body = await res.json().catch(() => ({}));
  expect(body).toEqual(expect.objectContaining({ role: "Customer" }));
  expect(typeof body.cookieExpiration).toBe("number");

  return payload;
}

async function saveAddress(request: APIRequestContext, payload: ReturnType<typeof makeAddressPayload>) {
  const saveRes = await request.post(`${BASE}/address`, {
    data: payload,
    failOnStatusCode: false,
  });

  // POST succeeded
  if (saveRes.status() === 204) return payload;

  const saveBody = await saveRes.json().catch(() => ({}));


  // Some APIs return 200 with no wrapper; keep this guarded.
  if (saveBody?.statusCode !== undefined) expect(saveBody.statusCode).toBe(200);

  if (Array.isArray(saveBody?.savedAddresses)) {
    expect(saveBody.savedAddresses.length).toBeGreaterThan(0);

    const saved = saveBody.savedAddresses[saveBody.savedAddresses.length - 1]; // assume the last one is the newly saved address

    if (saveBody?.savedAddressId) {
      expect(saved?.id).toBe(saveBody.savedAddressId);
    }

    expect(saved).toEqual(
      expect.objectContaining({
        firstName: payload.firstName,
        lastName: payload.lastName,
        addressLine1: payload.addressLine1,
        city: payload.city,
        region: payload.region,
        postalCode: payload.postalCode,
        country: payload.country,
        phoneNumber: payload.phoneNumber,
      })
    );
  }

  return payload;
}

async function verifyAddress(request: APIRequestContext, payload:  ReturnType<typeof makeAddressPayload>) {
  const getRes = await request.get(`${BASE}/address`, { failOnStatusCode: false });
  expect(getRes.status()).toBe(200);

  const getBody = await getRes.json().catch(() => ({}));
  const list = Array.isArray(getBody) ? getBody : getBody.savedAddresses ?? [];

  // Tighten matching a bit to avoid false positives
  const exists = list.some(
    (a: any) =>
      a?.addressLine1 === payload.addressLine1 &&
      a?.postalCode === payload.postalCode &&
      a?.region === payload.region
  );

  expect(exists).toBeTruthy();
}

// --------------------
// step tests (isolated)
// --------------------


test.beforeAll(async ({ request }) => {
  globalCreds = getGlobalTestCredentials();

  // ensure the account exists – ignore already‑exists errors
  await request.post(`${BASE}/account`, {
    data: {
      customer: {
        firstName: "playwright",
        lastName: "user",
        email: globalCreds.email,
        password: globalCreds.password,
      },
    },
    failOnStatusCode: false,
  });
});

test.describe("account API - stepwise (isolated)", () => {

  //testing the create account API
  test("create", async ({ request }) => {
    const { email, password } = await createAccount(request);
  });

  //testing the sign in API
  test("sign in", async ({ request }) => {
    await signIn(request, globalCreds.email, globalCreds.password);
  });

  //testing the update contact API
  test("update contact", async ({ request }) => {
    await signIn(request, globalCreds.email, globalCreds.password);
    await updateContact(request, globalCreds.email);
  });

  //testing the save address API
  test("save address", async ({ request }) => {
    await signIn(request, globalCreds.email, globalCreds.password);
    const contact = makeContactPayload(globalCreds.email);
    const addr = makeAddressPayload(contact.firstName, contact.lastName, contact.phoneNumber);
    await saveAddress(request, addr);
  });
  test("verify address exists", async ({ request }) => {
    await signIn(request, globalCreds.email, globalCreds.password);
    const contact = makeContactPayload(globalCreds.email);
    const addr = makeAddressPayload(contact.firstName, contact.lastName, contact.phoneNumber);
    await saveAddress(request, addr);
    await verifyAddress(request, addr);
  });
});

// --------------------
// negative tests (keep old tests too)
// --------------------

async function safeJson(res: any) {
  return await res.json().catch(() => null);
}

function expectNotSuccess(status: number) {
  // Success statuses you use elsewhere
  expect([200, 201]).not.toContain(status);
}

// Negative tests for create account, sign in, update contact, and address saving/verification APIs
test.describe("account API - negative", () => {
  test("create: invalid email format should fail", async ({ request }) => {
    const badEmail = "not-an-email";
    const password = randomPassword();
    const seed = makeContactPayload(badEmail);

    const res = await request.post(`${BASE}/account`, {
      data: { customer: { firstName: seed.firstName, lastName: seed.lastName, email: badEmail, password } },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());

    const body = await safeJson(res);
    // schema-agnostic: just ensure something comes back or it's empty but not success
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("create: missing email should fail", async ({ request }) => {
    const email = "";
    const password = randomPassword();
    const seed = makeContactPayload("temp@example.com"); // only to reuse name generation

    const res = await request.post(`${BASE}/account`, {
      data: { customer: { firstName: seed.firstName, lastName: seed.lastName, email, password } },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("create: duplicate email should fail (usually 409/400)", async ({ request }) => {
    // create first account
    const { email } = await createAccount(request);

    // attempt to create again with same email
    const password2 = randomPassword();
    const seed2 = makeContactPayload(email);

    const res2 = await request.post(`${BASE}/account`, {
      data: { customer: { firstName: seed2.firstName, lastName: seed2.lastName, email, password: password2 } },
      failOnStatusCode: false,
    });

    expectNotSuccess(res2.status());
    const body = await safeJson(res2);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("sign in: wrong password should fail", async ({ request }) => {
    const { email, password } = await createAccount(request);

    // sanity: correct login works (optional but helps isolate failures)
    await signIn(request, email, password);

    const res = await request.post(`${BASE}/account/sign-in`, {
      data: { username: email, password: "WrongPassword!123", persist: false },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("sign in: unknown email should fail", async ({ request }) => {
    const res = await request.post(`${BASE}/account/sign-in`, {
      data: { username: uniqueEmail(), password: randomPassword(), persist: false },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("sign in: missing password should fail", async ({ request }) => {
    const { email } = await createAccount(request);

    const res = await request.post(`${BASE}/account/sign-in`, {
      data: { username: email, password: "", persist: false },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("sign in: missing username should fail", async ({ request }) => {
    const res = await request.post(`${BASE}/account/sign-in`, {
      data: { username: "", password: randomPassword(), persist: false },
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("update contact: without signing in should fail", async ({ request }) => {
    const email = uniqueEmail();
    const payload = makeContactPayload(email);

    const res = await request.put(`${BASE}/account/contact`, {
      data: payload,
      failOnStatusCode: false,
    });

    // If the API allows this anonymously, this test will fail — but typically it should be 401/403.
    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("address: save without signing in should fail", async ({ request }) => {
    const addr = makeAddressPayload("test", "user", "(123) 441 - 3241");

    const res = await request.post(`${BASE}/address`, {
      data: addr,
      failOnStatusCode: false,
    });

    expectNotSuccess(res.status());
    const body = await safeJson(res);
    expect(body === null || typeof body === "object").toBeTruthy();
  });

  test("address: verify without signing in should fail OR return empty", async ({ request }) => {
    const res = await request.get(`${BASE}/address`, { failOnStatusCode: false });

    // Depending on API, could be 401/403 OR 200 with empty list.
    if (res.status() === 200) {
      const body = await safeJson(res);
      const list = Array.isArray(body) ? body : body?.savedAddresses ?? [];
      expect(Array.isArray(list)).toBeTruthy();
      // If unauth returns empty list, this passes.
      expect(list.length).toBe(0);
    } else {
      expectNotSuccess(res.status());
    }
  });
});

// --------------------
// full regression E2E
// --------------------

test("E2E API: create -> sign in -> update contact -> save address -> verify", async ({ request }) => {
  const { email, password } = await createAccount(request);
  await signIn(request, email, password);

  const contact = await updateContact(request, email);
  const addr = makeAddressPayload(contact.firstName, contact.lastName, contact.phoneNumber);

  await saveAddress(request, addr);
  await verifyAddress(request, addr);
});