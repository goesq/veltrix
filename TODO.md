# O que falta fazer

Levantamento feito lendo o código em 14/10/2026. O projeto compila (`npm run typecheck` passa).
O terminal está bem completo; a maior parte do que falta está no orquestrador.

## 1. Bugs no orquestrador (corrigir primeiro)

- [ ] **"Tentar novamente" numa tarefa bloqueada a deixa presa na fila para sempre.**
      `TaskRow.tsx` mostra o botão para tarefas `blocked`. `retryTask` volta a tarefa para
      `pending`, mas a dependência que falhou continua `failed`, então `readyTasks` nunca a
      escolhe e o objetivo fica "Em andamento" para sempre.
      Correção: ao tentar de novo uma tarefa bloqueada, tentar de novo também as dependências
      que falharam (ou esconder o botão nas bloqueadas).
      (`src/main/orchestrator/Orchestrator.ts:112`, `src/renderer/src/features/projects/TaskRow.tsx:23`)
- [ ] **Tarefas na fila não voltam a rodar depois de reabrir o app.** `recoverInterruptedWork`
      marca as tarefas que estavam rodando como falhas, mas não chama `dispatch`. Tarefas
      `pending` independentes ficam paradas até o usuário mexer no projeto.
      (`src/main/orchestrator/Orchestrator.ts:37`)
- [ ] **Remover um agente quebra as tarefas dele.** O painel deixa remover um agente com
      tarefas na fila ou rodando; as tarefas na fila falham com "agent was removed" e
      nenhuma tentativa resolve. Bloquear a remoção ou reatribuir as tarefas.
      (`src/renderer/src/features/projects/AgentsPanel.tsx:58`)
- [ ] **O planejamento não tem timeout nem pode ser cancelado.** O `claude -p` do
      `ClaudeCliPlanner` não é guardado em lugar nenhum: se travar, o objetivo fica
      "Planejando" até o app fechar, e o processo não é morto ao sair do app.
      (`src/main/orchestrator/planning/ClaudeCliPlanner.ts:35`)
- [ ] **Tarefas também não têm timeout.** Um agente travado ocupa o agente para sempre.

## 2. Orquestrador: o que falta para ficar bom

### Fluxo do objetivo
- [ ] **Revisar o plano antes de executar**: mostrar as tarefas, permitir editar, reatribuir
      ou remover, e só então aprovar. Hoje o plano já sai executando.
- [ ] **Tentar o planejamento de novo** quando ele falha (hoje o objetivo vira "Com falhas"
      sem botão de tentar de novo; é preciso reescrever o prompt).
- [ ] **Cancelar o objetivo inteiro** (planejamento + todas as tarefas) e remover um objetivo
      específico. Hoje só existe "Limpar concluídos".
- [ ] **Replanejar quando algo falha**: devolver ao planejador o erro da tarefa e o que já
      foi feito, para ele propor tarefas novas em vez de só bloquear as dependentes.
- [ ] **Resumo final do objetivo**: quando todas as tarefas terminam, gerar um resumo do que
      mudou (ou pelo menos juntar os resumos das tarefas).
- [ ] **Continuar um objetivo** ("agora ajusta X") reaproveitando o histórico, em vez de
      começar sempre do zero.
- [ ] O composer fica travado em "Planejando…" enquanto o planejamento roda
      (`submit` só retorna no fim). Dá para retornar logo e mostrar o progresso no card.

### Qualidade do resultado passado entre tarefas
- [ ] O "resultado" de uma tarefa são os últimos 4000 caracteres da saída do terminal
      (`RESULT_TAIL_CHARS`). No Codex e no Gemini isso tende a ser log, não o resumo.
      Usar saída estruturada de cada CLI: `claude -p --output-format json`,
      `codex exec --output-last-message <arquivo>`, `gemini --output-format json`, ou pedir
      ao agente para escrever o resumo em `.veltrix/results/<id>.md`.
- [ ] Sucesso hoje é só "código de saída 0". Considerar um passo de verificação
      (rodar testes/lint configurados no projeto, ou uma tarefa de revisão).

### Agentes em paralelo no mesmo diretório
- [ ] Agentes paralelos editam a mesma pasta ao mesmo tempo; o planejador só é *orientado* a
      evitar arquivos em comum. Opções: um git worktree por agente com merge no final, ou
      pelo menos detectar e avisar quando duas tarefas paralelas mexeram no mesmo arquivo.
- [ ] `CONTEXT.md` recebe escritas de vários agentes ao mesmo tempo e pode perder notas.
- [ ] Mostrar os arquivos alterados por tarefa (diff do git antes/depois).

### Planejador
- [ ] O planejador via API só vê o `CONTEXT.md`: não conhece a estrutura do repositório.
      Incluir pelo menos a árvore de arquivos e o README.
- [ ] Nenhum dos dois planejadores vê os objetivos anteriores do projeto.
- [ ] O modelo do planejador via CLI não é configurável (`plannerModel` só vale para a API).

### Interface
- [ ] Visualizar as dependências (grafo ou ao menos a ordem/camadas) em vez de só uma lista.
- [ ] Notificação do sistema quando um objetivo termina ou uma tarefa falha.
- [ ] Botão para abrir o log/brief da tarefa (`.veltrix/logs`, `.veltrix/tasks`).
- [ ] Verificar se o CLI do agente está instalado ao cadastrar (hoje só descobre ao rodar).

## 3. Projeto em geral

- [ ] **Não há testes.** Começar pelo que é lógica pura e fácil de testar:
      `taskGraph.ts`, `validatePlan`, `buildAgentCommand`/quoting de shell, `autoTitle.ts`.
      (Os bugs da seção 1 viram testes de regressão.)
- [ ] **Não há lint** (só `.prettierrc`). Adicionar ESLint e scripts `lint`/`format`.
- [ ] **Não há CI.** Um workflow com `typecheck` + testes + build em macOS e Windows.
- [ ] Adicionar `.veltrix/` ao `.gitignore` do projeto automaticamente (hoje o README pede
      para o usuário fazer isso).
- [ ] Fish, nushell e WSL ainda não informam o diretório atual (README, "Working directory
      tracking").
- [ ] Linux: o tipo `Platform` já inclui `linux`, mas não há alvo de empacotamento nem atalhos
      testados.
- [ ] Textos misturados: a interface está em português, mas as mensagens de erro do processo
      principal estão em inglês (ex.: "Add at least one agent to this project first.").
- [ ] Atualização automática e assinatura dos instaladores (`electron-builder.yml`).

## Ordem sugerida

1. Bugs da seção 1, com testes para `taskGraph` e o fluxo de retry.
2. Revisar o plano antes de executar + tentar o planejamento de novo + cancelar objetivo.
3. Resultado estruturado das tarefas (melhora muito a passagem de contexto).
4. Isolamento dos agentes paralelos (worktrees) e diff por tarefa.
5. Lint, CI e o resto.
