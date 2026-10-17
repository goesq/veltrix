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
- **Projects**: point Veltrix at a folder and send goals to an **orchestrator**. It assembles
  the team of AI coding agents the goal needs (Claude Code, Codex CLI, Gemini CLI and more, or
  any headless CLI), splits the goal into tasks, routes them to the right agent, runs
  independent tasks in parallel and ticks each one off as it finishes.
- **Canvas**: an infinite board per project with live agents, markdown notes, checklists and
  labels. Link agents so they message each other, and link them to notes so they read them
  and tick checklist items off as they work. Good for brainstorming, too.

New here? The [tutorial](docs/tutorial.md) walks through all of it, step by step.

**[▶ Watch the one-minute demo](docs/media/veltrix-demo.mp4)**: the orchestrator assembles a
team from a single prompt, then two agents work live on the canvas, message each other and
tick a shared checklist off.

  

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

1. You describe a goal in a project. A project with no agents is fine: ask for the team you
   want ("create a frontend and a backend agent and build the login") or let the planner
   decide.
2. The **planner** (Claude Code CLI by default; any CLI or API in **Settings → Orchestrator**)
   returns a plan: the agents to add, if any, then the tasks, the agent for each one and the
   dependencies between them. New agents get a name, a role and an installed CLI, and are
   placed on the project's canvas.
3. Tasks whose dependencies are done start right away. Each agent runs one task at a time;
   different agents run in parallel. The goal shows its tasks as a checklist that ticks
   itself off, with a progress bar.
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

## The canvas

Each project has a canvas (the **Canvas** tab) where agents run live, in their own
interactive terminal, next to notes, checklists and labels. Pick a tool in the bar at the
top, or press its key while nothing is being typed:

| Tool                           | Key   |
| ------------------------------ | ----- |
| Select (drag to select several) | `V`  |
| Pan                            | `H`   |
| Agent: add one, or create one with an installed CLI | `T` |
| Note                           | `N`   |
| Checklist                      | `C`   |
| Text label                     | `L`   |
| Browser portal                 | `P`   |
| Next / previous node           | `]` `[` |
| Next agent waiting for you     | `W`   |
| Enlarge the selected node      | `Enter` |

Hold `Space` or use the middle mouse button to pan with any tool, scroll to move around and
pinch (or `Ctrl`/`⌘` + scroll) to zoom. Double-click a node's header to enlarge it into a
panel; `Esc` puts it back. `Delete` removes the selected notes, labels and lines,
`Ctrl`/`⌘` + `Z` undoes (deleted notes come back from `.veltrix/notes/.trash/`), `Ctrl`/`⌘` +
`Shift` + `Z` redoes and `Ctrl`/`⌘` + `D` duplicates. With several items selected, the bar
also arranges them in a grid, aligns them or spaces them evenly.

- **Manager agents** (the crown in an agent's header) assemble their own team: from its
  terminal, a manager runs `veltrix-send --recruit <name> "<role>"` and the new agent appears
  below it, linked both ways, and starts at once; `--dismiss <name>` removes it when its work
  is done.
- **Browser portals** (`P`) put a web page on the canvas. An agent linked to one drives it
  from its terminal: `veltrix-send --browser open <url>`, `read` (the page's text with its
  links, buttons and fields numbered), `click`, `type`, `screenshot` and `back`. Portals run
  isolated from the app (no Node, no preload, their own session) and only load web pages.
- **Own workspace**: in an agent's settings, "Own workspace (git worktree)" gives it a branch
  (`veltrix/<name>`) and a separate copy of the project to work in, so agents running at the
  same time never touch the same files. Turning it off removes the copy, never with
  uncommitted changes in it; the branch stays.
- **Agents waiting for you** (quiet after printing something since you last typed to them)
  get an amber "Waiting for you" in their header, and the Canvas tab counts them.
- **Lines between agents** let the first one message the second with `veltrix-send`. Click a
  line to pause it; a line that carries too many messages in a minute pauses itself.
- **Notes** are markdown files in `.veltrix/notes/`. Link an agent to a note (drag from one
  to the other) and it reads and edits that file; notes linked to each other form a chain
  the agent can follow. A running agent is told about a note the moment you link it. Locked
  notes are read-only on disk, so they work as specs.
- **Checklists** are notes with `- [ ]` items. Agents tick items off (`- [x]`) as they finish
  them, and the note updates on screen as it happens. Notes render headings, lists, tables,
  code and links.

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
    orchestrator/   Planning (including the agents a plan adds), task graph, agent runs
    live/           Live agent sessions on the canvas and the veltrix-send channel
    canvas/         Canvas saves, note files and the watcher that picks up agents' edits
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
