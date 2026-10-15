import type { Messages } from './pt-BR'

/** English (United States) strings. */
export const enUS: Messages = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Remove',
    edit: 'Edit',
    clear: 'Clear',
    choose: 'Choose…',
    close: 'Close',
    dismiss: 'Dismiss',
    resize: 'Drag to resize · double-click to reset',
  },

  titleBar: {
    search: 'Search commands, terminals and projects…',
  },

  sidebar: {
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    settings: 'Settings',
  },

  terminals: {
    section: 'Terminals',
    newTerminal: 'New terminal',
    limit: (max) => `Limit of ${max} terminals`,
    limitReached: (max) => `You can have at most ${max} terminals open.`,
    showOne: 'Show one terminal',
    showGrid: 'Show all in a grid',
    none: 'No terminals.',
    renameHint: 'Double-click to rename',
    rename: 'Rename',
    close: 'Close terminal',
    options: 'Terminal options',
    otherShell: 'Open with another shell',
    defaultShell: 'default',
    emptyTitle: 'No terminals open',
    emptyDescription: (max) =>
      `Open up to ${max} terminals and switch between them from the sidebar or with shortcuts.`,
    maximize: 'Maximize',
    exited: (code) => `Process exited (code ${code})`,
  },

  projects: {
    section: 'Projects',
    add: 'Add project',
    none: 'No projects yet.',
    emptyTitle: 'No projects',
    emptyDescription:
      'A project is a folder where AI agents work together. You send a goal to the orchestrator, which splits it into tasks and hands them out to the agents, sharing the context.',
    agentCount: (count) => (count === 1 ? '1 agent' : `${count} agents`),
    runningCount: (count) => (count === 1 ? '1 task running' : `${count} tasks running`),
    options: 'Project options',
    edit: 'Edit project',
    remove: 'Remove project',
    tabs: {
      orchestrator: 'Orchestrator',
      agents: (count) => `Agents (${count})`,
      context: 'Context',
    },
    clearFinished: 'Clear finished',
    restartTerminal: 'Restart',
    openingTerminal: 'Opening terminal…',
  },

  projectDialogs: {
    editTitle: 'Edit project',
    name: 'Name',
    folder: 'Folder',
    folderHint: "The agents and the project's terminal will work in the new folder.",
    folderBusy: 'Wait for the running tasks to finish to change the folder.',
    removeTitle: 'Remove project',
    removeQuestion: (name) =>
      `Remove "${name}" from Veltrix? The folder and its files stay on disk; only the project leaves the list.`,
    removeBusy: 'Wait for the running tasks to finish to remove it.',
  },

  orchestrator: {
    placeholder:
      'Describe the goal. The orchestrator splits it into tasks and hands them out to the agents.',
    needsAgent: 'Add at least one agent to get started.',
    send: 'Send',
    planning: 'Planning…',
    planningGoal: 'The orchestrator is splitting the goal into tasks…',
    cancelTask: 'Cancel task',
    retryTask: 'Try again',
    dependsOn: (titles) => `Depends on: ${titles}`,
  },

  taskStatus: {
    pending: 'Queued',
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
  },

  goalStatus: {
    planning: 'Planning',
    running: 'In progress',
    done: 'Done',
    failed: 'Failed',
  },

  agents: {
    title: 'Agents',
    add: 'Add agent',
    empty:
      'Connect agents to the orchestrator. Each one gets a role and runs the tasks the orchestrator hands out.',
    idle: 'Idle',
    newTitle: 'New agent',
    editTitle: 'Edit agent',
    name: 'Name',
    namePlaceholder: 'e.g. backend',
    role: 'Role',
    roleHint: 'The orchestrator uses this to decide which tasks go to this agent.',
    rolePlaceholder: 'e.g. Node.js API, database and integration tests',
    tool: 'Tool',
    command: 'Command',
    commandHint: 'Runs in the project folder. {prompt} receives the instruction.',
    color: 'Color',
  },

  providers: {
    claude: 'Runs `claude -p` in the project folder.',
    codex: 'Runs `codex exec` with a sandbox that can write to the project.',
    gemini: 'Runs `gemini -p`, approving edits only.',
    custom: 'Any headless CLI. Use {prompt} in the command.',
    customLabel: 'Custom command',
  },

  context: {
    introBefore: 'Context shared by every agent, saved in ',
    introAfter: '. Agents also write down what they learn here.',
    unsaved: 'Unsaved changes',
    saved: 'Saved',
  },

  palette: {
    newTerminalWith: (shell) => `New terminal: ${shell}`,
    terminalAt: (position) => `Terminal ${position}`,
    project: 'Project',
    nothingFound: 'Nothing found.',
  },

  actions: {
    groups: {
      general: 'General',
      terminals: 'Terminals',
      projects: 'Projects',
    },
    'palette.toggle': 'Open command palette',
    'view.terminals': 'Show terminals',
    'view.projects': 'Show projects',
    'view.toggleSidebar': 'Collapse / expand sidebar',
    'view.settings': 'Open settings',
    'terminal.new': 'New terminal',
    'terminal.close': 'Close terminal',
    'terminal.next': 'Next terminal',
    'terminal.previous': 'Previous terminal',
    'terminal.toggleLayout': 'Switch between one terminal and grid',
    'terminal.focus': (position) => `Go to terminal ${position}`,
    'project.add': 'Add project',
  },

  shortcuts: {
    instructions: 'Click a shortcut and press the new combination.',
    escCancels: 'cancels',
    backspaceRemoves: 'removes it',
    needsModifier:
      "Include Ctrl, Alt or ⌘ in the combination so it doesn't get in the way of typing.",
    inUse: (combo, action) => `${combo} is already used by "${action}".`,
    reset: 'Restore default',
    remove: 'Remove shortcut',
    recording: 'Press keys…',
    resetAll: 'Restore all defaults',
  },

  settings: {
    title: 'Settings',
    general: 'General',
    language: 'Language',
    languageAuto: 'Automatic (system language)',
    orchestrator: 'Orchestrator',
    orchestratorDescription:
      'The planner: it takes the goal, splits it into tasks and picks the agent for each one.',
    claudeCli: 'Uses your installed `claude` and its current login. No API key needed.',
    anthropicApi: 'Anthropic API',
    anthropicApiDescription:
      "Calls the API directly with your key, stored in the system's secure storage.",
    model: 'Model',
    apiKey: 'API key',
    apiKeySaved: 'A key is saved.',
    apiKeyMissing: 'No key saved.',
    terminal: 'Terminal',
    defaultShell: 'Default shell',
    defaultShellHint: 'Used by the + button and the new-terminal shortcut.',
    startFolder: 'Start folder',
    startFolderHint:
      'Where new terminals open. Restored terminals go back to the folder they were in.',
    homeFolder: 'Home folder',
    prompt: 'Veltrix prompt',
    promptHint:
      'Shows just the current folder and git branch, like ➜ veltrix git:(main). When off, the shell uses your own prompt.',
    banner: 'Banner on start',
    bannerHint:
      'Shows the Veltrix wordmark with the shell, folder and branch when a terminal opens.',
    terminalNote:
      'Applies to terminals opened after the change. Command Prompt (cmd) has no banner or branch.',
    fontSize: 'Font size',
    shortcuts: 'Shortcuts',
  },
}
