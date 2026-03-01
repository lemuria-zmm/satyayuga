import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function runStep(cmd, args) {
  const label = `${cmd} ${args.join(" ")}`;
  console.log(`\n==> ${label}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    throw new Error(`Step failed: ${label}`);
  }
}

function assertDist() {
  const distDir = "dist";
  if (!existsSync(distDir)) {
    throw new Error("dist directory not found. Build output is missing.");
  }

  const indexFile = join(distDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error("dist/index.html not found.");
  }

  const assetsDir = join(distDir, "assets");
  if (!existsSync(assetsDir)) {
    throw new Error("dist/assets directory not found.");
  }

  const assetFiles = readdirSync(assetsDir).filter((name) => statSync(join(assetsDir, name)).isFile());
  if (assetFiles.length === 0) {
    throw new Error("dist/assets has no files.");
  }

  const requiredFiles = ["_headers", "_redirects"];
  for (const name of requiredFiles) {
    if (!existsSync(join(distDir, name))) {
      throw new Error(`dist/${name} not found. Static hosting config missing.`);
    }
  }

  console.log("\nRelease check: dist artifact looks valid.");
}

try {
  runStep("npm", ["run", "typecheck"]);
  runStep("npm", ["run", "build"]);
  assertDist();
  console.log("\nRelease check: PASSED");
} catch (err) {
  console.error("\nRelease check: FAILED");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
