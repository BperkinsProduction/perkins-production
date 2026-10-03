// Runs every browser check against URL (default: the local build) and prints one line per check.
// Usage: node tests/run-all.mjs      or      URL=https://www.perkinsproduction.com/concepts/robinwood/ node tests/run-all.mjs
import { session, result, allLogs, loadRetries, URL_DEFAULT, DESKTOP, PHONE } from "./lib.mjs";
import { heroChecks } from "./hero.mjs";
import { measureLogo, skipCheck } from "./logo.mjs";
import { flightDesktop, flightPhone } from "./flight.mjs";
import { breathCheck } from "./breath.mjs";
import { dialogsCheck } from "./dialogs.mjs";
import { bookingCheck, messageCheck } from "./forms.mjs";
import { imagesCheck, overflowCheck } from "./media.mjs";

const results = [];
const print = (r) => { results.push(r); console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}: ${r.detail}`); };

// Each group gets a fresh page so one check's leftovers (an open dialog, a finished breath) cannot leak into another.
async function group(label, opts, fn) {
  let b;
  try { b = await session(label, opts); for (const r of [].concat(await fn(b))) print(r); }
  catch (e) { print(result(`${label} crashed`, false, String((e && e.stack) || e).split("\n").slice(0, 3).join(" | "))); }
  finally { if (b) await b.close(); }
}

console.log(`Testing ${URL_DEFAULT}`);

for (const r of await heroChecks()) print(r);

let desktopLogo;
await group("logo", DESKTOP, async (b) => { desktopLogo = await measureLogo(b, false); return [await skipCheck(b)]; });

await group("phone", PHONE, async (b) => {
  const phoneLogo = await measureLogo(b, true);
  const out = [result("4 logo glide", desktopLogo && desktopLogo.ok && phoneLogo.ok,
    `desktop: ${desktopLogo ? desktopLogo.detail : "not measured"} | phone: ${phoneLogo.detail}`)];
  out.push(await flightPhone(b));
  out.push(await overflowCheck(b, "phone 390x844"));
  return out;
});

await group("flight", DESKTOP, (b) => flightDesktop(b));
await group("breath", DESKTOP, (b) => breathCheck(b));
await group("dialogs", DESKTOP, (b) => dialogsCheck(b));
await group("forms", DESKTOP, async (b) => [await bookingCheck(b), await messageCheck(b)]);
await group("media", DESKTOP, async (b) => [await imagesCheck(b), await overflowCheck(b, "desktop 1440x900")]);

// 13. console errors and exceptions across every session. Connection resets from the local
// python server are listed separately: they come from its listen backlog, not from the page.
const local = new URL(URL_DEFAULT).host;
const serverResets = allLogs.filter((l) => /ERR_CONNECTION_RESET/.test(l) && l.includes(local) && /^127\.|^localhost/.test(local));
const errors = allLogs.filter((l) => / (EXC|error|LOG) /.test(l) && !serverResets.includes(l));
const warnings = allLogs.filter((l) => / warning /.test(l));
print(result("13 no console errors", errors.length === 0,
  `${errors.length} error(s) or exception(s)${errors.length ? ": " + errors.slice(0, 6).join(" || ") : ""}; ${warnings.length} warning(s)${warnings.length ? ": " + warnings.slice(0, 3).join(" || ") : ""}`));
if (serverResets.length || loadRetries.length)
  console.log(`NOTE  local server dropped connections: ${loadRetries.length} page load(s) retried${loadRetries.length ? " (" + loadRetries.join("; ") + ")" : ""}, ${serverResets.length} reset(s) during checks${serverResets.length ? ": " + serverResets.slice(0, 4).join(" || ") : ""}`);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ", failed: " + failed.map((r) => r.name).join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
