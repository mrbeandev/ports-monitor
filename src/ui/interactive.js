import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { stopManyPids } from "../actions/stop.js";
import { filterPorts, listOpenPorts } from "../core/ports.js";
import { colorize, formatPortsTable, supportsColor } from "../utils/format.js";

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clearScreen() {
  output.write("\x1b[2J\x1b[H");
}

function underline(text, enabled) {
  if (!enabled) return text;
  return `\x1b[4m${text}\x1b[0m`;
}

function formatOption(label, shortcut, colors) {
  const idx = label.toLowerCase().indexOf(shortcut.toLowerCase());
  if (idx === -1) {
    return colors ? `${underline(shortcut, true)} ${label}` : `[${shortcut}] ${label}`;
  }

  if (!colors) {
    return `${label.slice(0, idx)}[${label[idx]}]${label.slice(idx + 1)}`;
  }

  return `${label.slice(0, idx)}${underline(label[idx], true)}${label.slice(idx + 1)}`;
}

function enterFullscreen() {
  if (!output.isTTY) return;
  output.write("\x1b[?1049h\x1b[?25l");
}

function exitFullscreen() {
  if (!output.isTTY) return;
  output.write("\x1b[?25h\x1b[?1049l");
}

function renderScreen(rows, query, status) {
  const colors = supportsColor();
  clearScreen();
  output.write(`${colorize("ports-monitor interactive", "bold", colors)}\n`);
  output.write(`${colorize("Filter:", "cyan", colors)} ${query || "(none)"}\n`);
  output.write(`${colorize("Matches:", "cyan", colors)} ${rows.length}\n`);
  if (status) {
    output.write(`${colorize("Status:", "cyan", colors)} ${status}\n`);
  }
  output.write("\n");
  output.write(`${formatPortsTable(rows, { color: colors })}\n`);

  const options = [
    formatOption("filter", "f", colors),
    formatOption("refresh", "r", colors),
    formatOption("stop row", "s", colors),
    formatOption("stop port", "p", colors),
  ];
  if (query && rows.length === 0) {
    options.unshift(formatOption("clear filter", "c", colors));
  }
  options.push(formatOption("quit", "q", colors));

  output.write(`\n${colorize("Options:", "cyan", colors)} ${options.join(" | ")}\n`);
}

export async function runInteractive() {
  const rl = readline.createInterface({ input, output });
  let query = "";
  let rows = await listOpenPorts();
  let status = "Ready";

  enterFullscreen();

  const onSigint = () => {
    try {
      rl.close();
    } finally {
      clearScreen();
      exitFullscreen();
      process.exit(130);
    }
  };

  process.on("SIGINT", onSigint);

  try {
    while (true) {
      const filtered = filterPorts(rows, { query });
      renderScreen(filtered, query, status);
      status = "";

      const actionRaw = (await rl.question("> ")).trim().toLowerCase();
      const action = actionRaw
        .replace(/\s+/g, " ")
        .replace(/^clear$/, "clear filter")
        .replace(/^c$/, "clear filter")
        .replace(/^f$/, "filter")
        .replace(/^r$/, "refresh")
        .replace(/^s$/, "stop row")
        .replace(/^p$/, "stop port")
        .replace(/^q$/, "quit");

      if (action === "clear filter") {
        if (!query) {
          status = "No active filter to clear";
          continue;
        }
        query = "";
        status = "Filter cleared";
        continue;
      }

      if (action === "quit") {
        break;
      }

      if (action === "filter") {
        query = (await rl.question("Enter filter text (empty to clear): ")).trim();
        status = query ? `Filter set to '${query}'` : "Filter cleared";
        continue;
      }

      if (action === "refresh") {
        rows = await listOpenPorts();
        status = "Refreshed";
        continue;
      }

      if (action === "stop row") {
        const idx = asNumber(await rl.question("Row number to stop: "));
        if (!idx || idx < 1 || idx > filtered.length) {
          status = "Invalid row number";
          continue;
        }

        const row = filtered[idx - 1];
        if (!row.pid) {
          status = "Selected row has no PID; cannot stop";
          continue;
        }

        const confirm = (await rl.question(`Stop PID ${row.pid} (${row.processName || "unknown"})? [y/N]: `))
          .trim()
          .toLowerCase();
        if (confirm !== "y") {
          status = "Cancelled";
          continue;
        }

        const result = await stopManyPids([row.pid], { force: false, dryRun: false });
        status = `${result[0].success ? "Stopped" : "Failed"} PID ${row.pid}`;
        rows = await listOpenPorts();
        continue;
      }

      if (action === "stop port") {
        const port = asNumber(await rl.question("Port to stop (all owning PIDs): "));
        if (!port) {
          status = "Invalid port";
          continue;
        }

        const targets = filterPorts(filtered, { port }).map((row) => row.pid).filter(Boolean);
        const unique = [...new Set(targets)];
        if (!unique.length) {
          status = "No stoppable PID found on that port";
          continue;
        }

        const confirm = (await rl.question(`Stop ${unique.length} PID(s) on port ${port}? [y/N]: `))
          .trim()
          .toLowerCase();
        if (confirm !== "y") {
          status = "Cancelled";
          continue;
        }

        const results = await stopManyPids(unique, { force: false, dryRun: false });
        const ok = results.filter((r) => r.success).length;
        status = `Stopped ${ok}/${results.length} PID(s)`;
        rows = await listOpenPorts();
        continue;
      }

      status = "Unknown option. Try: filter, refresh, stop row, stop port, clear filter, or quit";
    }
  } finally {
    process.off("SIGINT", onSigint);
    rl.close();
    clearScreen();
    exitFullscreen();
  }
}
