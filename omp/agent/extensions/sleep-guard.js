// Harness-level agent guard: omp extension loaded from ~/.omp/agent/extensions/.
// Refuses the sleep command from agent tool calls while the session runs under
// herdr (HERDR_ENV=1). Interactive omp sessions and the user's own terminal
// (no HERDR_ENV) pass everything. Installed beside the herdr-managed
// herdr-omp-agent-state.ts; the repo template lives in
// omp/agent/extensions/ and is synced by omp-sync.sh.
// No harness-side sleep guard exists yet; if one is added, keep its patterns
// in sync here.

// Command invocation, not any mention: `sleep` may carry a path or `command`
// prefix; bare `sleep` (no args) is blocked too.
const SLEEP_INVOCATION = /(^|[;&|(\s"'])([^&;|(\s"']*\/)?sleep([ \t]+|$)/;

function refusal(command) {
	if (SLEEP_INVOCATION.test(command)) {
		return "sleep is disabled for agents (harness guard): waiting uses herdr agent wait or your harness's background waits, never shell sleeps";
	}
	return null;
}

export default function (pi) {
	pi.on("tool_call", (event, ctx) => {
		if (process.env.HERDR_ENV !== "1") return undefined;
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
