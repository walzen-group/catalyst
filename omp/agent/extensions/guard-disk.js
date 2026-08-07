// Harness-level agent guard: omp extension loaded from ~/.omp/agent/extensions/.
// Refuses disk and raw-device commands (diskutil, dd, hdiutil) from agent tool calls
// on macOS, where they reach the real machine's volumes. Installed beside guard-push.js;
// the repo template lives in omp/agent/extensions/ and is synced by omp-sync.sh.
// Counterpart of the diskutil hook in settings/claude-glaive/settings.json; keep the
// command list in sync with it.
//
// Two deliberate differences from guard-push.js:
// darwin only, since the same extensions dir seeds the Linux container, where these
// three commands either do not exist or address container-local devices; and no
// HERDR_ENV gate, since a wrong dd is unrecoverable whether or not a multiplexer
// started the session. The hook sees agent tool calls, so the user's own terminal is
// unaffected either way.

// Matches at a command boundary and allows a path prefix (/sbin/diskutil), so a name
// embedded in a word (ddgst, add) passes. A separate word anywhere in the command line
// counts, so `grep -r diskutil docs/` is refused as well: the same over-block the Claude
// hook and guard-push.js carry, and the guard errs toward refusing. A bare `dd` with no
// arguments is refused too, which the shell-hook version lets through.
const DISK_CMD = /(^|[;&|(\s"'])([^&;|(\s"']*\/)?(diskutil|dd|hdiutil)([ \t]+|$)/;

function refusal(command) {
	if (DISK_CMD.test(command)) {
		return "disk volume commands (diskutil, dd, hdiutil) are disabled for agents (harness guard)";
	}
	return null;
}

export default function (pi) {
	pi.on("tool_call", (event, ctx) => {
		if (process.platform !== "darwin") return undefined;
		if (event?.toolName !== "bash") return undefined;
		const command = typeof event.input?.command === "string" ? event.input.command : "";
		const reason = command ? refusal(command) : null;
		if (reason) {
			ctx?.ui?.notify?.(`BLOCKED: ${reason}`, "warning");
			return { block: true, reason: `BLOCKED: ${reason}` };
		}
		return undefined;
	});
}
