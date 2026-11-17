import path from "path";
import { fileURLToPath } from "url";

export function getDirname(metaUrl?: string): string {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  if (metaUrl) {
    return path.dirname(fileURLToPath(metaUrl));
  }
  throw new Error("Cannot determine dirname: neither __dirname nor import.meta.url available");
}
