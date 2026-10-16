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
    hideFromGrid: 'Hide from the grid',
    showInGrid: 'Show in the grid',
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
    dragToReorder: 'Drag to change places with another terminal',
    exited: (code) => `Process exited (code ${code})`,
  },

  projects: {
    section: 'Projects',
    beta: 'Beta',
    betaHint: 'In development: it may change and still have bugs.',
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
      canvas: 'Canvas',
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
    icon: 'Icon',
    color: 'Color',
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
    claude: 'Runs `claude -p` in the project folder, approving file edits only.',
    codex: 'Runs `codex exec` with a sandbox that can only write to the project.',
    gemini: 'Runs `gemini -p`, approving file edits only.',
    cursor: 'Runs `cursor-agent -p --force`, which can edit the project files.',
    copilot: 'Runs `copilot -p` with only the write tool allowed.',
    qwen: 'Runs `qwen -p`, approving file edits only.',
    opencode: 'Runs `opencode run` with the permissions set in OpenCode.',
    aider: 'Runs `aider --message`, without automatic commits.',
    custom: 'Any headless CLI. Use {prompt} in the command.',
    customLabel: 'Custom command',
  },

  canvas: {
    addAgent: 'Add agent',
    allOnCanvas: 'Every agent is already on the canvas.',
    edgeHint:
      'Drag from the right of one agent to another so it can send messages. Click a line to pause it; Delete removes it.',
    emptyTitle: 'Empty canvas',
    emptyDescription:
      'Add agents and connect them with lines. Each one runs live and can message the agents it is connected to.',
    noAgents: 'Create agents in the Agents tab to place them here.',
    start: 'Start',
    stop: 'Stop',
    stopped: 'Session stopped. When started, the agent reads its instructions and waits.',
    removeFromCanvas: 'Remove from canvas',
    focusHint: 'Double-click to view at 100%',
    permission: 'Session permissions',
    permissionLocked: 'Stop the session to change its permissions',
    permissionAsk: 'Ask',
    permissionAcceptEdits: 'Accept edits',
    messages: 'Messages',
    noMessages: 'No messages yet.',
  },

  context: {
    scope: 'Who reads the context',
    scopeShared: 'One for the whole project',
    scopeSharedHint: 'Every agent and the orchestrator read the same file.',
    scopePerAgent: 'One per agent',
    scopePerAgentHint:
      'Each agent reads only its own file; the orchestrator reads them all to plan.',
    source: 'File',
    sourceVeltrix: 'Veltrix context',
    sourceClaudeMd: "Project's CLAUDE.md",
    sourceFile: 'Another file',
    chooseFile: 'Choose file…',
    changeFile: 'Change file',
    agentFile: (name) => `File for ${name}`,
    noAgents: 'Add agents to the project to give each one its own context.',
    notesHint: 'Agents also write down what they learn in the file.',
    missingFile: "This file doesn't exist yet; saving creates it.",
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
    sections: {
      general: 'General',
      orchestrator: 'Orchestrator',
      apiKeys: 'API keys',
      agents: 'Agents',
      terminal: 'Terminal',
      shortcuts: 'Shortcuts',
    },
    groups: {
      app: 'App',
      ai: 'Artificial intelligence',
      workspace: 'Workspace',
    },

    generalDescription: 'App preferences.',
    language: 'Language',
    languageAuto: 'Automatic (system language)',

    orchestratorDescription:
      'The orchestrator is the planner: it takes the goal, splits it into tasks and picks the agent for each one. Choose which AI plays that part.',
    engineGroups: {
      cli: 'Subscription via CLI',
      cloud: 'Cloud API',
      local: 'Local or self-hosted',
    },
    engineGroupHints: {
      cli: 'Uses the installed CLI and the login you already have there. No key needed.',
      cloud: "Calls the provider's API with your key. Billed by usage on the provider's account.",
      local: 'Models running on this machine or on a server compatible with the OpenAI API.',
    },
    openAiCompatible: 'OpenAI-compatible',
    inUse: 'In use',
    installed: 'Installed',
    notInstalled: 'Not found',
    keySaved: 'Key saved',
    keyMissing: 'No key',
    engineSetup: (name) => `Set up ${name}`,
    model: 'Model',
    modelCliHint: "Leave empty to use the CLI's own default model.",
    modelDefault: (model) => `Leave empty to use ${model}.`,
    baseUrl: 'API address',
    baseUrlHint: 'Base URL up to the version, without /chat/completions.',
    installHint: (binary) =>
      `"${binary}" was not found on PATH. Install the CLI and sign in to it once from a terminal.`,
    test: 'Test connection',
    testing: 'Testing…',
    testOk: 'Connected',

    apiKeysDescription:
      "AI provider keys, encrypted in the system's secure storage. They are only sent to the provider itself.",
    apiKey: 'API key',
    apiKeyOptional: 'API key (optional)',
    apiKeySaved: 'A key is saved.',
    apiKeyMissing: 'No key saved.',
    getKeyAt: (site) => `Create a key at ${site}.`,

    agentsDescription:
      'Agents carry out the tasks the orchestrator hands out. Each project picks its own; these are the tools available and the command Veltrix runs for each one.',
    agentsHowTo: 'To add an agent, open a project and use the Agents tab.',
    customToolHint:
      'Any other CLI that runs without interaction works too: pick "Custom command" when creating the agent.',
    refresh: 'Check again',

    terminalDescription: 'How terminals open and look.',
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

    shortcutsDescription: 'Keyboard shortcuts for each action.',
  },
}
