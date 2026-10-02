/* ---------------------------------------------------------------- the reader: bios, services, tips */
var reader = document.getElementById("reader"), body = document.getElementById("reader-body"), content = null, opener = null;
function getContent(){ return content ? Promise.resolve(content) : fetch("assets/content.json").then(function(r){ return r.json(); }).then(function(j){ content = j; return j; }); }
function esc(s){ return s.replace(/[&<>"]/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; }); }
function renderParas(ps, bio){
  var out = "", list = [], creds = [];
  function flush(){ if (list.length){ out += "<ul>" + list.map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; list = []; } }
  for (var i = 0; i < ps.length; i++){
    var p = ps[i], nxt = ps[i + 1] || "";
    if (bio && /^[A-Za-z\- ]{2,40}\s?:\s/.test(p) && p.length < 240){ creds.push(p.replace(/\s+:/, ":")); continue; }
    var short = p.length < 90 && !/[.!?"]$/.test(p);
    if (short && (nxt.length < 90 && !/[.!?"]$/.test(nxt) || list.length)){ list.push(p); continue; }
    flush();
    if (short) out += "<h3>" + esc(p) + "</h3>"; else out += "<p>" + esc(p) + "</p>";
  }
  flush();
  if (creds.length) out += '<ul class="creds">' + creds.map(function(c){ return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>";
  return out;
}
function openReader(html, from){
  opener = from || document.activeElement; body.innerHTML = html; reader.querySelector(".reader-in").scrollTop = 0;
  if (!reader.open) reader.showModal();
}
reader.addEventListener("close", function(){ if (opener && opener.focus) opener.focus(); });
reader.querySelector(".reader-close").addEventListener("click", function(){ reader.close(); });
reader.addEventListener("click", function(e){ if (e.target === reader) reader.close(); });
document.querySelectorAll("[data-bio]").forEach(function(b){
  b.addEventListener("click", function(){
    getContent().then(function(c){
      var d = c.dentists[b.dataset.bio], role = b.querySelector(".role").textContent;
      openReader('<div class="head"><img src="assets/' + b.dataset.img + '.jpg" alt=""><div><span class="kicker" style="margin:0 0 .4rem">' + esc(role) + '</span><h2 id="reader-title">' + esc(d.name) + "</h2></div></div>" + renderParas(d.paras, true) + '<p style="margin-top:1.6rem"><a class="btn btn-book" href="#book" data-close>Book a visit</a></p>', b);
    });
  });
});
document.querySelectorAll("[data-svc]").forEach(function(b){
  b.addEventListener("click", function(){
    getContent().then(function(c){
      var s = c.services[b.dataset.svc];
      openReader('<span class="kicker" style="margin-bottom:.4rem">Services</span><h2 id="reader-title">' + esc(s.title) + '</h2><p class="sub">' + esc(s.sub) + "</p>" + renderParas(s.paras, false) + '<p style="margin-top:1.6rem"><a class="btn btn-book" href="#book" data-close>Book a visit</a></p>', b);
    });
  });
});
function tipsIndex(from){
  getContent().then(function(c){
    openReader('<span class="kicker" style="margin-bottom:.4rem">Tips library</span><h2 id="reader-title">From the Robinwood team.</h2><p class="sub">' + c.posts.length + ' articles from the practice\'s own blog.</p><ul class="tiplist">' + c.posts.map(function(p, i){ return '<li><button type="button" data-tip="' + i + '">' + esc(p.title) + "</button></li>"; }).join("") + "</ul>", from);
  });
}
document.getElementById("open-tips").addEventListener("click", function(e){ tipsIndex(e.currentTarget); });
body.addEventListener("click", function(e){
  var t = e.target.closest("[data-tip]"), back = e.target.closest("[data-tips]"), cl = e.target.closest("[data-close]");
  if (t){ var p = content.posts[+t.dataset.tip]; body.innerHTML = '<p><button class="btn btn-quiet" type="button" data-tips>All articles</button></p><h2 id="reader-title">' + esc(p.title) + "</h2>" + renderParas(p.paras, false); reader.querySelector(".reader-in").scrollTop = 0; }
  if (back){ tipsIndex(opener); }
  if (cl){ reader.close(); }
});

