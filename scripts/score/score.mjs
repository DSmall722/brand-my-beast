#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WEIGHTS = { flows: 50, a11y: 25, perf: 25 };
const ROOT = process.cwd();
const SCORE_DIR = join(ROOT, "score");
const REPORT_PATH = join(SCORE_DIR, "playwright.json");
const OUT_PATH = join(SCORE_DIR, "score.json");
const NEXT_BIN = join(ROOT, "node_modules/next/dist/bin/next");
const LH_BIN = join(ROOT, "node_modules/lighthouse/cli/index.js");
const PERF_PORT = 3100;
const PERF_ORIGIN = `http://127.0.0.1:${PERF_PORT}`;
const PERF_PAGES = ["/", "/panels/hood", "/#questions"];

let nextChild = null;

function stripStripe(env) {
  const next = { ...env };
  for (const key of Object.keys(next)) {
    if (key.startsWith("STRIPE_") || key === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") {
      delete next[key];
    }
  }
  return next;
}

function applyCleanEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("STRIPE_") || key === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") {
      delete process.env[key];
    }
  }
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function roundScore(value) {
  return Math.round(value);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function decodeAttachmentBody(body) {
  if (typeof body !== "string" || body.length === 0) return null;
  try {
    return JSON.parse(body);
  } catch {
    try {
      return JSON.parse(Buffer.from(body, "base64").toString("utf8"));
    } catch {
      return null;
    }
  }
}

function walkSpecs(suite, acc) {
  for (const spec of suite.specs ?? []) acc.push(spec);
  for (const child of suite.suites ?? []) walkSpecs(child, acc);
}

function specFile(spec) {
  return String(spec.file ?? "").replaceAll("\\", "/");
}

function isFlowSpec(file) {
  const normalized = file.replaceAll("\\", "/");
  return normalized.endsWith("flows.spec.ts");
}

function collectFlows(specs) {
  const flows = specs.filter((spec) => isFlowSpec(specFile(spec)));
  const passed = flows.filter((spec) => spec.ok).length;
  const total = flows.length;
  return {
    weight: WEIGHTS.flows,
    passed,
    total,
    score: total === 0 ? 0 : roundScore((100 * passed) / total),
  };
}

function collectA11y(specs) {
  let critical = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;
  const seen = new Set();
  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        for (const attachment of result.attachments ?? []) {
          if (attachment.name !== "axe") continue;
          const payload = decodeAttachmentBody(attachment.body);
          if (!payload || !Array.isArray(payload.violations)) continue;
          const key = payload.path ?? payload.id ?? specFile(spec);
          if (seen.has(key)) continue;
          seen.add(key);
          for (const violation of payload.violations) {
            if (violation.impact === "critical") critical += 1;
            else if (violation.impact === "serious") serious += 1;
            else if (violation.impact === "moderate") moderate += 1;
            else if (violation.impact === "minor") minor += 1;
          }
        }
      }
    }
  }
  return {
    weight: WEIGHTS.a11y,
    serious,
    critical,
    score: Math.max(0, 100 - 10 * critical - 4 * serious),
    moderate,
    minor,
  };
}

function totalScore(flows, a11y, perf) {
  const weight = WEIGHTS.flows + WEIGHTS.a11y + WEIGHTS.perf;
  return roundScore(
    (flows.score * WEIGHTS.flows + a11y.score * WEIGHTS.a11y + perf * WEIGHTS.perf) / weight,
  );
}

function warn(message) {
  if (process.env.GITHUB_ACTIONS) {
    process.stdout.write(`::warning::${message}\n`);
    return;
  }
  process.stderr.write(`score: ${message}\n`);
}

function printSummary(score) {
  const perfScore = score.perf ? score.perf.score : "n/a";
  const lines = [
    "| area | weight | score |",
    "| --- | ---: | ---: |",
    `| flows | ${score.flows.weight} | ${score.flows.score} |`,
    `| a11y | ${score.a11y.weight} | ${score.a11y.score} |`,
    `| perf | ${WEIGHTS.perf} | ${perfScore} |`,
    `| **total** |  | **${score.total}** |`,
    "",
  ];
  if (score.perf?.pages && Object.keys(score.perf.pages).length > 0) {
    lines.push("| page | lcp_ms | cls | tbt_ms | perf |");
    lines.push("| --- | ---: | ---: | ---: | ---: |");
    for (const [path, row] of Object.entries(score.perf.pages)) {
      lines.push(`| ${path} | ${row.lcp_ms} | ${row.cls} | ${row.tbt_ms} | ${row.perf} |`);
    }
    lines.push("");
  }
  lines.push(
    `flows ${score.flows.passed}/${score.flows.total}; a11y critical ${score.a11y.critical} serious ${score.a11y.serious} moderate ${score.a11y.moderate ?? 0} minor ${score.a11y.minor ?? 0}; sha ${score.sha}`,
  );
  const text = `${lines.join("\n")}\n`;
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  }
}

function runPlaywright(env) {
  mkdirSync(SCORE_DIR, { recursive: true });
  const result = spawnSync(
    "npx",
    ["playwright", "test", "--project=score"],
    {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: "inherit",
    },
  );
  return result.status ?? 1;
}

function perfEnv() {
  const env = stripStripe(process.env);
  env.WAITLIST_MODE = "memory";
  env.INTENT_MODE = "memory";
  env.AUTH_MODE = "test";
  if (!env.AUTH_SECRET) env.AUTH_SECRET = "score-auth-secret-min-32-chars!!";
  if (!env.AUTH_TEST_PASSWORD) env.AUTH_TEST_PASSWORD = "test";
  env.NEXT_TELEMETRY_DISABLED = "1";
  delete env.DATABASE_URL;
  delete env.POSTGRES_URL;
  delete env.POSTGRES_PRISMA_URL;
  delete env.RESEND_API_KEY;
  delete env.VERCEL;
  delete env.VERCEL_ENV;
  delete env.PLAYWRIGHT_BASE_URL;
  return env;
}

function chromePath() {
  return process.env.CHROME_PATH || chromium.executablePath();
}

function runNextBuild(env) {
  const result = spawnSync(process.execPath, [NEXT_BIN, "build"], {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`next build exited ${result.status ?? 1}`);
  }
}

function startNext(env) {
  const child = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-p", String(PERF_PORT), "-H", "127.0.0.1"],
    {
      cwd: ROOT,
      env,
      stdio: "inherit",
      detached: true,
    },
  );
  nextChild = child;
  return child;
}

function stopNext(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      return;
    }
  }
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 120000;
  let last = "no response";
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`next start exited ${child.exitCode} before ready`);
    }
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.status < 500) return;
      last = `status ${response.status}`;
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${url} (${last})`);
}

function metricsFromReport(report) {
  const raw = report?.categories?.performance?.score;
  const lcp = report?.audits?.["largest-contentful-paint"]?.numericValue;
  const cls = report?.audits?.["cumulative-layout-shift"]?.numericValue;
  const tbt = report?.audits?.["total-blocking-time"]?.numericValue;
  if (
    typeof raw !== "number" ||
    typeof lcp !== "number" ||
    typeof cls !== "number" ||
    typeof tbt !== "number"
  ) {
    return null;
  }
  return {
    lcp_ms: roundScore(lcp),
    cls: Math.round(cls * 1000) / 1000,
    tbt_ms: roundScore(tbt),
    perf: roundScore(raw * 100),
  };
}

function combineRuns(runs) {
  if (runs.length === 1) return runs[0];
  return {
    lcp_ms: roundScore(median(runs.map((run) => run.lcp_ms))),
    cls: Math.round(median(runs.map((run) => run.cls)) * 1000) / 1000,
    tbt_ms: roundScore(median(runs.map((run) => run.tbt_ms))),
    perf: roundScore(median(runs.map((run) => run.perf))),
  };
}

function runLighthouse(url, chrome, env, outPath) {
  const result = spawnSync(
    process.execPath,
    [
      LH_BIN,
      url,
      "--quiet",
      "--preset=perf",
      "--form-factor=mobile",
      "--only-categories=performance",
      "--output=json",
      `--output-path=${outPath}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage",
      "--no-enable-error-reporting",
      "--disable-full-page-screenshot",
    ],
    {
      cwd: ROOT,
      env: { ...env, CHROME_PATH: chrome },
      stdio: "inherit",
    },
  );
  return result.status ?? 1;
}

async function collectPerf(stable) {
  const runs = stable ? 3 : 1;
  const env = perfEnv();
  runNextBuild(env);
  const child = startNext(env);
  try {
    await waitForServer(`${PERF_ORIGIN}/`, child);
    const chrome = chromePath();
    const pages = {};
    for (const path of PERF_PAGES) {
      const samples = [];
      for (let index = 0; index < runs; index += 1) {
        const outPath = join(SCORE_DIR, `lh-${index}.json`);
        const status = runLighthouse(`${PERF_ORIGIN}${path}`, chrome, env, outPath);
        let report = null;
        try {
          report = JSON.parse(readFileSync(outPath, "utf8"));
        } catch (error) {
          throw new Error(
            `lighthouse ${path} produced no report (exit ${status}): ${error.message}`,
          );
        } finally {
          rmSync(outPath, { force: true });
        }
        const metrics = metricsFromReport(report);
        if (status !== 0 || !metrics) {
          throw new Error(`lighthouse ${path} failed (exit ${status})`);
        }
        samples.push(metrics);
      }
      pages[path] = combineRuns(samples);
    }
    const score = roundScore(
      Object.values(pages).reduce((sum, page) => sum + page.perf, 0) / PERF_PAGES.length,
    );
    return { weight: WEIGHTS.perf, pages, score };
  } finally {
    stopNext(child);
    nextChild = null;
  }
}

function shutdown() {
  if (nextChild) stopNext(nextChild);
  process.exit(143);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function main() {
  applyCleanEnv();
  const stable = process.argv.includes("--stable");
  const env = stripStripe(process.env);
  env.SCORE = "1";
  if (!env.PORT) env.PORT = "3456";
  delete env.PLAYWRIGHT_BASE_URL;
  delete env.CI;

  const status = runPlaywright(env);
  let report;
  try {
    report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  } catch (error) {
    warn(`missing ${REPORT_PATH} (playwright exit ${status}): ${error.message}`);
    process.exit(1);
  }

  const specs = [];
  for (const suite of report.suites ?? []) walkSpecs(suite, specs);
  const flows = collectFlows(specs);
  const a11yAll = collectA11y(specs);
  const a11y = {
    weight: a11yAll.weight,
    serious: a11yAll.serious,
    critical: a11yAll.critical,
    score: a11yAll.score,
  };

  let perf = null;
  let perfError = null;
  try {
    perf = await collectPerf(stable);
  } catch (error) {
    perfError = error;
    process.stderr.write(`score: perf failed: ${error.message}\n`);
  }

  const perfBlock = perf ?? { weight: WEIGHTS.perf, pages: {}, score: 0 };
  const score = {
    version: 1,
    sha: gitSha(),
    total: totalScore(flows, a11y, perfBlock.score),
    flows,
    a11y,
    perf: perfBlock,
  };
  score.a11y.moderate = a11yAll.moderate;
  score.a11y.minor = a11yAll.minor;
  mkdirSync(SCORE_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(score, null, 2)}\n`);
  printSummary(score);
  process.stdout.write(`wrote ${OUT_PATH}\n`);
  if (perfError) {
    warn(`perf incomplete: ${perfError.message}`);
    process.exit(process.env.GITHUB_ACTIONS ? 0 : 1);
  }
  if (process.env.GITHUB_ACTIONS) {
    warn(
      `score total ${score.total} (flows ${flows.score}, a11y ${a11y.score}, perf ${perfBlock.score}); warning-only`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  warn(error.message);
  process.stderr.write(`score: ${error.stack || error.message}\n`);
  process.exit(process.env.GITHUB_ACTIONS ? 0 : 1);
});
