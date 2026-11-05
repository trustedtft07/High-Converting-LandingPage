const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 3;
const MAX_TRACKED_IPS = 500;

const requestLog = new Map<string, number[]>();

function pruneExpiredEntries(now: number): void {
  if (requestLog.size <= MAX_TRACKED_IPS) return;
  for (const [ip, timestamps] of requestLog.entries()) {
    const active = timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (active.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, active);
    }
  }
}

export function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  pruneExpiredEntries(now);

  const key = clientIp.trim() || 'unknown';
  const history = requestLog.get(key) || [];
  const recentRequests = history.filter((ts) => now - ts < WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS) {
    requestLog.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLog.set(key, recentRequests);
  return false;
}
