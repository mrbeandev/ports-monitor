# ports-monitor

`ports-monitor` is a cross-platform Node.js CLI to:

- inspect currently open ports,
- filter them quickly,
- stop the owning process(es).

Supports Linux, macOS, and Windows.

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
