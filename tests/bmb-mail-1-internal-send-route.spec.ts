import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { BRAND } from "../src/lib/campaign";
import {
  handleInternalSendMail,
  INTERNAL_MAIL_FROM,
  INTERNAL_MAIL_ENVELOPE_FROM,
  internalMailUsesJsonTransport,
  resetInternalMailRateLimitForTests,
  type InternalMailEnv,
  type InternalMailPayload,
  type SmtpAuth,
} from "../src/lib/internal-send-mail";
import {
  listStructuredLogsForTests,
  resetStructuredLogsForTests,
} from "../src/lib/structured-log";

const PATH = "/api/internal/send-mail";
const HTTP_TOKEN = "playwright-internal-mail-token-min-32!!";
const UNIT_TOKEN = "unit-test-internal-mail-token-32ch!!";
const UNIT_ENV: InternalMailEnv = {
  INTERNAL_MAIL_TOKEN: UNIT_TOKEN,
  IMPROVMX_SMTP_USER: "fake-smtp-user",
  IMPROVMX_SMTP_PASS: "fake-smtp-pass",
};

const VALID_BODY = {
  to: "buyer@example.com",
  subject: "Panel wrap quote",
  text: "SECRET_BODY_TEXT_NOT_IN_LOG",
} as const;

function authHeader(token: string, scheme = "Bearer"): string {
  return `${scheme} ${token}`;
}

function postRequest(opts: {
  token?: string | null;
  scheme?: string;
  body?: unknown;
  rawBody?: string;
  contentType?: string;
}): Request {
  const headers: Record<string, string> = {};
  if (opts.token !== null) {
    headers.authorization = authHeader(
      opts.token ?? UNIT_TOKEN,
      opts.scheme ?? "Bearer",
    );
  }
  if (opts.rawBody !== undefined) {
    if (opts.contentType) headers["content-type"] = opts.contentType;
    return new Request(`http://127.0.0.1${PATH}`, {
      method: "POST",
      headers,
      body: opts.rawBody,
    });
  }
  headers["content-type"] = "application/json";
  return new Request(`http://127.0.0.1${PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? VALID_BODY),
  });
}

function mockTransport(overrides?: {
  sendMail?: (mail: InternalMailPayload) => Promise<{ messageId?: string }>;
}) {
  const sent: InternalMailPayload[] = [];
  const smtpCalls: SmtpAuth[] = [];
  return {
    sent,
    smtpCalls,
    createTransport: (smtp: SmtpAuth) => {
      smtpCalls.push(smtp);
      return {
        sendMail: async (mail: InternalMailPayload) => {
          if (overrides?.sendMail) return overrides.sendMail(mail);
          sent.push(mail);
          return { messageId: "<mock-id@brandmybeast>" };
        },
      };
    },
  };
}

async function jsonOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

async function resetHttpLimiter(request: APIRequestContext): Promise<void> {
  const res = await request.post("/api/test/rate-limit", {
    data: { resetInternalMail: true },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe("BMB-MAIL-1: internal send route", () => {
  test.beforeEach(() => {
    resetInternalMailRateLimitForTests();
    resetStructuredLogsForTests();
  });

  test("From display is DJ at BrandMyBeast + hello@", () => {
    expect(INTERNAL_MAIL_FROM).toBe(
      '"DJ at BrandMyBeast" <hello@brandmybeast.com>',
    );
    expect(INTERNAL_MAIL_ENVELOPE_FROM).toBe(BRAND.email);
  });

  test("json transport switch is ignored in production", () => {
    expect(
      internalMailUsesJsonTransport({ INTERNAL_MAIL_TRANSPORT: "json" }),
    ).toBe(true);
    expect(
      internalMailUsesJsonTransport({
        INTERNAL_MAIL_TRANSPORT: "json",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      internalMailUsesJsonTransport({
        INTERNAL_MAIL_TRANSPORT: "json",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(internalMailUsesJsonTransport({})).toBe(false);
  });

  test("401: no Authorization header", async () => {
    const res = await handleInternalSendMail(postRequest({ token: null }), {
      env: UNIT_ENV,
      createTransport: mockTransport().createTransport,
    });
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: "unauthorized" });
  });

  test("401: Basic scheme", async () => {
    const res = await handleInternalSendMail(
      postRequest({ scheme: "Basic" }),
      {
        env: UNIT_ENV,
        createTransport: mockTransport().createTransport,
      },
    );
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: "unauthorized" });
  });

  test("401: wrong bearer token", async () => {
    const res = await handleInternalSendMail(
      postRequest({ token: "wrong-token-that-is-long-enough-32!!" }),
      {
        env: UNIT_ENV,
        createTransport: mockTransport().createTransport,
      },
    );
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: "unauthorized" });
  });

  test("401: INTERNAL_MAIL_TOKEN unset", async () => {
    const res = await handleInternalSendMail(postRequest({}), {
      env: {
        IMPROVMX_SMTP_USER: "fake-smtp-user",
        IMPROVMX_SMTP_PASS: "fake-smtp-pass",
      },
      createTransport: mockTransport().createTransport,
    });
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: "unauthorized" });
  });

  test("401: INTERNAL_MAIL_TOKEN shorter than 32 chars", async () => {
    const res = await handleInternalSendMail(postRequest({ token: "short" }), {
      env: { ...UNIT_ENV, INTERNAL_MAIL_TOKEN: "short-token-not-32" },
      createTransport: mockTransport().createTransport,
    });
    expect(res.status).toBe(401);
    expect(await jsonOf(res)).toEqual({ error: "unauthorized" });
  });

  test("401 happens before body parsing (non-JSON, no auth)", async () => {
    const res = await handleInternalSendMail(
      postRequest({ token: null, rawBody: "not-json" }),
      {
        env: UNIT_ENV,
        createTransport: mockTransport().createTransport,
      },
    );
    expect(res.status).toBe(401);
  });

  test("failed auth does not count toward the rate limit", async () => {
    const mock = mockTransport();
    for (let i = 0; i < 40; i += 1) {
      const denied = await handleInternalSendMail(
        postRequest({ token: null }),
        { env: UNIT_ENV, createTransport: mock.createTransport },
      );
      expect(denied.status).toBe(401);
    }
    const ok = await handleInternalSendMail(postRequest({}), {
      env: UNIT_ENV,
      createTransport: mock.createTransport,
    });
    expect(ok.status).toBe(200);
  });

  test("400: missing to", async () => {
    const res = await handleInternalSendMail(
      postRequest({ body: { subject: "Hi", text: "Body" } }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(typeof body.error).toBe("string");
    expect(JSON.stringify(body)).not.toContain("subject");
  });

  test("400: bad email", async () => {
    const res = await handleInternalSendMail(
      postRequest({
        body: { to: "not-an-email", subject: "Hi", text: "Body" },
      }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(typeof body.error).toBe("string");
    expect(JSON.stringify(body)).not.toContain("not-an-email");
  });

  test("400: missing subject", async () => {
    const res = await handleInternalSendMail(
      postRequest({ body: { to: "a@example.com", text: "Body" } }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    expect(typeof (await jsonOf(res)).error).toBe("string");
  });

  test("400: subject with newline", async () => {
    const res = await handleInternalSendMail(
      postRequest({
        body: {
          to: "a@example.com",
          subject: "hello\nworld",
          text: "Body",
        },
      }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(typeof body.error).toBe("string");
    expect(JSON.stringify(body)).not.toContain("hello\nworld");
  });

  test("400: missing text", async () => {
    const res = await handleInternalSendMail(
      postRequest({ body: { to: "a@example.com", subject: "Hi" } }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    expect(typeof (await jsonOf(res)).error).toBe("string");
  });

  test("400: non-JSON body", async () => {
    const res = await handleInternalSendMail(
      postRequest({ rawBody: "plain text", contentType: "text/plain" }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    expect(typeof (await jsonOf(res)).error).toBe("string");
  });

  test("400: too many recipients", async () => {
    const to = Array.from({ length: 11 }, (_, i) => `n${i}@example.com`);
    const res = await handleInternalSendMail(
      postRequest({ body: { to, subject: "Hi", text: "Body" } }),
      { env: UNIT_ENV, createTransport: mockTransport().createTransport },
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(typeof body.error).toBe("string");
    expect(JSON.stringify(body)).not.toContain("n0@example.com");
  });

  test("400: caller cannot override From", async () => {
    const mock = mockTransport();
    const res = await handleInternalSendMail(
      postRequest({
        body: {
          ...VALID_BODY,
          from: "Evil <evil@example.com>",
          sender: "Evil <evil@example.com>",
        },
      }),
      { env: UNIT_ENV, createTransport: mock.createTransport },
    );
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(body).toEqual({ error: "invalid payload" });
    expect(JSON.stringify(body)).not.toContain("evil@example.com");
    expect(mock.sent).toHaveLength(0);
    expect(mock.smtpCalls).toHaveLength(0);
  });

  test("200: From is fixed; Reply-To defaults", async () => {
    const mock = mockTransport();
    const res = await handleInternalSendMail(postRequest({}), {
      env: UNIT_ENV,
      createTransport: mock.createTransport,
    });
    expect(res.status).toBe(200);
    expect(await jsonOf(res)).toEqual({
      ok: true,
      messageId: "<mock-id@brandmybeast>",
    });
    expect(mock.sent).toHaveLength(1);
    expect(mock.sent[0]!.from).toBe(INTERNAL_MAIL_FROM);
    expect(mock.sent[0]!.replyTo).toBe("hello@brandmybeast.com");
    expect(mock.sent[0]!.to).toBe("buyer@example.com");
    expect(mock.sent[0]!.subject).toBe("Panel wrap quote");
    expect(mock.sent[0]!.text).toBe("SECRET_BODY_TEXT_NOT_IN_LOG");
    expect(mock.sent[0]!.envelope).toEqual({
      from: INTERNAL_MAIL_ENVELOPE_FROM,
      to: ["buyer@example.com"],
    });
    expect(mock.smtpCalls[0]).toEqual({
      host: "smtp.improvmx.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "fake-smtp-user", pass: "fake-smtp-pass" },
    });
  });

  test("200: caller replyTo and cc pass through", async () => {
    const mock = mockTransport();
    const res = await handleInternalSendMail(
      postRequest({
        body: {
          to: ["a@example.com", "b@example.com"],
          subject: "Two buyers",
          text: "hello",
          html: "<p>hello</p>",
          replyTo: "ops@example.com",
          cc: "cc@example.com",
        },
      }),
      { env: UNIT_ENV, createTransport: mock.createTransport },
    );
    expect(res.status).toBe(200);
    expect(mock.sent[0]!.from).toBe(INTERNAL_MAIL_FROM);
    expect(mock.sent[0]!.replyTo).toBe("ops@example.com");
    expect(mock.sent[0]!.cc).toBe("cc@example.com");
    expect(mock.sent[0]!.html).toBe("<p>hello</p>");
    expect(mock.sent[0]!.envelope.to).toEqual(
      expect.arrayContaining(["a@example.com", "b@example.com", "cc@example.com"]),
    );
  });

  test("429 after 30 authenticated sends in the window", async () => {
    const mock = mockTransport();
    for (let i = 0; i < 30; i += 1) {
      const res = await handleInternalSendMail(postRequest({}), {
        env: UNIT_ENV,
        createTransport: mock.createTransport,
      });
      expect(res.status).toBe(200);
    }
    const limited = await handleInternalSendMail(postRequest({}), {
      env: UNIT_ENV,
      createTransport: mock.createTransport,
    });
    expect(limited.status).toBe(429);
    expect(mock.sent).toHaveLength(30);
  });

  test("503 when SMTP env is missing", async () => {
    const res = await handleInternalSendMail(postRequest({}), {
      env: { INTERNAL_MAIL_TOKEN: UNIT_TOKEN },
      createTransport: mockTransport().createTransport,
    });
    expect(res.status).toBe(503);
    expect(await jsonOf(res)).toEqual({ error: "mail not configured" });
  });

  test("502 on transport throw without leaking error text", async () => {
    const mock = mockTransport({
      sendMail: async () => {
        throw new Error("SMTP boom secret credential=hunter2");
      },
    });
    const res = await handleInternalSendMail(postRequest({}), {
      env: UNIT_ENV,
      createTransport: mock.createTransport,
    });
    expect(res.status).toBe(502);
    const body = await jsonOf(res);
    expect(body).toEqual({ error: "send failed" });
    expect(JSON.stringify(body)).not.toContain("SMTP boom");
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(JSON.stringify(body)).not.toContain("credential");
  });

  test("log line has recipient + subject + messageId and not the text body", async () => {
    const mock = mockTransport();
    const res = await handleInternalSendMail(postRequest({}), {
      env: UNIT_ENV,
      createTransport: mock.createTransport,
    });
    expect(res.status).toBe(200);
    const logs = listStructuredLogsForTests().filter(
      (row) => row.event === "internal-send-mail",
    );
    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry).toMatchObject({
      event: "internal-send-mail",
      subject: "Panel wrap quote",
      messageId: "<mock-id@brandmybeast>",
    });
    const raw = JSON.stringify(entry);
    expect(raw).toContain("buyer@example.com");
    expect(raw).not.toContain("SECRET_BODY_TEXT_NOT_IN_LOG");
    expect(raw).not.toContain(UNIT_TOKEN);
    expect(raw).not.toContain("fake-smtp-pass");
  });

  test("route is nodejs + dynamic; sitemap and llms omit it", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/internal/send-mail/route.ts"),
      "utf8",
    );
    expect(route).toMatch(/runtime\s*=\s*"nodejs"/);
    expect(route).toMatch(/dynamic\s*=\s*"force-dynamic"/);
    expect(route).not.toMatch(/console\.log\s*\(/);

    const sitemap = readFileSync(
      join(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    expect(sitemap).not.toContain("send-mail");
    expect(sitemap).not.toContain("/api/internal");

    const llms = readFileSync(join(process.cwd(), "src/lib/llms-txt.ts"), "utf8");
    expect(llms).not.toContain("send-mail");
    expect(llms).not.toContain("/api/internal");
  });

  test("SECURITY.md and SLICES.md name BMB-MAIL-1", () => {
    const security = readFileSync(join(process.cwd(), "SECURITY.md"), "utf8");
    expect(security).toContain("BMB-MAIL-1");
    expect(security).toContain("/api/internal/send-mail");
    expect(security).toContain("INTERNAL_MAIL_TOKEN");
    expect(security).toContain("IMPROVMX_SMTP_USER");
    expect(security).toContain("IMPROVMX_SMTP_PASS");
    expect(security).toMatch(/Bearer/i);
    expect(security).toMatch(/30/);
    expect(security.toLowerCase()).not.toContain("gmail.com");

    const slices = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
    expect(slices).toMatch(/BMB-MAIL-1/);
    expect(slices).toMatch(/- \[[xX]\]/);
  });
});

test.describe("BMB-MAIL-1: HTTP against json transport", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    await resetHttpLimiter(request);
  });

  test("GET is 405", async ({ request }) => {
    const res = await request.get(PATH);
    expect(res.status()).toBe(405);
  });

  test("401: no header; Basic; wrong bearer", async ({ request }) => {
    const none = await request.post(PATH, { data: VALID_BODY });
    expect(none.status()).toBe(401);
    expect(await none.json()).toEqual({ error: "unauthorized" });

    const basic = await request.post(PATH, {
      data: VALID_BODY,
      headers: { authorization: "Basic abc" },
    });
    expect(basic.status()).toBe(401);

    const wrong = await request.post(PATH, {
      data: VALID_BODY,
      headers: { authorization: "Bearer totally-wrong-token-min-32-chars!!" },
    });
    expect(wrong.status()).toBe(401);
  });

  test("400: missing to; bad email; missing subject; newline subject; missing text; non-JSON; too many", async ({
    request,
  }) => {
    const headers = { authorization: `Bearer ${HTTP_TOKEN}` };

    const missingTo = await request.post(PATH, {
      data: { subject: "Hi", text: "Body" },
      headers,
    });
    expect(missingTo.status()).toBe(400);

    const badEmail = await request.post(PATH, {
      data: { to: "not-an-email", subject: "Hi", text: "Body" },
      headers,
    });
    expect(badEmail.status()).toBe(400);
    expect(JSON.stringify(await badEmail.json())).not.toContain("not-an-email");

    const missingSubject = await request.post(PATH, {
      data: { to: "a@example.com", text: "Body" },
      headers,
    });
    expect(missingSubject.status()).toBe(400);

    const newline = await request.post(PATH, {
      data: { to: "a@example.com", subject: "hello\nworld", text: "Body" },
      headers,
    });
    expect(newline.status()).toBe(400);

    const missingText = await request.post(PATH, {
      data: { to: "a@example.com", subject: "Hi" },
      headers,
    });
    expect(missingText.status()).toBe(400);

    const nonJson = await request.post(PATH, {
      headers: { ...headers, "content-type": "text/plain" },
      data: "not-json",
    });
    expect(nonJson.status()).toBe(400);

    const tooMany = await request.post(PATH, {
      data: {
        to: Array.from({ length: 11 }, (_, i) => `n${i}@example.com`),
        subject: "Hi",
        text: "Body",
      },
      headers,
    });
    expect(tooMany.status()).toBe(400);
  });

  test("200 json transport returns ok + messageId", async ({ request }) => {
    const res = await request.post(PATH, {
      data: VALID_BODY,
      headers: { authorization: `Bearer ${HTTP_TOKEN}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; messageId: string };
    expect(body.ok).toBe(true);
    expect(typeof body.messageId).toBe("string");
    expect(body.messageId.length).toBeGreaterThan(0);
  });

  test("sitemap and llms.txt do not list the route", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).not.toContain("send-mail");
    expect(xml).not.toContain("/api/internal");

    const llms = await request.get("/llms.txt");
    expect(llms.ok()).toBeTruthy();
    const text = await llms.text();
    expect(text).not.toContain("send-mail");
    expect(text).not.toContain("/api/internal");
  });
});
