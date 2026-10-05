#!/usr/bin/env node
/**
 * Run Playwright as N one-worker processes, each with its own `next dev`.
 *
 * The memory ledger is process-global, so two workers on one server race.
 * Two servers do not. Specs are packed by file size.
 */

import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SHARDS = Number(process.env.BMB_PLAYWRIGHT_SHARDS ?? 2);
const BASE_PORT = Number(process.env.BMB_PLAYWRIGHT_BASE_PORT ?? 3100);

function walkSpecs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkSpecs(full));
      continue;
    }
    if (name.endsWith(".spec.ts")) out.push(full);
  }
  return out;
}

function packBySize(files, shards) {
  const bins = Array.from({ length: shards }, () => ({
    weight: 0,
    files: [],
  }));
  const weighted = files
    .map((file) => ({ file, weight: statSync(file).size }))
    .sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file));
  for (const item of weighted) {
    let lightest = 0;
    for (let i = 1; i < bins.length; i += 1) {
      if (bins[i].weight < bins[lightest].weight) lightest = i;
    }
    bins[lightest].files.push(item.file);
    bins[lightest].weight += item.weight;
  }
  for (const bin of bins) bin.files.sort((a, b) => a.localeCompare(b));
  return bins;
}

function runPlaywright(files, env, label) {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["playwright", "test", "--reporter=list", ...files],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );
    const pipe = (stream) => {
      let buf = "";
      stream.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.length > 0) process.stdout.write(`[${label}] ${line}\n`);
        }
      });
      stream.on("end", () => {
        if (buf.length > 0) process.stdout.write(`[${label}] ${buf}\n`);
      });
    };
    pipe(child.stdout);
    pipe(child.stderr);
    child.on("error", (error) => {
      process.stderr.write(`[${label}] ${error.message}\n`);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function serverEnv(port, index) {
  const env = {
    ...process.env,
    CI: "true",
    PORT: String(port),
    PLAYWRIGHT_OUTPUT_DIR: `test-results/shard-${index}`,
    NEXT_DIST_DIR: `.next/ci-${port}`,
  };
  delete env.PLAYWRIGHT_BASE_URL;
  delete env.NO_COLOR;
  return env;
}

async function main() {
  if (!Number.isInteger(SHARDS) || SHARDS < 1) {
    console.error(`BMB_PLAYWRIGHT_SHARDS must be a positive integer, got ${SHARDS}`);
    process.exit(1);
  }
  const specs = walkSpecs("tests");
  if (specs.length === 0) {
    console.error("ci-playwright-shards: no specs selected");
    process.exit(1);
  }
  const bins = packBySize(specs, SHARDS).filter((bin) => bin.files.length > 0);
  console.log(
    bins
      .map((bin, index) => `shard ${index}: ${bin.files.length} files, ${bin.weight} bytes`)
      .join("\n"),
  );
  const codes = await Promise.all(
    bins.map((bin, index) => {
      const port = BASE_PORT + index;
      return runPlaywright(bin.files, serverEnv(port, index), `shard ${index} :${port}`);
    }),
  );
  const failed = codes.find((code) => code !== 0);
  process.exit(failed ?? 0);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main();
}
