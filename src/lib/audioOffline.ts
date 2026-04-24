const CACHE_NAME = "swc-audio-v1";

const cacheOpen = async (): Promise<Cache | null> => {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
};

export const isAudioCached = async (signedUrl: string): Promise<boolean> => {
  const cache = await cacheOpen();
  if (!cache) return false;
  const match = await cache.match(stripQuery(signedUrl));
  return !!match;
};

export const downloadAudio = async (
  signedUrl: string,
  onProgress?: (pct: number) => void,
): Promise<boolean> => {
  const cache = await cacheOpen();
  if (!cache) return false;

  const cacheKey = stripQuery(signedUrl);
  const existing = await cache.match(cacheKey);
  if (existing) {
    onProgress?.(1);
    return true;
  }

  const res = await fetch(signedUrl);
  if (!res.ok || !res.body) return false;

  const total = Number(res.headers.get("Content-Length") || 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (total > 0) onProgress?.(Math.min(0.99, received / total));
    }
  }

  const blob = new Blob(chunks as BlobPart[], {
    type: res.headers.get("Content-Type") || "audio/mpeg",
  });
  const cachedRes = new Response(blob, {
    headers: {
      "Content-Type": blob.type,
      "Content-Length": String(blob.size),
      "Cache-Control": "public, max-age=31536000",
    },
  });
  await cache.put(cacheKey, cachedRes);
  onProgress?.(1);
  return true;
};

export const getCachedAudioUrl = async (signedUrl: string): Promise<string | null> => {
  const cache = await cacheOpen();
  if (!cache) return null;
  const match = await cache.match(stripQuery(signedUrl));
  if (!match) return null;
  const blob = await match.blob();
  return URL.createObjectURL(blob);
};

export const removeCachedAudio = async (signedUrl: string): Promise<void> => {
  const cache = await cacheOpen();
  if (!cache) return;
  await cache.delete(stripQuery(signedUrl));
};

const stripQuery = (url: string): string => {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
};
