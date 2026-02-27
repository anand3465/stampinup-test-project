import { test as setup, request } from '@playwright/test';
import {
  uniqueEmail,
  createAccount,
  signIn,
  updateContact,
  saveAddress,
  verifyAddressExists,
  saveStorageState
} from '../../utils/users';

setup('Provision user states (new / profile / address)', async () => {
  const password = 'TestPassword@1';

  // NEW USER: create + sign in
  {
    const email = uniqueEmail();
    const api = await request.newContext();
    await createAccount(api, email, password);
    await signIn(api, email, password);
    await saveStorageState(api, 'test-data/state_new.json');
    await api.dispose();
  }

  // PROFILE USER: create + sign in + update contact
  {
    const email = uniqueEmail();
    const api = await request.newContext();
    await createAccount(api, email, password);
    await signIn(api, email, password);
    await updateContact(api, email);
    await saveStorageState(api, 'test-data/state_profile.json');
    await api.dispose();
  }

  // ADDRESS USER: create + sign in + update contact + save address + verify
  {
    const email = uniqueEmail();
    const api = await request.newContext();
    await createAccount(api, email, password);
    await signIn(api, email, password);
    await updateContact(api, email);
    await saveAddress(api);
    await verifyAddressExists(api, '1105 E Cedar Ridge Rd');
    await saveStorageState(api, 'test-data/state_address.json');
    await api.dispose();
  }
});

