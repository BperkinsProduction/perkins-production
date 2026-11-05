import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { parseCookies } from './admin.js';
import { cleanText, isValidSlug, MAX_NAME } from './review.js';

// Review room accounts. Each reviewer has their own password. Accounts are kept
// as write-once events in Blob like the notes are: a person is added, invited,
// sets a password, signs in. Only salted scrypt hashes and SHA-256 fingerprints
// of invite links are ever stored.

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'pp_review';
export const SESSION_DAYS = 30;
export const INVITE_DAYS = 14;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
export const LOCK_FAILS = 10;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;
export const ROLES = Object.freeze(['client', 'studio']);

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function cleanEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(email) ? email : '';
}

export function cleanPerson(value) {
  const email = cleanEmail(value?.email);
  const name = cleanText(value?.name, MAX_NAME);
  const role = ROLES.includes(value?.role) ? value.role : 'client';
  const projects = (Array.isArray(value?.projects) ? value.projects : []).filter(isValidSlug).slice(0, 20);
  return email && name && projects.length ? { email, name, role, projects } : null;
}

export function passwordProblem(password, email = '') {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return 'That password is too long.';
  if (email && password.trim().toLowerCase() === email) return 'Pick something other than your email address.';
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 6 || parts[0] !== 'scrypt' || typeof password !== 'string' || password.length > MAX_PASSWORD) return false;
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(key, expected);
}

// A spare hash so a wrong email takes as long to refuse as a wrong password.
let decoy;
export async function burnTime(password) {
  decoy ||= await hashPassword('not-a-real-password');
  await verifyPassword(String(password || '').slice(0, MAX_PASSWORD), decoy);
}

export function newInviteToken() {
  return randomBytes(24).toString('base64url');
}

// Sessions are signed cookies. They name the password they were made with, so
// a new password (or switching the person off) ends every older session.
function sessionSecret() {
  if (process.env.REVIEW_SESSION_SECRET) return process.env.REVIEW_SESSION_SECRET;
  const admin = process.env.REVIEW_ADMIN_SHA256;
  const blob = process.env.BLOB_READ_WRITE_TOKEN;
  return admin && blob ? sha256(`pp-review-session|${admin}|${blob}`) : null;
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSession(person, now = Date.now()) {
  const secret = sessionSecret();
  if (!secret || !person?.password) return null;
  const payload = Buffer.from(JSON.stringify({
    p: person.id, v: person.password.id, x: now + SESSION_DAYS * 86400 * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function readSession(req, now = Date.now()) {
  const secret = sessionSecret();
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!secret || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), sign(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(data.x) && data.x > now && typeof data.p === 'string' ? data : null;
  } catch {
    return null;
  }
}

export function personForSession(session, people) {
  if (!session) return null;
  const person = people.get(session.p);
  return person && person.active && person.password && person.password.id === session.v ? person : null;
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/api/review; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/api/review; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// Fold account events (oldest first) into people keyed by id.
export function foldAuth(events) {
  const people = new Map();
  const fails = new Map();
  const usedInvites = new Set();
  const teamLinks = [];

  for (const event of events) {
    // One shared link per room. Each person on the room's list uses it once to pick a password.
    if (event.type === 'teamlink') {
      teamLinks.push({ id: event.id, project: event.project, tokenHash: event.tokenHash, expires: event.expires, at: event.at });
      continue;
    }
    if (event.type === 'person' && event.person) {
      const before = people.get(event.person);
      people.set(event.person, {
        id: event.person,
        email: event.email,
        name: event.name,
        role: event.role,
        projects: event.projects,
        active: before ? before.active : true,
        password: before?.password || null,
        invite: before?.invite || null,
        signIns: before?.signIns || [],
        addedAt: before?.addedAt || event.at,
      });
      continue;
    }
    const person = people.get(event.person);
    if (event.type === 'fail' && event.email) {
      if (!fails.has(event.email)) fails.set(event.email, []);
      fails.get(event.email).push(event.at);
    }
    if (!person) continue;
    if (event.type === 'invite') {
      person.invite = { id: event.id, tokenHash: event.tokenHash, expires: event.expires, at: event.at };
    } else if (event.type === 'password') {
      person.password = { id: event.id, hash: event.hash, at: event.at };
      if (event.invite) usedInvites.add(event.invite);
    } else if (event.type === 'disable') {
      person.active = false;
    } else if (event.type === 'enable') {
      person.active = true;
    } else if (event.type === 'signin') {
      person.signIns.push({ at: event.at, device: event.device || '' });
    }
  }

  for (const person of people.values()) {
    if (person.invite && usedInvites.has(person.invite.id)) person.invite = null;
  }
  return { people, fails, teamLinks };
}

export function personByEmail(people, email) {
  for (const person of people.values()) if (person.email === email) return person;
  return null;
}

export function personByInvite(people, token, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 24) return null;
  const hash = sha256(token);
  for (const person of people.values()) {
    const invite = person.invite;
    if (invite && person.active && safeEqual(invite.tokenHash, hash) && Date.parse(invite.expires) > now) return person;
  }
  return null;
}

export function teamLinkByToken(teamLinks, token, now = Date.now()) {
  if (typeof token !== 'string' || token.length < 24) return null;
  const hash = sha256(token);
  return teamLinks.find(link => safeEqual(link.tokenHash, hash) && Date.parse(link.expires) > now) || null;
}

// Who may use a team link: on that room's list, switched on, and no password yet.
export function personForTeamLink(people, link, email) {
  const person = personByEmail(people, email);
  if (!link || !person || !person.active || person.password) return null;
  return (person.projects || []).includes(link.project) ? person : null;
}

export function isLocked(fails, email, now = Date.now()) {
  const recent = (fails.get(email) || []).filter(at => now - Date.parse(at) < LOCK_WINDOW_MS);
  return recent.length >= LOCK_FAILS;
}

// A short, plain description of the device, for "who signed in from where".
export function deviceLabel(userAgent = '') {
  const ua = String(userAgent);
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : 'Other';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${browser} on ${os}`;
}

// What the admin tools may see about a person. Never the hash or the invite fingerprint.
export function publicPerson(person, now = Date.now()) {
  const last = person.signIns[person.signIns.length - 1] || null;
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    projects: person.projects,
    active: person.active,
    hasPassword: Boolean(person.password),
    passwordSetAt: person.password?.at || null,
    inviteOpen: Boolean(person.invite && Date.parse(person.invite.expires) > now),
    inviteExpires: person.invite?.expires || null,
    signInCount: person.signIns.length,
    lastSignIn: last,
    recentSignIns: person.signIns.slice(-10).reverse(),
  };
}
