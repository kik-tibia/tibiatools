import type { APIRoute } from "astro";
import { apiError, cachedJson, preflight } from "@lib/api/http";
import { isMetaResourceName, listMetaResource, metaResourceNames } from "@lib/api/metadata";

export const GET: APIRoute = ({ params }) => {
  const resource = params.resource ?? "";
  if (!isMetaResourceName(resource)) {
    return apiError(404, `Unknown resource "${resource}". One of: ${metaResourceNames.join(", ")}.`);
  }
  return cachedJson(listMetaResource(resource));
};

export const OPTIONS: APIRoute = () => preflight();
