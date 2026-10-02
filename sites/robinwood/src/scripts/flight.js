import { clamp, root, smooth } from "./core.js";

/* ---------------------------------------------------------------- the flight along the Pike */
(function(){
  var fl = document.getElementById("flight"), st = document.getElementById("fstage"), fv = document.getElementById("flightVideo");
  var mile = document.getElementById("fmile"), bar = document.getElementById("fbar");
  var labels = [].slice.call(fl.querySelectorAll(".fl")), stops = [].slice.call(fl.querySelectorAll(".fstop")).map(function(e){ return { el: e, at: +e.dataset.at, op: -1 }; });
  var data = null, fready = false, fdur = 0, fbusy = false, fpend = null, flast = -1, fstart = 0, fload = false;
  var ftarget = 0, fshown = 0, frun = false, fprev = 0, lastMile = "", lastBar = -1;
  function on(){ return root.classList.contains("scrub") && !root.classList.contains("no-flight"); }
  function prog(){ var r = fl.getBoundingClientRect(), span = fl.offsetHeight - innerHeight; return span > 0 ? clamp(-r.top / span, 0, 1) : 0; }
  function load(){
    if (fload) return; fload = true;
    Promise.all([fetch("assets/flight.json").then(function(r){ return r.json(); }), fetch("assets/flight.mp4").then(function(r){ if (!r.ok) throw 0; return r.blob(); })])
    .then(function(res){
      data = res[0]; fv.src = URL.createObjectURL(res[1]);
      fv.addEventListener("loadeddata", function(){ fdur = fv.duration; fready = true; st.classList.add("ready"); fv.pause(); flast = -1; frender(fshown); }, { once: true });
      fv.load();
    }).catch(function(){ root.classList.add("no-flight"); });
  }
  function fseek(t){
    if (fbusy){ fpend = t; if (performance.now() - fstart > 600) fbusy = false; else return; }
    fbusy = true; fstart = performance.now(); flast = t; try { fv.currentTime = t; } catch(e){ fbusy = false; }
  }
  fv.addEventListener("seeked", function(){ fbusy = false; if (fpend !== null){ var t = fpend; fpend = null; if (Math.abs(t - flast) > 0.001) fseek(t); } });
  fv.addEventListener("error", function(){ fbusy = false; root.classList.add("no-flight"); });
  function frender(p){
    var frac = smooth(0, 1, clamp((p - 0.06) / 0.86, 0, 1));
    var m = (frac * 18.2).toFixed(1); if (m !== lastMile){ lastMile = m; mile.textContent = m; }
    if (Math.abs(frac - lastBar) > 0.002){ lastBar = frac; bar.style.width = (frac * 100).toFixed(2) + "%"; }
    var seen = Math.min(1, frac + 0.12 * Math.sin(Math.PI * frac)); /* the camera looks about 2.5 miles ahead of where it is */
    stops.forEach(function(s){
      var d = Math.abs(seen - s.at), op = s.at === 0 ? 1 - smooth(0.03, 0.09, frac) : s.at === 1 ? smooth(0.93, 0.985, frac) : 1 - smooth(0.035, 0.065, d);
      if (Math.abs(op - s.op) > 0.01){ s.op = op; s.el.style.opacity = op.toFixed(2); s.el.style.transform = "translateY(" + ((1 - op) * 10).toFixed(1) + "px)"; }
    });
    if (data){
      var n = data.frames.length, f = data.frames[Math.min(n - 1, Math.max(0, Math.round((isFinite(p) ? p : 0) * (n - 1))))], W = st.clientWidth, H = st.clientHeight;
      if (!f){ console.warn('flight frame missing', p, n); return; }
      var sc = Math.max(W / data.res[0], H / data.res[1]), dw = data.res[0] * sc, dh = data.res[1] * sc, ox = (W - dw) / 2, oy = (H - dh) / 2;
      labels.forEach(function(l){
        var q = f[l.dataset.k], x = ox + q[0] * dw, y = oy + q[1] * dh;
        var vis = q[2] > 0 ? Math.min(smooth(0.02, 0.08, x / W), smooth(0.02, 0.08, 1 - x / W), smooth(0.14, 0.22, y / H), smooth(0.08, 0.16, 1 - y / H)) : 0;
        l.style.opacity = vis.toFixed(2); if (vis > 0) l.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) " + (l.classList.contains("office") ? "translate(-50%,calc(-100% - 34px))" : "translate(-50%,-150%)");
      });
    }
    if (fready){ var t = p * Math.max(0, fdur - 0.05); if (Math.abs(t - flast) > 1 / 48) fseek(t); }
  }
  function ftick(now){
    var dt = Math.min(64, now - fprev); fprev = now;
    fshown += (ftarget - fshown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
    if (Math.abs(ftarget - fshown) < 0.0004){ fshown = ftarget; frun = false; }
    frender(fshown); if (frun) requestAnimationFrame(ftick);
  }
  function fscroll(){
    if (!on()) return;
    var r = fl.getBoundingClientRect(); if (r.top < innerHeight * 2.5) load();
    if (r.bottom < -innerHeight || r.top > innerHeight * 1.5) return;
    ftarget = prog(); if (!frun){ frun = true; fprev = performance.now(); requestAnimationFrame(ftick); }
  }
  addEventListener("scroll", fscroll, { passive: true }); addEventListener("resize", fscroll); fscroll();
})();

