// Harness-level agent guard: omp extension loaded from ~/.omp/agent/extensions/.
// Refuses tool calls that name a sops file (*.sops.*), the file set Claude Code denies
// through Read(**/*.sops.*) in settings/claude-glaive/settings.json and the container
// claude-config; keep the pattern in sync with it. Installed beside guard-mnt.js; the
// repo template lives in omp/agent/extensions/ and is synced by omp-sync.sh.
//
// No platform gate: sops ciphertext and the age identity it decrypts with live on every
// host, so the pattern is the gate. The user's own terminal is unaffected; the hook sees
// agent tool calls.

// A `.sops.` infix in the filename: root.sops.env, repo-key.sops.yaml, .sops.yaml (the
// sops config). A trailing `.sops` with no following segment stays out, matching the
// Claude glob.
const SOPS_FILE = /\.sops\./i;

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
			if (typeof candidate === "string" && SOPS_FILE.test(candidate)) return candidate;
		}
	}
	return null;
}

export default function (pi) {
	pi.on("tool_call", (event, ctx) => {
		if (!offendingValue(event?.input)) return undefined;
		const reason = "sops files (*.sops.*) are off limits to agents (harness guard)";
		ctx?.ui?.notify?.(`BLOCKED: ${reason}`, "warning");
		return { block: true, reason: `BLOCKED: ${reason}` };
	});
}
