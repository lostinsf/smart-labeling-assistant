import { existsSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";

const workerConfigPath = "wrangler.toml";
const tempConfigPath = "wrangler.worker.toml.tmp";

const hasWorkerConfig = existsSync(workerConfigPath);

try {
  if (hasWorkerConfig) {
    renameSync(workerConfigPath, tempConfigPath);
  }

  const result =
    process.platform === "win32"
      ? spawnSync(
          "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            "npx wrangler pages deploy dist --project-name smart-labeling-assistant"
          ],
          { stdio: "inherit" }
        )
      : spawnSync(
          "npx",
          ["wrangler", "pages", "deploy", "dist", "--project-name", "smart-labeling-assistant"],
          { stdio: "inherit" }
        );

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
} finally {
  if (existsSync(tempConfigPath)) {
    renameSync(tempConfigPath, workerConfigPath);
  }
}
