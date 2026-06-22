export function getStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue;
    }

    return [];
  } catch {
    return [];
  }
}

export function setStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}
