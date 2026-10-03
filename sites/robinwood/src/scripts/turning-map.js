import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- the turning map */
var map = document.getElementById("map"), relief = document.getElementById("relief"), pinH = document.getElementById("pin-h"), pinM = document.getElementById("pin-m");
var turn = null, frames = [], frameNow = -1, turnLoading = false;
function placePins(pos){
  pinH.style.left = (pos.hagerstown[0] * 100) + "%"; pinH.style.top = (pos.hagerstown[1] * 100) + "%";
  pinM.style.left = (pos.middletown[0] * 100) + "%"; pinM.style.top = (pos.middletown[1] * 100) + "%";
}
function loadTurn(){
  if (turnLoading || reduce.matches) return; turnLoading = true;
  fetch("assets/turn/turn.json").then(function(r){ return r.json(); }).then(function(j){
    var n = j.frames.length, left = n, list = [];
    for (var i = 0; i < n; i++){
      (function(i){ var im = new Image(); im.decoding = "async"; im.onload = im.onerror = function(){ if (--left === 0){ turn = j; frames = list; turnMap(); } }; im.src = "assets/turn/t" + (i < 10 ? "0" : "") + i + ".webp"; list[i] = im; })(i);
    }
  }).catch(function(){});
}
function turnMap(){
  if (!turn || reduce.matches) return;
  var r = map.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
  var p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1), i = Math.round(p * (frames.length - 1));
  if (i !== frameNow && frames[i].complete && frames[i].naturalWidth){ frameNow = i; relief.src = frames[i].src; placePins(turn.frames[i]); }
}
new IntersectionObserver(function(es){ if (es[0].isIntersecting) loadTurn(); }, { rootMargin: "150% 0px" }).observe(map);
addEventListener("scroll", turnMap, { passive: true });

