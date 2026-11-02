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
  projectForKey,
} from '../lib/review.js';

export const config = { maxDuration: 30 };

// Event files never change once written, so their bodies can be kept between calls.
const bodyCache = new Map();

async function loadEvents(slug) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: `review/${slug}/`, cursor, limit: 1000 });
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

  return events.filter(Boolean).sort((a, b) => (a.at || '').localeCompare(b.at || '') || (a.seq || 0) - (b.seq || 0));
}

async function writeEvent(slug, event) {
  const stamped = { ...event, at: new Date().toISOString(), seq: Date.now() };
  await put(`review/${slug}/${event.type}/${stamped.at.replace(/[:.]/g, '-')}.json`, JSON.stringify(stamped), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
    cacheControlMaxAge: 31536000,
  });
  return stamped;
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const admin = isReviewAdmin(req);
  const key = req.query.key || req.headers['x-review-key'];
  const slug = admin && isValidSlug(req.query.project) ? req.query.project : projectForKey(key);

  let body = {};
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req, 256 * 1024);
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

  if (!slug) return res.status(404).json({ error: 'This review link is not valid.' });

  if (req.method === 'GET') {
    const state = foldEvents(await loadEvents(slug));
    if (!state.manifest) return res.status(404).json({ error: 'Nothing to review yet.' });
    return res.status(200).json({ ...state, project: admin ? slug : undefined });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const author = cleanText(body.author, MAX_NAME);
  const action = body.action;

  if (action === 'manifest') {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const manifest = cleanManifest(body.manifest);
    if (!manifest || !manifest.videos.length) return res.status(400).json({ error: 'Manifest has no playable videos' });
    await writeEvent(slug, { type: 'manifest', manifest });
    return res.status(200).json({ ok: true, videos: manifest.videos.length });
  }

  if (!author) return res.status(400).json({ error: 'Add your name first.' });
  const state = foldEvents(await loadEvents(slug));

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
    const note = await writeEvent(slug, {
      type: 'note', id: newId(), video, version, t, text, author, drawing, parent: parentNote ? parent : null, admin,
    });
    await notify(state, note);
    return res.status(200).json({ ok: true, id: note.id });
  }

  if (action === 'status') {
    const status = ['open', 'done', 'removed'].includes(body.status) ? body.status : null;
    const note = state.notes.find(item => item.id === body.note);
    if (!status || !note) return res.status(400).json({ error: 'Unknown note' });
    // Only the person who wrote a note (or Brice) can remove it.
    if (status === 'removed' && !admin && note.author.toLowerCase() !== author.toLowerCase()) {
      return res.status(403).json({ error: 'Only the person who wrote a note can remove it.' });
    }
    await writeEvent(slug, { type: 'status', note: note.id, status, author });
    return res.status(200).json({ ok: true });
  }

  if (action === 'approve' || action === 'unapprove') {
    const video = cleanText(body.video, 60);
    const version = cleanText(body.version, 20);
    if (!hasVersion(state.manifest, video, version)) return res.status(400).json({ error: 'Unknown video' });
    await writeEvent(slug, { type: action, video, version, author });
    if (action === 'approve') {
      await notify(state, { author, video, version, t: 0, text: `Approved ${version}.`, parent: null });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
