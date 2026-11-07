const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const SESSION_KEY = 'avya_session';
const DEVICE_KEY = 'avya_device';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
export const saveSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const getDeviceToken = () => localStorage.getItem(DEVICE_KEY) || '';
export const saveDeviceToken = (t) => localStorage.setItem(DEVICE_KEY, t);
export const clearDeviceToken = () => localStorage.removeItem(DEVICE_KEY);

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Call the backend. Returns JSON, or a Blob when { blob: true }. */
export async function api(path, { method = 'GET', body, blob = false } = {}) {
  const headers = {};
  const session = getSession();
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const device = getDeviceToken();
  if (device) headers['X-Device-Token'] = device;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check the internet connection and try again.', 0, 'NETWORK');
  }

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* not JSON */
    }
    if (res.status === 401 && ['BAD_TOKEN', 'INACTIVE', 'NO_TOKEN'].includes(data.code)) {
      window.dispatchEvent(new Event('avya:logout'));
    }
    throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.code);
  }
  return blob ? res.blob() : res.json();
}
