/**
 * Git remote → clickable branch URL.
 *
 * Only providers with a known branch path are understood. Anything else stays plain text,
 * so an unrecognized host is never linked to a URL that 404s.
 */

export interface RemoteTarget {
	/** Web base of the repository, without `.git` or a trailing slash. */
	base: string;
	/** Path segment the host uses between the repository and a branch name. */
	treePath: string;
}

const TREE_PATH = "/tree/";
const GITLAB_TREE_PATH = "/-/tree/";

function treePathFor(host: string): string | undefined {
	if (host === "gitlab.com" || host.startsWith("gitlab.")) return GITLAB_TREE_PATH;
	if (host === "github.com" || host === "gitea.com" || host === "codeberg.org" || host.startsWith("forgejo.")) {
		return TREE_PATH;
	}
	return undefined;
}

/**
 * Parse a remote URL in any of the forms `git remote get-url` prints:
 * `git@host:owner/repo.git`, `ssh://git@host/owner/repo.git`, `https://host/owner/repo.git`.
 */
export function parseRemote(remote: string): RemoteTarget | undefined {
	const value = remote.trim();
	if (!value) return undefined;

	let host: string;
	let path: string;

	const scpLike = /^(?:[^@/]+@)?([^:/]+):(?!\/)(.+)$/.exec(value);
	if (!value.includes("://") && scpLike) {
		host = scpLike[1] as string;
		path = scpLike[2] as string;
	} else {
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			return undefined;
		}
		if (!["ssh:", "git:", "http:", "https:"].includes(url.protocol)) return undefined;
		host = url.hostname;
		path = url.pathname.replace(/^\/+/, "");
	}

	const repository = path.replace(/\/+$/, "").replace(/\.git$/, "");
	const treePath = treePathFor(host.toLowerCase());
	if (!repository || !treePath) return undefined;

	return { base: `https://${host}/${repository}`, treePath };
}

/** URL for `branch` in the repository `remote` points at, or undefined when the host is unknown. */
export function branchUrl(remote: string, branch: string): string | undefined {
	const target = parseRemote(remote);
	if (!target) return undefined;

	const encoded = branch.split("/").map((segment) => encodeURIComponent(segment)).join("/");
	return `${target.base}${target.treePath}${encoded}`;
}
