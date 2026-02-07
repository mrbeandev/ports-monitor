import { normalizeState, parsePortAndAddress, run } from "../utils/exec.js";

function parseLsofLine(line) {
  const trimmed = line.trim();
  if (!trimmed || /^COMMAND\s+PID\s+/i.test(trimmed)) return null;

  const match = trimmed.match(
    /^(\S+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+(TCP|UDP)\s+(.+)$/i
  );
  if (!match) return null;

  const processName = match[1];
  const pid = Number(match[2]);
  const protocol = match[3].toLowerCase();
  const details = match[4];

  const stateMatch = details.match(/\(([^)]+)\)\s*$/);
  const state = stateMatch ? normalizeState(stateMatch[1]) : protocol === "udp" ? "UNCONN" : "";

  const endpoint = details.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const arrowSplit = endpoint.split("->")[0].trim();
  const { address, port } = parsePortAndAddress(arrowSplit);

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

export async function getMacosPorts() {
  const [tcpResult, udpResult] = await Promise.all([
    run("lsof -nP -iTCP -sTCP:LISTEN"),
    run("lsof -nP -iUDP"),
  ]);

  const combined = [tcpResult.stdout, udpResult.stdout].join("\n");
  if (combined.trim()) {
    return combined
      .split(/\r?\n/)
      .map(parseLsofLine)
      .filter(Boolean)
      .filter((item) => item.port !== null);
  }

  throw new Error("Unable to read ports on macOS. Ensure `lsof` is available.");
}
