import { IMAGE } from '../config/app';

export interface ProcessedImage {
  low: Blob;
  high: Blob;
  width: number;
  height: number;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be read as an image.')); };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image compression failed.'))), 'image/jpeg', quality));

/** Low = AI, preview, list. High = archive, PDF, Cloudinary original. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const [low, high] = await Promise.all([
    toBlob(draw(img, IMAGE.lowMaxEdge), IMAGE.lowQuality),
    toBlob(draw(img, IMAGE.highMaxEdge), IMAGE.highQuality),
  ]);
  return { low, high, width: img.naturalWidth, height: img.naturalHeight };
}

export async function imageData(blob: Blob, maxEdge: number): Promise<ImageData> {
  const img = await loadImage(blob);
  const canvas = draw(img, maxEdge);
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
