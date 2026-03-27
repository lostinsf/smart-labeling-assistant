import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

function readProxyTarget() {
  const config = readFileSync(workerConfigPath, "utf8");
  const match = config.match(/^\s*API_PROXY_TARGET\s*=\s*"([^"]+)"/m);
  return match?.[1]?.trim() || "";
}

function createPagesWorker(proxyTarget) {
  return `export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const proxyUrl = new URL(url.pathname + url.search, ${JSON.stringify(proxyTarget)});
      const proxiedRequest = new Request(proxyUrl.toString(), request);
      return fetch(proxiedRequest);
    }

    return env.ASSETS.fetch(request);
  }
};
`;
}

const hasWorkerConfig = existsSync(workerConfigPath);
const proxyTarget = readProxyTarget();
const tempDeployDir = mkdtempSync(join(tmpdir(), "smart-labeling-pages-"));

try {
  runCommand("npm", ["run", "build"]);

  cpSync("dist", tempDeployDir, { recursive: true });
  writeFileSync(join(tempDeployDir, "_worker.js"), createPagesWorker(proxyTarget), "utf8");

  if (hasWorkerConfig) {
    renameSync(workerConfigPath, tempConfigPath);
  }

  runCommand("npx", [
    "wrangler",
    "pages",
    "deploy",
    tempDeployDir,
    "--project-name",
    "smart-labeling-assistant",
    "--commit-dirty=true"
  ]);
} finally {
  if (existsSync(tempConfigPath)) {
    renameSync(tempConfigPath, workerConfigPath);
  }

  rmSync(tempDeployDir, { recursive: true, force: true });
}
