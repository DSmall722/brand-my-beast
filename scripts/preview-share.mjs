#!/usr/bin/env node

const raw = process.env.PORT ?? "";
const port = /^[0-9]+$/.test(raw) ? raw : "3000";

console.log(`http://localhost:${port}`);
console.log("not the live domain.");
