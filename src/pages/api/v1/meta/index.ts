import type { APIRoute } from "astro";
import { cachedJson, preflight } from "@lib/api/http";
import { metaIndex } from "@lib/api/metadata";

export const GET: APIRoute = () => cachedJson(metaIndex("/api/v1/meta"));

export const OPTIONS: APIRoute = () => preflight();
