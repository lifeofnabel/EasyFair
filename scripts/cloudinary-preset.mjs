// One-time setup: creates the unsigned upload preset "messe_unsigned" (folder "messe") and proves it works
// with a tiny test upload that is deleted again. The API secret is read from the environment of THIS
// terminal only; it is never written to disk or into the app.
//
// PowerShell:
//   $env:CLOUDINARY_API_KEY = "<key>"; $env:CLOUDINARY_API_SECRET = "<secret>"; node scripts/cloudinary-preset.mjs
const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? 'dwzzcufpf';
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;
const PRESET = 'messe_unsigned';
const FOLDER = 'messe';

if (!key || !secret) {
  console.error('Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in this terminal first.');
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
const api = `https://api.cloudinary.com/v1_1/${cloud}`;

async function call(method, path, params) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: { Authorization: auth, ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const presetParams = { unsigned: 'true', folder: FOLDER, allowed_formats: 'jpg,jpeg,png,webp,heic', unique_filename: 'false', use_filename: 'false' };

const existing = await call('GET', `/upload_presets/${PRESET}`);
const result = existing.ok
  ? await call('PUT', `/upload_presets/${PRESET}`, presetParams)
  : await call('POST', '/upload_presets', { name: PRESET, ...presetParams });
if (!result.ok) {
  console.error(`Could not ${existing.ok ? 'update' : 'create'} preset (${result.status}):`, result.body?.error?.message ?? result.body);
  process.exit(1);
}
console.log(`Preset "${PRESET}" ${existing.ok ? 'updated' : 'created'} (unsigned, folder "${FOLDER}").`);

// Test exactly like the app does: unsigned upload, no key, no secret.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), 'setup-test.png');
form.append('upload_preset', PRESET);
form.append('public_id', `setup-test-${Date.now()}`);
const up = await fetch(`${api}/image/upload`, { method: 'POST', body: form });
const upBody = await up.json();
if (!up.ok) {
  console.error('Test upload failed:', upBody?.error?.message ?? upBody);
  process.exit(1);
}
console.log(`Test upload ok: ${upBody.public_id}`);
const del = await call('DELETE', `/resources/image/upload?public_ids[]=${encodeURIComponent(upBody.public_id)}`);
console.log(del.ok ? 'Test image deleted again. Cloudinary is ready for the app.' : 'Test image could not be deleted (harmless).');
