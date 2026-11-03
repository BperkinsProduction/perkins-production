import { list, put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { readJsonBody } from '../lib/admin.js';
import {
  cleanDrawing,
  cleanManifest,
  cleanText,
  cleanTime,
  foldEvents,
  formatTime,
  isReviewAdmin,
  isValidSlug,
  MAX_NAME,
  newId,
} from '../lib/review.js';
import {
  burnTime,
  cleanEmail,
  cleanPerson,
  createSession,
  deviceLabel,
  expiredSessionCookie,
  foldAuth,
  hashPassword,
  INVITE_DAYS,
  isLocked,
  newInviteToken,
  passwordProblem,
  personByEmail,
  personByInvite,
  personForSession,
  publicPerson,
  readSession,
  sessionCookie,
  sha256,
  verifyPassword,
} from '../lib/review-auth.js';

export const config = { maxDuration: 30 };

const AUTH_PREFIX = 'review-auth/';

// Event files never change once written, so their bodies can be kept between calls.
const bodyCache = new Map();
// Events this instance just wrote, in case a listing a moment later does not show them yet.
const justWritten = [];

async function loadPrefix(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const events = await Promise.all(blobs.map(async blob => {
    if (bodyCache.has(blob.url)) return bodyCache.get(blob.url);
    try {
      const response = await fetch(blob.url);
      if (!response.ok) return null;
      const event = await response.json();
      bodyCache.set(blob.url, event);
      return event;
    } catch {
      return null;
    }
  }));

  const listed = new Set(blobs.map(blob => blob.url));
  for (const item of justWritten) {
    if (item.prefix === prefix && !listed.has(item.url)) events.push(item.event);
  }
  return events.filter(Boolean).sort((a, b) => (a.at || '').localeCompare(b.at || '') || (a.seq || 0) - (b.seq || 0));
}

async function writeEvent(prefix, event) {
  const stamped = { ...event, at: new Date().toISOString(), seq: Date.now() };
  const blob = await put(`${prefix}${event.type}/${stamped.at.replace(/[:.]/g, '-')}.json`, JSON.stringify(stamped), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  bodyCache.set(blob.url, stamped);
  justWritten.push({ prefix, url: blob.url, event: stamped });
  if (justWritten.length > 200) justWritten.shift();
  return stamped;
}

const loadRoom = async slug => foldEvents(await loadPrefix(`review/${slug}/`));
const loadAuth = async () => foldAuth(await loadPrefix(AUTH_PREFIX));

// A second, per-instance brake on password guessing, by network address.
const attempts = new Map();
function tooManyAttempts(req, now = Date.now()) {
  const id = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const record = attempts.get(id);
  if (!record || now - record.startedAt > 15 * 60 * 1000) {
    attempts.set(id, { count: 1, startedAt: now });
    return false;
  }
  record.count += 1;
  return record.count > 30;
}

async function notify(state, note) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REVIEW_NOTIFY_TO;
  if (!apiKey || !to) return;
  const video = state.manifest?.videos.find(item => item.id === note.video);
  const subject = note.parent
    ? `${note.author} replied on ${video?.title || note.video}`
    : `${note.author} left a note on ${video?.title || note.video} ${note.version}`;
  const text = `${note.author} at ${formatTime(note.t)} on ${video?.title || note.video} ${note.version}:\n\n${note.text}${note.drawing ? '\n\n(Includes a drawing on the frame.)' : ''}`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.REVIEW_NOTIFY_FROM || 'Perkins Review <onboarding@resend.dev>',
        to: to.split(',').map(item => item.trim()),
        subject,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error('Review notify failed:', error?.message);
  }
}

function hasVersion(manifest, videoId, version) {
  return Boolean(manifest?.videos.some(video => video.id === videoId && video.versions.some(item => item.v === version)));
}

async function signIn(req, res, person) {
  const token = createSession(person);
  if (!token) return res.status(503).json({ error: 'Sign in is not set up yet. Tell Brice.' });
  await writeEvent(AUTH_PREFIX, { type: 'signin', person: person.id, device: deviceLabel(req.headers['user-agent']) });
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ ok: true, name: person.name });
}

// Sign in, first-time password, sign out. These need no session.
async function accountAction(req, res, action, body) {
  if (action === 'signout') {
    res.setHeader('Set-Cookie', expiredSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (tooManyAttempts(req)) {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({ error: 'Too many tries. Wait 15 minutes and try again.' });
  }
  const { people, fails } = await loadAuth();
  const expired = 'This invite link has expired or was already used. Ask Brice for a new one.';

  if (action === 'invite-check') {
    const person = personByInvite(people, body.token);
    if (!person) return res.status(404).json({ error: expired });
    return res.status(200).json({ ok: true, name: person.name, email: person.email, returning: Boolean(person.password) });
  }

  if (action === 'welcome') {
    const person = personByInvite(people, body.token);
    if (!person) return res.status(404).json({ error: expired });
    const problem = passwordProblem(body.password, person.email);
    if (problem) return res.status(400).json({ error: problem });
    const password = await writeEvent(AUTH_PREFIX, {
      type: 'password', person: person.id, id: newId(), hash: await hashPassword(body.password), invite: person.invite.id,
    });
    person.password = { id: password.id, hash: password.hash, at: password.at };
    return signIn(req, res, person);
  }

  // signin
  const email = cleanEmail(body.email);
  const refused = () => res.status(401).json({ error: 'That email and password do not match.' });
  if (!email || typeof body.password !== 'string') {
    await burnTime(body.password);
    return refused();
  }
  if (isLocked(fails, email)) {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({ error: 'Too many tries on this account. Wait 15 minutes and try again.' });
  }
  const person = personByEmail(people, email);
  const ok = person?.active && person.password
    ? await verifyPassword(body.password, person.password.hash)
    : (await burnTime(body.password), false);
  if (!ok) {
    await writeEvent(AUTH_PREFIX, { type: 'fail', email });
    return refused();
  }
  return signIn(req, res, person);
}

// Brice's tools: add people, send invites, switch someone off.
async function peopleAction(res, action, body) {
  const { people } = await loadAuth();

  if (action === 'person') {
    const details = cleanPerson(body);
    if (!details) return res.status(400).json({ error: 'A person needs a name, an email and at least one project.' });
    const existing = personByEmail(people, details.email);
    const id = existing?.id || newId();
    await writeEvent(AUTH_PREFIX, { type: 'person', person: id, ...details });
    return res.status(200).json({ ok: true, id, created: !existing });
  }

  const person = personByEmail(people, cleanEmail(body.email));
  if (!person) return res.status(404).json({ error: 'No one with that email.' });

  if (action === 'invite') {
    const token = newInviteToken();
    const expires = new Date(Date.now() + INVITE_DAYS * 86400 * 1000).toISOString();
    await writeEvent(AUTH_PREFIX, { type: 'invite', person: person.id, id: newId(), tokenHash: sha256(token), expires });
    return res.status(200).json({ ok: true, name: person.name, token, expires, reset: Boolean(person.password) });
  }

  if (action === 'disable' || action === 'enable') {
    await writeEvent(AUTH_PREFIX, { type: action, person: person.id });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const admin = isReviewAdmin(req);

  let body = {};
  if (req.method === 'POST') {
    // JSON only, so a form on another site cannot post here with someone's cookie.
    if (!String(req.headers['content-type'] || '').includes('application/json')) {
      return res.status(415).json({ error: 'Send JSON' });
    }
    try {
      body = (await readJsonBody(req, 256 * 1024)) || {};
    } catch {
      return res.status(400).json({ error: 'Invalid request' });
    }
  }

  // Video uploads from Brice's machine go straight to Blob with a short-lived token.
  if (req.method === 'POST' && body?.type === 'blob.generate-client-token') {
    try {
      const result = await handleUpload({
        request: req,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const payloadKey = (() => {
            try { return JSON.parse(clientPayload || '{}').admin; } catch { return null; }
          })();
          if (!isReviewAdmin({ headers: { 'x-review-admin': payloadKey } })) throw new Error('Unauthorized');
          if (!/^review-media\/[a-z0-9-]+\//.test(pathname)) throw new Error('Bad path');
          return {
            allowedContentTypes: ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/webp', 'image/png'],
            maximumSizeInBytes: 2 * 1024 * 1024 * 1024,
            addRandomSuffix: true,
          };
        },
        onUploadCompleted: async () => {},
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Upload refused' });
    }
  }

  const action = body.action;

  if (req.method === 'POST' && ['signin', 'welcome', 'invite-check', 'signout'].includes(action)) {
    return accountAction(req, res, action, body);
  }

  if (admin && req.method === 'POST' && ['person', 'invite', 'disable', 'enable'].includes(action)) {
    return peopleAction(res, action, body);
  }

  if (admin && req.method === 'GET' && req.query.people) {
    const { people } = await loadAuth();
    return res.status(200).json({ people: [...people.values()].map(person => publicPerson(person)) });
  }

  // Everything below is the room itself: Brice's tools, or a signed-in person.
  let me = null;
  let slug = null;
  if (admin) {
    slug = isValidSlug(req.query.project) ? req.query.project : null;
  } else {
    const { people } = await loadAuth();
    me = personForSession(readSession(req), people);
    if (me) slug = me.projects.includes(req.query.project) ? req.query.project : me.projects[0];
  }
  if (!slug) {
    if (!admin) res.setHeader('Set-Cookie', expiredSessionCookie());
    return res.status(401).json({ error: 'Please sign in.', signin: true });
  }

  if (req.method === 'GET') {
    const state = await loadRoom(slug);
    if (!state.manifest) return res.status(404).json({ error: 'Nothing to review yet.' });
    return res.status(200).json({
      ...state,
      project: slug,
      me: me ? { id: me.id, name: me.name, role: me.role } : { id: null, name: 'Brice', role: 'studio' },
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (action === 'manifest') {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const manifest = cleanManifest(body.manifest);
    if (!manifest || !manifest.videos.length) return res.status(400).json({ error: 'Manifest has no playable videos' });
    await writeEvent(`review/${slug}/`, { type: 'manifest', manifest });
    return res.status(200).json({ ok: true, videos: manifest.videos.length });
  }

  // A signed-in person always posts as themselves. Brice's tools may name the author.
  const author = me ? me.name : cleanText(body.author, MAX_NAME) || 'Brice';
  const by = me ? me.id : null;
  const studio = admin || me?.role === 'studio';
  const state = await loadRoom(slug);
  const prefix = `review/${slug}/`;

  if (action === 'note') {
    const text = cleanText(body.text);
    const drawing = cleanDrawing(body.drawing);
    const parent = typeof body.parent === 'string' ? body.parent : null;
    const parentNote = parent ? state.notes.find(note => note.id === parent && !note.parent) : null;
    if (parent && !parentNote) return res.status(400).json({ error: 'That note is gone.' });
    const video = parentNote ? parentNote.video : cleanText(body.video, 60);
    const version = parentNote ? parentNote.version : cleanText(body.version, 20);
    const t = parentNote ? parentNote.t : cleanTime(body.t);
    if (!text && !drawing) return res.status(400).json({ error: 'Write a note or draw on the frame.' });
    if (t === null || !hasVersion(state.manifest, video, version)) return res.status(400).json({ error: 'Unknown video' });
    const note = await writeEvent(prefix, {
      type: 'note', id: newId(), video, version, t, text, author, by, drawing, parent: parentNote ? parent : null, admin: studio,
    });
    if (!studio) await notify(state, note);
    return res.status(200).json({ ok: true, id: note.id });
  }

  if (action === 'status') {
    const status = ['open', 'done', 'removed'].includes(body.status) ? body.status : null;
    const note = state.notes.find(item => item.id === body.note);
    if (!status || !note) return res.status(400).json({ error: 'Unknown note' });
    // Only the person who wrote a note (or Brice) can remove it.
    const own = note.by ? note.by === by : note.author.toLowerCase() === author.toLowerCase();
    if (status === 'removed' && !studio && !own) {
      return res.status(403).json({ error: 'Only the person who wrote a note can remove it.' });
    }
    await writeEvent(prefix, { type: 'status', note: note.id, status, author, by });
    return res.status(200).json({ ok: true });
  }

  if (action === 'approve' || action === 'unapprove') {
    const video = cleanText(body.video, 60);
    const version = cleanText(body.version, 20);
    if (!hasVersion(state.manifest, video, version)) return res.status(400).json({ error: 'Unknown video' });
    await writeEvent(prefix, { type: action, video, version, author, by });
    if (action === 'approve' && !studio) {
      await notify(state, { author, video, version, t: 0, text: `Approved ${version}.`, parent: null });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
