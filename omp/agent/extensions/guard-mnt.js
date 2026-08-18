// Harness-level agent guard: omp extension loaded from ~/.omp/agent/extensions/.
// Refuses tool calls that reach a Windows drive mount (/mnt/<drive>) on WSL, where they
// address the real machine's filesystem. Installed beside guard-disk.js; the repo
// template lives in omp/agent/extensions/ and is synced by omp-sync.sh.
// Counterpart of the Claude Code managed settings in modules/os/nixos/claude-guard.nix;
// keep the path pattern in sync with it.
//
// No platform gate, unlike guard-disk.js: the pattern names a path shape that only WSL
// has, so the guard is inert on macOS and in the coding container. No HERDR_ENV gate
// either, since the Windows side is out of bounds whether or not a multiplexer started
// the session. The hook sees agent tool calls, so the user's own terminal is unaffected.

// A drive mount is /mnt plus a single letter: /mnt/c, /mnt/d. The trailing class keeps
// /mnt/wsl and /mnt/wslg out of it, and the leading class keeps a relative path such as
// vendor/mnt/c out of it.
const MNT_DRIVE = /(^|[^A-Za-z0-9_.-])\/mnt\/[a-z]([^A-Za-z0-9_-]|$)/;

// bash carries the path in the command line or cwd; the path-based tools carry it in
// their own field. edit takes [PATH#TAG] sections in `input`. grep's `pattern` is a
// search string rather than a target, so it stays out of the list.
const PATH_FIELDS = ["command", "cwd", "path", "paths", "input", "file_path"];

function offendingValue(input) {
	if (!input || typeof input !== "object") return null;
	for (const field of PATH_FIELDS) {
		const value = input[field];
		const candidates = Array.isArray(value) ? value : [value];
		for (const candidate of candidates) {
			if (typeof candidate === "string" && MNT_DRIVE.test(candidate)) return candidate;
		}
	}
	return null;
}

export default function (pi) {
	pi.on("tool_call", (event, ctx) => {
		if (!offendingValue(event?.input)) return undefined;
		const reason =
			"the Windows drive mounts (/mnt/<drive>) are off limits to agents on this host (harness guard)";
		ctx?.ui?.notify?.(`BLOCKED: ${reason}`, "warning");
		return { block: true, reason: `BLOCKED: ${reason}` };
	});
}
