// Check 9 (booking walkthrough) and check 10 (message form).
import { run, click, type, result } from "./lib.mjs";

const DONE_TEXT = "This is a design concept. No appointment was made and nothing was sent.";
const ui = `return { step: $$("#booker .pane").findIndex((p) => p.classList.contains("cur")), backHidden: $("#back").hidden, nextDisabled: $("#next").disabled, nextHidden: $("#next").hidden };`;

export async function bookingCheck(b) {
  const trail = [];
  const fail = (why) => result("9 booking", false, trail.concat(why).join("; "));
  const s0 = await run(b, ui);
  trail.push(`step one: back hidden=${s0.backHidden}, next disabled=${s0.nextDisabled}`);
  if (!(s0.step === 0 && s0.backHidden && s0.nextDisabled)) return fail("bad initial state");

  const steps = [
    ['[data-office="middletown"]', "office link"],
    ["#next", "next to dentist"],
    ['#o-doc .opt[data-v="Dr. Cho"]', "Dr. Cho"],
    ["#next", "next to time"],
    ["#o-day .opt", "first day"],
    ["#o-time .opt", "first time"],
    ["#next", "next to details"],
  ];
  for (const [sel, what] of steps) {
    const c = await click(b, sel);
    if (!c.ok) return fail(`${what}: ${c.why}`);
    await run(b, `await frame();`);
  }
  const office = await run(b, `return ($('#o-office [aria-pressed="true"]') || {}).dataset?.v || null;`);
  const s3 = await run(b, ui);
  trail.push(`office ${office}, reached step ${s3.step + 1} (next disabled=${s3.nextDisabled})`);
  if (office !== "middletown" || s3.step !== 3) return fail("did not reach the details step");

  await type(b, '#booker [name="n"]', "Test Patient");
  await type(b, '#booker [name="p"]', "301-555-0142");
  const s3b = await run(b, ui);
  trail.push(`after name and phone next disabled=${s3b.nextDisabled}`);
  const c = await click(b, "#next");
  if (!c.ok) return fail(`request button: ${c.why}`);
  const done = await run(b, `await frame(); const d = $("#done");
    return { cur: d.classList.contains("cur"), text: d.textContent.replace(/\\s+/g, " ").trim(), sum: ($("#sum2") || {}).textContent || "" };`);
  const ok = !s3b.nextDisabled && done.cur && done.text.includes(DONE_TEXT) && /Middletown/.test(done.sum);
  trail.push(`done pane shown=${done.cur}, concept text present=${done.text.includes(DONE_TEXT)}, summary "${done.sum}"`);
  return result("9 booking", ok, trail.join("; "));
}

export async function messageCheck(b) {
  const s0 = await run(b, `return { disabled: $("#msg-send").disabled, doneHidden: $("#msg-done").hidden };`);
  await type(b, '#msg [name="mn"]', "Test Patient");
  await type(b, '#msg [name="mc"]', "test@example.com");
  await type(b, '#msg [name="mm"]', "Do you take new patients on Fridays?");
  const s1 = await run(b, `return { disabled: $("#msg-send").disabled };`);
  const c = await click(b, "#msg-send");
  const s2 = await run(b, `await until(() => !$("#msg-done").hidden, 2000); return { doneHidden: $("#msg-done").hidden, text: $("#msg-done").textContent.trim() };`);
  return result("10 message form", s0.disabled && s0.doneHidden && !s1.disabled && c.ok && !s2.doneHidden,
    `send disabled at start=${s0.disabled}; after filling disabled=${s1.disabled}; after submit #msg-done shown=${!s2.doneHidden} ("${s2.text}")${c.ok ? "" : "; click " + c.why}`);
}
