// Check 4 (logo glide) and check 5 (skip button).
import { run, click, sleep, result } from "./lib.mjs";

// Measures the glide in an open session. On phones it also walks 0 to 0.2 screens in small steps
// and records the highest point the flying logo reaches.
export async function measureLogo(b, phone) {
  await run(b, `go(0); await wait(400);`);
  const top = await run(b, `await frame();
    const fly = $(".logo-fly"), head = $(".site-head .logo img");
    return { fly: fly.getBoundingClientRect().width, head: head.getBoundingClientRect().width, flyShown: getComputedStyle(fly).display !== "none" };`);
  let walk = null;
  if (phone) {
    walk = await run(b, `
      const fly = $(".logo-fly"), end = innerHeight * 0.2; let minTop = Infinity, at = 0, n = 0;
      for (let y = 0; y <= end + 0.01; y += 4) {
        go(y); await frame(); n++;
        if (getComputedStyle(fly).display === "none") continue;
        const t = fly.getBoundingClientRect().top; if (t < minTop) { minTop = t; at = y; }
      }
      return { minTop, at, n, end };`);
  }
  const docked = await run(b, `go(innerHeight); await frame();
    const head = $(".site-head .logo img");
    await until(() => getComputedStyle(head).opacity === "1", 2500);
    return { docked: document.documentElement.classList.contains("logo-docked"), opacity: getComputedStyle(head).opacity };`);
  await run(b, `go(0); await frame();`);
  // 2.5x applies on desktop (slot 44vw against a 28px tall header logo). On a 390px phone 2.5x the
  // 228px header logo would be 570px, wider than the screen; the CSS sizes the phone slot at 78vw,
  // so there the flying logo only has to start out wider than the header logo.
  const ratio = top.head ? top.fly / top.head : 0, need = phone ? 1 : 2.5;
  let ok = top.flyShown && (phone ? ratio > need : ratio >= need) && docked.docked && docked.opacity === "1";
  let detail = `at 0: fly ${top.fly.toFixed(1)}px vs header ${top.head.toFixed(1)}px (x${ratio.toFixed(2)}, need ${phone ? "over 1" : "2.5"}); after one screen: logo-docked=${docked.docked} header opacity=${docked.opacity}`;
  if (walk) {
    ok = ok && walk.minTop >= 0;
    detail += `; walk 0 to ${Math.round(walk.end)}px in ${walk.n} steps: highest fly top ${walk.minTop.toFixed(1)}px at scroll ${walk.at}`;
  }
  return { ok, detail };
}

export async function skipCheck(b) {
  await run(b, `go(0); await wait(300);`);
  const c = await click(b, ".skip-intro");
  // the page scrolls smoothly; wait until scrollY has stopped moving
  const m = await run(b, `await wait(100); await settle(() => String(scrollY), 6000, 20);
    return { scrollY, top: $("#services").getBoundingClientRect().top };`);
  return result("5 skip intro", c.ok && m.top >= 0 && m.top <= 120,
    `${c.ok ? "real click landed" : "click problem: " + c.why}; #services top ${m.top.toFixed(1)}px (want 0 to 120) at scrollY ${Math.round(m.scrollY)}`);
}
