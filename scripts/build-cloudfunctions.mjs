import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

const entry = "packages/server/src/index.ts";
if (existsSync(entry)) {
  await mkdir("cloudfunctions/api", { recursive: true });
  await build({
    entryPoints: [entry],
    outfile: "cloudfunctions/api/index.js",
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    external: ["wx-server-sdk"],
  });
}
