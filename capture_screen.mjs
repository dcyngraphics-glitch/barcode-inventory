#!/usr/bin/env node
// capture_screen.mjs — capture a web page via CDP to PNG (bypasses Page.captureScreenshot timeout).
// Usage: node capture_screen.mjs <output.png> <url> [wait_ms]
import { execFileSync } from "node:child_process";

const OUT = process.argv[2];
const URL = process.argv[3];
const WAIT_MS = Number(process.argv[4] || 2500);

// 1) Load the URL in the browser harness session.
// (browser_exec session state is shared via the daemon; we reload the page here.)
execFileSync(process.execPath, ["./capture_screen.js", URL, String(WAIT_MS)], { stdio: "inherit" });

// 2) Ask the daemon to printToPDF (Page.captureScreenshot times out on this backend).
const { cdp, goto_url, wait_for_load, js, daemon_alive } = require("./browser_harness.helpers");
// The browser_exec session uses a node wrapper; re-import the socket helpers.
const fs = require("node:fs");
const path = require("node:path");

// Third: convert PDF bytes -> PNG with pymupdf, save to OUT.
execFileSync(process.execPath, ["./capture_pdf.mjs", OUT]);
