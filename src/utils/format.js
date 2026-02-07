function pad(value, width) {
  const text = String(value ?? "");
  if (text.length >= width) return text.slice(0, width - 1) + "~";
  return text + " ".repeat(width - text.length);
}

const CODES = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

export function supportsColor() {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  if (!process.stdout.isTTY) return false;

  const term = process.env.TERM || "";
  if (!term || term.toLowerCase() === "dumb") return false;

  return true;
}

export function colorize(text, code, enabled = supportsColor()) {
  if (!enabled || !code || !CODES[code]) return String(text);
  return `${CODES[code]}${text}${CODES.reset}`;
}

function colorCell(columnKey, rawValue, padded, colorsEnabled) {
  if (!colorsEnabled) return padded;

  if (columnKey === "protocol") {
    if (rawValue === "tcp") return colorize(padded, "blue", true);
    if (rawValue === "udp") return colorize(padded, "magenta", true);
  }

  if (columnKey === "state") {
    if (rawValue === "LISTEN") return colorize(padded, "green", true);
    if (rawValue === "UNCONN") return colorize(padded, "yellow", true);
    if (rawValue) return colorize(padded, "red", true);
  }

  if (columnKey === "pid" && !rawValue) {
    return colorize(pad("-", padded.length), "dim", true);
  }

  return padded;
}

export function formatPortsTable(rows, options = {}) {
  const colorsEnabled = options.color ?? supportsColor();

  if (!rows.length) {
    return colorsEnabled
      ? colorize("No matching open ports found.", "yellow", true)
      : "No matching open ports found.";
  }

  const columns = [
    { key: "idx", title: "#", width: 4 },
    { key: "protocol", title: "PROTO", width: 7 },
    { key: "port", title: "PORT", width: 7 },
    { key: "address", title: "ADDRESS", width: 24 },
    { key: "state", title: "STATE", width: 13 },
    { key: "pid", title: "PID", width: 8 },
    { key: "processName", title: "PROCESS", width: 20 },
  ];

  const headerRaw = columns.map((c) => pad(c.title, c.width)).join(" ");
  const separatorRaw = columns.map((c) => "-".repeat(c.width)).join(" ");
  const headerWithColor = colorsEnabled
    ? colorize(colorize(headerRaw, "bold", true), "cyan", true)
    : headerRaw;
  const separator = colorsEnabled ? colorize(separatorRaw, "dim", true) : separatorRaw;
  const lines = [headerWithColor, separator];

  rows.forEach((row, index) => {
    const view = {
      idx: index + 1,
      protocol: row.protocol || "",
      port: row.port || "",
      address: row.address || "",
      state: row.state || "",
      pid: row.pid || "",
      processName: row.processName || row.command || "",
    };

    const line = columns
      .map((c) => {
        const rawValue = String(view[c.key] ?? "");
        const padded = pad(rawValue, c.width);
        return colorCell(c.key, rawValue, padded, colorsEnabled);
      })
      .join(" ");
    lines.push(line);
  });

  return lines.join("\n");
}

export function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    i += 1;
  }

  return { positional, flags };
}

export function printJson(value) {
  return JSON.stringify(value, null, 2);
}
