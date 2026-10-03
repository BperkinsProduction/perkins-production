// Shared helpers every feature uses.
var root = document.documentElement;
var reduce = matchMedia("(prefers-reduced-motion: reduce)");
function clamp(v,a,b){ return v < a ? a : v > b ? b : v; }
function smooth(e0,e1,x){ var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }


export { clamp, reduce, root, smooth };
