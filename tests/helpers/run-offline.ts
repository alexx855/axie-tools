import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));

// Isolate mocks from other tests and disable both credential loading and installs.
export function runOfflineProcess(args: string[]) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--no-install", ...args],
    cwd: repo,
    env: { PATH: process.env.PATH ?? "" },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 10000,
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString() + result.stdout.toString());
  }
  return result;
}

export function runOffline(script: string) {
  const result = runOfflineProcess(["-e", script]);
  const line = result.stdout
    .toString()
    .split("\n")
    .find((line) => line.startsWith("OFFLINE_RESULT:"));
  if (!line) throw new Error("Offline child did not complete");
  return JSON.parse(line.slice("OFFLINE_RESULT:".length));
}
