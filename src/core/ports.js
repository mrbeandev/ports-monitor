import { getLinuxPorts } from "../platform/linux.js";
import { getMacosPorts } from "../platform/macos.js";
import { getWindowsPorts } from "../platform/windows.js";

function normalizeProtocol(value) {
  if (!value) return "";
  return String(value).toLowerCase();
}

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).toLowerCase();
}

function toKey(row) {
  return [
    row.protocol || "",
    row.port || "",
    row.address || "",
    row.state || "",
    row.pid || "",
    row.processName || "",
  ].join("|");
}

function dedupe(rows) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    const key = toKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(row);
    }
  }
  return output;
}

export async function listOpenPorts() {
  const platform = process.platform;

  let rows;
  if (platform === "linux") {
    rows = await getLinuxPorts();
  } else if (platform === "darwin") {
    rows = await getMacosPorts();
  } else if (platform === "win32") {
    rows = await getWindowsPorts();
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return dedupe(rows).sort((a, b) => {
    if ((a.port || 0) !== (b.port || 0)) {
      return (a.port || 0) - (b.port || 0);
    }
    return (a.pid || 0) - (b.pid || 0);
  });
}

export function filterPorts(rows, filters = {}) {
  const {
    port,
    pid,
    protocol,
    processName,
    state,
    address,
    query,
  } = filters;

  return rows.filter((row) => {
    if (port !== undefined && port !== null && Number(row.port) !== Number(port)) {
      return false;
    }

    if (pid !== undefined && pid !== null && Number(row.pid) !== Number(pid)) {
      return false;
    }

    if (protocol && normalizeProtocol(row.protocol) !== normalizeProtocol(protocol)) {
      return false;
    }

    if (processName) {
      const target = normalizeString(processName);
      const actual = normalizeString(row.processName || row.command);
      if (!actual.includes(target)) {
        return false;
      }
    }

    if (state && normalizeString(row.state) !== normalizeString(state)) {
      return false;
    }

    if (address && !normalizeString(row.address).includes(normalizeString(address))) {
      return false;
    }

    if (query) {
      const q = normalizeString(query);
      const haystack = [
        row.protocol,
        row.port,
        row.address,
        row.state,
        row.pid,
        row.processName,
        row.command,
      ]
        .map(normalizeString)
        .join(" ");
      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });
}
