// Kimi Code rate limits as a colored widget above the editor, via setWidget.
//
// Shows `kimi 5h 31% 1h40m · quota 8% 2d16h` (used percent plus time until
// reset) in muted dark gray while the active model is a kimi-code model.
//
// Why a widget and not the built-in `usage` statusline segment: omp's Kimi
// adapter passes the API's raw window id through (`300time_unit_minute`) while
// the segment only matches the canonical `5h`/`7d` ids. And why not
// ctx.ui.setStatus: hook-status text is sanitized (ANSI stripped) and rendered
// in one flat color, so it cannot be colored per value. setWidget accepts a
// component factory with full theme access. Remove this once the upstream
// adapter canonicalizes window ids and the `usage` segment works for Kimi.
//
// Token resolution shells out to `omp token kimi-code`, so OAuth refresh stays
// with omp and no credential handling lives here.

import { Text } from "@oh-my-pi/pi-tui";

const PROVIDER = "kimi-code";
const WIDGET_KEY = "kimi-usage";
const REFRESH_MS = 180_000;
const BASE_URL = (process.env.KIMI_CODE_BASE_URL || "https://api.kimi.com/coding/v1").replace(/\/+$/, "");

function num(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function windowMs(window) {
	const duration = num(window?.duration);
	if (duration === undefined) return undefined;
	const unit = String(window?.timeUnit || "").toUpperCase();
	if (unit.includes("MINUTE")) return duration * 60_000;
	if (unit.includes("HOUR")) return duration * 3_600_000;
	if (unit.includes("DAY")) return duration * 86_400_000;
	if (unit.includes("SECOND")) return duration * 1_000;
	return undefined;
}

function fmtCountdown(resetTime) {
	const ms = Date.parse(resetTime) - Date.now();
	if (!Number.isFinite(ms) || ms <= 0) return "";
	const mins = Math.round(ms / 60_000);
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 48) return `${hours}h${mins % 60 ? `${mins % 60}m` : ""}`;
	return `${Math.floor(hours / 24)}d${hours % 24 ? `${hours % 24}h` : ""}`;
}

function fmtPart(label, detail) {
	const used = num(detail?.used);
	const limit = num(detail?.limit);
	if (used === undefined || !limit) return null;
	const pct = Math.round((used / limit) * 100);
	const reset = fmtCountdown(detail?.resetTime);
	return `${label} ${pct}%${reset ? ` ${reset}` : ""}`;
}

// The session window is the shortest-duration entry in limits[]; the account
// quota lives in the top-level `usage` object.
function format(data) {
	const parts = [];
	let session;
	let sessionMs;
	for (const entry of Array.isArray(data?.limits) ? data.limits : []) {
		const ms = windowMs(entry?.window);
		if (ms === undefined) continue;
		if (sessionMs === undefined || ms < sessionMs) {
			sessionMs = ms;
			session = entry;
		}
	}
	if (session?.detail) {
		const hours = sessionMs / 3_600_000;
		const label = Number.isInteger(hours) ? `${hours}h` : `${Math.round(sessionMs / 60_000)}m`;
		const part = fmtPart(label, session.detail);
		if (part) parts.push(part);
	}
	const quota = fmtPart("quota", data?.usage);
	if (quota) parts.push(quota);
	return parts.length ? `kimi ${parts.join(" · ")}` : null;
}

async function fetchUsage(pi) {
	const tokenResult = await pi.exec("omp", ["token", PROVIDER], { timeout: 15_000 });
	const token = tokenResult.code === 0 ? tokenResult.stdout.trim() : "";
	if (!token) return null;
	const response = await fetch(`${BASE_URL}/usages`, {
		headers: {
			Authorization: `Bearer ${token}`,
			"User-Agent": "KimiCLI/1.0",
			Accept: "application/json",
		},
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) return null;
	return response.json();
}

export default function kimiUsage(pi) {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		const hide = () => ctx.ui.setWidget(WIDGET_KEY, undefined);
		const show = (text) =>
			ctx.ui.setWidget(WIDGET_KEY, (_ui, theme) => new Text(theme.fg("muted", text), 1, 0), {
				placement: "aboveEditor",
			});
		let inFlight = false;
		const tick = async () => {
			if (inFlight) return;
			if (ctx.model?.provider !== PROVIDER) {
				hide();
				return;
			}
			inFlight = true;
			try {
				const data = await fetchUsage(pi);
				const status = data ? format(data) : null;
				if (status) show(status);
				else hide();
			} catch {
				// Keep the last good widget; the next tick retries.
			} finally {
				inFlight = false;
			}
		};
		await tick();
		// Managed timer: unref'd and cleared automatically on session_shutdown.
		ctx.setInterval(tick, REFRESH_MS);
	});
}
