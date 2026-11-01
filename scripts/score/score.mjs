#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WEIGHTS = { flows: 50, a11y: 25, perf: 25 };
const ROOT = process.cwd();
const SCORE_DIR = join(ROOT, "score");
const REPORT_PATH = join(SCORE_DIR, "playwright.json");
const OUT_PATH = join(SCORE_DIR, "score.json");

function stripStripe(env) {
  const next = { ...env };
  for (const key of Object.keys(next)) {
    if (key.startsWith("STRIPE_")) delete next[key];
  }
  return next;
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
  return file.endsWith("tests/score/flows.spec.ts") || file.endsWith("/score/flows.spec.ts");
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
            if (violation.impact === "serious") serious += 1;
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
  };
}

function totalScore(flows, a11y, perf) {
  if (perf == null) {
    const weight = WEIGHTS.flows + WEIGHTS.a11y;
    return roundScore((flows.score * WEIGHTS.flows + a11y.score * WEIGHTS.a11y) / weight);
  }
  const weight = WEIGHTS.flows + WEIGHTS.a11y + WEIGHTS.perf;
  return roundScore(
    (flows.score * WEIGHTS.flows + a11y.score * WEIGHTS.a11y + perf * WEIGHTS.perf) /
      weight,
  );
}

function printSummary(score) {
  const lines = [
    "| area | weight | score |",
    "| --- | ---: | ---: |",
    `| flows | ${score.flows.weight} | ${score.flows.score} |`,
    `| a11y | ${score.a11y.weight} | ${score.a11y.score} |`,
    `| perf | ${WEIGHTS.perf} | n/a |`,
    `| **total** |  | **${score.total}** |`,
    "",
    `flows ${score.flows.passed}/${score.flows.total}; a11y critical ${score.a11y.critical} serious ${score.a11y.serious}; sha ${score.sha}`,
  ];
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

function main() {
  const env = stripStripe(process.env);
  env.SCORE = "1";
  if (!env.PORT) env.PORT = "3456";
  delete env.PLAYWRIGHT_BASE_URL;

  const status = runPlaywright(env);
  let report;
  try {
    report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  } catch (error) {
    process.stderr.write(
      `score: missing ${REPORT_PATH} (playwright exit ${status}): ${error.message}\n`,
    );
    process.exit(1);
  }

  const specs = [];
  for (const suite of report.suites ?? []) walkSpecs(suite, specs);
  const flows = collectFlows(specs);
  const a11y = collectA11y(specs);
  const score = {
    version: 1,
    sha: gitSha(),
    total: totalScore(flows, a11y, null),
    flows,
    a11y,
    perf: null,
  };
  writeFileSync(OUT_PATH, `${JSON.stringify(score, null, 2)}\n`);
  printSummary(score);
  process.stdout.write(`wrote ${OUT_PATH}\n`);
  process.exit(0);
}

main();
