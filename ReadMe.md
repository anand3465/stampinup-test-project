This repo contains tests for [stampinup.com](https://www.stampinup.com/) written in TypeScript using Playwright. The solutions to the SQL questions are included in the [SQLsolutions.md](/SQLsolutions.md) file within this repo.

**How to run?**

You can run the following command in the terminal to run the tests:

```bash
npx playwright test
```

**Test Structure:**

1. I have written automated tests for the backend APIs that are triggered during account creation, sign in, adding an address, editing an address, and related flows.
2. I have written automated test cases for the UI, mainly focusing on verifying that the appropriate elements are visible when an item is clicked.
3. I have also included end to end tests covering account creation, logging in, updating contact and adding an address.

**Notes / My approach:**

- With the resources available to me, I made some assumptions about the UI behaviour and wrote the UI tests accordingly.
- I wanted to follow the best software practices and therefore avoided interfering too much with the production data.
- If I had full access to the API implementation, another approach I could have taken would be to use Mock APIs. This would allow me to isolate the tests and prevent any unexpected / flaky tests.

I enjoyed writting tests for your website! Let me know if you have any feedback or suggestions.
