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
    beta: 'Beta',
    betaHint: 'Em desenvolvimento: pode mudar e ainda ter falhas.',
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
      canvas: 'Canvas',
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
    icon: 'Ícone',
    color: 'Cor',
    removeTitle: 'Remover projeto',
    removeQuestion: (name: string) =>
      `Remover "${name}" do Veltrix? A pasta e os arquivos continuam no disco, só o projeto sai da lista.`,
    removeBusy: 'Aguarde as tarefas em execução terminarem para remover.',
  },

  orchestrator: {
    placeholder:
      'Descreva o objetivo. O orquestrador monta o time de agentes que faltar, divide em tarefas e distribui. Ex.: "crie um agente de frontend e um de backend e implemente o login".',
    send: 'Enviar',
    planning: 'Planejando…',
    planningGoal: 'O orquestrador está montando o time e dividindo o objetivo em tarefas…',
    createdAgents: 'Agentes criados:',
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
    worktree: 'Workspace próprio (git worktree)',
    worktreeHint:
      'Trabalha numa branch própria, numa cópia separada do projeto, para agentes rodando ao mesmo tempo nunca mexerem nos mesmos arquivos. Vale na hora.',
    worktreeWorking: 'Atualizando o worktree…',
    color: 'Cor',
  },

  providers: {
    claude: 'Executa `claude -p` na pasta do projeto, aprovando só edições de arquivo.',
    codex: 'Executa `codex exec` com sandbox que só escreve no projeto.',
    gemini: 'Executa `gemini -p`, aprovando só edições de arquivo.',
    cursor: 'Executa `cursor-agent -p --force`, que pode editar os arquivos do projeto.',
    copilot: 'Executa `copilot -p` liberando só a ferramenta de escrita.',
    qwen: 'Executa `qwen -p`, aprovando só edições de arquivo.',
    opencode: 'Executa `opencode run` com as permissões configuradas no OpenCode.',
    aider: 'Executa `aider --message`, sem commits automáticos.',
    custom: 'Qualquer CLI headless. Use {prompt} no comando.',
    customLabel: 'Comando próprio',
  },

  canvas: {
    tools: {
      select: 'Selecionar',
      hand: 'Mover a tela',
      agent: 'Agente',
      note: 'Nota',
      checklist: 'Checklist',
      text: 'Texto',
      portal: 'Portal (navegador)',
    },
    newAgentWith: (tool: string) => `Novo agente ${tool}`,
    newAgentHint: 'abre e inicia',
    emptyTitle: 'Canvas vazio',
    emptyDescription:
      'Use a barra acima: agentes (T), notas (N), checklists (C) e textos (L). Ligue agentes entre si para conversarem, e a notas para lerem e marcarem tarefas.',
    start: 'Iniciar',
    stop: 'Parar',
    stopped: 'Sessão parada. Ao iniciar, o agente lê as instruções dele e espera.',
    removeFromCanvas: 'Tirar do canvas',
    lift: 'Ampliar',
    liftHint: 'Clique duplo para ampliar',
    putBack: 'Devolver ao canvas',
    liftedHere: 'Ampliado — clique para devolver',
    manager: 'Manager',
    managerOn: 'Tornar manager: pode recrutar e dispensar agentes',
    managerOff: 'Deixar de ser manager',
    managerLocked: 'Pare a sessão para mudar se é manager',
    waiting: 'Esperando você',
    waitingCount: (count: number) =>
      count === 1 ? '1 agente esperando você' : `${count} agentes esperando você`,
    undo: 'Desfazer',
    redo: 'Refazer',
    duplicate: 'Duplicar notas e textos',
    tidy: 'Organizar em grade',
    deleteSelection: 'Tirar do canvas',
    alignLabel: 'Alinhar',
    align: {
      left: 'Alinhar à esquerda',
      centerX: 'Centralizar na horizontal',
      right: 'Alinhar à direita',
      top: 'Alinhar no topo',
      centerY: 'Centralizar na vertical',
      bottom: 'Alinhar embaixo',
      distributeX: 'Distribuir na horizontal',
      distributeY: 'Distribuir na vertical',
    },
    portal: {
      back: 'Voltar',
      forward: 'Avançar',
      reload: 'Recarregar',
      address: 'Digite um endereço ou pesquise',
      empty:
        'Digite um endereço acima. Ligue um agente a este portal e ele pode abrir páginas, ler, clicar e digitar.',
    },
    permission: 'Permissões da sessão',
    permissionLocked: 'Pare a sessão para mudar as permissões',
    permissionAsk: 'Perguntar',
    permissionAcceptEdits: 'Aceitar edições',
    messages: 'Mensagens',
    noMessages: 'Nenhuma mensagem ainda.',
    untitledNote: 'Sem título',
    noteColor: 'Trocar cor',
    noteOptions: 'Opções da nota',
    edit: 'Editar',
    preview: 'Visualizar',
    rename: 'Renomear',
    lock: 'Travar',
    lockHint: 'só leitura',
    unlock: 'Destravar',
    deleteNote: 'Apagar nota',
    notePlaceholder: 'Escreva em markdown. "- [ ] tarefa" vira um item de checklist.',
    emptyNote: 'Nota vazia. Clique para escrever.',
    addItem: 'Adicionar item',
    textPlaceholder: 'Digite um texto',
  },

  context: {
    scope: 'Quem lê o contexto',
    scopeShared: 'Um para o projeto todo',
    scopeSharedHint: 'Todos os agentes e o orquestrador leem o mesmo arquivo.',
    scopePerAgent: 'Um para cada agente',
    scopePerAgentHint:
      'Cada agente lê só o próprio arquivo; o orquestrador lê todos para planejar.',
    source: 'Arquivo',
    sourceVeltrix: 'Contexto do Veltrix',
    sourceClaudeMd: 'CLAUDE.md do projeto',
    sourceFile: 'Outro arquivo',
    chooseFile: 'Escolher arquivo…',
    changeFile: 'Trocar arquivo',
    agentFile: (name: string) => `Arquivo de ${name}`,
    noAgents: 'Adicione agentes ao projeto para dar um contexto a cada um.',
    notesHint: 'Os agentes também anotam no arquivo o que aprendem.',
    missingFile: 'Este arquivo ainda não existe; ele é criado ao salvar.',
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
    sections: {
      general: 'Geral',
      orchestrator: 'Orquestrador',
      apiKeys: 'Chaves de API',
      agents: 'Agentes',
      terminal: 'Terminal',
      shortcuts: 'Atalhos',
    },
    groups: {
      app: 'Aplicativo',
      ai: 'Inteligência artificial',
      workspace: 'Área de trabalho',
    },

    generalDescription: 'Preferências do aplicativo.',
    language: 'Idioma',
    languageAuto: 'Automático (idioma do sistema)',

    orchestratorDescription:
      'O orquestrador é quem planeja: recebe o objetivo, divide em tarefas e escolhe o agente de cada uma. Escolha qual IA faz esse papel.',
    engineGroups: {
      cli: 'Assinatura via CLI',
      cloud: 'API na nuvem',
      local: 'Local ou servidor próprio',
    },
    engineGroupHints: {
      cli: 'Usa o CLI instalado e o login que você já tem nele. Não precisa de chave.',
      cloud: 'Chama a API do provedor com a sua chave. Cobrado por uso na conta do provedor.',
      local: 'Modelos rodando nesta máquina ou em um servidor compatível com a API da OpenAI.',
    },
    openAiCompatible: 'Compatível com OpenAI',
    inUse: 'Em uso',
    installed: 'Instalado',
    notInstalled: 'Não encontrado',
    keySaved: 'Chave salva',
    keyMissing: 'Sem chave',
    engineSetup: (name: string) => `Configurar ${name}`,
    model: 'Modelo',
    modelCliHint: 'Vazio usa o modelo padrão do próprio CLI.',
    modelDefault: (model: string) => `Vazio usa ${model}.`,
    baseUrl: 'Endereço da API',
    baseUrlHint: 'URL base até a versão, sem /chat/completions.',
    installHint: (binary: string) =>
      `"${binary}" não foi encontrado no PATH. Instale o CLI e faça login nele uma vez pelo terminal.`,
    test: 'Testar conexão',
    testing: 'Testando…',
    testOk: 'Conectado',

    apiKeysDescription:
      'Chaves dos provedores de IA, criptografadas no cofre do sistema. Só são enviadas ao próprio provedor.',
    apiKey: 'Chave de API',
    apiKeyOptional: 'Chave de API (opcional)',
    apiKeySaved: 'Uma chave está salva.',
    apiKeyMissing: 'Nenhuma chave salva.',
    getKeyAt: (site: string) => `Crie uma chave em ${site}.`,

    agentsDescription:
      'Os agentes executam as tarefas que o orquestrador distribui. Cada projeto escolhe os seus; aqui estão as ferramentas disponíveis e o comando que o Veltrix roda para cada uma.',
    agentsHowTo: 'Para adicionar um agente, abra um projeto e use a aba Agentes.',
    customToolHint:
      'Qualquer outro CLI que rode sem interação também serve: escolha "Comando próprio" ao criar o agente.',
    refresh: 'Verificar de novo',

    terminalDescription: 'Como os terminais abrem e aparecem.',
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

    shortcutsDescription: 'Atalhos de teclado de cada ação.',
  },
}

export type Messages = typeof ptBR
