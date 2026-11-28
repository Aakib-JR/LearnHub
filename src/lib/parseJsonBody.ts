export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false };

export async function parseJsonBody(
  request: Request
): Promise<JsonBodyResult> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
