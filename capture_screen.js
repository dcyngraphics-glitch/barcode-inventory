#!/usr/bin/env node
// capture_screen.js — navigate to a URL in the browser harness session,
// printToPDF, dump base64 PDF to stdout for the python step.
// Usage: node capture_screen.js <url> [wait_ms]
import { cdp, goto_url, wait_for_load, js } from "./browser_harness.helpers.js";

const URL = process.argv[2];
const WAIT_MS = Number(process.argv[3] || 2500);

await goto_url(URL);
await new Promise((r) => setTimeout(r, WAIT_MS));
console.log("TITLE:", js("document.title"));

// Capture a PDF via CDP (Page.printToPDF works where Page.captureScreenshot times out)
const res = await cdp("Page.printToPDF", { landscape: false, printBackground: true, _response_timeout: 20000 });
if (!res || typeof res.data !== "string" || !res.data.startsWith("JVBER")) {
  console.error("FAIL: unexpected printToPDF response", JSON.stringify(res).slice(0, 200));
  process.exit(1);
}
// digits-only base64 (no padding) so the python side can decode it safely
process.stdout.write("BASE64:" + res.data);
