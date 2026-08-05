import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const rootEnvFile = fileURLToPath(new URL("../../.env", import.meta.url));
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

try {
  loadEnvFile(rootEnvFile);
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const nextProcess = spawn(process.execPath, [nextBin, "dev"], {
  env: process.env,
  stdio: "inherit",
});

nextProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
