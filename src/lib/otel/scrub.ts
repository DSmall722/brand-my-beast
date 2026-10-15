export const ATTRIBUTE_ALLOWLIST = [
  "http.method",
  "http.request.method",
  "http.route",
  "http.status_code",
  "http.response.status_code",
  "next.span_name",
  "next.span_type",
  "next.route",
  "next.rsc",
  "operation.name",
  "service.name",
] as const;

const ALLOW = new Set<string>(ATTRIBUTE_ALLOWLIST);

const SENSITIVE_ALLOW = new Set<string>([
  "http.method",
  "http.request.method",
  "http.route",
  "next.route",
  "http.status_code",
  "http.response.status_code",
]);

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const STRIPE_ID =
  /\b(?:cs|pi|evt|cus|seti|ch|pm|py|txn|sub|prod|src|acct)_[A-Za-z0-9]+\b/i;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Bag = Record<string, unknown>;

export type ScrubbableSpan = {
  name: string;
  attributes?: Bag;
  updateName?: (name: string) => void;
  events?: { name?: string; attributes?: Bag }[];
  links?: { attributes?: Bag }[];
};

function mustDropKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (
    lower === "http.url" ||
    lower === "url.full" ||
    lower === "url.query" ||
    lower === "http.target" ||
    lower === "url.path" ||
    lower === "db.statement"
  ) {
    return true;
  }
  return (
    lower.includes("header") ||
    lower.includes("cookie") ||
    lower.includes("authorization") ||
    lower.includes("email") ||
    lower.includes("stripe") ||
    lower.includes("amount") ||
    lower.includes("price") ||
    lower.includes("password") ||
    lower.includes("secret") ||
    lower.includes("body") ||
    lower.includes("statement")
  );
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isIdSegment(segment: string): boolean {
  if (!segment) return false;
  if (segment.startsWith("[") && segment.endsWith("]")) return false;
  if (UUID.test(segment) || /^\d+$/.test(segment) || STRIPE_ID.test(segment)) {
    return true;
  }
  return (
    segment.length >= 16 &&
    /^[A-Za-z0-9_-]+$/.test(segment) &&
    /[0-9]/.test(segment) &&
    /[A-Za-z]/.test(segment)
  );
}

function stripQueryAndHash(value: string): string {
  return value.replace(/\?[^ \t]*/g, "").replace(/#[^ \t]*/g, "");
}

export function templateRoute(raw: string): string {
  let path = stripQueryAndHash(raw).trim();
  const methodPrefix = path.match(
    /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i,
  );
  if (methodPrefix) path = path.slice(methodPrefix[0].length);
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      const start = path.indexOf("/", path.indexOf("//") + 2);
      path = start >= 0 ? path.slice(start) : "/";
    }
  }
  if (!path.startsWith("/")) {
    const embedded = path.match(/\/[^\s]*/);
    path = embedded ? embedded[0] : path;
  }
  const templated = path
    .split("/")
    .map((segment) => (isIdSegment(decodeSegment(segment)) ? "[id]" : segment))
    .join("/");
  return templated || "/";
}

export function scrubSpanName(name: string): string {
  let next = name.replace(/https?:\/\/[^\s]+/gi, (url) => {
    try {
      return templateRoute(new URL(url).pathname);
    } catch {
      return templateRoute(url);
    }
  });
  next = stripQueryAndHash(next);
  next = next.replace(/(^|\s)(\/[^\s]*)/g, (_all, lead: string, path: string) => {
    return `${lead}${templateRoute(path)}`;
  });
  next = next.replace(new RegExp(EMAIL.source, "gi"), "[redacted]");
  next = next.replace(new RegExp(STRIPE_ID.source, "gi"), "[id]");
  next = next.replace(/\s+/g, " ").trim();
  return next || "span";
}

function containsSecret(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.includes("?") || EMAIL.test(value) || STRIPE_ID.test(value))
  );
}

function isSensitiveText(value: string): boolean {
  const path = templateRoute(value).toLowerCase();
  if (
    path.includes("/stripe") ||
    path.includes("/checkout") ||
    path.includes("/payment")
  ) {
    return true;
  }
  return /(?:^|\/)bid(?:\/|$)/.test(path);
}

function isSensitiveSpan(span: ScrubbableSpan): boolean {
  if (isSensitiveText(span.name)) return true;
  const bag = span.attributes;
  if (!bag) return false;
  for (const key of [
    "http.route",
    "next.route",
    "http.target",
    "url.path",
    "http.url",
    "url.full",
    "next.span_name",
  ]) {
    const value = bag[key];
    if (typeof value === "string" && isSensitiveText(value)) return true;
  }
  return false;
}

function methodOf(span: ScrubbableSpan): string {
  const bag = span.attributes;
  for (const key of ["http.request.method", "http.method"]) {
    const value = bag?.[key];
    if (typeof value !== "string") continue;
    const token = value.split("?")[0]?.trim().toUpperCase() ?? "";
    if (HTTP_METHODS.has(token)) return token;
  }
  const match = span.name.match(
    /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i,
  );
  return match?.[1]?.toUpperCase() ?? "";
}

function normalizeAllowed(key: string, value: unknown): unknown {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (key === "http.method" || key === "http.request.method") {
    const token = value.split("?")[0]?.trim().toUpperCase() ?? "";
    return HTTP_METHODS.has(token) ? token : undefined;
  }
  if (key === "http.route" || key === "next.route") return templateRoute(value);
  if (key === "http.status_code" || key === "http.response.status_code") {
    return /^\d{3}$/.test(value) ? value : undefined;
  }
  if (key === "next.span_name" || key === "operation.name") {
    return scrubSpanName(value);
  }
  const stripped = stripQueryAndHash(value).trim();
  return stripped || undefined;
}

function scrubAttributes(bag: Bag, allowed: ReadonlySet<string>): void {
  for (const key of Object.keys(bag)) {
    if (!allowed.has(key) || mustDropKey(key)) {
      delete bag[key];
      continue;
    }
    const next = normalizeAllowed(key, bag[key]);
    if (next === undefined || containsSecret(next)) delete bag[key];
    else bag[key] = next;
  }
}

function nameLooksRaw(name: string): boolean {
  if (name.includes("?") || name.includes("#") || /https?:\/\//i.test(name)) {
    return true;
  }
  const path = name.match(/\/[^\s]*/);
  if (!path?.[0]) return false;
  return path[0]
    .split("/")
    .some((segment) => isIdSegment(decodeSegment(segment)));
}

export function scrubSpan(span: ScrubbableSpan): void {
  const sensitive = isSensitiveSpan(span);
  const bag = span.attributes;
  if (bag) {
    for (const key of ["http.route", "next.route"]) {
      if (typeof bag[key] === "string") bag[key] = templateRoute(bag[key]);
    }
  }
  const method = methodOf(span);
  const route =
    (typeof bag?.["http.route"] === "string" && bag["http.route"]) ||
    (typeof bag?.["next.route"] === "string" && bag["next.route"]) ||
    "";
  const allowed = sensitive ? SENSITIVE_ALLOW : ALLOW;
  if (bag) scrubAttributes(bag, allowed);
  for (const event of span.events ?? []) {
    if (event.attributes) scrubAttributes(event.attributes, allowed);
    if (typeof event.name === "string") event.name = scrubSpanName(event.name);
  }
  for (const link of span.links ?? []) {
    if (link.attributes) scrubAttributes(link.attributes, allowed);
  }

  let name: string;
  if (sensitive) {
    const safeRoute = route || templateRoute(span.name);
    name = method ? `${method} ${safeRoute}` : safeRoute;
  } else if (route && nameLooksRaw(span.name)) {
    name = method ? `${method} ${route}` : scrubSpanName(span.name);
  } else {
    name = scrubSpanName(span.name);
  }
  span.name = name || "span";
  span.updateName?.(span.name);
}

export function createScrubSpanProcessor() {
  return {
    onStart(span: ScrubbableSpan) {
      scrubSpan(span);
    },
    onEnd(span: ScrubbableSpan) {
      scrubSpan(span);
    },
    shutdown() {
      return Promise.resolve();
    },
    forceFlush() {
      return Promise.resolve();
    },
  };
}
