import { normalizeState, parsePortAndAddress, run } from "../utils/exec.js";

function parseSsLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) return null;

  const protocol = (parts[0] || "").toLowerCase();
  const state = normalizeState(parts[1]);
  const local = parts[4];
  const processInfo = line.includes("users:(") ? line.slice(line.indexOf("users:(")) : "";
  const { address, port } = parsePortAndAddress(local);

  const procMatch = processInfo.match(/"([^"]+)"[^\n]*?pid=(\d+)/);
  const processName = procMatch ? procMatch[1] : null;
  const pid = procMatch ? Number(procMatch[2]) : null;

  return {
    protocol,
    port,
    address,
    state,
    pid,
    processName,
    command: processName,
  };
}

function parseNetstatLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) return null;
  if (!/^(tcp|udp)/i.test(parts[0])) return null;

  const protocol = parts[0].toLowerCase();
  const local = parts[3];
  let state = "";
  let pidProg = "";

  if (protocol.startsWith("tcp")) {
    state = normalizeState(parts[5]);
    pidProg = parts[6] || "";
  } else {
    state = "UNCONN";
    pidProg = parts[5] || "";
  }

  const { address, port } = parsePortAndAddress(local);
  const pidMatch = pidProg.match(/^(\d+)\/(.*)$/);

  return {
    protocol: protocol.startsWith("tcp") ? "tcp" : "udp",
    port,
    address,
    state,
    pid: pidMatch ? Number(pidMatch[1]) : null,
    processName: pidMatch ? pidMatch[2] || null : null,
    command: pidMatch ? pidMatch[2] || null : null,
  };
}

export async function getLinuxPorts() {
  const ssResult = await run("ss -tunlpH");
  if (ssResult.ok && ssResult.stdout.trim()) {
    return ssResult.stdout
      .split(/\r?\n/)
      .map(parseSsLine)
      .filter(Boolean)
      .filter((item) => item.port !== null);
  }

  const netstatResult = await run("netstat -tunlp");
  if (netstatResult.ok && netstatResult.stdout.trim()) {
    return netstatResult.stdout
      .split(/\r?\n/)
      .map(parseNetstatLine)
      .filter(Boolean)
      .filter((item) => item.port !== null);
  }

  throw new Error(
    "Unable to read ports on Linux. Install `ss` (iproute2) or `netstat` and retry."
  );
}
