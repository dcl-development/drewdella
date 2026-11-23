import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Load `.env.local` then `.env` without overwriting variables already set. */
export function loadDotenvLocal(cwd = process.cwd()) {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.join(cwd, file);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}