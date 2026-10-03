import { root } from "./core.js";
import { hero } from "./hero.js";

/* ---------------------------------------------------------------- header, menu, phone dock */
var head = document.querySelector(".site-head"), dock = document.getElementById("dock");
function headState(){
  var y = scrollY, heroEnd = root.classList.contains("scrub") ? hero.offsetHeight - innerHeight * 1.05 : innerHeight * 0.6;
  head.classList.toggle("solid", y > heroEnd);
  dock.classList.toggle("show", y > innerHeight * 0.7);
}
addEventListener("scroll", headState, { passive: true }); headState();
var menuBtn = document.querySelector(".menu-btn"), mnav = document.getElementById("mnav");
menuBtn.addEventListener("click", function(){ var o = mnav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); menuBtn.textContent = o ? "Close" : "Menu"; });
mnav.addEventListener("click", function(e){ if (e.target.closest("a")){ mnav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); menuBtn.textContent = "Menu"; } });

