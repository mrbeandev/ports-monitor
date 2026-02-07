import { parsePortAndAddress, run } from "../utils/exec.js";

function parseTasklistCsv(csvText) {
  const map = new Map();
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cols.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    cols.push(current);

    const name = cols[0] || "";
    const pidRaw = cols[1] || "";
    const pid = Number(pidRaw);
    if (Number.isFinite(pid) && pid > 0) {
      map.set(pid, name.replace(/\.exe$/i, ""));
    }
  }

  return map;
}

function parseNetstatLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const proto = (parts[0] || "").toUpperCase();
  if (proto !== "TCP" && proto !== "UDP") return null;

  if (proto === "TCP") {
    if (parts.length < 5) return null;
    const local = parts[1];
    const state = parts[3].toUpperCase();
    const pid = Number(parts[4]);
    const { address, port } = parsePortAndAddress(local);
    return {
      protocol: "tcp",
      port,
      address,
      state,
      pid: Number.isFinite(pid) ? pid : null,
      processName: null,
      command: null,
    };
  }

  const local = parts[1];
  const pid = Number(parts[3]);
  const { address, port } = parsePortAndAddress(local);
  return {
    protocol: "udp",
    port,
    address,
    state: "UNCONN",
    pid: Number.isFinite(pid) ? pid : null,
    processName: null,
    command: null,
  };
}

export async function getWindowsPorts() {
  const [tcpResult, udpResult, tasklistResult] = await Promise.all([
    run("netstat -ano -p tcp"),
    run("netstat -ano -p udp"),
    run("tasklist /FO CSV /NH"),
  ]);

  const processNames = tasklistResult.ok ? parseTasklistCsv(tasklistResult.stdout) : new Map();
  const rows = [tcpResult.stdout, udpResult.stdout]
    .join("\n")
    .split(/\r?\n/)
    .map(parseNetstatLine)
    .filter(Boolean)
    .filter((item) => item.port !== null);

  for (const row of rows) {
    if (row.pid && processNames.has(row.pid)) {
      row.processName = processNames.get(row.pid);
      row.command = row.processName;
    }
  }

  return rows;
}
