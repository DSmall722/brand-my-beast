import { describe, expect, it } from "vitest";
import { createScrubSpanProcessor } from "./scrub";

function finish(span: {
  name: string;
  attributes: Record<string, unknown>;
  updateName?: (name: string) => void;
}) {
  const processor = createScrubSpanProcessor();
  processor.onStart(span);
  processor.onEnd(span);
  return span;
}

describe("otel attribute allowlist", () => {
  it("drops secrets and keeps method, route, and status", () => {
    const span = finish({
      name: "GET /panels/ck123abc456def789?email=person@example.com",
      attributes: {
        "http.method": "GET",
        "http.request.method": "GET",
        "http.route": "/panels/[id]",
        "http.status_code": 200,
        "http.response.status_code": 200,
        "http.url":
          "https://brandmybeast.com/panels/ck123abc456def789?email=person@example.com&session=cs_test_abc123",
        "url.full": "https://brandmybeast.com/panels/ck123abc456def789?x=1",
        "url.query": "session=cs_test_abc123",
        "http.target": "/panels/ck123abc456def789?x=1",
        "url.path": "/panels/ck123abc456def789",
        "http.request.header.cookie": "session=secret",
        "http.request.header.authorization": "Bearer secret",
        "http.response.header.set-cookie": "session=secret",
        "user.email": "person@example.com",
        email: "person@example.com",
        "stripe.checkout_session_id": "cs_test_abc123",
        amount: 58000,
        "bid.amount": 58000,
        price: 120000,
        "http.request.body": "{\"secret\":true}",
        "db.statement": "select email from users",
        "next.span_type": "App Route",
        "service.name": "brandmybeast",
      },
    });

    expect(span.attributes["http.url"]).toBeUndefined();
    expect(span.attributes["http.request.header.cookie"]).toBeUndefined();
    expect(span.attributes["http.request.header.authorization"]).toBeUndefined();
    expect(span.attributes["user.email"]).toBeUndefined();
    expect(span.attributes.email).toBeUndefined();
    expect(span.attributes["stripe.checkout_session_id"]).toBeUndefined();
    expect(span.attributes.amount).toBeUndefined();
    expect(span.attributes["url.path"]).toBeUndefined();
    expect(span.attributes["http.method"]).toBe("GET");
    expect(span.attributes["http.request.method"]).toBe("GET");
    expect(span.attributes["http.route"]).toBe("/panels/[id]");
    expect(span.attributes["http.status_code"]).toBe(200);
    expect(span.attributes["http.response.status_code"]).toBe(200);
    expect(span.attributes["service.name"]).toBe("brandmybeast");
    expect(span.name.includes("?")).toBe(false);
    expect(span.name).not.toContain("person@example.com");
    expect(span.name).not.toContain("cs_test");
    expect(span.name).toBe("GET /panels/[id]");
  });

  it("templates a raw route and strips the query from the span name", () => {
    const span = finish({
      name: "GET /api/artwork/ck123abc456def789?download=1",
      attributes: {
        "http.method": "GET",
        "http.route": "/api/artwork/ck123abc456def789",
        "http.status_code": 200,
      },
    });

    expect(span.attributes["http.route"]).toBe("/api/artwork/[id]");
    expect(span.name).toBe("GET /api/artwork/[id]");
    expect(span.name.includes("?")).toBe(false);
  });

  it("keeps only method, route template, and status on Stripe webhook spans", () => {
    const span = finish({
      name: "POST /api/stripe/webhook?sig=secret",
      attributes: {
        "http.method": "POST",
        "http.route": "/api/stripe/webhook",
        "http.status_code": 204,
        "next.span_name": "POST /api/stripe/webhook?sig=secret",
        "next.rsc": false,
        "service.name": "brandmybeast",
        "stripe.event_id": "evt_123",
        amount: 58000,
      },
    });

    expect(span.attributes).toEqual({
      "http.method": "POST",
      "http.route": "/api/stripe/webhook",
      "http.status_code": 204,
    });
    expect(span.name).toBe("POST /api/stripe/webhook");
    expect(span.name.includes("?")).toBe(false);
  });
});
