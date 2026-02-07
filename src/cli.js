#!/usr/bin/env node

import { stopManyPids } from "./actions/stop.js";
import { filterPorts, listOpenPorts } from "./core/ports.js";
import { runInteractive } from "./ui/interactive.js";
import { formatPortsTable, parseArgs, printJson } from "./utils/format.js";

function printHelp() {
  const text = `ports-monitor

Usage:
  ports-monitor list [--port N] [--pid N] [--process NAME] [--protocol tcp|udp] [--state STATE] [--address TEXT] [--query TEXT] [--json]
  ports-monitor stop [--port N | --pid N] [--protocol tcp|udp] [--force] [--dry-run] [--yes] [--json]
  ports-monitor interactive

Examples:
  ports-monitor list --process node
  ports-monitor stop --port 3000 --yes
  ports-monitor stop --pid 1234 --force --yes
  ports-monitor interactive
`;
  process.stdout.write(`${text}\n`);
}

function toNumber(value, key) {
  if (value === undefined || value === null || value === true) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid --${key} value: ${value}`);
  }
  return n;
}

function boolFlag(value) {
  return value === true || value === "true" || value === "1";
}

async function runList(flags) {
  const rows = await listOpenPorts();
  const filtered = filterPorts(rows, {
    port: toNumber(flags.port, "port"),
    pid: toNumber(flags.pid, "pid"),
    protocol: flags.protocol,
    processName: flags.process,
    state: flags.state,
    address: flags.address,
    query: flags.query,
  });

  if (boolFlag(flags.json)) {
    process.stdout.write(`${printJson(filtered)}\n`);
    return;
  }

  process.stdout.write(`${formatPortsTable(filtered)}\n`);
}

async function runStop(flags) {
  const rows = await listOpenPorts();

  const byPid = toNumber(flags.pid, "pid");
  const byPort = toNumber(flags.port, "port");

  if (!byPid && !byPort) {
    throw new Error("Stop requires --pid N or --port N");
  }

  const candidates = filterPorts(rows, {
    pid: byPid,
    port: byPort,
    protocol: flags.protocol,
  });

  const pids = [...new Set(candidates.map((row) => row.pid).filter(Boolean))];
  if (!pids.length) {
    process.stdout.write("No matching live PID found for stop operation.\n");
    return;
  }

  if (!boolFlag(flags.yes)) {
    process.stdout.write(
      `Refusing to stop ${pids.length} process(es) without --yes confirmation.\n`
    );
    process.stdout.write("Add --yes to execute, or --dry-run --json to inspect targets.\n");
    return;
  }

  const results = await stopManyPids(pids, {
    force: boolFlag(flags.force),
    dryRun: boolFlag(flags["dry-run"]),
  });

  if (boolFlag(flags.json)) {
    process.stdout.write(`${printJson(results)}\n`);
    return;
  }

  const ok = results.filter((r) => r.success).length;
  for (const result of results) {
    if (result.success) {
      process.stdout.write(`Stopped PID ${result.pid} (${result.strategy}).\n`);
    } else {
      process.stdout.write(`Failed PID ${result.pid}: ${result.error || "unknown error"}.\n`);
    }
  }
  process.stdout.write(`Done: ${ok}/${results.length} successful.\n`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional[0] || "list";

  if (flags.help || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "interactive") {
    await runInteractive();
    return;
  }

  if (command === "list") {
    await runList(flags);
    return;
  }

  if (command === "stop") {
    await runStop(flags);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message || String(error)}\n`);
  process.exit(1);
});
