import type { AppSettings } from '../types/models';

export interface UploadResult {
  publicId: string;
  url: string;
}

/**
 * Unsigned upload with an upload preset: no API secret ever reaches the browser.
 * Only the original (high quality) is uploaded; the low-quality version is a Cloudinary
 * URL transformation, which saves roaming data.
 */
export async function uploadToCloudinary(settings: AppSettings, blob: Blob, publicId: string): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', blob, `${publicId}.jpg`);
  form.append('upload_preset', settings.cloudinaryUploadPreset);
  form.append('public_id', publicId);
  if (settings.cloudinaryFolder) form.append('folder', settings.cloudinaryFolder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(settings.cloudinaryCloudName)}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Upload failed (${res.status})`);
  }
  const json = await res.json();
  return { publicId: json.public_id, url: json.secure_url };
}

export function lowUrl(url: string): string {
  return url.replace('/image/upload/', '/image/upload/c_limit,w_900,q_auto,f_auto/');
}
