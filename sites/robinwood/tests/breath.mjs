// Check 7: the breath. Holding space on #hold fills the visit steps; releasing lets it fall back.
import { run, key, sleep, result } from "./lib.mjs";

const state = `return { seen: $$("#steps .step.seen").length, breath: getComputedStyle($("#visit")).getPropertyValue("--breath").trim(), label: $("#hold-label").textContent.trim() };`;

export async function breathCheck(b) {
  const start = await run(b, `const h = $("#hold"); h.scrollIntoView({ block: "center", behavior: "instant" }); await frame(); h.focus();
    return { focused: document.activeElement === h, label: $("#hold-label").textContent.trim(), seen: $$("#steps .step.seen").length };`);
  await key(b, "keyDown");
  await sleep(2100);
  const held1 = await run(b, state);
  await key(b, "keyUp");
  await sleep(1800);
  const fell = await run(b, state);
  await run(b, `$("#hold").focus();`);
  await key(b, "keyDown");
  await sleep(4400);
  const held2 = await run(b, state);
  await key(b, "keyUp");
  await sleep(300);
  const after = await run(b, state);
  const ok = start.focused && start.seen === 0 && held1.seen === 2 && Math.abs(+fell.breath) < 0.02 && fell.seen === 0
    && held2.seen === 4 && after.seen === 4 && after.label !== start.label;
  return result("7 breath", ok,
    `focus=${start.focused}; 2.1 s hold: ${held1.seen} seen (--breath ${held1.breath}); after release: --breath ${fell.breath}, ${fell.seen} seen; 4.4 s hold: ${held2.seen} seen, label "${start.label}" to "${after.label}"`);
}
