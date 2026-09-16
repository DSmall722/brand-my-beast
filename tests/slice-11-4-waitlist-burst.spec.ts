import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";

/**
 * Slice 11.4 — 50 unique waitlist inserts in memory mode, no 500s.
 */
test.describe("slice 11.4: 50 unique waitlist inserts (memory)", () => {
  test("campaign constants stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("fifty unique emails insert without 500s", async ({ request }) => {
    const stamp = Date.now();
    const statuses: number[] = [];
    const bodies: Array<{ ok?: boolean; status?: string }> = [];

    for (let i = 0; i < 50; i += 1) {
      const email = `burst-${stamp}-${i}@example.com`;
      const res = await request.post("/api/waitlist", {
        data: { email },
      });
      statuses.push(res.status());
      bodies.push((await res.json()) as { ok?: boolean; status?: string });
    }

    expect(statuses.every((s) => s !== 500)).toBe(true);
    expect(statuses.filter((s) => s === 201)).toHaveLength(50);
    expect(bodies.every((b) => b.ok === true && b.status === "created")).toBe(
      true,
    );

    // Replay one address: exists path must stay non-500 too.
    const again = await request.post("/api/waitlist", {
      data: { email: `burst-${stamp}-0@example.com` },
    });
    expect(again.status()).toBe(200);
    const againBody = (await again.json()) as {
      ok?: boolean;
      status?: string;
    };
    expect(againBody.ok).toBe(true);
    expect(againBody.status).toBe("exists");
  });
});
