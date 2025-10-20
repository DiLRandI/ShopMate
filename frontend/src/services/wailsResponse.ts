export type Envelope<T> = {
  ok: boolean;
  data?: T | null;
  error?: string | null;
};

export function unwrap<T>(envelope: Envelope<T>): T {
  if (!envelope.ok || envelope.data === undefined || envelope.data === null) {
    const message = envelope.error ?? "Unexpected response";
    throw new Error(message);
  }
  return envelope.data;
}

export function unwrapVoid(envelope: Envelope<unknown>): void {
  if (!envelope.ok) {
    throw new Error(envelope.error ?? "Operation failed");
  }
}

export function unwrapOptional<T>(envelope: Envelope<T | null | undefined>): T | null {
  if (!envelope.ok) {
    throw new Error(envelope.error ?? "Operation failed");
  }
  return envelope.data ?? null;
}
