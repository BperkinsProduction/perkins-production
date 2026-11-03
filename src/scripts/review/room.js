
// The Review Room in the browser: player, notes, drawing on the frame, sign off.
// Who is posting comes from the signed-in session, never from the page.
import { $, api as call, toast } from './api.js';

{
  const COLORS = ['#c9a96e', '#e5484d', '#3dd68c', '#4cc2ff', '#f2efe9'];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const verb = matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
  const idleHint = `${verb} the video to leave a note at that moment`;
  $('hint').textContent = idleHint;
  const S = {
    data: null, videoId: null, version: null, filter: 'open', selected: null,
    name: '', me: null, project: null, drawMode: false, color: COLORS[0],
    strokes: [], showing: null, replyOpen: null, posting: false,
  };

  const video = $('video');
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');

  // ---------- helpers ----------
  function fmt(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }
  function ago(iso) {
    const d = new Date(iso);
    const mins = Math.round((Date.now() - d) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)} hr ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const currentVideo = () => S.data?.manifest.videos.find(v => v.id === S.videoId);
  const currentVersion = () => currentVideo()?.versions.find(v => v.v === S.version);
  const notesFor = (id, ver) => S.data.notes.filter(n => n.video === id && n.version === ver);
  const topNotes = () => notesFor(S.videoId, S.version).filter(n => !n.parent).sort((a, b) => a.t - b.t || a.at.localeCompare(b.at));
  const repliesOf = id => S.data.notes.filter(n => n.parent === id).sort((a, b) => a.at.localeCompare(b.at));
  const approvalOf = (id, ver) => S.data.approvals[`${id}@${ver}`];

  // ---------- data ----------
  async function api(method, body, fresh) {
    try {
      return await call(method, body, S.project, fresh);
    } catch (err) {
      if (err.signin && S.data) showGate('You were signed out. Sign in again to keep going.');
      throw err;
    }
  }

  // After your own change, read fresh so it shows straight away.
  async function load(first, fresh = false) {
    try {
      S.data = await api('GET', undefined, fresh);
    } catch (err) {
      if (first) {
        if (err.signin) { showGate(); return; }
        $('splash').innerHTML = '';
        const box = el('div');
        box.append(el('h2', '', 'Review room'), el('p', '', err.message));
        $('splash').append(box);
      }
      return;
    }
    S.me = S.data.me; S.name = S.me.name; S.project = S.data.project;
    if (first) {
      const m = S.data.manifest;
      document.title = `${m.title || 'Review Room'} | Perkins Production`;
      $('projectTitle').textContent = m.title || 'Review Room';
      $('projectClient').textContent = m.client || '';
      if (m.intro) { $('intro').textContent = m.intro; $('intro').hidden = false; }
      $('splash').hidden = true;
      $('room').hidden = false;
      const saved = store.get(`review-pos-${S.project}`);
      const [vid, ver] = (location.hash.slice(1) || saved || '').split('@');
      const pick = m.videos.find(v => v.id === vid) || m.videos[0];
      selectVideo(pick.id, pick.versions.some(x => x.v === ver) ? ver : null);
      showWho();
    } else {
      if (!currentVideo()) { const v = S.data.manifest.videos[0]; selectVideo(v.id); return; }
      renderAll();
    }
  }

  // ---------- selection ----------
  function selectVideo(id, ver) {
    const v = S.data.manifest.videos.find(x => x.id === id);
    if (!v) return;
    S.videoId = id;
    S.version = ver || v.versions[v.versions.length - 1].v;
    S.selected = null; S.replyOpen = null; clearDrawing();
    const src = currentVersion().url;
    if (video.getAttribute('src') !== src) {
      video.pause();
      $('vidErr').hidden = true;
      video.setAttribute('src', src);
      if (currentVersion().poster) video.poster = currentVersion().poster; else video.removeAttribute('poster');
      video.load();
    }
    history.replaceState(null, '', `#${id}@${S.version}`);
    store.set(`review-pos-${S.project}`, `${id}@${S.version}`);
    renderAll();
  }

  // ---------- render ----------
  function renderAll() {
    renderVideoList(); renderHead(); renderMarks(); renderApproval(); renderNotes(); updateComposer();
  }

  function renderVideoList() {
    const list = $('videoList'); list.innerHTML = '';
    const pick = $('mobilePick'); pick.innerHTML = '';
    for (const v of S.data.manifest.videos) {
      const latest = v.versions[v.versions.length - 1].v;
      const open = notesFor(v.id, latest).filter(n => !n.parent && n.status === 'open').length;
      const ok = approvalOf(v.id, latest);
      const b = el('button', 'vid' + (v.id === S.videoId ? ' on' : ''));
      b.type = 'button';
      b.append(el('div', 't', v.title));
      const m = el('div', 'm');
      m.append(el('span', '', latest));
      if (ok) m.append(el('span', 'ok', 'Approved'));
      else if (open) m.append(el('span', 'open', `${open} open`));
      b.append(m);
      b.addEventListener('click', () => selectVideo(v.id));
      list.append(b);
      const o = el('option', '', `${v.title} (${latest})${ok ? ', approved' : open ? `, ${open} open` : ''}`);
      o.value = v.id; o.selected = v.id === S.videoId;
      pick.append(o);
    }
  }

  function renderHead() {
    const v = currentVideo(), ver = currentVersion();
    $('videoTitle').textContent = v.title;
    $('videoSub').textContent = [ver.v, ver.date, v.note].filter(Boolean).join('  ·  ');
    const box = $('versions'); box.innerHTML = '';
    if (v.versions.length > 1) {
      for (const x of v.versions) {
        const b = el('button', x.v === S.version ? 'on' : '', x.v);
        b.type = 'button';
        if (approvalOf(v.id, x.v)) b.append(el('span', 'dot'));
        b.addEventListener('click', () => selectVideo(v.id, x.v));
        box.append(b);
      }
    }
    $('changes').hidden = !ver.changes;
    $('changesText').textContent = ver.changes || '';
  }

  function renderMarks() {
    const box = $('marks'); box.innerHTML = '';
    const d = video.duration;
    if (!d || !isFinite(d)) return;
    for (const n of topNotes()) {
      if (n.status === 'done' && S.filter === 'open') continue;
      const m = el('div', 'mark' + (n.status === 'done' ? ' done' : ''));
      m.style.left = `${Math.min(100, (n.t / d) * 100)}%`;
      m.title = `${fmt(n.t)}  ${n.author}: ${n.text.slice(0, 80)}`;
      m.addEventListener('pointerdown', e => { e.stopPropagation(); selectNote(n.id, true); });
      box.append(m);
    }
  }

  function renderApproval() {
    const a = approvalOf(S.videoId, S.version);
    const st = $('approveState');
    if (a) {
      st.className = 'state ok';
      st.textContent = `Approved by ${a.by}, ${new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`;
    } else {
      st.className = 'state';
      const open = topNotes().filter(n => n.status === 'open').length;
      st.textContent = open ? `${open} open note${open > 1 ? 's' : ''} on ${S.version}. Approve when it is ready to finish.` : `When ${S.version} is right, approve it and Brice will make the final.`;
    }
    $('approveBtn').hidden = Boolean(a);
    $('unapproveBtn').hidden = !a;
  }

  function renderNotes() {
    const all = topNotes();
    const open = all.filter(n => n.status === 'open').length;
    $('notesCount').textContent = `Notes on ${S.version}  ·  ${open} open`;
    for (const b of $('filters').children) b.classList.toggle('on', b.dataset.f === S.filter);
    const shown = all.filter(n => S.filter === 'all' || n.status === S.filter);
    const list = $('list'); list.innerHTML = '';
    if (!shown.length) {
      list.append(el('p', 'empty', S.filter === 'open'
        ? (all.length ? 'Every note here is done.' : `No notes yet. ${verb} the video at any moment to leave one.`)
        : 'Nothing here yet.'));
      return;
    }
    for (const n of shown) list.append(noteCard(n));
  }

  function noteCard(n) {
    const card = el('div', 'note' + (n.id === S.selected ? ' sel' : '') + (n.status === 'done' ? ' done' : ''));
    card.dataset.id = n.id;
    const h = el('div', 'h');
    const tc = el('button', 'tc', fmt(n.t)); tc.type = 'button';
    tc.addEventListener('click', () => selectNote(n.id, true));
    h.append(tc, el('span', 'by', n.author), el('span', 'when', ago(n.at)));
    card.append(h);
    if (n.text) card.append(el('div', 'body', n.text));
    if (n.drawing) {
      const d = el('button', 'drew', 'Show drawing'); d.type = 'button';
      d.addEventListener('click', () => selectNote(n.id, true));
      card.append(d);
    }
    for (const r of repliesOf(n.id)) {
      const rb = el('div', 'reply');
      const by = el('span', 'by', r.author);
      if (r.admin) by.append(el('span', 'studio', 'Perkins'));
      rb.append(by, el('span', 'when', ago(r.at)), el('p', '', r.text));
      card.append(rb);
    }
    const acts = el('div', 'acts');
    const reply = el('button', '', 'Reply'); reply.type = 'button';
    reply.addEventListener('click', () => { S.replyOpen = S.replyOpen === n.id ? null : n.id; renderNotes(); const t = document.querySelector(`.note[data-id="${n.id}"] textarea`); if (t) t.focus(); });
    const done = el('button', n.status === 'done' ? 'is-done' : '', n.status === 'done' ? 'Done ✓' : 'Mark done'); done.type = 'button';
    done.title = n.status === 'done' && n.statusBy ? `Marked done by ${n.statusBy}` : '';
    done.addEventListener('click', () => setStatus(n.id, n.status === 'done' ? 'open' : 'done'));
    acts.append(reply, done);
    if (S.me && (n.by ? n.by === S.me.id : n.author.toLowerCase() === S.name.toLowerCase())) {
      const rm = el('button', '', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', () => { if (confirm('Remove this note?')) setStatus(n.id, 'removed'); });
      acts.append(rm);
    }
    card.append(acts);
    if (S.replyOpen === n.id) {
      const box = el('div', 'reply-box');
      const ta = el('textarea'); ta.placeholder = 'Write a reply'; ta.maxLength = 4000;
      const send = el('button', 'btn small', 'Send'); send.type = 'button';
      send.addEventListener('click', () => postReply(n.id, ta.value, send));
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postReply(n.id, ta.value, send); });
      box.append(ta, send);
      card.append(box);
    }
    return card;
  }

  function selectNote(id, seek) {
    const n = S.data.notes.find(x => x.id === id);
    if (!n) return;
    S.selected = id;
    if (S.filter !== 'all' && n.status !== S.filter) S.filter = 'all';
    if (seek) { video.pause(); video.currentTime = n.t; }
    if (S.drawMode) toggleDraw(false);
    S.showing = n.drawing ? n.id : null;
    S.strokes = [];
    renderNotes(); renderMarks(); paint();
    const card = document.querySelector(`.note[data-id="${id}"]`);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ---------- actions ----------
  async function postNote() {
    if (S.posting) return;
    const text = $('noteText').value.trim();
    if (!text && !S.strokes.length) { toast('Write a note or draw on the frame first.'); $('noteText').focus(); return; }
    S.posting = true; $('postBtn').disabled = true;
    try {
      await api('POST', { action: 'note', video: S.videoId, version: S.version, t: video.currentTime, text, drawing: S.strokes.length ? S.strokes : null });
      $('noteText').value = '';
      clearDrawing(); toggleDraw(false);
      S.filter = 'open';
      await load(false, true);
      toast('Note posted. Brice will see it.');
    } catch (err) { toast(err.message); }
    S.posting = false; $('postBtn').disabled = false;
  }

  async function postReply(id, text, btn) {
    text = text.trim();
    if (!text) return;
    btn.disabled = true;
    try {
      await api('POST', { action: 'note', parent: id, text });
      S.replyOpen = null;
      await load(false, true);
    } catch (err) { toast(err.message); btn.disabled = false; }
  }

  async function setStatus(id, status) {
    try {
      await api('POST', { action: 'status', note: id, status });
      await load(false, true);
      if (status === 'done') toast('Marked done.');
    } catch (err) { toast(err.message); }
  }

  function openApprove() {
    const open = topNotes().filter(n => n.status === 'open').length;
    $('approveText').textContent = `Approve ${currentVideo().title} ${S.version} as ${S.name}?` + (open ? ` There ${open === 1 ? 'is' : 'are'} still ${open} open note${open > 1 ? 's' : ''}.` : ' Brice will make the final from this version.');
    $('approveModal').hidden = false;
  }
  async function approve(action) {
    $('approveModal').hidden = true;
    try {
      await api('POST', { action, video: S.videoId, version: S.version });
      await load(false, true);
      toast(action === 'approve' ? 'Approved. Thank you.' : 'Approval removed.');
    } catch (err) { toast(err.message); }
  }

  // ---------- sign in ----------
  function showWho() { $('who').hidden = !S.name; $('whoName').textContent = S.name; }
  function showGate(message) {
    S.data = null;
    video.pause();
    $('room').hidden = true; $('splash').hidden = true; $('who').hidden = true;
    $('gate').hidden = false;
    $('signinErr').hidden = !message;
    if (message) $('signinErr').textContent = message;
    setTimeout(() => $('signinEmail').focus(), 50);
  }
  $('signinForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('signinBtn');
    btn.disabled = true; $('signinErr').hidden = true;
    try {
      await call('POST', { action: 'signin', email: $('signinEmail').value, password: $('signinPassword').value });
      $('signinPassword').value = '';
      $('gate').hidden = true; $('splash').hidden = false;
      await load(true);
    } catch (err) {
      $('signinErr').textContent = err.message; $('signinErr').hidden = false;
    }
    btn.disabled = false;
  });
  $('showPassword').addEventListener('click', () => {
    const f = $('signinPassword');
    f.type = f.type === 'password' ? 'text' : 'password';
    $('showPassword').textContent = f.type === 'password' ? 'Show' : 'Hide';
  });
  $('signOut').addEventListener('click', async () => {
    try { await call('POST', { action: 'signout' }); } catch {}
    location.replace('/review/');
  });

  // ---------- player ----------
  function setPlayIcon() {
    $('playIcon').innerHTML = video.paused ? '<path d="M6 4l14 8-14 8z"/>' : '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
    $('playBtn').setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    $('bigPlay').hidden = !video.paused || video.currentTime > 0.05 || S.drawMode;
  }
  function togglePlay() {
    if (video.paused) {
      if (S.drawMode) toggleDraw(false);
      S.showing = null; S.strokes = []; paint();
      video.play().catch(() => {});
    } else video.pause();
  }
  function tick() {
    const d = video.duration || 0, t = video.currentTime || 0;
    const pct = d ? (t / d) * 100 : 0;
    $('fill').style.width = `${pct}%`;
    $('head').style.left = `${pct}%`;
    $('time').textContent = `${fmt(t)} / ${fmt(d)}`;
    try { if (video.buffered.length && d) $('buf').style.width = `${(video.buffered.end(video.buffered.length - 1) / d) * 100}%`; } catch {}
    updateComposer();
  }
  function updateComposer() {
    $('composeAt').textContent = `Note at ${fmt(video.currentTime)}`;
  }
  video.addEventListener('timeupdate', tick);
  video.addEventListener('seeked', tick);
  video.addEventListener('progress', tick);
  video.addEventListener('loadedmetadata', () => { tick(); renderMarks(); sizeCanvas(); });
  video.addEventListener('play', () => { setPlayIcon(); $('hint').style.opacity = 0; });
  video.addEventListener('pause', setPlayIcon);
  video.addEventListener('error', () => { if (video.getAttribute('src')) $('vidErr').hidden = false; });
  video.addEventListener('playing', () => { if (S.showing) { S.showing = null; paint(); } });

  $('playBtn').addEventListener('click', togglePlay);
  $('backBtn').addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - 5); });
  $('fwdBtn').addEventListener('click', () => { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); });
  $('speed').addEventListener('change', e => { video.playbackRate = Number(e.target.value); });
  $('fsBtn').addEventListener('click', () => {
    const p = $('player');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (p.requestFullscreen) p.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
  document.addEventListener('fullscreenchange', () => setTimeout(sizeCanvas, 100));

  // scrubbing
  const scrub = $('scrub');
  function seekFromEvent(e) {
    const r = scrub.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (video.duration) video.currentTime = x * video.duration;
  }
  scrub.addEventListener('pointerdown', e => {
    scrub.setPointerCapture(e.pointerId); seekFromEvent(e);
    const move = ev => seekFromEvent(ev);
    const up = () => { scrub.removeEventListener('pointermove', move); scrub.removeEventListener('pointerup', up); };
    scrub.addEventListener('pointermove', move); scrub.addEventListener('pointerup', up);
  });
  scrub.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration || 0, video.currentTime + 1); e.preventDefault(); }
  });

  // ---------- drawing ----------
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    paint();
  }
  // The rectangle the picture actually fills inside the player (it may letterbox).
  function frameRect() {
    const W = canvas.width, H = canvas.height;
    const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
    const s = Math.min(W / vw, H / vh);
    const w = vw * s, h = vh * s;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }
  function drawStrokes(strokes) {
    const f = frameRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, f.w / 260) * (dpr > 1 ? 1 : 1);
    for (const s of strokes) {
      ctx.strokeStyle = s.c; ctx.beginPath();
      s.p.forEach(([x, y], i) => {
        const px = f.x + x * f.w, py = f.y + y * f.h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      if (s.p.length === 1) { ctx.lineTo(f.x + s.p[0][0] * f.w + 0.1, f.y + s.p[0][1] * f.h); }
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  function paint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (S.showing) {
      const n = S.data?.notes.find(x => x.id === S.showing);
      if (n?.drawing) drawStrokes(n.drawing);
    }
    if (S.strokes.length) drawStrokes(S.strokes);
  }
  function clearDrawing() { S.strokes = []; paint(); syncDrawButtons(); }
  function syncDrawButtons() {
    $('undoBtn').hidden = !S.drawMode || !S.strokes.length;
    $('clearBtn').hidden = !S.drawMode || !S.strokes.length;
  }
  function toggleDraw(on) {
    S.drawMode = on === undefined ? !S.drawMode : on;
    $('player').classList.toggle('drawing', S.drawMode);
    $('drawBtn').textContent = S.drawMode ? 'Done drawing' : (S.strokes.length ? 'Drawing added' : 'Draw on frame');
    $('swatches').hidden = !S.drawMode;
    $('hint').textContent = S.drawMode ? 'Draw on the frame. Circle or point at what you mean.' : idleHint;
    $('hint').style.opacity = S.drawMode ? 1 : 0;
    if (S.drawMode) { video.pause(); S.showing = null; paint(); }
    syncDrawButtons(); setPlayIcon();
  }
  COLORS.forEach(c => {
    const b = el('button'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', `Pen color ${c}`);
    if (c === S.color) b.classList.add('on');
    b.addEventListener('click', () => { S.color = c; for (const x of $('swatches').children) x.classList.toggle('on', x === b); });
    $('swatches').append(b);
  });
  $('drawBtn').addEventListener('click', () => toggleDraw());
  $('undoBtn').addEventListener('click', () => { S.strokes.pop(); paint(); syncDrawButtons(); });
  $('clearBtn').addEventListener('click', clearDrawing);

  let live = null;
  function toFrame(e) {
    const r = canvas.getBoundingClientRect();
    const dpr = canvas.width / r.width;
    const f = frameRect();
    return [Math.min(1, Math.max(0, ((e.clientX - r.left) * dpr - f.x) / f.w)), Math.min(1, Math.max(0, ((e.clientY - r.top) * dpr - f.y) / f.h))];
  }
  canvas.addEventListener('pointerdown', e => {
    if (!S.drawMode) {
      // Clicking the picture pauses it and opens a note at this moment.
      if (!video.paused) { video.pause(); $('noteText').focus({ preventScroll: true }); toast(`Paused at ${fmt(video.currentTime)}. Write your note below.`); }
      else if (video.currentTime < 0.05 && !S.selected) togglePlay();
      else { $('noteText').focus({ preventScroll: true }); }
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    live = { c: S.color, p: [toFrame(e)] };
    S.strokes.push(live); paint();
  });
  canvas.addEventListener('pointermove', e => {
    if (!live) return;
    const p = toFrame(e), last = live.p[live.p.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.003 && live.p.length < 600) { live.p.push(p); paint(); }
  });
  const endStroke = () => { if (live) { live = null; syncDrawButtons(); } };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  new ResizeObserver(sizeCanvas).observe($('player'));

  // ---------- wiring ----------
  $('postBtn').addEventListener('click', postNote);
  $('noteText').addEventListener('focus', () => { if (!video.paused) video.pause(); });
  $('noteText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote(); });
  $('filters').addEventListener('click', e => { const f = e.target.dataset?.f; if (f) { S.filter = f; renderNotes(); renderMarks(); } });
  $('mobilePick').addEventListener('change', e => selectVideo(e.target.value));
  $('approveBtn').addEventListener('click', openApprove);
  $('approveCancel').addEventListener('click', () => { $('approveModal').hidden = true; });
  $('approveConfirm').addEventListener('click', () => approve('approve'));
  $('unapproveBtn').addEventListener('click', () => { if (confirm('Undo the approval on this version?')) approve('unapprove'); });

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (!$('gate').hidden || !$('approveModal').hidden) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowLeft' || e.key === 'j') { video.currentTime = Math.max(0, video.currentTime - (e.key === 'j' ? 5 : 1)); }
    else if (e.key === 'ArrowRight' || e.key === 'l') { video.currentTime = Math.min(video.duration || 0, video.currentTime + (e.key === 'l' ? 5 : 1)); }
    else if (e.key === ',') { video.pause(); video.currentTime = Math.max(0, video.currentTime - 1 / 30); }
    else if (e.key === '.') { video.pause(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 1 / 30); }
    else if (e.key === 'n') { e.preventDefault(); video.pause(); $('noteText').focus(); }
  });

  // Keep notes fresh while the page is open.
  setInterval(() => { if (document.visibilityState === 'visible' && S.data && !S.posting && !S.replyOpen && !$('noteText').value) load(); }, 90000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.data) load(); });

  setPlayIcon();
  load(true);
}
