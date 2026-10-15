# Contributing to Veltrix

Thanks for your interest in Veltrix. Bug reports, fixes, translations and new agent presets
are all welcome. This guide covers how to get the app running, how the code is organized and
what a pull request needs before it can be merged.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md). To report a
security issue, don't open a public issue: see [SECURITY.md](SECURITY.md).

## Before you start

- **Bugs**: search the [issues](https://github.com/goesq/veltrix/issues) first. If nothing
  matches, open one with the bug report template.
- **Small fixes** (typos, obvious bugs, missing translations): open a pull request directly.
- **New features and larger changes**: open an issue first so we can agree on the approach
  before you spend time on it. Veltrix aims to stay small and focused, and not every good idea
  fits.

## Setup

Requirements: Node.js 20+ and npm. Veltrix runs on macOS and Windows.

```bash
git clone https://github.com/goesq/veltrix.git
cd veltrix
npm install
npm run dev
```

`npm install` builds `node-pty`, a native module. If it fails, install your platform's build
tools: the Xcode Command Line Tools on macOS (`xcode-select --install`), or Visual Studio
Build Tools with the "Desktop development with C++" workload on Windows.

`npm run dev` starts the app with hot reload for the renderer and restarts Electron when the
main process or preload change.

To try the orchestrator you need at least one agent CLI (`claude`, `codex` or `gemini`)
installed and signed in. Use a throwaway folder as the project while you experiment: agents
are allowed to edit files in it.

## Checks

There is no test suite yet, so the type checker is the main safety net:

```bash
npm run typecheck
```

It checks the main and preload processes (`tsconfig.node.json`) and the renderer
(`tsconfig.web.json`). It must pass with no errors. `npm run build` runs it too, before
bundling.

Then try your change in the running app. If it touches shells, paths, keyboard shortcuts or
packaging, say in the pull request which platforms you tested on, since behavior differs
between macOS and Windows.

## Code style

Formatting follows [`.prettierrc`](.prettierrc) and [`.editorconfig`](.editorconfig):

- single quotes, no semicolons, trailing commas
- 100-character lines, 2-space indentation, LF line endings

Prettier isn't a project dependency, so run it with `npx` on the files you changed:

```bash
npx prettier --write src/path/to/changed-file.ts
```

Beyond formatting:

- Match the code around you: naming, structure and how much it comments.
- Comments explain why, not what. Exported functions and types get a short doc comment.
- Keep TypeScript strict. Avoid `any` and non-null assertions; model the data instead.
- Don't add a dependency for something a few lines of code can do. If one is needed, explain
  why in the pull request.
- User-facing text goes through the translation catalogs, never inline in components (see
  [Adding a language](#adding-a-language)).

## How the code is organized

The [architecture section of the README](README.md#architecture) has the full map. In short:

| Folder          | What lives there                                                           |
| --------------- | -------------------------------------------------------------------------- |
| `src/shared/`   | Types and the IPC contract (`ipc.ts`) shared by every process              |
| `src/main/`     | Electron main process: terminals, projects, the orchestrator, settings     |
| `src/preload/`  | The typed, minimal bridge exposed to the renderer as `window.veltrix`      |
| `src/renderer/` | The React UI, split into `features/`, `components/`, `stores/` and `i18n/` |

A few rules keep the boundaries clean:

- The renderer runs sandboxed with context isolation and no Node access. Anything that needs
  the file system, a process or the network goes in the main process and is exposed through
  the IPC contract in `src/shared/ipc.ts`, then the preload bridge.
- `src/main/ipc/` stays thin: it translates IPC calls into service calls and holds no logic
  of its own.
- Keep the preload bridge minimal. Expose specific operations, never generic ones like "run
  this command" or "read this path".

## Adding a language

Translations live in `src/renderer/src/i18n/`, one file per language. `pt-BR.ts` defines the
shape of `Messages`, and TypeScript fails the build if another catalog misses a key or adds
one that doesn't exist.

To add a language, for example French (France):

1. Copy `src/renderer/src/i18n/en-US.ts` to `fr-FR.ts`, rename the export (`frFR`) and
   translate every string. Keep the placeholders and function parameters as they are, and
   leave product names (Claude Code, Codex CLI, Gemini CLI) untranslated.
2. In `src/shared/i18n.ts`, add the tag to `LOCALES`, its name in its own language to
   `LOCALE_NAMES` (`'Français (France)'`), and a line in `resolveLocale` so "Automatic" picks it
   from the system language.
3. Register the catalog in `src/renderer/src/i18n/index.ts`.
4. Add the banner's few words to `TEXT` in `src/main/terminal/banner.ts`.
5. Update the [Languages section of the README](README.md#languages).

`npm run typecheck` points at anything still missing. Then switch to the language in
**Settings → General** and go through the app, including dialogs, empty states and error
messages, to check that nothing is cut off or reads awkwardly.

## Proposing a new agent preset

Presets are the agents offered out of the box (today Claude Code, Codex CLI and Gemini CLI).
Any other CLI already works through the "custom command" option, so a preset is worth adding
when a tool is widely used and its headless mode is stable.

Open a feature request first with:

- the CLI, a link to its documentation and how it's installed
- the exact headless command, with `{prompt}` where the instruction goes
- which flag limits it to editing files in the project, and what it can do without that flag
- whether it reads its instruction from an argument, and how it exits when the task fails

A preset has to run non-interactively in the project folder, take the instruction as an
argument and, by default, be allowed to edit files in the project and nothing more. Presets
that skip permission checks or run with full access won't be accepted; users who want that can
use a custom command.

Once agreed, the change touches:

1. `src/shared/types.ts`: add the id to `AgentProvider`.
2. `src/main/orchestrator/agents/agentCommand.ts`: add the command to `PROVIDER_COMMANDS`.
3. `src/renderer/src/features/projects/providers.ts`: add the id to `providerIds` and the
   product name to `productNames`.
4. Every catalog in `src/renderer/src/i18n/`: add the one-line description under `providers`.
5. The README: mention the agent and its default permissions.

## Pull requests

- Keep each pull request to one change. Split unrelated fixes and refactors into their own.
- Branch from `main` and keep the branch up to date with it.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/)
  style the history uses, in the imperative and lower case, for example
  `fix(terminal): keep the cursor visible after resize` or `docs: describe the banner`.
- Fill in the pull request template: what changed, why, and how you tested it. Link the issue
  it closes.
- Include a screenshot or short recording for visible UI changes.
- Add or update strings in every language catalog. If you can't translate one, use English and
  say so in the pull request.
- Update the README when behavior, shortcuts or settings change.
- Never commit secrets, API keys, personal paths or logs (`.veltrix/`, `out/`, `dist/` are
  ignored for this reason).

A maintainer will review as soon as possible. Expect some back and forth; it's about keeping
the code consistent, not about you.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE), like the rest of the project.
