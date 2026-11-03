// Shared by the Review Room pages. The session lives in an HttpOnly cookie, so
// the pages never see or store anything secret.

export const $ = id => document.getElementById(id);

export async function api(method, body, project) {
  const query = project ? `?project=${encodeURIComponent(project)}` : '';
  const res = await fetch(`/api/review${query}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.error || 'Something went wrong.');
    error.signin = Boolean(json.signin);
    error.status = res.status;
    throw error;
  }
  return json;
}

let toastTimer;
export function toast(message) {
  const box = $('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3200);
}
