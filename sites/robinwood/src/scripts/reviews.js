import { reduce } from "./core.js";

/* ---------------------------------------------------------------- reviews track */
var track = document.getElementById("track");
document.querySelectorAll(".track-btns button").forEach(function(b){
  b.addEventListener("click", function(){ track.scrollBy({ left: +b.dataset.dir * Math.min(460, track.clientWidth * 0.8), behavior: reduce.matches ? "auto" : "smooth" }); });
});

