import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("miniprogram/generated", { recursive: true });
await build({
  entryPoints: {
    domain: "packages/domain/src/index.ts",
    contracts: "packages/contracts/src/index.ts",
  },
  outdir: "miniprogram/generated",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
});
