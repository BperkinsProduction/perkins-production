// Check 8: the reader dialog for bios, service pages and the tips library.
import { run, click, result } from "./lib.mjs";

const opened = `await until(() => $("#reader").open && $("#reader-title"), 4000);
  return { open: $("#reader").open, title: ($("#reader-title") || {}).textContent || "", kicker: (($("#reader-body .kicker") || {}).textContent || "").trim(), paras: $$("#reader-body p").length };`;

async function closeReader(b) {
  const c = await click(b, "#reader .reader-close");
  const m = await run(b, `await until(() => !$("#reader").open, 2000); return { open: $("#reader").open };`);
  return c.ok && !m.open;
}

export async function dialogsCheck(b) {
  const notes = [];
  let ok = true;

  const c1 = await click(b, '[data-bio="eric-cho"]');
  const bio = await run(b, opened);
  const bioOk = c1.ok && bio.open && bio.title === "Eric Cho, DDS";
  notes.push(`bio: open=${bio.open} title "${bio.title}"${c1.ok ? "" : " (" + c1.why + ")"}`);
  const closed1 = await closeReader(b);
  ok = ok && bioOk && closed1;

  const svc = await run(b, `const s = $("[data-svc]"); return { key: s.dataset.svc, n: $$("[data-svc]").length };`);
  const c2 = await click(b, `[data-svc="${svc.key}"]`);
  const sp = await run(b, opened);
  const svcOk = c2.ok && sp.open && sp.kicker === "Services" && sp.title.length > 2 && sp.paras > 1;
  notes.push(`service ${svc.key}: open=${sp.open} title "${sp.title}" with ${sp.paras} paragraphs${c2.ok ? "" : " (" + c2.why + ")"}`);
  const closed2 = await closeReader(b);
  ok = ok && svcOk && closed2;

  const c3 = await click(b, "#open-tips");
  const tips = await run(b, `await until(() => $$("#reader-body [data-tip]").length, 4000);
    return { open: $("#reader").open, n: $$("#reader-body [data-tip]").length, pick: ($('#reader-body [data-tip="5"]') || {}).textContent };`);
  const c4 = await click(b, '#reader-body [data-tip="5"]');
  const art = await run(b, `await until(() => $("#reader-body [data-tips]"), 3000);
    return { title: ($("#reader-title") || {}).textContent || "", paras: $$("#reader-body p").length, back: !!$("#reader-body [data-tips]") };`);
  const tipsOk = c3.ok && tips.open && tips.n === 33 && c4.ok && art.back && art.title === tips.pick && art.paras > 1;
  notes.push(`tips: ${tips.n} [data-tip] buttons (want 33); article "${art.title}" with ${art.paras} paragraphs${c3.ok && c4.ok ? "" : " (" + (c3.why || c4.why) + ")"}`);
  const closed3 = await closeReader(b);
  ok = ok && tipsOk && closed3;
  if (!(closed1 && closed2 && closed3)) notes.push("close button did not close the dialog");

  return result("8 dialogs", ok, notes.join("; "));
}
