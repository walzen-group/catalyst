// Neuralwatt daily usage as a colored widget above the editor, via setWidget.
//
// Shows `neuralwatt ↗49 ⚡3Wh` (today's request count and energy) in muted dark
// gray while the active model is a neuralwatt model, the same shape and
// placement as the kimi-code widget in kimi-usage.js (only one of the two can be
// visible, since both key off the active provider).
//
// This is the nw-usage script from neuralwatt/neuralwatt-tools rewritten as an
// omp extension: same GET /v1/usage/energy call and same compact output, without
// the bash/jq/curl dependency, the /tmp cache file, or a script to deploy. The
// refresh interval below replaces the script's 60s cache.
//
// Key resolution shells out to `omp token neuralwatt`, which runs the apiKey
// command from omp-models.yml and hands back what it printed. So the key stays
// defined in exactly one place (the mounted ~/.secrets file) and no credential
// path is hardcoded here.

import { Text } from "@oh-my-pi/pi-tui";

const PROVIDER = "neuralwatt";
const WIDGET_KEY = "neuralwatt-usage";
const REFRESH_MS = 180_000;
const BASE_URL = (process.env.NEURALWATT_BASE_URL || "https://api.neuralwatt.com/v1").replace(/\/+$/, "");

function num(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

// `.daily[0]` is today's bucket, matching nw-usage.
function format(data) {
	const today = Array.isArray(data?.daily) ? data.daily[0] : undefined;
	if (!today) return null;
	const parts = [];
	const requests = num(today.requests);
	if (requests !== undefined) parts.push(`↗${requests}`);
	const kwh = num(today.energy_kwh);
	if (kwh !== undefined) parts.push(`⚡${Math.round(kwh * 1000)}Wh`);
	return parts.length ? `neuralwatt ${parts.join(" ")}` : null;
}

async function apiKey(pi) {
	const tokenResult = await pi.exec("omp", ["token", PROVIDER], { timeout: 15_000 });
	return tokenResult.code === 0 ? tokenResult.stdout.trim() : "";
}

async function fetchUsage(pi) {
	const key = await apiKey(pi);
	if (!key) return null;
	const response = await fetch(`${BASE_URL}/usage/energy`, {
		headers: {
			Authorization: `Bearer ${key}`,
			Accept: "application/json",
		},
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) return null;
	return response.json();
}

export default function neuralwattUsage(pi) {
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
