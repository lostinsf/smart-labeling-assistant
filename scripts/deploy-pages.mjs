import { existsSync, readFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";

const workerConfigPath = "wrangler.toml";
const tempConfigPath = "wrangler.worker.toml.tmp";

function runCommand(command, args, options = {}) {
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], {
          stdio: "inherit",
          ...options
        })
      : spawnSync(command, args, {
          stdio: "inherit",
          ...options
        });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function readPublicApiBaseUrl() {
  const config = readFileSync(workerConfigPath, "utf8");
  const match = config.match(/^\s*VITE_API_BASE_URL\s*=\s*"([^"]+)"/m);
  return match?.[1]?.trim() || "";
}

const hasWorkerConfig = existsSync(workerConfigPath);
const viteApiBaseUrl = readPublicApiBaseUrl();

try {
  runCommand("npm", ["run", "build"], {
    env: {
      ...process.env,
      ...(viteApiBaseUrl ? { VITE_API_BASE_URL: viteApiBaseUrl } : {})
    }
  });

  if (hasWorkerConfig) {
    renameSync(workerConfigPath, tempConfigPath);
  }

  runCommand("npx", [
    "wrangler",
    "pages",
    "deploy",
    "dist",
    "--project-name",
    "smart-labeling-assistant",
    "--commit-dirty=true"
  ]);
} finally {
  if (existsSync(tempConfigPath)) {
    renameSync(tempConfigPath, workerConfigPath);
  }
}
