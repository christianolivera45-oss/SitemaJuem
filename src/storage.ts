const isStorageAvailable = (() => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
})();

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    if (isStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fallback
      }
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },
  setItem(key: string, value: string): void {
    if (isStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fallback
      }
    }
    memoryStorage[key] = value;
  },
  removeItem(key: string): void {
    if (isStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // Fallback
      }
    }
    delete memoryStorage[key];
  }
};
