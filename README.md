# pi-footer

Minimal [pi](https://pi.dev) extension that makes the git branch in the built-in footer a
clickable link:

```
~/Code/github.com/S1M0N38/pi-footer (main)        ↑12k ↓3.4k R98k $0.412 8.2%/200k (auto)
                                  └ clickable
```

`main` opens `https://github.com/S1M0N38/pi-footer/tree/main`. Nothing else about the footer
changes: same layout, stats, colors, and `(auto)`/`(sub)` markers.

## Install

```bash
pi install git:github.com/S1M0N38/pi-footer
```

### Uninstall

```bash
pi remove git:github.com/S1M0N38/pi-footer
```

## Supported remotes

The link points at the branch page of the repository `origin` points to. The URL is derived
from the remote, so HTTPS, `ssh://`, and `git@host:owner/repo` forms all work:

| host | branch URL |
|---|---|
| `github.com` | `<base>/tree/<branch>` |
| `gitea.com` | `<base>/tree/<branch>` |
| `codeberg.org` | `<base>/tree/<branch>` |
| `forgejo.*` | `<base>/tree/<branch>` |
| `gitlab.com`, `gitlab.*` | `<base>/-/tree/<branch>` |
| anything else | no link, plain text |

No link is drawn when there is no `origin`, the HEAD is detached, or the branch was
truncated out of the line at a narrow width.

## How it works

pi exports `FooterComponent`, and extensions resolve `@earendil-works/pi-coding-agent` to pi's
own module instance, so this extension wraps `FooterComponent.prototype.render` instead of
replacing the footer:

1. call the original `render(width)`;
2. read the branch the footer just drew (`this.footerData.getGitBranch()`);
3. replace `(branch)` in the first line with `(` + `hyperlink(branch, url)` + `)`.

The link is injected after truncation and OSC 8 adds no visible width, so wrapping and
diffing are untouched. Injection happens only when the terminal advertises hyperlink support
(the same `getCapabilities().hyperlinks` check pi's markdown links use), and never inside an
already-rendered custom footer. `origin` is resolved once per session with
`git remote get-url origin`, never per frame.

## Limits

- **Silent breakage.** If a future pi changes the footer line from `pwd (branch)` or renames
  `footerData`, the link stops appearing rather than failing. That is the trade for not
  vendoring ~250 lines of footer logic.
- **`origin` only.** A checkout that pushes to `fork` and tracks `upstream` links to `fork`.
- **Not a public API.** `FooterComponent` is exported but not documented as an extension API.
- **Terminal gating.** Unknown terminals get plain text; set `PI_HYPERLINKS=1` to force links.

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [AGENTS.md](AGENTS.md)
