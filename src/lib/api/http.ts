export type ApiIssue = { field: string; message: string };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export function cachedJson(data: unknown, seconds = 300): Response {
  return json(data, { headers: { "Cache-Control": `public, max-age=${seconds}` } });
}

export function apiError(status: number, message: string, issues?: ApiIssue[]): Response {
  return json({ error: { status, message, ...(issues && issues.length > 0 ? { issues } : {}) } }, { status });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function methodNotAllowed(allowed: string): Response {
  return json(
    { error: { status: 405, message: `Method not allowed. Use ${allowed}.` } },
    { status: 405, headers: { Allow: `${allowed}, OPTIONS` } },
  );
}

export async function readJsonBody(request: Request): Promise<{ value: unknown } | { response: Response }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { response: apiError(400, "Could not read the request body.") };
  }
  if (text.trim() === "") return { response: apiError(400, "Request body is empty. Send a JSON object.") };
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    return { response: apiError(400, `Request body is not valid JSON: ${(e as Error).message}`) };
  }
}
