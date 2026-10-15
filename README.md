<p align="center">
  <img src="resources/logo.svg" width="280" alt="Veltrix" />
</p>

# Veltrix

A clean, multi-tab terminal with built-in AI agent orchestration, for macOS and Windows.

- **Terminals**: up to 10 terminals listed in a collapsible sidebar, shown one at a time or
  all together in a grid. Pick the shell per terminal (Windows PowerShell by default, Command
  Prompt, PowerShell 7, Git Bash, WSL distros; zsh, bash, fish on macOS). Terminals are named
  after their first command and reopen in the folder they were in; new ones start in the
  folder set in **Settings → Terminal** (your home folder by default).
- **Projects**: point Veltrix at a folder, connect AI coding agents (Claude Code, Codex CLI,
  Gemini CLI or any headless CLI), and send goals to an **orchestrator**. The orchestrator
  splits each goal into tasks, routes them to the right agent, runs independent tasks in
  parallel and passes results along to the tasks that depend on them.

  

<img width="1919" height="1034" alt="image" src="https://github.com/user-attachments/assets/b1225eae-2d8a-4b65-96f1-89cea50f9858" />




Built with Electron, React, Tailwind CSS, xterm.js and node-pty.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

To use agents, install the CLIs you want (`claude`, `codex`, `gemini`) and sign in to them
as you normally would. Veltrix runs them headlessly inside the project folder.

### Packaging

```bash
npm run dist:mac   # .dmg (run on macOS)
npm run dist:win   # NSIS installer (run on Windows)
```

Pushing a `v*` tag runs the Release workflow, which builds both installers on GitHub and
attaches them to that tag's release. Each build is launched with `--smoke-test` first, which
checks that the interface loads and the default shell runs in a terminal, and nothing is
attached if it fails. Run `Veltrix --smoke-test` yourself to check an installed copy.

The macOS build is signed ad hoc, not with a Developer ID, so macOS blocks it the first
time. After moving Veltrix to Applications, run `xattr -cr /Applications/Veltrix.app`, or
open it once from **System Settings → Privacy & Security → Open Anyway**.

## How orchestration works

1. You describe a goal in a project.
2. The **planner** (Claude Code CLI by default, or the Anthropic API with your own key)
   returns a plan: tasks, the agent for each one and the dependencies between them.
3. Tasks whose dependencies are done start right away. Each agent runs one task at a time;
   different agents run in parallel.
4. Each task gets a brief in `.veltrix/tasks/<id>.md` containing the goal, the task, and the
   results of the tasks it depends on. Agents also read and append to the shared
   `.veltrix/CONTEXT.md`, which you can edit from the app.
5. If a task fails, the tasks depending on it are blocked until you retry it.

Agent output is shown live in the app and saved to `.veltrix/logs/`. Add `.veltrix/` to the
project's `.gitignore` if you don't want to version it.

By default, agents may edit files in the project but are not given broader permissions:
Claude Code runs with `--permission-mode acceptEdits`, Codex with
`--sandbox workspace-write`, Gemini with `--approval-mode auto_edit`. Use a custom command
for anything else.

## Keyboard shortcuts

Every shortcut can be changed or removed in **Settings → Shortcuts**. Defaults:

| Action                      | macOS     | Windows          |
| --------------------------- | --------- | ---------------- |
| Command palette             | `⌘K`      | `Ctrl+K`         |
| New terminal                | `⌘T`      | `Ctrl+Shift+T`   |
| Close terminal              | `⌘W`      | `Ctrl+Shift+W`   |
| Next / previous terminal    | `⌘⇧]` `⌘⇧[` | `Ctrl+Tab` `Ctrl+Shift+Tab` |
| Go to terminal 1–9          | `⌘1`–`⌘9` | `Ctrl+1`–`Ctrl+9` |
| Toggle single / grid layout | `⌘⇧G`     | `Ctrl+Shift+G`   |
| Add project                 | `⌘O`      | `Ctrl+Shift+O`   |
| Show terminals / projects   | `⌘⇧1` `⌘⇧2` | `Ctrl+Shift+1` `Ctrl+Shift+2` |
| Settings                    | `⌘,`      | `Ctrl+,`         |
| Collapse / expand sidebar   | `⌘B`      | `Ctrl+Shift+B`   |

Shortcuts must include Ctrl, Alt or ⌘ (or be a function key) so they never swallow normal
typing. Keys that aren't bound always reach the shell. On Windows, `Ctrl+C` copies when text
is selected and `Ctrl+V` pastes.

## Working directory tracking

To reopen terminals where they were, each shell reports its working directory with the
standard OSC 7 sequence before every prompt (the same convention VS Code, Windows Terminal and
iTerm2 use). Veltrix adds this through a small startup snippet that loads your own
configuration first: PowerShell wraps your existing `prompt`, cmd sets `PROMPT`, bash uses an
init file and zsh a `ZDOTDIR` that sources your dotfiles. Fish, nushell and WSL shells work
normally but don't report their folder yet.

## Prompt and banner

The same snippet gives PowerShell, bash and zsh a compact prompt, `➜ folder git:(branch)`,
with the arrow turning red when the last command failed. The branch is read from `.git/HEAD`,
so the prompt never starts a git process. Each new terminal also opens with a "veltrix"
banner showing the shell, folder and branch; it moves the details below the wordmark, or
drops the wordmark, when the terminal is narrow. Both can be turned off in
**Settings → Terminal** to keep your own prompt (oh-my-posh, starship and the like). cmd gets
a colored prompt with the full path, and no banner.

The banner also redraws itself after `clear` (and Ctrl+L in bash and zsh), with the current
folder and branch.

## Languages

The interface is available in English (United States), the default, and Portuguese (Brazil).
Switch in **Settings → General**, where "Automatic" follows the system language instead. The
terminal banner follows the same choice.

Translations live in `src/renderer/src/i18n/`, one file per language. `pt-BR.ts` defines the
keys, and TypeScript fails the build if another language misses one. To add a language, see
[Adding a language](CONTRIBUTING.md#adding-a-language).

## Architecture

```
src/
  shared/     Types and the IPC contract shared by every process
  main/       Electron main process
    infra/          Persistence, shell resolution, ANSI handling
    terminal/       Interactive pty sessions (10-terminal limit is enforced here)
    projects/       Project storage and the per-project .veltrix workspace
    orchestrator/   Planning, task graph, agent runs
    settings/       Settings; the API key is encrypted with the OS keychain
    ipc/            Thin translation layer between IPC and the services
  preload/    Typed, minimal bridge exposed as window.veltrix
  renderer/   React UI (features/, components/, stores/, i18n/)
```

The renderer runs sandboxed with context isolation and no Node access; everything goes through
the typed bridge defined in `src/shared/ipc.ts`.

## Contributing

Bug reports, fixes, translations and new agent presets are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style and what a pull request needs, and
[SECURITY.md](SECURITY.md) to report a vulnerability privately. Everyone taking part follows
the [code of conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
