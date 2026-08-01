import type { APIRoute } from "astro";
import { computeDamage } from "@lib/api/damage";
import { apiError, json, methodNotAllowed, preflight, readJsonBody } from "@lib/api/http";
import { parseBuildRequest } from "@lib/api/parse-build";

export const POST: APIRoute = async ({ request }) => {
  const body = await readJsonBody(request);
  if ("response" in body) return body.response;

  const parsed = parseBuildRequest(body.value);
  if (!parsed.ok) {
    return apiError(400, "The build could not be calculated as sent. See issues for the fields to fix.", parsed.issues);
  }

  try {
    return json(computeDamage(parsed.build));
  } catch (e) {
    return apiError(500, `The calculator failed on this build: ${(e as Error).message}`);
  }
};

export const GET: APIRoute = () => methodNotAllowed("POST");

export const OPTIONS: APIRoute = () => preflight();
