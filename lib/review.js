import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Client review rooms. Every action is written once to Blob as its own small
// JSON file and never overwritten, so nothing is ever served stale from the CDN.
// The room's state is rebuilt by folding those events in time order.

export const MAX_TEXT = 4000;
export const MAX_NAME = 60;
export const DRAW_COLORS = Object.freeze(['#c9a96e', '#e5484d', '#3dd68c', '#4cc2ff', '#f2efe9']);

// Vercel only holds SHA-256 fingerprints of the keys, never the keys themselves.
export function fingerprint(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

// REVIEW_KEYS is a JSON object of share key fingerprint to project slug.
export function projectForKey(key) {
  if (typeof key !== 'string' || key.length < 16) return null;
  let map;
  try {
    map = JSON.parse(process.env.REVIEW_KEYS || '{}');
  } catch {
    return null;
  }
  const given = fingerprint(key);
  for (const [candidate, slug] of Object.entries(map)) {
    if (safeEqual(candidate, given) && isValidSlug(slug)) return slug;
  }
  return null;
}

export function isReviewAdmin(req) {
  const expected = process.env.REVIEW_ADMIN_SHA256;
  const given = req.headers['x-review-admin'];
  return Boolean(expected && expected.length === 64 && typeof given === 'string' && given.length >= 24 && safeEqual(fingerprint(given), expected));
}

export function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9-]{1,40}$/.test(slug);
}

export function newId() {
  return randomBytes(9).toString('base64url');
}

export function cleanText(value, max = MAX_TEXT) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
}

export function cleanTime(value) {
  const t = Number(value);
  return Number.isFinite(t) && t >= 0 && t < 24 * 3600 ? Math.round(t * 100) / 100 : null;
}

// Strokes drawn on a paused frame, as points normalized to 0..1 of the frame.
export function cleanDrawing(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const strokes = [];
  for (const stroke of value.slice(0, 30)) {
    if (!stroke || !Array.isArray(stroke.p)) continue;
    const color = DRAW_COLORS.includes(stroke.c) ? stroke.c : DRAW_COLORS[0];
    const points = [];
    for (const point of stroke.p.slice(0, 600)) {
      if (!Array.isArray(point)) continue;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push([clamp01(x), clamp01(y)]);
    }
    if (points.length) strokes.push({ c: color, p: points });
  }
  return strokes.length ? strokes : null;
}

function clamp01(n) {
  return Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
}

export function cleanManifest(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.videos)) return null;
  const videos = value.videos.slice(0, 100).map(video => ({
    id: cleanText(video.id, 60),
    title: cleanText(video.title, 120),
    note: cleanText(video.note || '', 400),
    versions: (Array.isArray(video.versions) ? video.versions : []).slice(0, 50).map(version => ({
      v: cleanText(version.v, 20),
      url: /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//.test(version.url) ? version.url : '',
      poster: /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//.test(version.poster || '') ? version.poster : '',
      date: cleanText(version.date || '', 30),
      changes: cleanText(version.changes || '', 1000),
    })).filter(version => version.v && version.url),
  })).filter(video => video.id && video.title && video.versions.length);
  return {
    title: cleanText(value.title, 120),
    client: cleanText(value.client, 120),
    intro: cleanText(value.intro || '', 800),
    videos,
  };
}

// Fold events (already sorted oldest first) into the room's current state.
export function foldEvents(events) {
  let manifest = null;
  const notes = new Map();
  const approvals = {};

  for (const event of events) {
    if (event.type === 'manifest' && event.manifest) {
      manifest = event.manifest;
    } else if (event.type === 'note' && event.id && !notes.has(event.id)) {
      notes.set(event.id, {
        id: event.id,
        video: event.video,
        version: event.version,
        t: event.t,
        text: event.text,
        author: event.author,
        drawing: event.drawing || null,
        parent: event.parent || null,
        at: event.at,
        status: 'open',
        statusBy: null,
        statusAt: null,
      });
    } else if (event.type === 'status' && notes.has(event.note)) {
      const note = notes.get(event.note);
      note.status = event.status;
      note.statusBy = event.author;
      note.statusAt = event.at;
    } else if (event.type === 'approve' || event.type === 'unapprove') {
      const key = `${event.video}@${event.version}`;
      approvals[key] = event.type === 'approve' ? { by: event.author, at: event.at } : null;
    }
  }

  return {
    manifest,
    notes: [...notes.values()].filter(note => note.status !== 'removed'),
    approvals: Object.fromEntries(Object.entries(approvals).filter(([, value]) => value)),
  };
}

export function formatTime(seconds) {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
