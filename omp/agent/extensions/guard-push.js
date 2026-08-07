// Harness-level agent guard: omp extension loaded from ~/.omp/agent/extensions/.
// Refuses git push and mutating gh commands from agent tool calls while the
// session runs under herdr (HERDR_ENV=1). Interactive omp sessions and the
// user's own terminal (no HERDR_ENV) pass everything. Installed beside the
// herdr-managed herdr-omp-agent-state.ts; the repo template lives in
// omp/agent/extensions/ and is synced by omp-sync.sh.
// Keep patterns in sync with catalyst/devcontainers/coding/claude-config/hooks/guard-push.sh.

import { execSync } from "node:child_process";

// Command invocation, not any mention: `git` may carry its own flags
// (-C <dir>, -c key=val, --git-dir=...) before the `push` subcommand.
const GIT_PUSH = /(^|[;&|(\s"'])([^&;|(\s"']*\/)?git([ \t]+-[^ \t]+([ \t]+[^ \t]+)?)*[ \t]+push([ \t]+|$)/;

const GH_MUTATE =
	/(^|[;&|(\s"'])([^&;|(\s"']*\/)?gh([ \t]+(-{1,2}[^ \t]+)([ \t]+[^ \t]+)?)*[ \t]+(pr[ \t]+merge|repo[ \t]+sync|release[ \t]+create|alias[ \t]+set)([ \t]+|$)/;

const GH_PR_MERGE =
	/(^|[;&|(\s"'])([^&;|(\s"']*\/)?gh([ \t]+(-{1,2}[^ \t]+)([ \t]+[^ \t]+)?)*[ \t]+pr[ \t]+merge([ \t]+|$)/;

const GH_API_CALL = /(^|[;&|(\s"'])([^&;|(\s"']*\/)?gh([ \t]+(-{1,2}[^ \t]+)([ \t]+[^ \t]+)?)*[ \t]+api([ \t]+|$)/;
const GH_API_METHOD = /[ \t]+(-X|--method|-m)[ \t]+(POST|PUT|PATCH|DELETE)([ \t]+|$)/i;

// git push target: block only when a pushed ref lands on main or master.
// With no explicit refspec, fall back to the current branch.
function pushHitsProtected(command) {
	const toks = command.trim().split(/\s+/);
	const pi = toks.indexOf("push");
	if (pi < 0) return false;
	const rest = toks.slice(pi + 1).filter((t) => !t.startsWith("-"));
	let cur = null;
	const currentBranch = () => {
		if (cur === null) {
			try {
				cur = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
			} catch {
				cur = "";
			}
		}
		return cur;
	};
	if (rest.length <= 1) {
		const b = currentBranch();
		return b === "main" || b === "master";
	}
	for (const r of rest.slice(1)) {
		let dst = r.replace(/^\+/, "");
		const colon = dst.lastIndexOf(":");
		if (colon >= 0) dst = dst.slice(colon + 1);
		dst = dst.replace(/^refs\/heads\//, "");
		if (dst === "" || dst === "HEAD") dst = currentBranch();
		if (dst === "main" || dst === "master") return true;
	}
	return false;
}

// gh pr merge target branch via gh pr view; empty when it cannot be determined.
function ghPrMergeBase(command) {
	const toks = command.trim().split(/\s+/);
	let mi = -1;
	for (let i = 0; i < toks.length - 1; i++) {
		if (toks[i] === "pr" && toks[i + 1] === "merge") {
			mi = i + 1;
			break;
		}
	}
	let pr = "";
	if (mi >= 0) {
		for (let i = mi + 1; i < toks.length; i++) {
			if (toks[i].startsWith("-")) continue;
			pr = toks[i];
			break;
		}
	}
	if (pr && !/^[\w./:#-]+$/.test(pr)) return "";
	try {
		const cmd = pr
			? `gh pr view ${pr} --json baseRefName -q .baseRefName`
			: "gh pr view --json baseRefName -q .baseRefName";
		return execSync(cmd, { encoding: "utf8" }).trim();
	} catch {
		return "";
	}
}

function refusal(command) {
	if (GIT_PUSH.test(command)) {
		return pushHitsProtected(command) ? "git push to main/master is disabled for agents (harness guard)" : null;
	}
	if (GH_PR_MERGE.test(command)) {
		const base = ghPrMergeBase(command);
		if (!base) {
			return "gh pr merge target branch could not be determined; merges to main/master are disabled for agents (harness guard)";
		}
		if (base === "main" || base === "master") {
			return "gh pr merge into main/master is disabled for agents (harness guard)";
		}
		return null;
	}
	if (GH_MUTATE.test(command)) return "mutating gh commands are disabled for agents (harness guard)";
	if (GH_API_CALL.test(command)) {
		if (GH_API_METHOD.test(command)) return "gh api mutations are disabled for agents (harness guard)";
		if (/graphql/i.test(command) && /mutation/i.test(command)) {
			return "gh api graphql mutations are disabled for agents (harness guard)";
		}
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
