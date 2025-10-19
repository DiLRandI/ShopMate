declare global {
  interface Window {
    go: Record<string, Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>>;
  }
}

export {};
