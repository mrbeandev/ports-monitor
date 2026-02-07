# ports-monitor

[![npm version](https://img.shields.io/npm/v/ports-monitor.svg)](https://www.npmjs.com/package/ports-monitor)
[![npm downloads](https://img.shields.io/npm/dm/ports-monitor.svg)](https://www.npmjs.com/package/ports-monitor)
[![license](https://img.shields.io/npm/l/ports-monitor.svg)](./LICENSE)

`ports-monitor` is a cross-platform Node.js CLI to find open ports, filter them fast, and stop the owning process.

- Check open ports on Linux, macOS, and Windows
- Filter by port, PID, protocol, process, address, or search query
- Kill a process by port (or by PID) with graceful-first behavior
- Use either script-friendly flags or an interactive terminal view

Supports Linux, macOS, and Windows.

## Why ports-monitor

- Works across Linux, macOS, and Windows with one command
- Fast for day-to-day dev tasks like "what is using port 3000?"
- Safe stop flow: graceful first, then force only when needed
- Useful for local debugging, CI agents, and remote servers

## Install

From npm:

```bash
npm install -g ports-monitor
```

Or from this repo:

```bash
npm link
```

Then run:

```bash
ports-monitor --help
```

Shortcut alias:

```bash
pm --help
```

## Local Development

From this repo:

```bash
npm install
npm run check
```

## Usage

List ports:

```bash
ports-monitor list
ports-monitor list --process node
ports-monitor list --port 3000
ports-monitor list --protocol tcp --state LISTEN
ports-monitor list --json
```

Stop by port or PID:

```bash
ports-monitor stop --port 3000 --yes
ports-monitor stop --pid 1234 --yes
ports-monitor stop --pid 1234 --force --yes
ports-monitor stop --port 3000 --dry-run --yes --json
```

Interactive mode:

```bash
ports-monitor interactive
```

## Common Tasks

Find what process is using a specific port:

```bash
ports-monitor list --port 3000
```

Kill whatever is running on a specific port:

```bash
ports-monitor stop --port 3000 --yes
```

Kill by PID:

```bash
ports-monitor stop --pid 1234 --yes
```

Preview stop targets without killing:

```bash
ports-monitor stop --port 3000 --dry-run --yes --json
```

## Commands

### `list`

`ports-monitor list [--port N] [--pid N] [--process NAME] [--protocol tcp|udp] [--state STATE] [--address TEXT] [--query TEXT] [--json]`

### `stop`

`ports-monitor stop [--port N | --pid N] [--protocol tcp|udp] [--force] [--dry-run] [--yes] [--json]`

Default stop behavior is graceful first, then force kill if needed.

### `interactive`

Simple terminal loop with live refresh, free-text filtering, and stop actions.

## Notes

- Some processes may require elevated privileges to inspect or stop.
- On Linux, the CLI uses `ss` first and falls back to `netstat`.
- On macOS, the CLI uses `lsof`.
- On Windows, the CLI uses `netstat` and `tasklist`.

## Links

- npm: https://www.npmjs.com/package/ports-monitor
- GitHub: https://github.com/mrbeandev/ports-monitor
- Website: https://mrbean.dev
