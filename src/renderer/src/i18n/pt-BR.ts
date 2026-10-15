/**
 * Portuguese (Brazil) strings. This catalog defines the shape of `Messages`: every other
 * language must provide exactly the same keys, which the type checker enforces.
 */
export const ptBR = {
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    remove: 'Remover',
    edit: 'Editar',
    clear: 'Limpar',
    choose: 'Escolher…',
    close: 'Fechar',
    dismiss: 'Dispensar',
    resize: 'Arraste para redimensionar · clique duplo para restaurar',
  },

  titleBar: {
    search: 'Buscar comandos, terminais e projetos…',
  },

  sidebar: {
    collapse: 'Recolher barra lateral',
    expand: 'Expandir barra lateral',
    settings: 'Configurações',
  },

  terminals: {
    section: 'Terminais',
    newTerminal: 'Novo terminal',
    limit: (max: number) => `Limite de ${max} terminais`,
    limitReached: (max: number) => `Limite de ${max} terminais atingido.`,
    showOne: 'Mostrar um terminal',
    showGrid: 'Mostrar todos em grade',
    hideFromGrid: 'Ocultar da grade',
    showInGrid: 'Mostrar na grade',
    none: 'Nenhum terminal.',
    renameHint: 'Clique duas vezes para renomear',
    rename: 'Renomear',
    close: 'Fechar terminal',
    options: 'Opções do terminal',
    otherShell: 'Abrir com outro shell',
    defaultShell: 'padrão',
    emptyTitle: 'Nenhum terminal aberto',
    emptyDescription: (max: number) =>
      `Abra até ${max} terminais e alterne entre eles pela barra lateral ou pelos atalhos.`,
    maximize: 'Maximizar',
    dragToReorder: 'Arraste para trocar de lugar com outro terminal',
    exited: (code: number) => `Processo encerrado (código ${code})`,
  },

  projects: {
    section: 'Projetos',
    add: 'Adicionar projeto',
    none: 'Nenhum projeto ainda.',
    emptyTitle: 'Nenhum projeto',
    emptyDescription:
      'Um projeto é uma pasta onde agentes de IA trabalham juntos. Você envia o objetivo ao orquestrador, ele divide em tarefas e distribui entre os agentes, compartilhando o contexto.',
    agentCount: (count: number) => (count === 1 ? '1 agente' : `${count} agentes`),
    runningCount: (count: number) =>
      count === 1 ? '1 tarefa em execução' : `${count} tarefas em execução`,
    options: 'Opções do projeto',
    edit: 'Editar projeto',
    remove: 'Remover projeto',
    tabs: {
      orchestrator: 'Orquestrador',
      agents: (count: number) => `Agentes (${count})`,
      context: 'Contexto',
    },
    clearFinished: 'Limpar concluídos',
    restartTerminal: 'Reiniciar',
    openingTerminal: 'Abrindo terminal…',
  },

  projectDialogs: {
    editTitle: 'Editar projeto',
    name: 'Nome',
    folder: 'Pasta',
    folderHint: 'Os agentes e o terminal do projeto passam a trabalhar na pasta nova.',
    folderBusy: 'Aguarde as tarefas em execução terminarem para trocar a pasta.',
    removeTitle: 'Remover projeto',
    removeQuestion: (name: string) =>
      `Remover "${name}" do Veltrix? A pasta e os arquivos continuam no disco, só o projeto sai da lista.`,
    removeBusy: 'Aguarde as tarefas em execução terminarem para remover.',
  },

  orchestrator: {
    placeholder:
      'Descreva o objetivo. O orquestrador divide em tarefas e distribui entre os agentes.',
    needsAgent: 'Adicione pelo menos um agente para começar.',
    send: 'Enviar',
    planning: 'Planejando…',
    planningGoal: 'O orquestrador está dividindo o objetivo em tarefas…',
    cancelTask: 'Cancelar tarefa',
    retryTask: 'Tentar novamente',
    dependsOn: (titles: string) => `Depende de: ${titles}`,
  },

  taskStatus: {
    pending: 'Na fila',
    running: 'Executando',
    done: 'Concluída',
    failed: 'Falhou',
    blocked: 'Bloqueada',
    cancelled: 'Cancelada',
  },

  goalStatus: {
    planning: 'Planejando',
    running: 'Em andamento',
    done: 'Concluído',
    failed: 'Com falhas',
  },

  agents: {
    title: 'Agentes',
    add: 'Adicionar agente',
    empty:
      'Conecte agentes ao orquestrador. Cada um recebe um papel e executa as tarefas que o orquestrador distribuir.',
    idle: 'Ocioso',
    newTitle: 'Novo agente',
    editTitle: 'Editar agente',
    name: 'Nome',
    namePlaceholder: 'ex.: backend',
    role: 'Papel',
    roleHint: 'O orquestrador usa isso para decidir quais tarefas vão para este agente.',
    rolePlaceholder: 'ex.: API em Node.js, banco de dados e testes de integração',
    tool: 'Ferramenta',
    command: 'Comando',
    commandHint: 'Executado no diretório do projeto. {prompt} recebe a instrução.',
    color: 'Cor',
  },

  providers: {
    claude: 'Executa `claude -p` no diretório do projeto.',
    codex: 'Executa `codex exec` com sandbox de escrita no projeto.',
    gemini: 'Executa `gemini -p` aprovando apenas edições.',
    custom: 'Qualquer CLI headless. Use {prompt} no comando.',
    customLabel: 'Comando próprio',
  },

  context: {
    introBefore: 'Contexto compartilhado entre todos os agentes, salvo em ',
    introAfter: '. Os agentes também anotam aqui o que aprendem.',
    unsaved: 'Alterações não salvas',
    saved: 'Salvo',
  },

  palette: {
    newTerminalWith: (shell: string) => `Novo terminal: ${shell}`,
    terminalAt: (position: number) => `Terminal ${position}`,
    project: 'Projeto',
    nothingFound: 'Nada encontrado.',
  },

  actions: {
    groups: {
      general: 'Geral',
      terminals: 'Terminais',
      projects: 'Projetos',
    },
    'palette.toggle': 'Abrir paleta de comandos',
    'view.terminals': 'Mostrar terminais',
    'view.projects': 'Mostrar projetos',
    'view.toggleSidebar': 'Recolher / expandir barra lateral',
    'view.settings': 'Abrir configurações',
    'terminal.new': 'Novo terminal',
    'terminal.close': 'Fechar terminal',
    'terminal.next': 'Próximo terminal',
    'terminal.previous': 'Terminal anterior',
    'terminal.toggleLayout': 'Alternar entre um terminal e grade',
    'terminal.focus': (position: number) => `Ir para o terminal ${position}`,
    'project.add': 'Adicionar projeto',
  },

  shortcuts: {
    instructions: 'Clique num atalho e pressione a nova combinação.',
    escCancels: 'cancela',
    backspaceRemoves: 'remove',
    needsModifier: 'Inclua Ctrl, Alt ou ⌘ na combinação para não atrapalhar a digitação.',
    inUse: (combo: string, action: string) => `${combo} já é usado por "${action}".`,
    reset: 'Restaurar padrão',
    remove: 'Remover atalho',
    recording: 'Pressione…',
    resetAll: 'Restaurar todos os padrões',
  },

  settings: {
    title: 'Configurações',
    general: 'Geral',
    language: 'Idioma',
    languageAuto: 'Automático (idioma do sistema)',
    orchestrator: 'Orquestrador',
    orchestratorDescription:
      'Quem planeja: recebe o objetivo, divide em tarefas e escolhe o agente de cada uma.',
    claudeCli: 'Usa o `claude` instalado e o seu login atual. Não precisa de chave de API.',
    anthropicApi: 'API da Anthropic',
    anthropicApiDescription:
      'Chama a API diretamente com a sua chave, guardada no cofre do sistema.',
    model: 'Modelo',
    apiKey: 'Chave de API',
    apiKeySaved: 'Uma chave está salva.',
    apiKeyMissing: 'Nenhuma chave salva.',
    terminal: 'Terminal',
    defaultShell: 'Shell padrão',
    defaultShellHint: 'Usado pelo botão + e pelo atalho de novo terminal.',
    startFolder: 'Pasta inicial',
    startFolderHint:
      'Onde os terminais novos abrem. Terminais restaurados voltam para a pasta em que estavam.',
    homeFolder: 'Pasta do usuário',
    prompt: 'Prompt do Veltrix',
    promptHint:
      'Mostra só a pasta atual e o branch do git, como ➜ veltrix git:(main). Desligado, o shell usa o seu próprio prompt.',
    banner: 'Banner ao abrir',
    bannerHint: 'Mostra o letreiro do Veltrix com shell, pasta e branch quando um terminal abre.',
    terminalNote:
      'Valem para os terminais abertos depois da mudança. O Prompt de comando (cmd) não tem banner nem branch.',
    fontSize: 'Tamanho da fonte',
    shortcuts: 'Atalhos',
  },
}

export type Messages = typeof ptBR
