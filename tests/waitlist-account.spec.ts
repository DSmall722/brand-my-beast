import { expect, test } from "@playwright/test";
import {
  attachWaitlistAccount,
  getWaitlistByEmail,
  joinWaitlist,
  resetWaitlistStoreForTests,
} from "../src/lib/waitlist";

test.describe("waitlist account link (slice 5.3)", () => {
  test("attach keeps createdAt and sets userId without dropping the row", async () => {
    resetWaitlistStoreForTests();
    const email = "unit-slice53@example.com";
    const joined = await joinWaitlist(email);
    expect(joined).toEqual({ ok: true, status: "created" });
    const before = await getWaitlistByEmail(email);
    expect(before?.userId).toBeNull();
    const createdAt = before!.createdAt;

    const linked = await attachWaitlistAccount({
      email,
      userId: "test:unit-slice53@example.com",
    });
    expect(linked?.createdAt).toBe(createdAt);
    expect(linked?.userId).toBe("test:unit-slice53@example.com");

    const again = await joinWaitlist(email);
    expect(again).toEqual({ ok: true, status: "exists" });
    const after = await getWaitlistByEmail(email);
    expect(after?.createdAt).toBe(createdAt);
    expect(after?.userId).toBe("test:unit-slice53@example.com");
  });
});
