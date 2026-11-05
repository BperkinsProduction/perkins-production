import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPerson,
  createSession,
  foldAuth,
  hashPassword,
  isLocked,
  passwordProblem,
  personByInvite,
  personForSession,
  personForTeamLink,
  teamLinkByToken,
  publicPerson,
  readSession,
  sha256,
  verifyPassword,
} from '../lib/review-auth.js';

process.env.REVIEW_ADMIN_SHA256 = sha256('admin-key-for-tests-only-xx');
process.env.BLOB_READ_WRITE_TOKEN = 'blob-token-for-tests';

const doug = { type: 'person', person: 'p1', email: 'doug@example.com', name: 'Doug', role: 'client', projects: ['se'], at: '2026-11-01T00:00:00Z' };

test('passwords hash and verify, and wrong ones fail', async () => {
  const hash = await hashPassword('correct horse');
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword('correct horse', hash), true);
  assert.equal(await verifyPassword('correct horsf', hash), false);
  assert.equal(await verifyPassword('correct horse', 'nonsense'), false);
});

test('password rules', () => {
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem('doug@example.com', 'doug@example.com'));
  assert.equal(passwordProblem('a fine password', 'doug@example.com'), null);
});

test('a person needs a name, email and project', () => {
  assert.equal(cleanPerson({ name: 'Doug', email: 'nope', projects: ['se'] }), null);
  assert.deepEqual(cleanPerson({ name: 'Doug', email: 'Doug@Example.com ', projects: ['se', 'BAD!'] }),
    { email: 'doug@example.com', name: 'Doug', role: 'client', projects: ['se'] });
});

test('invites work once, then a new password ends old sessions', () => {
  const token = 'x'.repeat(32);
  const future = new Date(Date.now() + 86400000).toISOString();
  let { people } = foldAuth([doug, { type: 'invite', person: 'p1', id: 'i1', tokenHash: sha256(token), expires: future, at: '1' }]);
  assert.equal(personByInvite(people, token)?.id, 'p1');
  assert.equal(personByInvite(people, 'y'.repeat(32)), null);

  ({ people } = foldAuth([doug,
    { type: 'invite', person: 'p1', id: 'i1', tokenHash: sha256(token), expires: future, at: '1' },
    { type: 'password', person: 'p1', id: 'w1', hash: 'h', invite: 'i1', at: '2' },
  ]));
  assert.equal(personByInvite(people, token), null, 'used invite is spent');

  const cookie = createSession(people.get('p1'));
  const session = readSession({ headers: { cookie: `pp_review=${cookie}` } });
  assert.equal(personForSession(session, people)?.name, 'Doug');
  assert.equal(readSession({ headers: { cookie: `pp_review=${cookie}x` } }), null, 'tampered cookie refused');

  ({ people } = foldAuth([doug, { type: 'password', person: 'p1', id: 'w1', hash: 'h', at: '2' }, { type: 'password', person: 'p1', id: 'w2', hash: 'h2', at: '3' }]));
  assert.equal(personForSession(session, people), null, 'new password ends the old session');

  ({ people } = foldAuth([doug, { type: 'password', person: 'p1', id: 'w1', hash: 'h', at: '2' }, { type: 'disable', person: 'p1', at: '3' }]));
  assert.equal(personForSession(session, people), null, 'switched-off person is out');
});

test('expired invites do not work', () => {
  const token = 'z'.repeat(32);
  const { people } = foldAuth([doug, { type: 'invite', person: 'p1', id: 'i1', tokenHash: sha256(token), expires: '2020-01-01T00:00:00Z', at: '1' }]);
  assert.equal(personByInvite(people, token), null);
});

test('ten failed tries lock the account for a while', () => {
  const now = Date.now();
  const recent = Array.from({ length: 10 }, () => ({ type: 'fail', email: 'doug@example.com', at: new Date(now - 60000).toISOString() }));
  assert.equal(isLocked(foldAuth(recent).fails, 'doug@example.com', now), true);
  assert.equal(isLocked(foldAuth(recent.slice(1)).fails, 'doug@example.com', now), false);
  assert.equal(isLocked(foldAuth(recent).fails, 'doug@example.com', now + 16 * 60000), false);
});

test('the people list never carries the hash', () => {
  const { people } = foldAuth([doug, { type: 'password', person: 'p1', id: 'w1', hash: 'secret-hash', at: '2' }, { type: 'signin', person: 'p1', device: 'Safari on iPhone', at: '3' }]);
  const shown = publicPerson(people.get('p1'));
  assert.equal(JSON.stringify(shown).includes('secret-hash'), false);
  assert.equal(shown.lastSignIn.device, 'Safari on iPhone');
});

test('a team link sets a first password for people on that room only', () => {
  const token = 'z'.repeat(32);
  const future = new Date(Date.now() + 86400000).toISOString();
  const link = { type: 'teamlink', id: 't1', project: 'se', tokenHash: sha256(token), expires: future, at: '1' };
  const outsider = { type: 'person', person: 'p2', email: 'sam@example.com', name: 'Sam', role: 'client', projects: ['other'], at: '0' };
  let { people, teamLinks } = foldAuth([doug, outsider, link]);
  const found = teamLinkByToken(teamLinks, token);
  assert.equal(found?.id, 't1');
  assert.equal(teamLinkByToken(teamLinks, 'q'.repeat(32)), null);
  assert.equal(personForTeamLink(people, found, 'doug@example.com')?.id, 'p1');
  assert.equal(personForTeamLink(people, found, 'sam@example.com'), null, 'not on this room');
  assert.equal(personForTeamLink(people, found, 'nobody@example.com'), null);

  ({ people, teamLinks } = foldAuth([doug, link, { type: 'password', person: 'p1', id: 'w1', hash: 'h', teamlink: 't1', at: '2' }]));
  assert.equal(personForTeamLink(people, teamLinkByToken(teamLinks, token), 'doug@example.com'), null, 'cannot reset a set password');

  ({ teamLinks } = foldAuth([{ ...link, expires: '2020-01-01T00:00:00Z' }]));
  assert.equal(teamLinkByToken(teamLinks, token), null, 'expired');
});
