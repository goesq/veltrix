# Tutorial: from an empty folder to a team of agents

This tutorial walks through Veltrix's projects area: the orchestrator, which plans goals and
hands tasks to agents, and the canvas, where agents run live next to notes and checklists.
It takes about ten minutes. The terminals need no tutorial: open one and type.

> The projects area is in beta. Agents edit files in your project, so try it on a folder
> under version control, where every change is easy to review and undo.

## Before you start

You need at least one agent CLI installed and signed in, the same way you would use it in a
terminal:

| CLI          | Install                                      |
| ------------ | -------------------------------------------- |
| Claude Code  | `npm install -g @anthropic-ai/claude-code`   |
| Codex CLI    | `npm install -g @openai/codex`               |
| Gemini CLI   | `npm install -g @google/gemini-cli`          |

Cursor, GitHub Copilot, Qwen Code, OpenCode and Aider work too. **Settings → Agents** shows
which ones Veltrix found on your PATH.

The orchestrator also needs a **planner**, the model that turns a goal into a plan. By default
it is the Claude Code CLI, on your own subscription. To use another CLI, or an API such as
Anthropic, OpenAI, Gemini, OpenRouter or a local Ollama, go to **Settings → Orchestrator**
and press **Test connection** to check it can be reached.

## 1. Create a project

Press `⌘O` (macOS) or `Ctrl+Shift+O` (Windows), or **+** next to **Projects** in the
sidebar, and pick the folder of the code you want to work on. The project opens right away;
**⋯ → Edit project** gives it another name, an icon and a color.

A project has four tabs:

- **Orchestrator**: where you send goals and follow their tasks.
- **Agents**: the agents of the project, their roles and the CLI each one runs.
- **Context**: what every agent reads before working (conventions, stack, constraints).
- **Canvas**: the live board, covered from step 5 on.

The right half of the Orchestrator, Agents and Context tabs is a terminal in the project
folder, for anything you want to run yourself.

## 2. Write the context

Open **Context** and describe the project the way you would to a new teammate: the stack,
how to run and test it, conventions, and what not to touch. Agents read it before every task
and append what they learn under "Notes from agents".

By default it lives in `.veltrix/CONTEXT.md`. You can point it at the project's own
`CLAUDE.md` or any other file instead, or give each agent a context of its own.

## 3. Send a goal, and let the orchestrator build the team

You don't need to create agents first. In **Orchestrator**, describe what you want, and
say which agents you want if you have a preference:

```text
Create a backend agent and a frontend agent, then add a login page with email and
password, a POST /login route that checks the password with bcrypt, and tests for both.
```

Press `⌘Enter` / `Ctrl+Enter`. The orchestrator:

1. **Builds the team.** It reuses the project's agents whose roles fit, and adds the ones
   that are missing, each with a name, a role and one of your installed CLIs. They show up
   under "Agents created", in the **Agents** tab and on the canvas.
2. **Splits the goal into tasks**, assigns each one to an agent, and decides which tasks
   depend on others.
3. **Runs them.** Tasks whose dependencies are done start right away. Each agent works on
   one task at a time; different agents work in parallel.
4. **Ticks them off.** The goal shows its tasks as a checklist with a progress bar. A task
   is ticked as soon as its agent finishes; a running task shows a spinner. Expand a task to
   watch its agent's output live.

If a task fails, the tasks that depend on it wait. Fix what went wrong (often the context
was missing something) and press **Try again** on the task. **Clear finished** removes goals
that are done.

Asking only for agents works too: "set up a designer and a reviewer" adds them and plans no
tasks. Edit them any time in the **Agents** tab, where the role is what the orchestrator
reads when it decides who gets which task.

## 4. Where things are on disk

Everything the orchestrator and the canvas write goes into `.veltrix/` in the project:

```text
.veltrix/
  CONTEXT.md          shared context (unless you chose another file)
  agents/<id>.md      per-agent context, when the project uses it
  tasks/<id>.md       the brief each task's agent reads
  logs/<id>.log       the full output of each task run
  live/<id>.md        the brief each live agent on the canvas reads
  notes/<id>.md       canvas notes and checklists
```

Add `.veltrix/` to `.gitignore` if you don't want to version it, or commit `CONTEXT.md` and
`notes/` to share them with your team.

## 5. The canvas

Open the **Canvas** tab. Where the orchestrator runs agents in the background, one task at
a time, the canvas runs them **live**: each agent is its own interactive session that you
talk to directly, and that can talk to the others.

The bar at the top holds the tools. Press a tool's key while you aren't typing:

| Tool       | Key | What it does                                                     |
| ---------- | --- | ---------------------------------------------------------------- |
| Select     | `V` | Click to select, drag on empty space to select several           |
| Pan        | `H` | Drag to move around                                              |
| Agent      | `T` | Put one of the project's agents here, or create one with a CLI   |
| Note       | `N` | Click where the note goes                                        |
| Checklist  | `C` | A note that starts as a checklist                                |
| Text       | `L` | A label, to title an area or jot an idea down                    |
| Portal     | `P` | A web page agents can drive                                      |

Move between nodes with `]` and `[`, jump to the next agent waiting for you with `W`, and
press `Enter` to enlarge the selected node.

To move around with any tool, scroll (or swipe on a trackpad), hold `Space` and drag, or
drag with the middle mouse button. Pinch, or hold `Ctrl` / `⌘` and scroll, to zoom.
`Delete` removes the selected notes, labels and lines; the **×** on an agent takes it off the
canvas (the agent stays in the project).

Made a mistake? `Ctrl` / `⌘` + `Z` undoes any change on the canvas, including a deleted note:
its file waits in `.veltrix/notes/.trash/` and comes back. `Ctrl` / `⌘` + `Shift` + `Z` redoes.
Select a few items (`Ctrl` / `⌘` + click, or drag a box around them) and the bar offers to
duplicate them (`Ctrl` / `⌘` + `D`), arrange them in a grid, align them or space them evenly,
or remove them.

### Agents

Press `T` and choose **New Claude Code agent** (or any installed CLI): a new agent appears in
the middle of the screen and starts right away. Make as many as you like, one per
conversation you want to keep going. Agents already in the project are listed in the same
menu.

Each agent's header has:

- **Ask / Accept edits**: whether the session asks before editing files. Change it while the
  agent is stopped.
- **▶ / ■**: start or stop the session.
- **Enlarge**: opens the agent in a large panel, the best way to work with it. Double-clicking
  the header does the same; `Esc` or clicking outside puts it back.
- **Crown**: makes the agent a manager (see below). Change it while the agent is stopped.

When an agent goes quiet after printing something since you last typed to it (a question, a
permission prompt, a finished result), its header says **Waiting for you** in amber, and the
Canvas tab shows how many agents are waiting.

When a session starts, the agent reads a short brief: who it is, its role, the project
context, and how to reach the other agents and notes.

### Connect agents so they talk

Drag from the dot on the side of one agent to another. The arrow says who may message whom:
from A to B means A can send B a message. Draw a second line for B to answer.

An agent sends a message from its shell with `veltrix-send <agent> "message"`; you can simply
ask it, for example: *"ask the reviewer to check the changes in src/auth"*. The message is
typed into the other agent's session, and the line glows while it is used. Messages also
show in the **Messages** panel at the top right.

Click a line to pause it. A line that carries more than eight messages in a minute pauses
itself, so two agents can't keep each other busy forever.

### Managers build their own team

Turn on the crown of an agent and start it: it is now a manager, and its brief teaches it two
more commands.

```text
veltrix-send --recruit designer "Interface and CSS" --tool claude
veltrix-send --dismiss designer
```

A recruit appears below its manager, linked both ways, and starts at once (with the manager's
own CLI unless `--tool` picks another installed one). The manager then sends it a task with
`veltrix-send`, and the recruit reports back when done. Only the manager that recruited an
agent can dismiss it, and a manager leads at most six.

You don't type these commands: ask the manager in plain words.

```text
You lead this feature. Recruit a backend and a frontend agent, split the login sprint
checklist between them, and dismiss them when every item is ticked.
```

### Browser portals

Press `P` and click to add a portal: a web page on the canvas, with an address bar, back,
forward and reload. Link an agent to it and the agent can drive the page from its terminal:

```text
veltrix-send --browser open localhost:3000
veltrix-send --browser read           # the text, plus numbered links, buttons and fields
veltrix-send --browser type 2 "hello"  # into field 2; end with \n to press Enter
veltrix-send --browser click "Sign in"
veltrix-send --browser screenshot     # saves a PNG the agent can open
```

Ask in plain words, for example: *"open the app in the portal, sign up with a test user and
tell me what breaks"*. Portals are isolated from the app and only load web pages; agents are
told never to type passwords or payment details.

### Agents in their own workspace

Two agents editing the same files at the same time step on each other. In the **Agents** tab,
edit an agent and turn on **Own workspace (git worktree)**: it gets a branch of its own
(`veltrix/<name>`) and a separate copy of the project, and from then on works there, live and
in orchestrator tasks. Its node shows the branch. Review and merge its branch like any other.
Turning it off removes the copy (refused while it has uncommitted changes); the branch stays.

### Notes and brainstorming

Press `N` and click somewhere to add a note. Write in markdown: headings, lists, tables,
`code`, **bold**, links. Double-click the text (or press the pencil) to edit; click outside to see
it formatted. The title comes from the first line unless you rename the note.

Notes are made for thinking out loud on the canvas: spread ideas around, color them (click
the dot in the header), title areas with text labels (`L`), and enlarge a note to write in
comfort.

Every note is a real file in `.veltrix/notes/`. Link an agent to a note (drag a line between
them) and the agent reads and edits that file. A running agent is told about the note as soon
as you draw the line. Some ways to use this:

- **Shared memory**: link several agents to one note, so decisions and findings live in one
  place they all read.
- **Specs**: lock a note (**⋯ → Lock**) to make it read-only, on disk too. Agents follow it
  but can't change it.
- **Chains**: link notes to each other. An agent linked to the first note reaches every note
  in the chain, so one link gives it a whole tree of context.

### Checklists that agents tick off

Press `C` for a checklist, or write `- [ ] item` lines in any note. Add items in the field
under the list, and click a box to tick it yourself.

Link an agent to the checklist and ask it to work through it:

```text
Work through the "Login" checklist. Tick each item off as soon as it is done.
```

The agent changes `- [ ]` to `- [x]` in the file as it finishes each item, and the note
updates on screen as it happens, with a `done/total` count in its header. Link two agents to
the same checklist and they split the work between them.

## 6. Recipes

**Builder and reviewer.** Create two agents, draw lines both ways, and link both to a locked
spec note. Ask the builder to implement the spec and send its changes to the reviewer; the
reviewer answers with what to fix.

**Brainstorm board.** Put down a text label with the question, a few colored notes with
ideas, and one agent linked to all of them. Ask the agent to read the notes, group the ideas
into a new note and turn the chosen ones into a checklist.

**A lead and its team.** Create one agent, crown it, link it to a checklist and ask it to
recruit whoever the work needs. Watch the team appear under it, the messages go back and
forth, and the checklist fill up.

**Plan with the orchestrator, follow on the canvas.** Send a goal from the Orchestrator tab.
The agents it creates appear on the canvas, ready to start, if you'd rather continue the
work live with them.

## Troubleshooting

- **"command not found" when an agent starts**: install the CLI and sign in to it in a
  terminal. On macOS, Veltrix reads your PATH from your login shell, so CLIs installed with
  Homebrew or npm are found even when the app is opened from the Dock; restart Veltrix after
  installing one.
- **The planner fails**: open **Settings → Orchestrator** and press **Test connection**. API engines need
  a key; CLI engines need you signed in.
- **A note doesn't change when an agent edits it**: the canvas must be open for edits to show
  live; reopen the Canvas tab to reload every note. Make sure the agent edited the file under
  `.veltrix/notes/` that `veltrix-send --peers` lists, not a copy.
- **An agent ignores messages**: check the line points from the sender to the receiver, isn't
  paused (dashed), and that the receiver is running.
