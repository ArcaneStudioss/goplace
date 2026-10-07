# GoPlace · notas para sessões Claude

@AGENTS.md

- Cliente da Arcane Studios (dono: Gabriel). Falar em PT-BR. Regras gerais na base `arcane-studios-kb` (CLAUDE.md de lá).
- Next.js 16 (ler `node_modules/next/dist/docs/` antes de usar API nova), React 19, Tailwind 4, Postgres (Supabase) em produção e PGlite local.
- Banco: `src/lib/db.ts` (mesma interface nos dois), migrações em `db/migrations/*.sql` (rodam sozinhas). Nunca editar migração já aplicada em produção: criar a próxima.
- Painel: toda página e toda ação chama `exigirEquipe()`/`exigirAdmin()`. Formulários abrem em janela (`components/admin/Janela.tsx`), regra do Gabriel.
- Texto do site: sem travessão longo; não inventar números, depoimentos nem certificações. Produtos da semente são EXEMPLO (`exemplo = true`).
- Antes de entregar: `npm test`, `npx tsc --noEmit`, `npx eslint`, `next build`, `auditar-codigo.sh`, screenshots 390 e 1440 (claro e escuro).
- Não usar `pkill -f`/`pgrep -f` com padrão que apareça no próprio comando (mata o shell).
