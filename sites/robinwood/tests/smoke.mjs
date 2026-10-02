import { open } from "./cdp.mjs";
const b = await open();
const r = await b.js(`await new Promise(r=>setTimeout(r,2500)); const d=document,h=d.getElementById("hero"),v=d.getElementById("heroVideo");
  const out={scrub:d.documentElement.classList.contains("scrub"), ready:d.getElementById("stage").classList.contains("ready")};
  scrollTo({top:h.offsetTop+(h.offsetHeight-innerHeight)*0.565,behavior:"instant"}); await new Promise(r=>setTimeout(r,1800));
  out.band=[...d.querySelectorAll(".band")].map(x=>+(+getComputedStyle(x).opacity).toFixed(2)); out.t=+v.currentTime.toFixed(2); out.want=+(0.565*(v.duration-0.05)).toFixed(2);
  out.contours=d.querySelectorAll("[data-contour] path").length; return out`);
console.log(JSON.stringify(r), JSON.stringify(b.logs)); await b.close();
