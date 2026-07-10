// Server-Sent Events framing for the /v1/ask streaming response. Pure
// string-in/string-out so it is trivially testable.

/** Encode one SSE frame carrying a JSON payload. */
export function encodeSseData(payload: unknown): string {
  // JSON.stringify never emits raw newlines, so a single `data:` line is
  // always a valid SSE frame.
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** A text delta from the model. */
export function encodeDelta(delta: string): string {
  return encodeSseData({ delta });
}

/**
 * The final event: signals completion, carries the source page URLs used to
 * answer, and the D1 row id the widget needs for /v1/feedback.
 */
export function encodeDone(sources: string[], questionId: number | null): string {
  return encodeSseData({ done: true, sources, questionId });
}

/** A mid-stream failure after headers were already sent. */
export function encodeError(message: string): string {
  return encodeSseData({ error: message });
}
