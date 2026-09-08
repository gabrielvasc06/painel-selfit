import { useEffect, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        localStorage.removeItem(key);
      }
    }

    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
