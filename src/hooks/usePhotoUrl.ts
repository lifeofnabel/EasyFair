import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { lowUrl } from '../services/cloudinary';
import type { Photo } from '../types/models';

/** Local blob first (works offline), Cloudinary as fallback on other devices. */
export function usePhotoUrl(photo: Photo | undefined, quality: 'low' | 'high' = 'low'): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) { setUrl(null); return; }
    let objectUrl: string | null = null;
    let alive = true;
    db.photoBlobs.get(photo.id).then((b) => {
      if (!alive) return;
      const blob = quality === 'high' ? (b?.high ?? b?.low) : b?.low;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else if (photo.remote) {
        setUrl(quality === 'high' ? photo.remote.url : lowUrl(photo.remote.url));
      } else {
        setUrl(null);
      }
    });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo?.id, photo?.remote?.url, quality]);
  return url;
}
