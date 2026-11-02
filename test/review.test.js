import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDrawing, cleanManifest, foldEvents, projectForKey } from '../lib/review.js';

const manifest = { title: 'T', client: 'C', videos: [{ id: 'a', title: 'A', versions: [{ v: 'v1', url: 'https://x.public.blob.vercel-storage.com/a.mp4' }] }] };

test('folds notes, replies, status and approvals in order', () => {
  const state = foldEvents([
    { type: 'manifest', manifest, at: '1' },
    { type: 'note', id: 'n1', video: 'a', version: 'v1', t: 3, text: 'hi', author: 'Doug', at: '2' },
    { type: 'note', id: 'r1', parent: 'n1', video: 'a', version: 'v1', t: 3, text: 'ok', author: 'Brice', at: '3' },
    { type: 'status', note: 'n1', status: 'done', author: 'Brice', at: '4' },
    { type: 'approve', video: 'a', version: 'v1', author: 'Doug', at: '5' },
    { type: 'note', id: 'n2', video: 'a', version: 'v1', t: 9, text: 'x', author: 'Sue', at: '6' },
    { type: 'status', note: 'n2', status: 'removed', author: 'Sue', at: '7' },
  ]);
  assert.equal(state.notes.length, 2);
  assert.equal(state.notes.find(n => n.id === 'n1').status, 'done');
  assert.equal(state.approvals['a@v1'].by, 'Doug');
});

test('unapprove clears approval', () => {
  const state = foldEvents([
    { type: 'approve', video: 'a', version: 'v1', author: 'Doug', at: '1' },
    { type: 'unapprove', video: 'a', version: 'v1', author: 'Doug', at: '2' },
  ]);
  assert.deepEqual(state.approvals, {});
});

test('manifest only accepts blob video urls', () => {
  const bad = cleanManifest({ ...manifest, videos: [{ id: 'a', title: 'A', versions: [{ v: 'v1', url: 'https://evil.example/a.mp4' }] }] });
  assert.equal(bad.videos.length, 0);
  assert.equal(cleanManifest(manifest).videos.length, 1);
});

test('drawing points are clamped and colors limited', () => {
  const d = cleanDrawing([{ c: 'red', p: [[2, -1], [0.5, 0.5]] }]);
  assert.deepEqual(d[0].p, [[1, 0], [0.5, 0.5]]);
  assert.equal(d[0].c, '#c9a96e');
  assert.equal(cleanDrawing([]), null);
});

test('share keys resolve only exactly', () => {
  process.env.REVIEW_KEYS = JSON.stringify({ abcdefghijklmnopqrstu: 'acme' });
  assert.equal(projectForKey('abcdefghijklmnopqrstu'), 'acme');
  assert.equal(projectForKey('abcdefghijklmnopqrstv'), null);
  assert.equal(projectForKey('short'), null);
});
