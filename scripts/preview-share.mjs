#!/usr/bin/env node
/**
 * Slice 16.31 — print the local preview URL.
 * Does not start the server. Does not print the live domain.
 */

const raw = process.env.PORT ?? "";
const port = /^[0-9]+$/.test(raw) ? raw : "3000";

console.log(`http://localhost:${port}`);
console.log("not the live domain.");
