import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function run(command, options = {}) {
  const { timeout = 10000 } = options;

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    return { stdout, stderr, ok: true };
  } catch (error) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      ok: false,
      error,
    };
  }
}

export function parsePortAndAddress(localAddress) {
  if (!localAddress || typeof localAddress !== "string") {
    return { port: null, address: "" };
  }

  const bracketMatch = localAddress.match(/^\[(.*)\]:(\d+)$/);
  if (bracketMatch) {
    return { address: bracketMatch[1], port: Number(bracketMatch[2]) };
  }

  const plainMatch = localAddress.match(/^(.*):(\d+)$/);
  if (plainMatch) {
    return { address: plainMatch[1], port: Number(plainMatch[2]) };
  }

  return { port: null, address: localAddress };
}

export function normalizeState(state) {
  if (!state) return "";
  return String(state).toUpperCase();
}
