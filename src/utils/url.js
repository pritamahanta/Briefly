const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid']);

export function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);

  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
  }
  url.hash = '';

  return url.toString();
}
