import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { format, resolveConfig } from "prettier";

/**
 * Write data as JSON, formatted exactly as Prettier would format it, so that
 * generated files satisfy `prettier --check` without a manual pass afterwards.
 *
 * Creates the containing directory if it doesn't already exist.
 */
export async function writeJson(outPath, data) {
  const options = await resolveConfig(outPath);
  const formatted = await format(JSON.stringify(data), {
    ...options,
    filepath: outPath,
    parser: "json",
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, formatted);
}
