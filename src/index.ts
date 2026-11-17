/**
 * Clickable git branch in the built-in footer.
 *
 * The extension does not replace the footer: it wraps FooterComponent.prototype.render,
 * calls the original, and rewrites `(branch)` in the first line into an OSC 8 link. Every
 * other part of the footer — token stats, context usage, extension statuses, truncation —
 * keeps rendering exactly as pi built it, including future changes.
 */

import { FooterComponent, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getCapabilities, hyperlink } from "@earendil-works/pi-tui";
import { branchUrl } from "./remote.ts";

const REMOTE_TIMEOUT_MS = 5000;

/** Global symbol so a re-evaluated module cannot wrap the footer twice. */
const PATCH = Symbol.for("pi-footer.patch");

/** `git remote get-url origin`, resolved per working directory on session start. */
const origins = new Map<string, string | undefined>();
const resolving = new Set<string>();

/** Only the internals this extension reads. All of them are private to FooterComponent. */
interface FooterInternals {
	footerData?: { getGitBranch?: () => string | null };
	session?: { sessionManager?: { getCwd?: () => string } };
	render(width: number): string[];
}

type PatchedPrototype = FooterInternals & { [PATCH]?: true };

export default function (pi: ExtensionAPI): void {
	patchFooter();

	pi.on("session_start", async (_event, ctx) => {
		await resolveOrigin(pi, ctx.cwd);
	});
}

/**
 * Replace the built-in footer's first line with a link around the branch name.
 * A no-op unless the footer actually drew a branch and the host is recognized.
 */
function linkBranch(lines: string[], footer: FooterInternals): void {
	if (!getCapabilities().hyperlinks || lines.length === 0) return;

	const branch = footer.footerData?.getGitBranch?.();
	const cwd = footer.session?.sessionManager?.getCwd?.();
	if (!branch || branch === "detached" || !cwd) return;

	const origin = origins.get(cwd);
	if (!origin) return;

	const url = branchUrl(origin, branch);
	if (!url) return;

	// The line is `~... (branch)` or `~... (branch) • session name`. lastIndexOf keeps the
	// match on the branch when the path itself contains `(branch)`, and finds nothing when
	// the line was truncated before the closing parenthesis.
	const label = `(${branch})`;
	const index = lines[0].lastIndexOf(label);
	if (index === -1) return;

	lines[0] = `${lines[0].slice(0, index)}(${hyperlink(branch, url)})${lines[0].slice(index + label.length)}`;
}

function patchFooter(): void {
	const prototype = FooterComponent.prototype as unknown as PatchedPrototype;
	if (prototype[PATCH]) return;

	const original = prototype.render;
	prototype.render = function (width: number): string[] {
		const lines = original.call(this, width);
		try {
			linkBranch(lines, this);
		} catch {
			// Private footer internals moved; keep the untouched built-in line.
		}
		return lines;
	};

	prototype[PATCH] = true;
}

/** Re-read the origin once per session, so `git remote set-url` is picked up without a restart. */
async function resolveOrigin(pi: ExtensionAPI, cwd: string): Promise<void> {
	if (resolving.has(cwd)) return;

	resolving.add(cwd);
	try {
		const result = await pi.exec("git", ["remote", "get-url", "origin"], {
			cwd,
			timeout: REMOTE_TIMEOUT_MS,
		});
		if (result.code === 0) {
			origins.set(cwd, result.stdout.trim() || undefined);
		} else {
			origins.delete(cwd);
		}
	} catch {
		origins.delete(cwd);
	} finally {
		resolving.delete(cwd);
	}
}
