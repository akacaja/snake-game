# CLAUDE.md

Instruções que o Claude lê sempre que abre este projeto.

## Sobre o projeto

<!-- Preenchido pelo /agent-crew:new-project. Ajuste à mão quando precisar. -->
- **O que é:** Um jogo da cobrinha.
- **Tecnologias:** JavaScript puro (módulos ES), Web Component com shadow DOM e canvas, sem dependências. Node.js só para testes, build e servidor local.
- **Estrutura de pastas:** `src/` (código e tema em `src/theme.js`; os originais dos addons em `src/addons/` e das skins em `src/skins/`), `dist/` (arquivo único gerado), `addons/` e `skins/` (gerados a partir de `src/addons/` e `src/skins/`), `test/`, `scripts/`, `demo/`, `examples/`, `context/` (prints em `context/prototype/`) e `.crew/`.
- `.crew/` e `context/prototype/` existem só no computador de quem usa o agent-crew; não vão para o repositório.
- **Comandos:** testes `npm test` · lint `a definir` · build `npm run build` · rodar localmente `node scripts/serve.js` (http://localhost:8000/demo/)
- **Regra do build:** depois de mudar qualquer arquivo de `src/` (inclusive `src/addons/` e `src/skins/`), rode `npm run build` e inclua `dist/`, `addons/` e `skins/` no mesmo commit. O `npm test` falha se algum deles estiver desatualizado.
- **Regra do tema:** cores e tamanhos só em `src/theme.js`.

## Quem está usando

Leia `.crew/profile.md` antes de responder: ele diz o nível da pessoa, o idioma, o tipo de projeto, as regras e o sistema de design. Responda sempre no idioma da pessoa e no nível de explicação indicado ali.

## Contexto de produto

Documentos de referência ficam em `context/` (specs, decisões, exemplos, prints de telas). Leia `context/README.md` para saber o que há lá. O sistema de design está descrito em `context/design.md`.

## Pipeline do kit

- Toda tarefa de código passa pelo fluxo de `/agent-crew:card`.
- Modelos: planner e reviewer = opus · implementer e mentor = sonnet · explorer, tester e documenter = haiku. Se um modelo falhar por indisponibilidade, use o reserva da tabela em `/agent-crew:card` uma única vez.
- Rascunhos do pipeline ficam em `.crew/`, que não vai para o repositório.

## Regras

- Nunca assumir o que não está claro: perguntar.
- Nunca fazer commit direto na branch principal. Cada card vive numa branch própria.
- Nunca gravar senhas, chaves ou tokens no código. Elas ficam em variáveis de ambiente, fora do repositório.
- Não fazer push, abrir PR ou deploy sem pedido explícito.
- Pedir confirmação antes de qualquer comando que apague ou sobrescreva coisas (por exemplo: apagar pastas, `git reset`, reinstalar dependências do zero, rodar migrações de banco).
- Seguir as regras extras registradas em `.crew/profile.md`.
