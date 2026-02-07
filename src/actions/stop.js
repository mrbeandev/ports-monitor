import { run } from "../utils/exec.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAlive(pid) {
  if (!pid || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

async function stopOnUnix(pid, force) {
  if (force) {
    await run(`kill -KILL ${pid}`);
    return { pid, strategy: "force", success: !isAlive(pid) };
  }

  await run(`kill -TERM ${pid}`);
  await sleep(800);

  if (!isAlive(pid)) {
    return { pid, strategy: "graceful", success: true };
  }

  await run(`kill -KILL ${pid}`);
  await sleep(300);

  return { pid, strategy: "graceful-then-force", success: !isAlive(pid) };
}

async function stopOnWindows(pid, force) {
  if (force) {
    await run(`taskkill /F /PID ${pid}`);
    return { pid, strategy: "force", success: !isAlive(pid) };
  }

  await run(`taskkill /PID ${pid}`);
  await sleep(800);

  if (!isAlive(pid)) {
    return { pid, strategy: "graceful", success: true };
  }

  await run(`taskkill /F /PID ${pid}`);
  await sleep(300);

  return { pid, strategy: "graceful-then-force", success: !isAlive(pid) };
}

export async function stopPid(pid, options = {}) {
  const pidNumber = Number(pid);
  if (!Number.isFinite(pidNumber) || pidNumber <= 0) {
    throw new Error(`Invalid PID: ${pid}`);
  }

  const { force = false, dryRun = false } = options;
  if (dryRun) {
    return { pid: pidNumber, strategy: force ? "force" : "graceful-then-force", success: true, dryRun: true };
  }

  if (process.platform === "win32") {
    return stopOnWindows(pidNumber, force);
  }

  return stopOnUnix(pidNumber, force);
}

export async function stopManyPids(pids, options = {}) {
  const unique = [...new Set(pids.map((pid) => Number(pid)).filter((pid) => Number.isFinite(pid) && pid > 0))];
  const results = [];

  for (const pid of unique) {
    try {
      const result = await stopPid(pid, options);
      results.push(result);
    } catch (error) {
      results.push({ pid, success: false, error: error.message || String(error) });
    }
  }

  return results;
}
