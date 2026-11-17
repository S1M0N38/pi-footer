# Contributing

## Development

Point pi at this checkout instead of pushing to GitHub for every edit. `/source` is not
built in — it comes from [pi-source](https://github.com/S1M0N38/pi-source):

```sh
pi install git:github.com/S1M0N38/pi-source
```

Then, in a session started in this repository:

```
/source local     # install this checkout, remove the git entry, reload
/source github    # back to the published clone
/source           # report what is installed now
```

Only one entry can exist: pi keys a git package by repository URL and a local package
by resolved absolute path, so both together load the extension twice.

<details>
<summary>Manual equivalent</summary>

```sh
pi remove git:github.com/S1M0N38/pi-footer
pi install ~/Code/github.com/S1M0N38/pi-footer
```

</details>

Then:

```sh
npm install         # typescript, @types/node, and the two peer packages
npm run typecheck   # tsc --noEmit
```

There is no test suite. `/reload` in a session re-applies the patch (the prototype guard
keeps it from wrapping twice); check the branch link in a repo with an `origin` remote, and
a repo without one for the plain-text fallback. Commit with conventional messages
(`feat:`, `fix:`, `docs:`, `chore:`).

## Notes

- The local entry in `settings.json` is relative to the agent dir: machine-local, never
  commit or copy it between machines.
- `pi -e ./pi-footer` skips the settings change for one run, but the git package must still
  be removed — same identity rule.
- The patch reaches into private `FooterComponent` fields (`footerData`, `session`) at
  runtime. Keep that access behind the `try/catch` and the optional-chaining guards in
  `src/index.ts`; a broken assumption must degrade to the built-in line, never throw from
  `render()`.
- `src/remote.ts` is pure string handling and safe to change without a session:
  `parseRemote()` decides whether a remote is linkable at all.
