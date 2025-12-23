// Runtime Dev Mode helpers
export const DEV_MODE_KEY = 'clovet_dev_mode';

export function isDevMode(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DEV_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDevMode(enabled: boolean) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function getDisableExternalApiRuntime(): boolean {
  // Priority: runtime dev mode toggle -> env var (build-time)
  if (isDevMode()) return true;
  return import.meta.env.VITE_DISABLE_EXTERNAL_API === 'true';
}

export function getDisableDbWritesRuntime(): boolean {
  if (isDevMode()) return true;
  return import.meta.env.VITE_DISABLE_DB_WRITES === 'true';
}
