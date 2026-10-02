import { clamp, reduce, root } from "./core.js";
import { mqs } from "./hero.js";

/* ---------------------------------------------------------------- the logo glides from the opening into the header */
(function(){
  var fly = document.querySelector(".logo-fly"), headImg = document.querySelector(".site-head .logo img");
  var slots = [].slice.call(document.querySelectorAll(".logo-slot"));
  var lastT = -1, lastKey = "";
  function slot(){ for (var i = 0; i < slots.length; i++){ if (slots[i].offsetParent !== null) return slots[i]; } return null; }
  function place(){
    if (reduce.matches){ root.classList.remove("logo-anim"); root.classList.add("logo-docked"); return; }
    root.classList.add("logo-anim");
    var sl = slot(); if (!sl){ root.classList.add("logo-docked"); return; }
    var a0 = sl.getBoundingClientRect(), hb = headImg.getBoundingClientRect(), pinned = root.classList.contains("scrub");
    /* pinned hero: dock over the first half screen of scrolling. Still hero: move with the page and land as the slot reaches the header */
    var span = pinned ? innerHeight * 0.3 : Math.max(40, a0.top + scrollY - hb.top);
    var t = clamp(scrollY / span, 0, 1), e = pinned ? t * t * (3 - 2 * t) : t;
    if (Math.abs(t - lastT) > 0.002){ lastT = t; root.style.setProperty("--lt", e.toFixed(3)); }
    if (t >= 0.999){ root.classList.add("logo-docked"); return; }
    root.classList.remove("logo-docked");
    var a = a0, b = hb;
    if (!b.width){ b = { left: a.left, top: 18, width: 180 }; }
    /* in the pinned hero the slot stays put; in the still hero it scrolls away, so start from where it sat at the top */
    var ax = a.left, ay = root.classList.contains("scrub") ? a.top : a.top + scrollY, aw = a.width;
    var x = ax + (b.left - ax) * e, y = ay + (b.top - ay) * e, w = aw + (b.width - aw) * e;
    var key = x.toFixed(1) + "," + y.toFixed(1) + "," + w.toFixed(1);
    if (key !== lastKey){ lastKey = key; fly.style.width = w.toFixed(1) + "px"; fly.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)"; }
  }
  addEventListener("scroll", place, { passive: true }); addEventListener("resize", function(){ lastKey = ""; place(); });
  (reduce.addEventListener ? reduce.addEventListener("change", place) : reduce.addListener(place));
  mqs.forEach(function(m){ (m.addEventListener ? m.addEventListener("change", function(){ lastKey = ""; setTimeout(place, 50); }) : 0); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  place(); setTimeout(place, 300);
})();

